import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from hms_backend.app.models.rbac import Role, Permission, RolePermission, UserRole, AuditLog, MasterCatalog, SystemSetting
from hms_backend.app.models.lab import LabEventOutbox
from hms_backend.app.core.websocket import manager

DEFAULT_ROLES = [
    {"role_code": "SUPER_ADMIN", "role_name": "Super Administrator", "description": "Full system configuration, security policies, and user/role administration (no clinical write authority)", "is_system": True},
    {"role_code": "HOSPITAL_ADMIN", "role_name": "Hospital Administrator", "description": "Operational governance, doctor/nurse profiles, master catalogs, tariffs, and system audit", "is_system": True},
    {"role_code": "RECEPTIONIST", "role_name": "Front Desk Receptionist", "description": "Patient registration, appointment scheduling, OP/IP intake, check-in, and payment collection", "is_system": True},
    {"role_code": "NURSE", "role_name": "Nursing Staff / Head Nurse", "description": "Waiting queue, vitals entry, nursing assessment, notes, medication administration, and ward care", "is_system": True},
    {"role_code": "DOCTOR", "role_name": "Medical Doctor / Consultant", "description": "Clinical examination, diagnosis, treatment plans, lab orders, lab result review, and prescriptions", "is_system": True},
    {"role_code": "LAB_TECHNICIAN", "role_name": "Laboratory Technician", "description": "Lab order acceptance, specimen collection, sample reception, and test result entry", "is_system": True},
    {"role_code": "LAB_SUPERVISOR", "role_name": "Laboratory Supervisor / Pathologist", "description": "Technical verification, result release/amendment, and critical alert management", "is_system": True},
    {"role_code": "PHARMACIST", "role_name": "Staff Pharmacist", "description": "Prescription verification, medicine dispensing, and inventory stock tracking", "is_system": True},
    {"role_code": "PHARMACY_MANAGER", "role_name": "Pharmacy Manager", "description": "Dispensing approval, inventory management, batch/expiry control, and stock adjustments", "is_system": True},
    {"role_code": "BILLING_STAFF", "role_name": "Billing & Revenue Specialist", "description": "Consolidated encounter invoices, charge review, payments, and receipt generation", "is_system": True},
    {"role_code": "CASHIER", "role_name": "Cashier", "description": "Payment collection, receipt printing, and daily cash reconciliation", "is_system": True},
    {"role_code": "WARD_MANAGER", "role_name": "Inpatient Ward Manager", "description": "Bed allocation, room status, bed transfers, and patient ward monitoring", "is_system": True},
    {"role_code": "AUDITOR", "role_name": "Compliance & Medical Auditor", "description": "Read-only access to audit logs, event logs, clinical history, and billing records", "is_system": True},
]

