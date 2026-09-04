from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
from hms_backend.app.models.appointment import Appointment
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.queue import QueueEntry
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.doctor import Doctor
from hms_backend.app.utils.audit import log_deleted_record

router = APIRouter(prefix="/appointments", tags=["appointments"])

MASTER_WORKING_SLOTS = [
    {"start": "09:00 AM", "end": "09:30 AM"},
    {"start": "09:30 AM", "end": "10:00 AM"},
    {"start": "10:00 AM", "end": "10:30 AM"},
    {"start": "10:30 AM", "end": "11:00 AM"},
    {"start": "11:00 AM", "end": "11:30 AM"},
    {"start": "11:30 AM", "end": "12:00 PM"},
    {"start": "02:00 PM", "end": "02:30 PM"},
    {"start": "02:30 PM", "end": "03:00 PM"},
    {"start": "03:00 PM", "end": "03:30 PM"},
    {"start": "03:30 PM", "end": "04:00 PM"},
    {"start": "04:00 PM", "end": "04:30 PM"},
    {"start": "04:30 PM", "end": "05:00 PM"},
]


@router.get("/available-slots")
def get_available_slots(
    doctor: str = Query(...),
    date: str = Query(...), # YYYY-MM-DD
    db: Session = Depends(get_db)
):
    # Fetch active appointments for this doctor on this date
    booked_appts = db.query(Appointment).filter(
        Appointment.doctor_name == doctor,
        Appointment.appointment_date == date,
        Appointment.appointment_status != "Cancelled",
        Appointment.status != "Cancelled"
    ).all()

    booked_times = {a.start_time for a in booked_appts if a.start_time}

    slots = []
    for s in MASTER_WORKING_SLOTS:
        is_avail = s["start"] not in booked_times
        slots.append({
            "start_time": s["start"],
            "end_time": s["end"],
            "slot_label": f"{s['start']} - {s['end']}",
            "is_available": is_avail
        })
    return {"doctor": doctor, "date": date, "slots": slots}


@router.get("")
def list_appointments(doctor_name: str = None, db: Session = Depends(get_db)):
    appts = db.query(Appointment).filter(
        Appointment.status != "Deleted",
        Appointment.appointment_status != "Deleted"
    ).order_by(Appointment.id.desc()).all()

    from hms_backend.app.api.v1.doctor import INITIAL_APPOINTMENTS, filter_by_doctor
    from hms_backend.app.utils.generic_crud import get_generic_records
    generic_records = get_generic_records(db, "doctor_appointments", INITIAL_APPOINTMENTS)
    
    result = []
    # Include structured DB appointments
    for a in appts:
        pt_name = "Patient Record"
        pt_code = "UHID-100"
        if a.patient:
            pt_name = a.patient.full_name
            pt_code = a.patient.patient_id or a.patient.patient_code or f"PAT-{a.patient.id}"
        
        appt_dict = {
            "id": a.id,
            "Appointment ID": a.appointment_code or f"APT-{a.id:04d}",
            "Patient ID": pt_code,
            "UHID": pt_code,
            "Patient": pt_name,
            "Patient Name": pt_name,
            "Doctor": a.doctor_name or "Dr. Madhavan",
            "Department": a.department_name or "Cardiology",
            "Date": a.appointment_date or str(datetime.now().date()),
            "Date & Time": f"{a.appointment_date} {a.start_time}" if a.start_time else str(a.appointment_date),
            "Time": a.start_time or "10:00 AM",
            "start_time": a.start_time,
            "end_time": a.end_time,
            "Type": a.appointment_type or "New Consultation",
            "Priority": a.priority or "Normal",
            "Reason": a.reason or "Consultation",
            "Referral Source": a.referral_source or "Self",
            "Consultation Fee": a.consultation_fee or "₹500",
            "Payment Status": a.payment_status or "Paid",
            "Payment Mode": a.payment_mode or "Cash",
            "Status": a.appointment_status or a.status or "Scheduled",
            "Appointment Status": a.appointment_status or a.status or "Scheduled",
            "Reminder": a.reminder_status or "Yes",
            "Reception Notes": a.reception_notes or ""
        }
        result.append(appt_dict)

    # Blend with generic_records for backwards compatibility
    existing_ids = {r.get("Appointment ID") for r in result}
    for g in generic_records:
        g_code = g.get("Appointment ID") or f"APT-{g.get('id', 100):03d}"
        if g_code not in existing_ids:
            g["Appointment ID"] = g_code
            g["Patient"] = g.get("Patient") or g.get("Patient Name") or "Patient"
            g["Patient Name"] = g.get("Patient")
            g["Status"] = g.get("Status") or "Scheduled"
            g["Appointment Status"] = g.get("Status")
            result.append(g)

    return filter_by_doctor(result, doctor_name)


