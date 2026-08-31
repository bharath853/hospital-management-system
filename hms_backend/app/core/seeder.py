from sqlalchemy.orm import Session
from hms_backend.app.models.user import User
from hms_backend.app.models.department import Department
from hms_backend.app.models.doctor import Doctor
from hms_backend.app.models.staff import Staff
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.appointment import Appointment
from hms_backend.app.models.opd import OPDVisit
from hms_backend.app.models.ipd import Ward, Bed, Admission
from hms_backend.app.models.prescription import Prescription
from hms_backend.app.models.lab import TestRequest, LabReport
from hms_backend.app.models.pharmacy import Medicine, StockTransaction
from hms_backend.app.models.billing import Invoice, Payment, ServiceMaster
from hms_backend.app.models.ambulance import Ambulance, EmergencyBooking
from hms_backend.app.core.security import hash_password


def seed_database(db: Session):
    """Populates initial database records if empty."""
    
    # 1. Departments
    if db.query(Department).count() == 0:
        depts = [
            Department(name="Cardiology", head_of_dept="Dr. Madhavan", total_staff=18, status="Active"),
            Department(name="Neurology", head_of_dept="Dr. S. Karthikeyan", total_staff=12, status="Active"),
            Department(name="Pediatrics", head_of_dept="Dr. Murugan Jeyaraman", total_staff=15, status="Active"),
            Department(name="Orthopedics", head_of_dept="Dr. Raj Kanna", total_staff=14, status="Active"),
            Department(name="Emergency & ICU", head_of_dept="Dr. Sarah Johnson", total_staff=30, status="Active"),
        ]
        db.add_all(depts)
        db.commit()

    # 2. Users (Admin, 5 Doctors, 5 Nurses, 2 Receptionists, Lab, Pharmacy, 8 Patients)
    if db.query(User).count() == 0:
        users = [
            # Admin
            User(employee_id="EMP-1000", full_name="Dr. Sarah Johnson", email="admin@hospital.com", password_hash=hash_password("admin123"), role="admin"),
            
            # 5 Doctors (Individual Logins)
            User(employee_id="EMP-1001", full_name="Dr. Madhavan", email="doctor@hospital.com", password_hash=hash_password("doctor123"), role="doctor"),
            User(employee_id="EMP-1002", full_name="Dr. S. Karthikeyan", email="karthikeyan@hospital.org", password_hash=hash_password("doctor123"), role="doctor"),
            User(employee_id="EMP-1003", full_name="Dr. Murugan Jeyaraman", email="murugan@hospital.org", password_hash=hash_password("doctor123"), role="doctor"),
            User(employee_id="EMP-1004", full_name="Dr. Raj Kanna", email="rajkanna@hospital.org", password_hash=hash_password("doctor123"), role="doctor"),
            User(employee_id="EMP-1005", full_name="Dr. Priya Nair", email="priyanair@hospital.org", password_hash=hash_password("doctor123"), role="doctor"),
            
            # 5 Nurses (Individual Logins)
            User(employee_id="EMP-1006", full_name="Selvi. V. Mary", email="nurse@hospital.com", password_hash=hash_password("nurse123"), role="nurse"),
            User(employee_id="EMP-1007", full_name="Kavitha. R.", email="kavitha.r@hospital.org", password_hash=hash_password("nurse123"), role="nurse"),
            User(employee_id="EMP-1008", full_name="Lakshmi. P", email="lakshmi.p@hospital.org", password_hash=hash_password("nurse123"), role="nurse"),
            User(employee_id="EMP-1009", full_name="Priya. S", email="priya.s@hospital.org", password_hash=hash_password("nurse123"), role="nurse"),
            User(employee_id="EMP-1010", full_name="Anandhi. K", email="anandhi.k@hospital.org", password_hash=hash_password("nurse123"), role="nurse"),
            
            # 2 Receptionists (Individual Logins)
            User(employee_id="EMP-1011", full_name="Rajesh", email="reception@hospital.com", password_hash=hash_password("reception123"), role="reception"),
            User(employee_id="EMP-1012", full_name="Pooja Venkatesh", email="pooja.v@hospital.org", password_hash=hash_password("reception123"), role="reception"),
            
            # Lab Tech & Pharmacist
            User(employee_id="EMP-1013", full_name="Anil Mehta", email="lab@hospital.com", password_hash=hash_password("lab123"), role="laboratory"),
            User(employee_id="EMP-1014", full_name="Vikram Singh", email="pharmacy123@hospital.org", password_hash=hash_password("pharmacy123"), role="pharmacy"),

            # 8 Patients (Individual Logins)
            User(employee_id="PAT-2001", full_name="Aarav", email="aarav@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2002", full_name="Ishaan", email="ishaan@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2003", full_name="Rahul", email="rahul@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2004", full_name="Tanvi", email="tanvi@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2005", full_name="Karthik", email="karthik@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2006", full_name="Srinivas", email="srinivas@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2007", full_name="Ananya", email="ananya@patient.com", password_hash=hash_password("patient123"), role="patient"),
            User(employee_id="PAT-2008", full_name="Deepika", email="deepika@patient.com", password_hash=hash_password("patient123"), role="patient"),
        ]
        db.add_all(users)
        db.commit()

    # 3. Doctors (5 Doctors with unique employee_id)
    if db.query(Doctor).count() == 0:
        cardio = db.query(Department).filter(Department.name == "Cardiology").first()
        neuro = db.query(Department).filter(Department.name == "Neurology").first()
        pedia = db.query(Department).filter(Department.name == "Pediatrics").first()
        ortho = db.query(Department).filter(Department.name == "Orthopedics").first()

        doctors = [
            Doctor(employee_id="EMP-1001", full_name="Dr. Madhavan", specialization="Cardiology", phone="+91 98765 12345", availability="Available", department_id=cardio.id if cardio else None),
            Doctor(employee_id="EMP-1002", full_name="Dr. S. Karthikeyan", specialization="Neurology", phone="+91 98765 67890", availability="Available", department_id=neuro.id if neuro else None),
            Doctor(employee_id="EMP-1003", full_name="Dr. Murugan Jeyaraman", specialization="Pediatrics", phone="+91 98765 23456", availability="Available", department_id=pedia.id if pedia else None),
            Doctor(employee_id="EMP-1004", full_name="Dr. Raj Kanna", specialization="Orthopedics", phone="+91 98765 34567", availability="Available", department_id=ortho.id if ortho else None),
            Doctor(employee_id="EMP-1005", full_name="Dr. Priya Nair", specialization="General Medicine", phone="+91 98765 45678", availability="Available", department_id=cardio.id if cardio else None),
        ]
        db.add_all(doctors)
        db.commit()

    # 4. Staff (5 Nurses + 2 Receptionists with unique employee_id)
    if db.query(Staff).count() == 0:
        staff_list = [
            # 5 Nurses
            Staff(employee_id="EMP-1006", full_name="Selvi. V. Mary", role="Head Nurse - ICU", shift="Morning Shift", phone="+91 91111 22222", status="Active"),
            Staff(employee_id="EMP-1007", full_name="Kavitha. R.", role="OPD Nurse", shift="Morning Shift", phone="+91 91111 33333", status="Active"),
            Staff(employee_id="EMP-1008", full_name="Lakshmi. P", role="IPD Ward Nurse", shift="Evening Shift", phone="+91 91111 44444", status="Active"),
            Staff(employee_id="EMP-1009", full_name="Priya. S", role="Pediatric Nurse", shift="Day Shift", phone="+91 91111 55555", status="Active"),
            Staff(employee_id="EMP-1010", full_name="Anandhi. K", role="Emergency Nurse", shift="Night Shift", phone="+91 91111 66666", status="Active"),
            # 2 Receptionists
            Staff(employee_id="EMP-1011", full_name="Rajesh", role="Chief Reception Officer", shift="Morning Shift", phone="+91 95555 11111", status="Active"),
            Staff(employee_id="EMP-1012", full_name="Pooja Venkatesh", role="Shift Reception Officer", shift="Evening Shift", phone="+91 95555 66666", status="Active"),
        ]
        db.add_all(staff_list)
        db.commit()

    # 5. Patients (8 Patients with unique patient_id, disease, and typical pain scale 1-10)
    if db.query(Patient).count() == 0:
        patients = [
            Patient(patient_id="PAT-2001", patient_code="PAT-2001", full_name="Aarav", phone="+91 98765 43210", email="aarav@patient.com", gender="Male", blood_group="O+", disease="Diabetes", pain_scale=3, status="Active"),
            Patient(patient_id="PAT-2002", patient_code="PAT-2002", full_name="Ishaan", phone="+91 91234 56780", email="ishaan@patient.com", gender="Male", blood_group="A+", disease="Hypertension", pain_scale=2, status="Active"),
            Patient(patient_id="PAT-2003", patient_code="PAT-2003", full_name="Rahul", phone="+91 98111 22233", email="rahul@patient.com", gender="Male", blood_group="B+", disease="Asthma", pain_scale=5, status="Active"),
            Patient(patient_id="PAT-2004", patient_code="PAT-2004", full_name="Tanvi", phone="+91 97444 55566", email="tanvi@patient.com", gender="Female", blood_group="AB+", disease="Pneumonia", pain_scale=7, status="Active"),
            Patient(patient_id="PAT-2005", patient_code="PAT-2005", full_name="Karthik", phone="+91 96333 44455", email="karthik@patient.com", gender="Male", blood_group="O-", disease="Tuberculosis", pain_scale=6, status="Active"),
            Patient(patient_id="PAT-2006", patient_code="PAT-2006", full_name="Srinivas", phone="+91 95222 33344", email="srinivas@patient.com", gender="Male", blood_group="A-", disease="Malaria", pain_scale=6, status="Active"),
            Patient(patient_id="PAT-2007", patient_code="PAT-2007", full_name="Ananya", phone="+91 94111 22233", email="ananya@patient.com", gender="Female", blood_group="B-", disease="Dengue", pain_scale=7, status="Active"),
            Patient(patient_id="PAT-2008", patient_code="PAT-2008", full_name="Deepika", phone="+91 93000 11122", email="deepika@patient.com", gender="Female", blood_group="AB-", disease="Typhoid", pain_scale=5, status="Active"),
        ]
        db.add_all(patients)
        db.commit()

    # 6. Appointments
    if db.query(Appointment).count() == 0:
        p1 = db.query(Patient).first()
        d1 = db.query(Doctor).first()
        if p1 and d1:
            appts = [
                Appointment(appointment_code="APT-801", patient_id=p1.id, doctor_id=d1.id, status="Checked In", appointment_type="Follow-up", queue_number=1),
                Appointment(appointment_code="APT-802", patient_id=p1.id, doctor_id=d1.id, status="Scheduled", appointment_type="Routine Consultation", queue_number=2),
            ]
            db.add_all(appts)
            db.commit()

    # 7. OPD Visits
    if db.query(OPDVisit).count() == 0:
        p1 = db.query(Patient).first()
        if p1:
            visits = [
                OPDVisit(token_no="TK-01", patient_id=p1.id, estimated_time="10:30 AM", status="In Consultation"),
                OPDVisit(token_no="TK-02", patient_id=p1.id, estimated_time="10:45 AM", status="Waiting"),
            ]
            db.add_all(visits)
            db.commit()

    # 8. IPD (Wards, Beds, Admissions)
    if db.query(Ward).count() == 0:
        w1 = Ward(name="General Medicine Ward", ward_type="General", total_beds=10, occupied_beds=1, nurse_in_charge="Selvi. V. Mary")
        w2 = Ward(name="Cardiology Deluxe Wing", ward_type="Deluxe Private", total_beds=8, occupied_beds=1, nurse_in_charge="Kavitha. R.")
        w3 = Ward(name="Intensive Care Unit (ICU)", ward_type="ICU", total_beds=6, occupied_beds=1, nurse_in_charge="Lakshmi. P")
        w4 = Ward(name="Orthopedics & Surgery Ward", ward_type="Semiprivate", total_beds=8, occupied_beds=0, nurse_in_charge="Anandhi. K")
        db.add_all([w1, w2, w3, w4])
        db.commit()

        # General Medicine Beds
        b1 = Bed(bed_number="Bed 01", room_number="Room 201", ward_id=w1.id, bed_type="General", daily_rate="₹1,500/day", status="Available")
        b2 = Bed(bed_number="Bed 02", room_number="Room 201", ward_id=w1.id, bed_type="General", daily_rate="₹1,500/day", status="Occupied")
        b3 = Bed(bed_number="Bed 03", room_number="Room 201", ward_id=w1.id, bed_type="General", daily_rate="₹1,500/day", status="Available")
        b4 = Bed(bed_number="Bed 04", room_number="Room 202", ward_id=w1.id, bed_type="General", daily_rate="₹1,500/day", status="Available")

        # Cardiology Deluxe Beds
        b5 = Bed(bed_number="Bed C1", room_number="Room 301", ward_id=w2.id, bed_type="Deluxe", daily_rate="₹5,000/day", status="Available")
        b6 = Bed(bed_number="Bed C2", room_number="Room 301", ward_id=w2.id, bed_type="Deluxe", daily_rate="₹5,000/day", status="Occupied")
        b7 = Bed(bed_number="Bed C3", room_number="Room 302", ward_id=w2.id, bed_type="Deluxe", daily_rate="₹5,000/day", status="Available")

        # ICU Beds
        b8 = Bed(bed_number="Bed ICU-01", room_number="Room ICU-1", ward_id=w3.id, bed_type="ICU", daily_rate="₹8,500/day", status="Occupied")
        b9 = Bed(bed_number="Bed ICU-02", room_number="Room ICU-1", ward_id=w3.id, bed_type="ICU", daily_rate="₹8,500/day", status="Available")

        # Surgery Beds
        b10 = Bed(bed_number="Bed S01", room_number="Room 401", ward_id=w4.id, bed_type="Semiprivate", daily_rate="₹3,000/day", status="Available")
        b11 = Bed(bed_number="Bed S02", room_number="Room 401", ward_id=w4.id, bed_type="Semiprivate", daily_rate="₹3,000/day", status="Available")

        db.add_all([b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11])
        db.commit()

        p1 = db.query(Patient).filter(Patient.full_name == "Tanvi").first()
        if p1:
            adm = Admission(admission_code="IPD-301", patient_id=p1.id, bed_id=b2.id, attending_doctor="Dr. Raj Kanna", status="Admitted")
            db.add(adm)
            db.commit()

    # 9. Prescriptions
    if db.query(Prescription).count() == 0:
        rx = [
            Prescription(patient_name="Aarav", doctor_name="Dr. Madhavan", medicines="Amoxicillin 500mg, Paracetamol 650mg", duration="5 Days", status="Prescribed"),
            Prescription(patient_name="Ishaan", doctor_name="Dr. S. Karthikeyan", medicines="Naproxen 250mg, Pantoprazole 40mg", duration="7 Days", status="Prescribed"),
        ]
        db.add_all(rx)
        db.commit()

    # 10. Laboratory
    if db.query(TestRequest).count() == 0:
        lab_reqs = [
            TestRequest(req_code="LAB-401", patient_name="Aarav", test_type="CBC Blood Profile", priority="Normal", requested_by="Dr. Madhavan", status="Requested"),
            TestRequest(req_code="LAB-402", patient_name="Tanvi", test_type="Knee MRI Scan", priority="Urgent", requested_by="Dr. Raj Kanna", status="In Progress"),
        ]
        db.add_all(lab_reqs)
        db.commit()

        lab_rep = LabReport(test_id=1, patient_name="Aarav", result_summary="Hemoglobin 14.2 g/dL (Normal)", verified_by="Anil Mehta", status="Verified")
        db.add(lab_rep)
        db.commit()

    # 11. Pharmacy
    if db.query(Medicine).count() == 0:
        meds = [
            Medicine(name="Paracetamol 650mg", batch_no="BAT-2024-X", stock_qty=1200, unit_price=1.5, status="Available"),
            Medicine(name="Amoxicillin 500mg", batch_no="BAT-2025-A", stock_qty=450, unit_price=4.0, status="Available"),
            Medicine(name="Pantoprazole 40mg", batch_no="BAT-2024-P", stock_qty=80, unit_price=3.0, status="Low Stock"),
        ]
        db.add_all(meds)
        db.commit()

    # 12. Billing
    if db.query(Invoice).count() == 0:
        invoices = [
            Invoice(invoice_code="INV-2026-01", patient_name="Aarav Kumar", total_amount=109.50, due_date="2026-08-12", status="Paid"),
            Invoice(invoice_code="INV-2026-02", patient_name="Siddharth Roy", total_amount=720.00, due_date="2026-08-16", status="Pending"),
        ]
        db.add_all(invoices)
        db.commit()

        pmts = [
            Payment(transaction_code="TXN-9901", patient_name="Aarav Kumar", amount=109.50, method="Credit Card", status="Completed"),
        ]
        db.add_all(pmts)
        db.commit()

    # 13. Ambulance
    if db.query(Ambulance).count() == 0:
        ambs = [
            Ambulance(vehicle_number="AMB-101", driver_name="Ramesh Kumar", driver_phone="+91 98989 11223", status="Available"),
            Ambulance(vehicle_number="AMB-102", driver_name="Suresh Patel", driver_phone="+91 98989 44556", status="On Call"),
        ]
        db.add_all(ambs)
        db.commit()

        bk = EmergencyBooking(patient_name="Emergency Call #901", pickup_location="MG Road Crossing", ambulance_vehicle="AMB-102", status="Dispatched")
        db.add(bk)
        db.commit()

    # 14. Service Master (Hospital Pricing Catalog)
    if db.query(ServiceMaster).count() == 0:
        services = [
            ServiceMaster(service_code="CONS-001", service_name="Specialist Consultation", category="Consultation", op_rate=500.0, ip_rate=500.0, unit="Per Visit", tax_rate=0.0),
            ServiceMaster(service_code="CONS-002", service_name="Follow-up Consultation", category="Consultation", op_rate=300.0, ip_rate=300.0, unit="Per Visit", tax_rate=0.0),
            ServiceMaster(service_code="CONS-003", service_name="Emergency Consultation", category="Consultation", op_rate=750.0, ip_rate=750.0, unit="Per Visit", tax_rate=0.0),
            ServiceMaster(service_code="BED-001", service_name="General Ward Bed", category="Bed", op_rate=1500.0, ip_rate=1500.0, unit="Per Day", tax_rate=0.0),
            ServiceMaster(service_code="BED-002", service_name="Cardiology Deluxe Room", category="Bed", op_rate=5000.0, ip_rate=5000.0, unit="Per Day", tax_rate=0.0),
            ServiceMaster(service_code="BED-003", service_name="ICU Bed", category="Bed", op_rate=8500.0, ip_rate=8500.0, unit="Per Day", tax_rate=0.0),
            ServiceMaster(service_code="NURS-001", service_name="Nursing Service & Care", category="Nursing", op_rate=500.0, ip_rate=500.0, unit="Per Day", tax_rate=0.0),
            ServiceMaster(service_code="LAB-001", service_name="CBC Blood Profile", category="Laboratory", op_rate=250.0, ip_rate=250.0, unit="Per Test", tax_rate=0.0),
            ServiceMaster(service_code="LAB-002", service_name="Blood Sugar Fasting", category="Laboratory", op_rate=100.0, ip_rate=100.0, unit="Per Test", tax_rate=0.0),
            ServiceMaster(service_code="LAB-003", service_name="Lipid Profile", category="Laboratory", op_rate=450.0, ip_rate=450.0, unit="Per Test", tax_rate=0.0),
            ServiceMaster(service_code="IMG-001", service_name="Chest X-Ray", category="Imaging", op_rate=400.0, ip_rate=400.0, unit="Per Scan", tax_rate=0.0),
            ServiceMaster(service_code="IMG-002", service_name="Knee MRI Scan", category="Imaging", op_rate=2500.0, ip_rate=2500.0, unit="Per Scan", tax_rate=0.0),
            ServiceMaster(service_code="PROC-001", service_name="ECG Test", category="Procedure", op_rate=300.0, ip_rate=300.0, unit="Per Test", tax_rate=0.0),
            ServiceMaster(service_code="PROC-002", service_name="Wound Dressing & Care", category="Procedure", op_rate=200.0, ip_rate=200.0, unit="Per Proc", tax_rate=0.0),
        ]
        db.add_all(services)
        db.commit()

    from hms_backend.app.services.lab_service import seed_lab_masters_if_needed
    seed_lab_masters_if_needed(db)