DEFAULT_PERMISSIONS = [
    # 1. Patient & Encounter
    {"perm_code": "PATIENT_CREATE", "module": "Patient", "description": "Register new patient demographic profiles"},
    {"perm_code": "PATIENT_VIEW", "module": "Patient", "description": "View patient demographic details"},
    {"perm_code": "PATIENT_UPDATE", "module": "Patient", "description": "Update patient demographic information"},
    {"perm_code": "ENCOUNTER_VIEW", "module": "Encounter", "description": "View clinical encounter records"},
    
    # 2. Appointment & Intake
    {"perm_code": "APPOINTMENT_CREATE", "module": "Appointment", "description": "Schedule new doctor appointments"},
    {"perm_code": "APPOINTMENT_VIEW", "module": "Appointment", "description": "View appointment calendars & lists"},
    {"perm_code": "APPOINTMENT_UPDATE", "module": "Appointment", "description": "Reschedule appointment slots"},
    {"perm_code": "APPOINTMENT_CANCEL", "module": "Appointment", "description": "Cancel scheduled appointments"},
    {"perm_code": "OP_REGISTRATION_CREATE", "module": "Reception", "description": "Create OP visit registrations"},
    {"perm_code": "IP_REGISTRATION_CREATE", "module": "Reception", "description": "Initiate IP admission requests"},
    {"perm_code": "PATIENT_CHECKIN", "module": "Reception", "description": "Check in arrived patients to triage queue"},
    {"perm_code": "QUEUE_MANAGE", "module": "Reception", "description": "Manage queue sequence & tokens"},

    # 3. Nursing
    {"perm_code": "NURSE_QUEUE_VIEW", "module": "Nursing", "description": "View triage and nursing waiting queues"},
    {"perm_code": "VITAL_CREATE", "module": "Nursing", "description": "Record patient vital signs and pain scale"},
    {"perm_code": "VITAL_VIEW", "module": "Nursing", "description": "View recorded patient vital signs"},
    {"perm_code": "VITAL_UPDATE", "module": "Nursing", "description": "Update vital signs records"},
    {"perm_code": "NURSING_ASSESSMENT_CREATE", "module": "Nursing", "description": "Perform nursing intake assessment"},
    {"perm_code": "NURSING_ASSESSMENT_VIEW", "module": "Nursing", "description": "View nursing assessments"},
    {"perm_code": "NURSING_ASSESSMENT_COMPLETE", "module": "Nursing", "description": "Complete nursing assessment and forward to doctor"},
    {"perm_code": "NURSING_NOTE_CREATE", "module": "Nursing", "description": "Add nursing progress notes"},
    {"perm_code": "MEDICATION_ADMINISTRATION_CREATE", "module": "Nursing", "description": "Record medication administration on MAR"},

    # 4. Doctor
    {"perm_code": "CONSULTATION_CREATE", "module": "Doctor", "description": "Conduct and save clinical consultation"},
    {"perm_code": "CONSULTATION_VIEW", "module": "Doctor", "description": "View doctor consultation history"},
    {"perm_code": "CONSULTATION_COMPLETE", "module": "Doctor", "description": "Finalize doctor consultation"},
    {"perm_code": "DIAGNOSIS_CREATE", "module": "Doctor", "description": "Record provisional & primary ICD-10 diagnosis"},
    {"perm_code": "DIAGNOSIS_VIEW", "module": "Doctor", "description": "View patient clinical diagnosis"},
    {"perm_code": "TREATMENT_PLAN_CREATE", "module": "Doctor", "description": "Document treatment orders and clinical plan"},
    {"perm_code": "LAB_ORDER_CREATE", "module": "Doctor", "description": "Order diagnostic laboratory investigations"},
    {"perm_code": "LAB_ORDER_VIEW", "module": "Doctor", "description": "View lab orders for assigned patients"},
    {"perm_code": "LAB_RESULT_REVIEW", "module": "Doctor", "description": "Review and acknowledge released lab results"},
    {"perm_code": "PRESCRIPTION_CREATE", "module": "Doctor", "description": "Prescribe medications with dosage instructions"},
    {"perm_code": "PRESCRIPTION_VIEW", "module": "Doctor", "description": "View patient medication prescriptions"},

    # 5. Laboratory
    {"perm_code": "LAB_WORK_QUEUE_VIEW", "module": "Laboratory", "description": "View laboratory section work queues"},
    {"perm_code": "SPECIMEN_COLLECT", "module": "Laboratory", "description": "Collect specimens & generate barcodes"},
    {"perm_code": "SPECIMEN_RECEIVE", "module": "Laboratory", "description": "Log and accept specimens into laboratory"},
    {"perm_code": "SPECIMEN_REJECT", "module": "Laboratory", "description": "Reject inadequate specimens & request recollection"},
    {"perm_code": "LAB_RESULT_ENTER", "module": "Laboratory", "description": "Enter test parameter findings and values"},
    {"perm_code": "LAB_RESULT_VERIFY", "module": "Laboratory", "description": "Technical verification of test results by supervisor"},
    {"perm_code": "LAB_RESULT_RELEASE", "module": "Laboratory", "description": "Authorize and release lab report to ordering doctor"},

    # 6. Pharmacy
    {"perm_code": "PRESCRIPTION_PROCESS", "module": "Pharmacy", "description": "Verify prescriptions and check drug interactions"},
    {"perm_code": "MEDICATION_DISPENSE", "module": "Pharmacy", "description": "Dispense medications and issue pharmacy bill"},
    {"perm_code": "INVENTORY_VIEW", "module": "Pharmacy", "description": "View medicine stock levels and alerts"},
    {"perm_code": "INVENTORY_MANAGE", "module": "Pharmacy", "description": "Manage batches, stock receipts, and expiry dates"},

    # 7. Inpatient (Ward & Beds)
    {"perm_code": "WARD_VIEW", "module": "Inpatient", "description": "View ward occupancy and bed status"},
    {"perm_code": "BED_ASSIGN", "module": "Inpatient", "description": "Allocate inpatient beds to admitted patients"},
    {"perm_code": "BED_RELEASE", "module": "Inpatient", "description": "Release beds upon patient discharge"},

    # 8. Billing & Payments
    {"perm_code": "CHARGE_VIEW", "module": "Billing", "description": "View automatic billable service charges"},
    {"perm_code": "INVOICE_VIEW", "module": "Billing", "description": "View patient invoices and financial summaries"},
    {"perm_code": "INVOICE_CREATE", "module": "Billing", "description": "Generate consolidated patient invoices"},
    {"perm_code": "PAYMENT_CREATE", "module": "Billing", "description": "Record payments via Cash, Card, UPI, Insurance"},
    {"perm_code": "PAYMENT_VIEW", "module": "Billing", "description": "View payment transaction records and gateway logs"},
    {"perm_code": "RECEIPT_PRINT", "module": "Billing", "description": "Print official patient billing receipts"},

    # 9. Admin & Security Governance
    {"perm_code": "USER_MANAGE", "module": "Admin", "description": "Create, update, and deactivate system user accounts"},
    {"perm_code": "ROLE_MANAGE", "module": "Admin", "description": "Configure roles and permission matrices"},
    {"perm_code": "MASTER_DATA_MANAGE", "module": "Admin", "description": "Manage master reference catalogs and tariffs"},
    {"perm_code": "DEPARTMENT_MANAGE", "module": "Admin", "description": "Create and configure clinical departments"},
    {"perm_code": "BILLING_TARIFF_MANAGE", "module": "Admin", "description": "Configure master pricing catalog and service rates"},
    {"perm_code": "AUDIT_LOG_VIEW", "module": "Admin", "description": "View comprehensive system audit trail and deleted logs"},
    {"perm_code": "SYSTEM_MONITOR_VIEW", "module": "Admin", "description": "Monitor system diagnostics, DB, and outbox queues"},
]