@router.post("")
def book_appointment(payload: dict, db: Session = Depends(get_db)):
    pid_input = payload.get("patient_id") or payload.get("Patient ID") or payload.get("UHID")
    pt = None
    if pid_input:
        pt = db.query(Patient).filter(
            (Patient.id == pid_input) if str(pid_input).isdigit() else (Patient.patient_id == str(pid_input)) | (Patient.patient_code == str(pid_input))
        ).first()

    pt_name = payload.get("Patient Name") or payload.get("Patient") or (pt.full_name if pt else "Existing Patient")
    doc_name = payload.get("Doctor") or payload.get("doctor_name") or "Dr. Madhavan"
    dept_name = payload.get("Department") or payload.get("department_name") or "Cardiology"
    
    appt_date = payload.get("Appointment Date") or payload.get("date") or str(datetime.now().date())
    start_time = payload.get("start_time") or payload.get("Time Slot") or "09:30 AM"
    end_time = payload.get("end_time") or "10:00 AM"

    # VALIDATE PAST DATE RESTRICTION
    today_date = datetime.now().date()
    try:
        booking_date = datetime.strptime(appt_date, "%Y-%m-%d").date()
        if booking_date < today_date:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot book appointment for a past date ({appt_date}). Please select today or a future date."
            )
    except ValueError:
        pass

    # CONCURRENCY & DOUBLE BOOKING PROTECTION
    existing_conflict = db.query(Appointment).filter(
        Appointment.doctor_name == doc_name,
        Appointment.appointment_date == appt_date,
        Appointment.start_time == start_time,
        Appointment.appointment_status != "Cancelled",
        Appointment.status != "Cancelled"
    ).first()

    if existing_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"Time slot {start_time} on {appt_date} for {doc_name} is already booked! Double booking is not allowed."
        )

    count = db.query(Appointment).count() + 1
    code = payload.get("Appointment ID") or f"APT-2026-{1000 + count}"

    appt_type = payload.get("Appointment Type") or payload.get("type") or "New Consultation"
    priority = payload.get("Priority") or "Normal"
    reason = payload.get("Reason for Visit") or payload.get("reason") or "Routine Consultation"
    referral = payload.get("Referral Source") or "Self"
    fee = payload.get("Consultation Fee") or "₹500"
    pay_mode = payload.get("Payment Mode") or "Cash"
    pay_status = payload.get("Payment Status") or "Paid"
    reminder = payload.get("SMS/WhatsApp Reminder") or payload.get("reminder") or "Yes"
    rec_notes = payload.get("Reception Notes") or ""

    doc_id = payload.get("doctor_id") or 1

    appt = Appointment(
        appointment_code=code,
        patient_id=pt.id if pt else 1,
        doctor_id=doc_id,
        doctor_name=doc_name,
        department_name=dept_name,
        appointment_date=appt_date,
        start_time=start_time,
        end_time=end_time,
        appointment_type=appt_type,
        priority=priority,
        reason=reason,
        referral_source=referral,
        consultation_fee=fee,
        payment_mode=pay_mode,
        payment_status=pay_status,
        status="Scheduled",
        appointment_status="Scheduled",
        reminder_status=reminder,
        reception_notes=rec_notes,
        created_by="Rajesh (Reception)"
    )

    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Sync to doctor_appointments & billing_invoices
    from hms_backend.app.utils.generic_crud import create_generic_record
    time_display = f"{appt_date} {start_time}"
    create_generic_record(db, "doctor_appointments", {
        "Time": time_display,
        "Date & Time": time_display,
        "Patient Name": pt_name,
        "Patient": pt_name,
        "Doctor": doc_name,
        "Department": dept_name,
        "Status": "Scheduled",
        "Appointment ID": code,
        "Notes": f"{appt_type}: {reason}"
    })

    create_generic_record(db, "doctor_notifications", {
        "Doctor": doc_name,
        "Patient": pt_name,
        "Message": f"📅 Appointment Scheduled: {pt_name} for {time_display} ({dept_name}).",
        "Status": "Unread"
    })

    create_generic_record(db, "billing_invoices", {
        "Invoice ID": f"INV-APT-{appt.id}",
        "Patient": pt_name,
        "Total Amount": str(fee),
        "Payment Mode": pay_mode,
        "Payment Status": pay_status,
        "Date": time_display
    })

    return {
        "id": appt.id,
        "Appointment ID": appt.appointment_code,
        "Patient ID": pt.patient_id if pt else "UHID-100",
        "Patient Name": pt_name,
        "Doctor": doc_name,
        "Department": dept_name,
        "Appointment Date": appt_date,
        "Time Slot": f"{start_time} - {end_time}",
        "start_time": start_time,
        "end_time": end_time,
        "Appointment Type": appt_type,
        "Priority": priority,
        "Reason for Visit": reason,
        "Consultation Fee": fee,
        "Payment Status": pay_status,
        "Status": "Scheduled",
        "Appointment Status": "Scheduled"
    }


