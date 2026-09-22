import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, Activity, ChevronRight, CheckCircle2, UserPlus, AlertCircle, X, Download, FileText, Settings, RefreshCw, HeartPulse, Clock, Filter, CreditCard } from 'lucide-react';

const AppointmentBooking = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Step 1: Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Booking Form State
  const [department, setDepartment] = useState('Cardiology');
  const [doctor, setDoctor] = useState('Dr. Madhavan');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [appointmentType, setAppointmentType] = useState('New Consultation');
  const [priority, setPriority] = useState('Normal');
  const [reason, setReason] = useState('');
  const [referralSource, setReferralSource] = useState('Self');
  
  const [consultationFee, setConsultationFee] = useState('₹500');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  
  const [reminder, setReminder] = useState('Yes');
  const [receptionNotes, setReceptionNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [bookedTicket, setBookedTicket] = useState(null);

  const deptDoctors = {
    'Cardiology': 'Dr. Madhavan',
    'Neurology': 'Dr. S. Karthikeyan',
    'Pediatrics': 'Dr. Murugan Jeyaraman',
    'Orthopedics': 'Dr. Raj Kanna',
    'General Medicine': 'Dr. Priya Nair'
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/appointments`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSlots = async (docName, dateStr) => {
    if (!docName || !dateStr) return;
    try {
      setLoadingSlots(true);
      const url = `${API_BASE}/api/v1/appointments/available-slots?doctor=${encodeURIComponent(docName)}&date=${encodeURIComponent(dateStr)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rawSlots = data.slots || [];
        
        // Filter past time slots if booking for today
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();
        const processedSlots = rawSlots.map(s => {
          if (dateStr === todayStr) {
            // Parse start time (e.g. "09:30 AM" or "02:30 PM")
            const [timePart, modifier] = s.start_time.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const slotDate = new Date();
            slotDate.setHours(hours, minutes, 0, 0);

            if (slotDate <= now) {
              return { ...s, is_available: false, slot_label: `${s.slot_label} (Past)` };
            }
          }
          return s;
        });

        setSlots(processedSlots);
        // Auto-select first available slot if none selected
        const firstAvail = processedSlots.find(s => s.is_available);
        if (firstAvail) setSelectedSlot(firstAvail);
        else setSelectedSlot(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchSlots(doctor, appointmentDate);
  }, [doctor, appointmentDate]);

  const handlePatientSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = patients.filter(p => 
      (p.Name || p.full_name || '').toLowerCase().includes(q) ||
      (p.Phone || p.phone || '').toLowerCase().includes(q) ||
      (p['Patient ID'] || p.UHID || '').toLowerCase().includes(q)
    );
    setSearchResults(matches);
  };

  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    const defaultDoc = deptDoctors[newDept] || 'Dr. Madhavan';
    setDoctor(defaultDoc);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Please search and select an existing patient first!");
      return;
    }
    if (!selectedSlot || !selectedSlot.is_available) {
      alert("Please select an available time slot!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        "patient_id": selectedPatient.id,
        "Patient ID": selectedPatient['Patient ID'] || selectedPatient.UHID,
        "UHID": selectedPatient['Patient ID'] || selectedPatient.UHID,
        "Patient Name": selectedPatient.Name || selectedPatient.full_name,
        "Doctor": doctor,
        "Department": department,
        "Appointment Date": appointmentDate,
        "start_time": selectedSlot.start_time,
        "end_time": selectedSlot.end_time,
        "Time Slot": selectedSlot.slot_label,
        "Appointment Type": appointmentType,
        "Priority": priority,
        "Reason for Visit": reason || "Consultation",
        "Referral Source": referralSource,
        "Consultation Fee": consultationFee,
        "Payment Mode": paymentMode,
        "Payment Status": paymentStatus,
        "SMS/WhatsApp Reminder": reminder,
        "Reception Notes": receptionNotes
      };

      const res = await fetch(`${API_BASE}/api/v1/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        fetchAppointments();
        fetchSlots(doctor, appointmentDate);

        setBookedTicket({
          id: result["Appointment ID"] || "APT-2026-101",
          patientName: selectedPatient.Name || selectedPatient.full_name,
          uhid: selectedPatient['Patient ID'] || selectedPatient.UHID,
          doctor: doctor,
          department: department,
          date: appointmentDate,
          timeSlot: selectedSlot.slot_label,
          type: appointmentType,
          fee: consultationFee,
          paymentStatus: paymentStatus,
          reminder: reminder
        });
        setShowTicketModal(true);

        // Reset inputs
        setReason('');
        setReceptionNotes('');
      } else {
        const errJson = await res.json();
        alert(errJson.detail || "Error booking appointment. Time slot might be unavailable.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchAppointments();
        fetchSlots(doctor, appointmentDate);
        if (newStatus === 'Checked-In') {
          alert("Patient checked in successfully! Encounter and Queue token generated.");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || `Failed to update status to ${newStatus}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to backend server.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#052E24] to-[#087F5B] text-white p-6 rounded-3xl border border-indigo-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087F5B] font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reception Desk • Scheduling Engine
          </div>
          <h1 className="text-2xl font-bold text-[#052E24]">Doctor Appointment Booking</h1>
          <p className="text-gray-600 text-xs mt-1">
            Connect existing patients to doctor schedules with real-time slot availability, department filtering & double-booking prevention.
          </p>
        </div>
      </div>

      {/* STEP 1: Search & Select Existing Patient */}
      <div className="bg-white/80 border border-gray-200 p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#052E24] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#087F5B]" />
            Step 1: Search & Select Existing Patient *
          </h3>
          {selectedPatient && (
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Patient Selected
            </span>
          )}
        </div>

        {/* User Diagram Styled Search Bar */}
        {!selectedPatient ? (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200/80 p-4 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-gray-600">
                UHID / Patient ID / Mobile / Name
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Type UHID-..., PT-..., Mobile number, or Name..."
                    value={searchQuery}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-slate-800 rounded-xl text-sm text-[#052E24] focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePatientSearch(searchQuery)}
                  className="px-5 py-2.5 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 font-bold rounded-xl text-xs shadow transition-all"
                >
                  [ Search ]
                </button>
              </div>
            </div>

            {/* Search Results Display */}
            {searchQuery && (
              <div className="bg-gray-50/90 border border-gray-200/80 rounded-xl p-4 space-y-3">
                <div className="text-xs text-gray-500 font-medium">
                  Search Results ({searchResults.length} Patients Found)
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-amber-400 py-2">
                    No existing patient record found for "{searchQuery}". (Appointment booking requires a valid registered patient ID).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.map(p => (
                      <div key={p.id} className="bg-white border border-gray-200 p-3.5 rounded-xl text-xs space-y-1.5 hover:border-blue-500/50 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#052E24] text-sm">{p.Name || p.full_name}</span>
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 font-mono text-[10px] font-bold rounded border border-blue-800">
                            {p['Patient ID'] || p.UHID || `PAT-${p.id}`}
                          </span>
                        </div>
                        <p className="text-gray-500">📱 Mobile: {p.Phone || p.phone}</p>
                        <p className="text-gray-500">👤 Gender: {p.gender || 'Male'} • Blood: {p.blood_group || 'O+'}</p>
                        <button
                          onClick={() => { setSelectedPatient(p); setSearchQuery(''); }}
                          className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-gray-900 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow"
                        >
                          [ Select Patient ]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Selected Patient Card Display */
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-800/60 p-4 rounded-xl flex items-center justify-between text-xs text-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-base text-[#052E24]">{selectedPatient.Name || selectedPatient.full_name}</span>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded font-mono font-bold">
                  UHID: {selectedPatient['Patient ID'] || selectedPatient.UHID || `PAT-${selectedPatient.id}`}
                </span>
              </div>
              <p className="text-gray-500">📱 Mobile: {selectedPatient.Phone || selectedPatient.phone} • Email: {selectedPatient.email || 'N/A'}</p>
            </div>
            <button
              onClick={() => setSelectedPatient(null)}
              className="px-3 py-1.5 bg-white hover:bg-slate-700 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 transition-all"
            >
              Change Patient
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: Appointment Details & Schedule Picker */}
      {selectedPatient && (
        <form onSubmit={handleBookAppointment} className="bg-white/80 border border-gray-200 p-6 rounded-2xl shadow-xl space-y-6 text-xs text-slate-200">
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#052E24] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              Step 2: Department, Doctor Schedule & Available Time Slots
            </h3>
            <span className="text-gray-500 text-[11px]">Real-time Availability Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Department Selector */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Department *</label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-indigo-500 focus:outline-none"
              >
                {Object.keys(deptDoctors).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Doctor Selector (Filtered) */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Assigned Doctor (Filtered) *</label>
              <select
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-indigo-500 focus:outline-none"
              >
                {Object.values(deptDoctors).map(docName => (
                  <option key={docName} value={docName}>{docName}</option>
                ))}
              </select>
            </div>

            {/* Appointment Date Picker */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Appointment Date *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Time Slot Picker Grid */}
          <div className="bg-gray-50/90 border border-gray-200/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Available 30-Minute Working Schedule Slots for {doctor} ({appointmentDate})
              </span>
              <span className="text-[10px] text-gray-500">Green = Available • Red/Disabled = Booked</span>
            </div>

            {loadingSlots ? (
              <p className="text-gray-500 text-center py-4">Checking schedule availability...</p>
            ) : slots.length === 0 ? (
              <p className="text-amber-400 text-center py-4">No slots configured for this date.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {slots.map((s, idx) => {
                  const isSelected = selectedSlot && selectedSlot.start_time === s.start_time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!s.is_available}
                      onClick={() => setSelectedSlot(s)}
                      className={`p-2.5 rounded-xl border text-center font-mono text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                        !s.is_available
                          ? 'bg-rose-950/40 text-rose-400 border-rose-900/50 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-emerald-600 text-gray-900 border-emerald-400 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400'
                          : 'bg-white text-slate-200 border-gray-200 hover:border-emerald-500 hover:bg-slate-750'
                      }`}
                    >
                      <span>{s.start_time}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {s.is_available ? (isSelected ? 'Selected' : 'Available') : 'Booked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 3: Visit Details, Payment & Communication */}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <h4 className="font-bold text-slate-200">Step 3: Visit Metadata, Fee & Reminders</h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Appointment Type *</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="New Consultation">New Consultation</option>
                  <option value="Follow-Up">Follow-Up Consultation</option>
                  <option value="Routine Consultation">Routine Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Referral Source</label>
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Self">Self / Direct Walk-In</option>
                  <option value="Doctor">Doctor Referral</option>
                  <option value="Hospital">Hospital Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Consultation Fee (Auto)</label>
                <input
                  type="text"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Insurance">Health Insurance</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Waived">Waived</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">SMS/WhatsApp Reminder</label>
                <select
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Yes">Yes (Send Confirmation & Reminder)</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-medium">Reason for Visit *</label>
              <input
                type="text"
                required
                placeholder="Short description of patient symptoms or visit reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-medium">Receptionist Notes</label>
              <textarea
                rows="2"
                placeholder="Additional administrative notes..."
                value={receptionNotes}
                onChange={(e) => setReceptionNotes(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || !selectedSlot || !selectedSlot.is_available}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-gray-900 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
            >
              {submitting ? 'Confirming Appointment...' : 'Confirm & Schedule Appointment ➔'}
            </button>
          </div>
        </form>
      )}

      {/* APPOINTMENTS DIRECTORY TABLE */}
      <div className="bg-white/80 border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#052E24]">Scheduled Appointments List</h2>
            <p className="text-xs text-gray-500">All active appointments with status tracking & cancellation slot release</p>
          </div>
          <button 
            onClick={fetchAppointments}
            className="p-2 text-gray-500 hover:text-gray-900 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Appointment ID</th>
                <th className="py-3.5 px-4">Patient UHID</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Doctor & Dept</th>
                <th className="py-3.5 px-4">Date & Time Slot</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Fee Status</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">Loading appointments...</td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">No scheduled appointments.</td>
                </tr>
              ) : (
                appointments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#087F5B]">
                      {a['Appointment ID'] || `APT-${a.id}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {a['Patient ID'] || a.UHID || 'UHID-100'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#052E24]">
                      {a.Patient || a['Patient Name']}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div>{a.Doctor || 'Dr. Madhavan'}</div>
                      <div className="text-[10px] text-gray-500">{a.Department || 'Cardiology'}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {a['Date & Time'] || a.Time || '2026-08-25 10:00 AM'}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{a.Type || 'Consultation'}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{a['Consultation Fee'] || '₹500'}</span>
                      <span className="block text-[10px] text-emerald-400">{a['Payment Status'] || 'Paid'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        (a.Status || a['Appointment Status']) === 'Cancelled'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : (a.Status || a['Appointment Status']) === 'Completed'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : (a.Status || a['Appointment Status']) === 'Checked-In'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        {a.Status || a['Appointment Status'] || 'Scheduled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {(a.Status || a['Appointment Status']) !== 'Cancelled' && (a.Status || a['Appointment Status']) !== 'Completed' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(a.id, 'Checked-In')}
                            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-gray-900 border border-purple-500/40 rounded text-[10px]"
                          >
                            Check-In
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(a.id, 'Cancelled')}
                            className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-gray-900 border border-rose-500/40 rounded text-[10px]"
                            title="Cancel appointment and free up time slot"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TICKET CONFIRMATION MODAL */}
      {showTicketModal && bookedTicket && (
        <div className="fixed inset-0 z-50 bg-gray-100/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-[#052E24]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Appointment Confirmed
              </div>
              <button onClick={() => setShowTicketModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-slate-300 shadow-inner space-y-3 font-sans">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="font-black text-blue-900 text-sm">CITY CARE GENERAL HOSPITAL</h4>
                  <p className="text-[10px] text-slate-600">Appointment Confirmation Ticket</p>
                </div>
                <span className="font-mono font-black text-xs bg-blue-900 text-gray-900 px-2 py-1 rounded">
                  {bookedTicket.id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p><span className="text-slate-500">Patient:</span> <strong className="text-slate-900">{bookedTicket.patientName}</strong> ({bookedTicket.uhid})</p>
                <p><span className="text-slate-500">Doctor:</span> <strong className="text-emerald-900">{bookedTicket.doctor}</strong> ({bookedTicket.department})</p>
                <p><span className="text-slate-500">Scheduled Date:</span> <strong>{bookedTicket.date}</strong></p>
                <p><span className="text-slate-500">Time Slot:</span> <strong className="text-blue-900 font-mono">{bookedTicket.timeSlot}</strong></p>
                <p><span className="text-slate-500">Fee:</span> <strong>{bookedTicket.fee} ({bookedTicket.paymentStatus})</strong></p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-lg text-[10px] font-semibold text-center">
                📱 Confirmation & Reminder sent via SMS / WhatsApp
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 font-bold text-xs rounded-xl shadow"
              >
                <Printer className="w-4 h-4 inline mr-1" /> Print Ticket
              </button>
              <button
                onClick={() => setShowTicketModal(false)}
                className="px-4 py-2 bg-white text-gray-600 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
};

export default AppointmentBooking;