# Role-to-Permissions Mapping Definition
ROLE_PERMISSIONS_MAP = {
    "SUPER_ADMIN": [
        "USER_MANAGE", "ROLE_MANAGE", "MASTER_DATA_MANAGE", "DEPARTMENT_MANAGE",
        "BILLING_TARIFF_MANAGE", "AUDIT_LOG_VIEW", "SYSTEM_MONITOR_VIEW",
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "INVOICE_VIEW", "PAYMENT_VIEW"
    ],
    "HOSPITAL_ADMIN": [
        "USER_MANAGE", "ROLE_MANAGE", "MASTER_DATA_MANAGE", "DEPARTMENT_MANAGE",
        "BILLING_TARIFF_MANAGE", "AUDIT_LOG_VIEW", "SYSTEM_MONITOR_VIEW",
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "APPOINTMENT_VIEW", "WARD_VIEW",
        "INVOICE_VIEW", "PAYMENT_VIEW"
    ],
    "RECEPTIONIST": [
        "PATIENT_CREATE", "PATIENT_VIEW", "PATIENT_UPDATE", "ENCOUNTER_VIEW",
        "APPOINTMENT_CREATE", "APPOINTMENT_VIEW", "APPOINTMENT_UPDATE", "APPOINTMENT_CANCEL",
        "OP_REGISTRATION_CREATE", "IP_REGISTRATION_CREATE", "PATIENT_CHECKIN",
        "QUEUE_MANAGE", "INVOICE_VIEW", "PAYMENT_CREATE", "PAYMENT_VIEW", "RECEIPT_PRINT"
    ],
    "NURSE": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "NURSE_QUEUE_VIEW",
        "VITAL_CREATE", "VITAL_VIEW", "VITAL_UPDATE",
        "NURSING_ASSESSMENT_CREATE", "NURSING_ASSESSMENT_VIEW", "NURSING_ASSESSMENT_COMPLETE",
        "NURSING_NOTE_CREATE", "MEDICATION_ADMINISTRATION_CREATE", "WARD_VIEW"
    ],
    "DOCTOR": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "VITAL_VIEW", "NURSING_ASSESSMENT_VIEW",
        "CONSULTATION_CREATE", "CONSULTATION_VIEW", "CONSULTATION_COMPLETE",
        "DIAGNOSIS_CREATE", "DIAGNOSIS_VIEW", "TREATMENT_PLAN_CREATE",
        "LAB_ORDER_CREATE", "LAB_ORDER_VIEW", "LAB_RESULT_REVIEW",
        "PRESCRIPTION_CREATE", "PRESCRIPTION_VIEW"
    ],
    "LAB_TECHNICIAN": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "LAB_WORK_QUEUE_VIEW",
        "SPECIMEN_COLLECT", "SPECIMEN_RECEIVE", "SPECIMEN_REJECT",
        "LAB_RESULT_ENTER"
    ],
    "LAB_SUPERVISOR": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "LAB_WORK_QUEUE_VIEW",
        "SPECIMEN_COLLECT", "SPECIMEN_RECEIVE", "SPECIMEN_REJECT",
        "LAB_RESULT_ENTER", "LAB_RESULT_VERIFY", "LAB_RESULT_RELEASE",
        "AUDIT_LOG_VIEW"
    ],
    "PHARMACIST": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "PRESCRIPTION_VIEW",
        "PRESCRIPTION_PROCESS", "MEDICATION_DISPENSE", "INVENTORY_VIEW"
    ],
    "PHARMACY_MANAGER": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "PRESCRIPTION_VIEW",
        "PRESCRIPTION_PROCESS", "MEDICATION_DISPENSE", "INVENTORY_VIEW",
        "INVENTORY_MANAGE"
    ],
    "BILLING_STAFF": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "CHARGE_VIEW",
        "INVOICE_VIEW", "INVOICE_CREATE", "PAYMENT_CREATE",
        "PAYMENT_VIEW", "RECEIPT_PRINT"
    ],
    "CASHIER": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "INVOICE_VIEW",
        "PAYMENT_CREATE", "PAYMENT_VIEW", "RECEIPT_PRINT"
    ],
    "WARD_MANAGER": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "WARD_VIEW",
        "BED_ASSIGN", "BED_RELEASE"
    ],
    "AUDITOR": [
        "PATIENT_VIEW", "ENCOUNTER_VIEW", "CONSULTATION_VIEW", "DIAGNOSIS_VIEW",
        "PRESCRIPTION_VIEW", "CHARGE_VIEW", "INVOICE_VIEW", "PAYMENT_VIEW",
        "AUDIT_LOG_VIEW", "SYSTEM_MONITOR_VIEW"
    ]
}