@router.patch("/{appt_id}/status")
def update_appointment_status(appt_id: int, payload: dict, db: Session = Depends(get_db)):
    new_status = payload.get("status") or payload.get("Appointment Status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Missing status in body")

    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        # Check generic table
        from hms_backend.app.utils.generic_crud import update_generic_record
        return update_generic_record(db, "doctor_appointments", appt_id, {"Status": new_status})

    appt.status = new_status
    appt.appointment_status = new_status
    appt.updated_at = datetime.now(timezone.utc)
    db.commit()

    if str(new_status).lower() in ["checked-in", "checked_in", "check-in"]:
        today_str = str(datetime.now().date())
        # Check if queue entry exists
        existing_q = db.query(QueueEntry).filter(
            (QueueEntry.appointment_id == appt.id) | 
            ((QueueEntry.patient_id == appt.patient_id) & (QueueEntry.queue_date == today_str))
        ).first()

        if not existing_q:
            dept_name = appt.department_name or "Cardiology"
            dept_prefix = (dept_name[0] if dept_name else "C").upper()
            existing_count = db.query(QueueEntry).filter(QueueEntry.queue_date == today_str).count()
            token_num = f"{dept_prefix}-{15 + existing_count:03d}"
            
            waiting_ahead = db.query(QueueEntry).filter(
                QueueEntry.doctor_name == appt.doctor_name,
                QueueEntry.queue_date == today_str,
                QueueEntry.queue_status.in_(["WAITING", "CHECKED_IN", "RECALLED"])
            ).count()
            position = waiting_ahead + 1
            est_wait = f"{max(5, (position - 1) * 10)} min"
            checkin_time_str = datetime.now().strftime("%I:%M %p")
            ts_suffix = str(int(datetime.now().timestamp() * 1000))[-8:]

            assigned_doc_id = appt.doctor_id or 1

            # Create Encounter
            encounter = Encounter(
                encounter_code=f"ENC-2026-{ts_suffix}",
                patient_id=appt.patient_id,
                appointment_id=appt.id,
                assigned_doctor_id=assigned_doc_id,
                doctor_id=assigned_doc_id,
                encounter_type="OP",
                status="CHECKED_IN",
                doctor_name=appt.doctor_name,
                department_name=appt.department_name,
                priority=appt.priority or "Normal",
                check_in_time=datetime.now(timezone.utc)
            )
            db.add(encounter)

            # Create Queue Entry
            q_entry = QueueEntry(
                queue_code=f"Q-2026-{ts_suffix[-6:]}",
                appointment_id=appt.id,
                patient_id=appt.patient_id,
                doctor_name=appt.doctor_name,
                department_name=appt.department_name,
                queue_date=today_str,
                token_number=token_num,
                queue_type="Appointment",
                priority=appt.priority or "Normal",
                priority_rank=3,
                check_in_time=checkin_time_str,
                queue_position=position,
                estimated_wait_time=est_wait,
                queue_status="CHECKED_IN",
                nursing_status="WAITING",
                vitals_recorded=False,
                consultation_room="Room 204",
                created_by="Receptionist"
            )
            db.add(q_entry)
            db.commit()

            # Sync to generic table
            from hms_backend.app.utils.generic_crud import create_generic_record
            pt_name = appt.patient.full_name if appt.patient else "Arun Kumar"
            create_generic_record(db, "reception_queue", {
                "Token No": token_num,
                "Patient": pt_name,
                "Doctor": appt.doctor_name,
                "Est. Time": est_wait,
                "Status": "WAITING",
                "Room": "Room 204"
            })

    return {"status": "success", "message": f"Appointment #{appt_id} status updated to {new_status}."}


@router.delete("/{appt_id}")
def delete_appointment(appt_id: int, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")

    deleted_info = {
        "id": a.id,
        "appointment_code": a.appointment_code,
        "status": "Deleted",
        "notes": a.notes
    }
    log_deleted_record(db, "Appointment", a.id, deleted_info)

    a.status = "Deleted"
    a.appointment_status = "Deleted"
    db.commit()
    return {"status": "success", "message": f"Appointment #{appt_id} marked as deleted in DB and saved in deleted_records table."}

