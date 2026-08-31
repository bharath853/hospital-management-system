import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from hms_backend.app.models.lab import (
    LabTestMaster, LabTestParameter, LabOrder, LabOrderItem, LabSpecimen,
    LabResult, LabResultValue, LabResultAmendment, LabEventOutbox
)
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.doctor import Doctor
from hms_backend.app.core.websocket import manager

# Pre-configured Lab Test Master seed data covering all 7 sections
SEED_TEST_MASTERS = [
    {
        "test_code": "CBC",
        "test_name": "Complete Blood Count (CBC) with Differential",
        "laboratory_section": "Hematology",
        "specimen_type": "Whole Blood",
        "container_type": "EDTA tube (Lavender Top)",
        "fasting_required": False,
        "tat_minutes": 45,
        "parameters": [
            {"parameter_code": "HGB", "parameter_name": "Hemoglobin", "unit": "g/dL", "data_type": "numeric", "reference_low": 12.0, "reference_high": 17.5, "critical_low": 7.0, "critical_high": 20.0, "display_order": 1},
            {"parameter_code": "RBC", "parameter_name": "RBC Count", "unit": "million/µL", "data_type": "numeric", "reference_low": 4.2, "reference_high": 5.9, "critical_low": 2.5, "critical_high": 7.0, "display_order": 2},
            {"parameter_code": "WBC", "parameter_name": "WBC Count", "unit": "/µL", "data_type": "numeric", "reference_low": 4000.0, "reference_high": 11000.0, "critical_low": 2000.0, "critical_high": 30000.0, "display_order": 3},
            {"parameter_code": "PLT", "parameter_name": "Platelet Count", "unit": "/µL", "data_type": "numeric", "reference_low": 150000.0, "reference_high": 450000.0, "critical_low": 50000.0, "critical_high": 1000000.0, "display_order": 4},
            {"parameter_code": "HCT", "parameter_name": "Hematocrit", "unit": "%", "data_type": "numeric", "reference_low": 36.0, "reference_high": 50.0, "critical_low": 20.0, "critical_high": 60.0, "display_order": 5},
            {"parameter_code": "MCV", "parameter_name": "MCV", "unit": "fL", "data_type": "numeric", "reference_low": 80.0, "reference_high": 100.0, "critical_low": 60.0, "critical_high": 120.0, "display_order": 6},
            {"parameter_code": "MCH", "parameter_name": "MCH", "unit": "pg", "data_type": "numeric", "reference_low": 27.0, "reference_high": 34.0, "critical_low": 20.0, "critical_high": 40.0, "display_order": 7},
            {"parameter_code": "MCHC", "parameter_name": "MCHC", "unit": "g/dL", "data_type": "numeric", "reference_low": 32.0, "reference_high": 36.0, "critical_low": 28.0, "critical_high": 38.0, "display_order": 8}
        ]
    },
    {
        "test_code": "HBA1C",
        "test_name": "Glycated Hemoglobin (HbA1c)",
        "laboratory_section": "Clinical Chemistry",
        "specimen_type": "Whole Blood",
        "container_type": "EDTA tube (Lavender Top)",
        "fasting_required": False,
        "tat_minutes": 60,
        "parameters": [
            {"parameter_code": "HBA1C_PCT", "parameter_name": "HbA1c Percentage", "unit": "%", "data_type": "numeric", "reference_low": 4.0, "reference_high": 5.6, "critical_low": 3.0, "critical_high": 14.0, "display_order": 1},
            {"parameter_code": "EAG", "parameter_name": "Estimated Average Glucose (eAG)", "unit": "mg/dL", "data_type": "numeric", "reference_low": 70.0, "reference_high": 114.0, "critical_low": 50.0, "critical_high": 350.0, "display_order": 2}
        ]
    },
    {
        "test_code": "CREAT",
        "test_name": "Serum Creatinine & KFT Panel",
        "laboratory_section": "Clinical Chemistry",
        "specimen_type": "Serum",
        "container_type": "SST tube (Gold Top)",
        "fasting_required": True,
        "tat_minutes": 60,
        "parameters": [
            {"parameter_code": "CREAT", "parameter_name": "Serum Creatinine", "unit": "mg/dL", "data_type": "numeric", "reference_low": 0.6, "reference_high": 1.2, "critical_low": 0.3, "critical_high": 5.0, "display_order": 1},
            {"parameter_code": "BUN", "parameter_name": "Blood Urea Nitrogen (BUN)", "unit": "mg/dL", "data_type": "numeric", "reference_low": 7.0, "reference_high": 20.0, "critical_low": 3.0, "critical_high": 100.0, "display_order": 2},
            {"parameter_code": "EGFR", "parameter_name": "eGFR (CKD-EPI)", "unit": "mL/min/1.73m²", "data_type": "numeric", "reference_low": 90.0, "reference_high": 120.0, "critical_low": 15.0, "critical_high": 150.0, "display_order": 3}
        ]
    },
    {
        "test_code": "BCULT",
        "test_name": "Blood Culture & Sensitivity Pair",
        "laboratory_section": "Microbiology",
        "specimen_type": "Whole Blood",
        "container_type": "Blood Culture Bottle Pair (Aerobic/Anaerobic)",
        "fasting_required": False,
        "tat_minutes": 1440,
        "parameters": [
            {"parameter_code": "GROWTH", "parameter_name": "Specimen Growth Status", "unit": "", "data_type": "text", "reference_text": "No Growth after 24h", "display_order": 1},
            {"parameter_code": "ORGANISM_1", "parameter_name": "Isolated Organism 1", "unit": "", "data_type": "text", "reference_text": "None Isolated", "display_order": 2},
            {"parameter_code": "SENSITIVITY", "parameter_name": "Antibiotic Sensitivity Profile", "unit": "", "data_type": "text", "reference_text": "Not Applicable", "display_order": 3}
        ]
    },
    {
        "test_code": "ANA",
        "test_name": "Antinuclear Antibody (ANA) Screen",
        "laboratory_section": "Immunology / Serology",
        "specimen_type": "Serum",
        "container_type": "Red Top / SST tube",
        "fasting_required": False,
        "tat_minutes": 180,
        "parameters": [
            {"parameter_code": "ANA_TITER", "parameter_name": "ANA Titer (IFA)", "unit": "titer", "data_type": "text", "reference_text": "Negative (< 1:40)", "display_order": 1},
            {"parameter_code": "ANA_PATTERN", "parameter_name": "Fluorescence Staining Pattern", "unit": "", "data_type": "text", "reference_text": "None", "display_order": 2}
        ]
    },
    {
        "test_code": "BGRP",
        "test_name": "ABO & Rh(D) Blood Grouping & Crossmatch",
        "laboratory_section": "Immunohematology / Blood Bank",
        "specimen_type": "Whole Blood",
        "container_type": "EDTA tube (Pink/Lavender Top)",
        "fasting_required": False,
        "tat_minutes": 30,
        "parameters": [
            {"parameter_code": "ABO_GROUP", "parameter_name": "ABO Blood Group", "unit": "", "data_type": "text", "reference_text": "Reported Group", "display_order": 1},
            {"parameter_code": "RH_FACTOR", "parameter_name": "Rh(D) Type", "unit": "", "data_type": "text", "reference_text": "Positive / Negative", "display_order": 2},
            {"parameter_code": "CROSSMATCH", "parameter_name": "Unit Crossmatch Status", "unit": "", "data_type": "text", "reference_text": "Compatible", "display_order": 3}
        ]
    },
    {
        "test_code": "URINE",
        "test_name": "Urine Routine & Clinical Microscopy",
        "laboratory_section": "Urinalysis / Clinical Microscopy",
        "specimen_type": "Urine",
        "container_type": "Sterile Urine Cup",
        "fasting_required": False,
        "tat_minutes": 30,
        "parameters": [
            {"parameter_code": "COLOR", "parameter_name": "Color & Clarity", "unit": "", "data_type": "text", "reference_text": "Straw / Clear", "display_order": 1},
            {"parameter_code": "PH", "parameter_name": "Urine pH", "unit": "", "data_type": "numeric", "reference_low": 4.5, "reference_high": 8.0, "critical_low": 3.5, "critical_high": 9.0, "display_order": 2},
            {"parameter_code": "PROTEIN", "parameter_name": "Urine Protein", "unit": "mg/dL", "data_type": "text", "reference_text": "Negative", "display_order": 3},
            {"parameter_code": "GLUCOSE", "parameter_name": "Urine Glucose", "unit": "mg/dL", "data_type": "text", "reference_text": "Negative", "display_order": 4},
            {"parameter_code": "WBC_HPF", "parameter_name": "Pus Cells (WBC/HPF)", "unit": "/HPF", "data_type": "numeric", "reference_low": 0.0, "reference_high": 5.0, "critical_low": 0.0, "critical_high": 50.0, "display_order": 5},
            {"parameter_code": "RBC_HPF", "parameter_name": "RBC/HPF", "unit": "/HPF", "data_type": "numeric", "reference_low": 0.0, "reference_high": 2.0, "critical_low": 0.0, "critical_high": 30.0, "display_order": 6}
        ]
    },
    {
        "test_code": "PCR",
        "test_name": "Pathogen Real-Time PCR Analysis",
        "laboratory_section": "Molecular Diagnostics / Pathology",
        "specimen_type": "Nasopharyngeal Swab / Tissue",
        "container_type": "Viral Transport Medium (VTM)",
        "fasting_required": False,
        "tat_minutes": 120,
        "parameters": [
            {"parameter_code": "TARGET_DETECTED", "parameter_name": "Pathogen Target Result", "unit": "", "data_type": "text", "reference_text": "Not Detected (Negative)", "display_order": 1},
            {"parameter_code": "CT_VALUE", "parameter_name": "Cycle Threshold (Ct)", "unit": "cycles", "data_type": "numeric", "reference_low": 35.0, "reference_high": 45.0, "critical_low": 10.0, "critical_high": 34.9, "display_order": 2}
        ]
    }
]