DEFAULT_MASTER_CATALOGS = [
    # Specialties
    {"category": "Specialty", "code": "CARD", "name": "Cardiology", "description": "Heart & Vascular Medicine"},
    {"category": "Specialty", "code": "NEUR", "name": "Neurology", "description": "Brain & Nervous System"},
    {"category": "Specialty", "code": "PEDS", "name": "Pediatrics", "description": "Child & Infant Health"},
    {"category": "Specialty", "code": "ORTH", "name": "Orthopedics", "description": "Bones, Joints & Spine"},
    {"category": "Specialty", "code": "EMRG", "name": "Emergency & Critical Care", "description": "Acute Trauma & ICU"},

    # Priority Levels
    {"category": "PriorityLevel", "code": "EMG", "name": "EMERGENCY", "description": "Immediate life-threatening triage priority"},
    {"category": "PriorityLevel", "code": "URG", "name": "URGENT", "description": "Priority clinical attention required"},
    {"category": "PriorityLevel", "code": "NRM", "name": "ROUTINE / NORMAL", "description": "Standard consultation priority"},

    # Diagnosis Examples
    {"category": "Diagnosis", "code": "I10", "name": "Essential (Primary) Hypertension", "description": "High blood pressure"},
    {"category": "Diagnosis", "code": "E11", "name": "Type 2 Diabetes Mellitus", "description": "Non-insulin dependent diabetes"},
    {"category": "Diagnosis", "code": "J45", "name": "Bronchial Asthma", "description": "Chronic respiratory airway inflammation"},
    {"category": "Diagnosis", "code": "K29.7", "name": "Acute Gastritis", "description": "Gastric mucosa inflammation"},

    # Procedures
    {"category": "Procedure", "code": "ECG-01", "name": "12-Lead Electrocardiogram", "description": "Cardiac electrical rhythm monitoring"},
    {"category": "Procedure", "code": "WND-01", "name": "Sterile Surgical Dressing", "description": "Wound care and aseptic bandaging"},
    {"category": "Procedure", "code": "IV-01", "name": "Peripheral IV Cannulation", "description": "Venous catheter placement"},
]