def seed_lab_masters_if_needed(db: Session):
    existing_count = db.query(LabTestMaster).count()
    if existing_count == 0:
        for t_data in SEED_TEST_MASTERS:
            params = t_data.pop("parameters", [])
            master = LabTestMaster(**t_data)
            db.add(master)
            db.commit()
            db.refresh(master)

            for p in params:
                param_obj = LabTestParameter(test_id=master.id, **p)
                db.add(param_obj)
            db.commit()


def compute_parameter_flag(val_str: str, param: LabTestParameter) -> tuple[str, bool]:
    """Computes LOW, NORMAL, HIGH, CRITICAL_LOW, CRITICAL_HIGH flag and boolean critical state."""
    if not param or param.data_type == "text":
        return ("NORMAL", False)

    try:
        num_val = float(val_str)
    except Exception:
        return ("NORMAL", False)

    # Check Critical Ranges first
    if param.critical_low is not None and num_val < param.critical_low:
        return ("CRITICAL_LOW", True)
    if param.critical_high is not None and num_val > param.critical_high:
        return ("CRITICAL_HIGH", True)

    # Check Reference Ranges
    if param.reference_low is not None and num_val < param.reference_low:
        return ("LOW", False)
    if param.reference_high is not None and num_val > param.reference_high:
        return ("HIGH", False)

    return ("NORMAL", False)


async def emit_lab_event(db: Session, event_type: str, payload: dict, target_doctor_id: int = None, channel: str = "laboratory"):
    """Saves to outbox, dispatches via WebSocket channel, and fallback broadcasts."""
    outbox = LabEventOutbox(
        event_type=event_type,
        payload=json.dumps(payload),
        processed=True
    )
    db.add(outbox)
    db.commit()

    if target_doctor_id:
        await manager.send_to_doctor(target_doctor_id, event_type, payload)
    
    if channel:
        await manager.broadcast_to_channel(channel, event_type, payload)