DEFAULT_SYSTEM_SETTINGS = [
    {"key_name": "Hospital Name", "value": "City Care General Hospital", "category": "General", "description": "Official healthcare institution title"},
    {"key_name": "Hospital Code", "value": "CCGH-2026", "category": "General", "description": "Unique hospital registry code"},
    {"key_name": "UHID Format", "value": "PT-{YEAR}-{SEQ:05d}", "category": "General", "description": "Universal Health ID pattern"},
    {"key_name": "Encounter Format", "value": "ENC-{YEAR}-{SEQ:05d}", "category": "General", "description": "Clinical encounter identifier format"},
    {"key_name": "Default Slot Duration", "value": "15", "category": "Queue", "description": "Doctor appointment slot size in minutes"},
    {"key_name": "Priority Escalation Timeout", "value": "30", "category": "Queue", "description": "Minutes before waiting alert triggers"},
    {"key_name": "Tax Rate", "value": "0.0", "category": "Billing", "description": "Standard GST/Sales Tax rate applied"},
]


def seed_rbac_and_masters_if_needed(db: Session):
    """Populates default RBAC roles, permissions, role-permission links, catalogs, and system settings."""
    # 1. Seed Roles
    for r in DEFAULT_ROLES:
        existing_role = db.query(Role).filter(Role.role_code == r["role_code"]).first()
        if not existing_role:
            db.add(Role(**r))
    db.commit()

    # 2. Seed Permissions
    for p in DEFAULT_PERMISSIONS:
        existing_perm = db.query(Permission).filter(Permission.perm_code == p["perm_code"]).first()
        if not existing_perm:
            db.add(Permission(**p))
    db.commit()

    # 3. Seed Role-Permissions mappings
    all_roles = {role.role_code: role for role in db.query(Role).all()}
    all_perms = {perm.perm_code: perm for perm in db.query(Permission).all()}

    for role_code, perm_codes in ROLE_PERMISSIONS_MAP.items():
        role_obj = all_roles.get(role_code)
        if role_obj:
            for p_code in perm_codes:
                perm_obj = all_perms.get(p_code)
                if perm_obj:
                    exists = db.query(RolePermission).filter(
                        RolePermission.role_id == role_obj.id,
                        RolePermission.permission_id == perm_obj.id
                    ).first()
                    if not exists:
                        db.add(RolePermission(role_id=role_obj.id, permission_id=perm_obj.id))
    db.commit()

    # 4. Seed Master Catalogs
    if db.query(MasterCatalog).count() == 0:
        cat_objs = [MasterCatalog(**c) for c in DEFAULT_MASTER_CATALOGS]
        db.add_all(cat_objs)
        db.commit()

    # 5. Seed System Settings
    if db.query(SystemSetting).count() == 0:
        sett_objs = [SystemSetting(**s) for s in DEFAULT_SYSTEM_SETTINGS]
        db.add_all(sett_objs)
        db.commit()


def get_system_health_diagnostics(db: Session) -> dict:
    """Probes backend services, SQLite DB connection, WebSockets, and Outbox event Queue."""
    db_status = "Healthy"
    try:
        db.execute(text("SELECT 1")).scalar()
    except Exception as e:
        db_status = f"Unhealthy: {str(e)}"

    failed_outbox_count = db.query(LabEventOutbox).filter(LabEventOutbox.processed == False).count()
    active_ws_conns = len(manager.active_connections)

    return {
        "status": "Healthy" if db_status == "Healthy" else "Degraded",
        "api": "Operational (v1.0.0)",
        "database": db_status,
        "websocket": f"Connected ({active_ws_conns} active channels)",
        "event_engine": "Operational (Async Event Router)",
        "failed_outbox_events": failed_outbox_count,
        "background_workers": "Running",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def log_audit_event(
    db: Session,
    user_id: int = None,
    username: str = "Admin",
    role: str = "admin",
    action: str = "UPDATE",
    entity_type: str = "System",
    entity_id: str = None,
    old_values: dict = None,
    new_values: dict = None,
    reason: str = None
):
    """Creates a permanent audit log record."""
    audit = AuditLog(
        user_id=user_id,
        username=username,
        role=role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        reason=reason or "Administrative Governance Action",
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    return audit
