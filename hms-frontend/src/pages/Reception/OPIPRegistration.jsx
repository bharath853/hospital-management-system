import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Calendar, Activity, ChevronRight, CheckCircle2, UserPlus, AlertCircle, X, Download, FileText, Settings, RefreshCw, HeartPulse, Clock, Filter, CreditCard } from 'lucide-react';

const OPIPRegistration = () => {
  const [activeTab, setActiveTab] = useState('OP'); // 'OP' or 'IP'

  // Common Search & Patient State
  const [searchQuery, setSearchQuery] = useState('');
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // OP Form State
  const [opVisitsList, setOpVisitsList] = useState([]);
  const [opVisitType, setOpVisitType] = useState('New Visit');
  const [opDepartment, setOpDepartment] = useState('Cardiology');
  const [opDoctor, setOpDoctor] = useState('Dr. Madhavan');
  const [opComplaint, setOpComplaint] = useState('Chest discomfort and fatigue');
  const [opReferral, setOpReferral] = useState('Self');
  const [opFee, setOpFee] = useState('₹500');
  const [opPaymentMode, setOpPaymentMode] = useState('Cash');
  const [opPaymentStatus, setOpPaymentStatus] = useState('Paid');
  const [showOpSlipModal, setShowOpSlipModal] = useState(false);
  const [registeredOpVisit, setRegisteredOpVisit] = useState(null);

  // IP Form State
  const [ipAdmissionsList, setIpAdmissionsList] = useState([]);
  const [ipAdmissionType, setIpAdmissionType] = useState('Elective');
  const [ipAdmissionSource, setIpAdmissionSource] = useState('OP Consultation');
  const [ipDepartment, setIpDepartment] = useState('General Medicine');
  const [ipDoctor, setIpDoctor] = useState('Dr. Madhavan');
  const [ipDiagnosis, setIpDiagnosis] = useState('Severe Acute Medical Care Required');
  const [ipReason, setIpReason] = useState('Inpatient Monitoring and IV Medication');
  const [ipInsuranceProvider, setIpInsuranceProvider] = useState('Star Health Insurance');
  const [ipPolicyNumber, setIpPolicyNumber] = useState('POL-2026-9901');
  const [ipDepositAmount, setIpDepositAmount] = useState('₹10,000');
  const [ipPaymentStatus, setIpPaymentStatus] = useState('Paid');

  // Bed Matrix & Bed Allocation State
  const [bedMatrix, setBedMatrix] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null); // { id, bed_number, room_number, ward_name, bed_type, daily_rate }

  const [submitting, setSubmitting] = useState(false);
  const [showIpSlipModal, setShowIpSlipModal] = useState(false);
  const [registeredIpAdmission, setRegisteredIpAdmission] = useState(null);

  const deptDoctors = {
    'Cardiology': 'Dr. Madhavan',
    'Neurology': 'Dr. S. Karthikeyan',
    'Pediatrics': 'Dr. Murugan Jeyaraman',
    'Orthopedics': 'Dr. Raj Kanna',
    'General Medicine': 'Dr. Priya Nair'
  };

  const fetchOPVisits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/reception/op-visits`);
      if (res.ok) setOpVisitsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIPAdmissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/reception/ip-admissions`);
      if (res.ok) setIpAdmissionsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBedMatrix = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/reception/bed-matrix`);
      if (res.ok) {
        const matrix = await res.json();
        setBedMatrix(matrix);
        if (matrix.length > 0 && !selectedWard) {
          setSelectedWard(matrix[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/patients`);
      if (res.ok) setPatientsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOPVisits();
    fetchIPAdmissions();
    fetchBedMatrix();
    fetchPatients();
  }, []);

  const handlePatientSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSelectedPatient(null);
      return;
    }
    const q = query.toLowerCase();
    const ptMatch = patientsList.find(p => 
      (p.Name || p.full_name || '').toLowerCase().includes(q) ||
      (p.Phone || p.phone || '').toLowerCase().includes(q) ||
      (p['Patient ID'] || p.UHID || p.patient_id || '').toLowerCase().includes(q)
    );
    if (ptMatch) {
      setSelectedPatient({
        id: ptMatch.id,
        uhid: ptMatch['Patient ID'] || ptMatch.UHID || ptMatch.patient_id || `PAT-${ptMatch.id}`,
        name: ptMatch.Name || ptMatch.full_name,
        age: ptMatch.Age || ptMatch.age || '32',
        gender: ptMatch.Gender || ptMatch.gender || 'Male',
        mobile: ptMatch.Phone || ptMatch.phone || '+91 98765 43210'
      });
    } else {
      setSelectedPatient(null);
    }
  };

  const handleOpSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        "patient_id": selectedPatient?.id || 1,
        "UHID": selectedPatient?.uhid || "PAT-2001",
        "Patient Name": selectedPatient?.name || searchQuery || "Aarav Kumar",
        "Doctor": opDoctor,
        "Department": opDepartment,
        "Visit Type": opVisitType,
        "Chief Complaint": opComplaint,
        "Referral Source": opReferral,
        "Consultation Fee": opFee,
        "Payment Mode": opPaymentMode,
        "Payment Status": opPaymentStatus
      };

      const res = await fetch(`${API_BASE}/api/v1/reception/op-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        fetchOPVisits();
        setRegisteredOpVisit(result);
        setShowOpSlipModal(true);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create OP Visit record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIpSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBed) {
      alert("Please select an AVAILABLE bed from the visual Bed Allocation grid!");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        "patient_id": selectedPatient?.id || 1,
        "UHID": selectedPatient?.uhid || "PAT-2001",
        "Patient Name": selectedPatient?.name || searchQuery || "Tanvi",
        "Admitting Doctor": ipDoctor,
        "Department": ipDepartment,
        "Admission Type": ipAdmissionType,
        "Admission Source": ipAdmissionSource,
        "Provisional Diagnosis": ipDiagnosis,
        "Reason for Admission": ipReason,
        "Ward": selectedWard?.ward_name || "General Medicine Ward",
        "Room": selectedBed.room_number,
        "Bed ID": selectedBed.id,
        "Bed Number": selectedBed.bed_number,
        "Insurance Provider": ipInsuranceProvider,
        "Policy Number": ipPolicyNumber,
        "Deposit Amount": ipDepositAmount,
        "Payment Status": ipPaymentStatus
      };

      const res = await fetch(`${API_BASE}/api/v1/reception/ip-admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        fetchIPAdmissions();
        fetchBedMatrix();
        setRegisteredIpAdmission(result);
        setShowIpSlipModal(true);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to process IP Admission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischargePatient = async (admissionId) => {
    if (!window.confirm("Confirm discharge for this patient and release allocated bed?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/reception/ip-admissions/${admissionId}/discharge`, {
        method: 'PATCH'
      });
      if (res.ok) {
        fetchIPAdmissions();
        fetchBedMatrix();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#052E24] to-[#087F5B] text-white p-6 rounded-3xl border border-indigo-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-700 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            Reception Desk • OP / IP Registration
          </div>
          <h1 className="text-2xl font-bold text-[#052E24]">Outpatient Encounters & Inpatient Admission Module</h1>
          <p className="text-gray-600 text-xs mt-1">
            Register OP consultation encounters or admit patients into wards with real-time interactive bed matrix allocation.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/80">
          <button
            onClick={() => setActiveTab('OP')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'OP'
                ? 'bg-[#087F5B] text-gray-900 shadow-lg shadow-blue-900/40'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Outpatient (OP) Registration
          </button>
          <button
            onClick={() => setActiveTab('IP')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'IP'
                ? 'bg-emerald-600 text-gray-900 shadow-lg shadow-emerald-900/40'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Inpatient (IP) Bed Allocation
          </button>
        </div>
      </div>

      {/* Patient Search Card */}
      <div className="bg-white/90 border border-gray-200 p-5 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#052E24] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#087F5B]" />
            Patient Lookup (Auto-populates Demographic Details)
          </h3>
          {selectedPatient && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
              Patient Verified ✓
            </span>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Type UHID (PAT-...), Name, or Mobile Number..."
            value={searchQuery}
            onChange={(e) => handlePatientSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs text-[#052E24] font-mono focus:border-blue-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
        </div>

        {selectedPatient ? (
          <div className="bg-gradient-to-r from-slate-950 to-blue-950 border border-blue-800/60 p-4 rounded-xl text-xs grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-200">
            <div>
              <span className="text-gray-500 text-[10px] block">Patient Name</span>
              <span className="font-bold text-[#052E24] text-sm">{selectedPatient.name}</span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] block">UHID / Patient ID</span>
              <span className="font-mono font-bold text-[#087F5B]">{selectedPatient.uhid}</span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] block">Age / Gender</span>
              <span className="font-semibold">{selectedPatient.age} yrs / {selectedPatient.gender}</span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] block">Mobile Number</span>
              <span className="font-mono text-emerald-400">{selectedPatient.mobile}</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-500">
            * Search existing patient records or leave blank for quick registration.
          </p>
        )}
      </div>

      {/* TAB 1: OUTPATIENT (OP) REGISTRATION */}
      {activeTab === 'OP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* OP Registration Form */}
          <div className="lg:col-span-1 bg-white/90 border border-gray-200 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-base font-bold text-[#052E24] flex items-center gap-2 border-b border-gray-200 pb-3">
              <UserCheck className="w-4 h-4 text-[#087F5B]" />
              New OP Encounter Registration
            </h3>

            <form onSubmit={handleOpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Visit Type *</label>
                <select
                  value={opVisitType}
                  onChange={(e) => setOpVisitType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="New Visit">New Visit (Routine OP)</option>
                  <option value="Follow-up Visit">Follow-up Visit</option>
                  <option value="Consultation">Specialist Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Department *</label>
                <select
                  value={opDepartment}
                  onChange={(e) => { setOpDepartment(e.target.value); setOpDoctor(deptDoctors[e.target.value] || 'Dr. Madhavan'); }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  {Object.keys(deptDoctors).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Attending Doctor *</label>
                <select
                  value={opDoctor}
                  onChange={(e) => setOpDoctor(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  {Object.values(deptDoctors).map(doc => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Chief Complaint *</label>
                <textarea
                  rows="2"
                  value={opComplaint}
                  onChange={(e) => setOpComplaint(e.target.value)}
                  placeholder="Describe chief complaint or symptoms..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Referral Source</label>
                <select
                  value={opReferral}
                  onChange={(e) => setOpReferral(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Self">Self / Direct Walk-in</option>
                  <option value="Doctor">Referred by Doctor</option>
                  <option value="Hospital">Referred by Hospital</option>
                  <option value="Other">Other Source</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Consultation Fee</label>
                  <input
                    type="text"
                    value={opFee}
                    onChange={(e) => setOpFee(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Payment Mode</label>
                  <select
                    value={opPaymentMode}
                    onChange={(e) => setOpPaymentMode(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Insurance">Insurance</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-gray-900 font-bold rounded-xl shadow-lg transition-all"
              >
                {submitting ? 'Registering...' : 'Register OP Encounter ➔'}
              </button>
            </form>
          </div>

          {/* OP Encounters List Table */}
          <div className="lg:col-span-2 bg-white/80 border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#052E24]">Registered OP Encounters</h3>
                <p className="text-xs text-gray-500">Outpatient clinical visits registered today</p>
              </div>
              <button onClick={fetchOPVisits} className="p-2 text-gray-500 hover:text-gray-900 bg-slate-700/50 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Visit ID</th>
                    <th className="py-3.5 px-4">UHID</th>
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">Doctor & Dept</th>
                    <th className="py-3.5 px-4">Chief Complaint</th>
                    <th className="py-3.5 px-4">Fee</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {opVisitsList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#087F5B]">{v['OP Visit ID']}</td>
                      <td className="py-3 px-4 font-mono">{v.UHID}</td>
                      <td className="py-3 px-4 font-semibold text-[#052E24]">{v['Patient Name']}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{v.Doctor}</div>
                        <div className="text-[10px] text-gray-500">{v.Department}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{v['Chief Complaint']}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{v.Fee}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {v.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INPATIENT (IP) ADMISSION & INTERACTIVE BED ALLOCATION */}
      {activeTab === 'IP' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* IP Admission Details Form */}
            <div className="lg:col-span-1 bg-white/90 border border-gray-200 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
              <h3 className="text-base font-bold text-[#052E24] flex items-center gap-2 border-b border-gray-200 pb-3">
                <BedDouble className="w-4 h-4 text-emerald-400" />
                IP Patient Admission Form
              </h3>

              <form onSubmit={handleIpSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Admission Type *</label>
                    <select
                      value={ipAdmissionType}
                      onChange={(e) => setIpAdmissionType(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                    >
                      <option value="Elective">Elective Admission</option>
                      <option value="Emergency">Emergency Admission</option>
                      <option value="Transfer">Transfer from Ward</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Admission Source *</label>
                    <select
                      value={ipAdmissionSource}
                      onChange={(e) => setIpAdmissionSource(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                    >
                      <option value="OP Consultation">OP Consultation</option>
                      <option value="Emergency Department">Emergency Dept</option>
                      <option value="Direct Admission">Direct Admission</option>
                      <option value="Referral Hospital">Referral Hospital</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Department *</label>
                    <select
                      value={ipDepartment}
                      onChange={(e) => { setIpDepartment(e.target.value); setIpDoctor(deptDoctors[e.target.value] || 'Dr. Madhavan'); }}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                    >
                      {Object.keys(deptDoctors).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Admitting Doctor *</label>
                    <select
                      value={ipDoctor}
                      onChange={(e) => setIpDoctor(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                    >
                      {Object.values(deptDoctors).map(doc => (
                        <option key={doc} value={doc}>{doc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Provisional Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={ipDiagnosis}
                    onChange={(e) => setIpDiagnosis(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Reason for Admission</label>
                  <textarea
                    rows="2"
                    value={ipReason}
                    onChange={(e) => setIpReason(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                  />
                </div>

                {/* Selected Bed Highlight Card */}
                {selectedBed ? (
                  <div className="bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-700/70 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Selected Bed Allocated ✓</span>
                    <div className="flex justify-between font-bold text-[#052E24]">
                      <span>{selectedWard?.ward_name} ({selectedBed.room_number})</span>
                      <span className="font-mono text-emerald-300">{selectedBed.bed_number}</span>
                    </div>
                    <p className="text-gray-600 text-[11px]">Type: {selectedBed.bed_type} • Rate: {selectedBed.daily_rate}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-[11px]">
                    * Select an AVAILABLE bed from the visual Bed Grid on the right!
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Initial Deposit</label>
                    <input
                      type="text"
                      value={ipDepositAmount}
                      onChange={(e) => setIpDepositAmount(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Insurance Provider</label>
                    <input
                      type="text"
                      value={ipInsuranceProvider}
                      onChange={(e) => setIpInsuranceProvider(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedBed}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-gray-900 font-bold rounded-xl shadow-lg transition-all"
                >
                  {submitting ? 'Admitting...' : 'Confirm IP Admission & Bed Allocation ➔'}
                </button>
              </form>
            </div>

            {/* INTERACTIVE VISUAL BED MATRIX GRID */}
            <div className="lg:col-span-2 bg-white/80 border border-gray-200 rounded-2xl shadow-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#052E24] flex items-center gap-2">
                    <Bed className="w-4 h-4 text-emerald-400" />
                    Interactive Bed Matrix & Room Availability Map
                  </h3>
                  <p className="text-xs text-gray-500">Green = Available 🟢 (Click to select), Red = Occupied 🔴</p>
                </div>
                <button onClick={fetchBedMatrix} className="p-2 text-gray-500 hover:text-gray-900 bg-slate-700/50 rounded-xl">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Ward Selector Tabs */}
              <div className="flex flex-wrap gap-2">
                {bedMatrix.map((ward) => (
                  <button
                    key={ward.id}
                    onClick={() => setSelectedWard(ward)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedWard?.id === ward.id
                        ? 'bg-[#087F5B] text-gray-900 border-blue-500 shadow-md'
                        : 'bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-slate-700'
                    }`}
                  >
                    {ward.ward_name} ({ward.total_beds - ward.occupied_beds} Available)
                  </button>
                ))}
              </div>

              {/* Rooms & Bed Grid Display */}
              {selectedWard && (
                <div className="space-y-4 pt-2">
                  <div className="bg-gray-50/90 border border-gray-200 p-4 rounded-xl flex items-center justify-between text-xs text-gray-600">
                    <div>
                      <span className="font-bold text-[#052E24]">{selectedWard.ward_name}</span>
                      <span className="text-gray-500 ml-2">({selectedWard.ward_type} • Nurse In-Charge: {selectedWard.nurse_in_charge})</span>
                    </div>
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-emerald-400 font-bold">🟢 {selectedWard.total_beds - selectedWard.occupied_beds} Available</span>
                      <span className="text-rose-400 font-bold">🔴 {selectedWard.occupied_beds} Occupied</span>
                    </div>
                  </div>

                  {selectedWard.rooms.map((room) => (
                    <div key={room.room_number} className="bg-gray-50/60 border border-gray-200/80 p-4 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-blue-300 font-mono">{room.room_number}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {room.beds.map((b) => {
                          const isOccupied = b.status === 'Occupied';
                          const isSelected = selectedBed?.id === b.id;

                          return (
                            <button
                              key={b.id}
                              disabled={isOccupied}
                              onClick={() => setSelectedBed({ ...b, ward_name: selectedWard.ward_name })}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                isOccupied
                                  ? 'bg-rose-950/40 border-rose-800/60 opacity-65 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-emerald-600 text-gray-900 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg'
                                  : 'bg-white hover:bg-slate-700 border-gray-200 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-xs">{b.bed_number}</span>
                                <span className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1">{b.bed_type}</div>
                              <div className="text-[10px] font-mono mt-0.5 text-gray-600">
                                {isOccupied ? `Pt: ${b.current_patient || 'Admitted'}` : b.daily_rate}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active IP Admissions Table */}
          <div className="bg-white/80 border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#052E24]">Current Inpatient (IP) Admissions</h3>
                <p className="text-xs text-gray-500">Patients currently admitted in hospital wards</p>
              </div>
              <button onClick={fetchIPAdmissions} className="p-2 text-gray-500 hover:text-gray-900 bg-slate-700/50 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Admission ID</th>
                    <th className="py-3.5 px-4">UHID</th>
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">Admitting Doctor</th>
                    <th className="py-3.5 px-4">Ward / Room / Bed</th>
                    <th className="py-3.5 px-4">Diagnosis</th>
                    <th className="py-3.5 px-4">Deposit</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {ipAdmissionsList.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{adm['IP Admission ID']}</td>
                      <td className="py-3 px-4 font-mono">{adm.UHID}</td>
                      <td className="py-3 px-4 font-semibold text-[#052E24]">{adm['Patient Name']}</td>
                      <td className="py-3 px-4">{adm['Admitting Doctor']}</td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-blue-300">{adm.Ward}</div>
                        <div className="text-[10px] text-gray-500">{adm.Room} - {adm['Bed Number']}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{adm.Diagnosis}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{adm['Deposit Amount']}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          adm.Status === 'Discharged'
                            ? 'bg-white text-gray-500 border border-gray-200'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {adm.Status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {adm.Status !== 'Discharged' && (
                          <button
                            onClick={() => handleDischargePatient(adm.id)}
                            className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Discharge & Release Bed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OP SLIP MODAL */}
      {showOpSlipModal && registeredOpVisit && (
        <div className="fixed inset-0 z-50 bg-gray-100/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#052E24]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-[#087F5B] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                OP Encounter Registered
              </div>
              <button onClick={() => setShowOpSlipModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-5 rounded-2xl space-y-3 font-sans">
              <div className="text-center border-b pb-2">
                <h4 className="font-black text-blue-900 text-sm">CITY CARE GENERAL HOSPITAL</h4>
                <p className="text-[10px] text-slate-600 font-bold">OUTPATIENT ENCOUNTER SLIP</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500 block text-[10px]">Visit ID</span><span className="font-mono font-bold text-blue-900">{registeredOpVisit['OP Visit ID']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">UHID</span><span className="font-mono font-bold">{registeredOpVisit.UHID}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Patient Name</span><span className="font-bold">{registeredOpVisit['Patient Name']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Doctor</span><span className="font-bold">{registeredOpVisit.Doctor}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Visit Type</span><span>{registeredOpVisit['Visit Type']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Fee Paid</span><span className="font-mono font-bold text-emerald-600">{registeredOpVisit.Fee}</span></div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 font-bold text-xs rounded-xl shadow">
                <Printer className="w-4 h-4 inline mr-1" /> Print Slip
              </button>
              <button onClick={() => setShowOpSlipModal(false)} className="px-4 py-2 bg-white text-gray-600 font-bold text-xs rounded-xl">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* IP ADMISSION SLIP MODAL */}
      {showIpSlipModal && registeredIpAdmission && (
        <div className="fixed inset-0 z-50 bg-gray-100/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#052E24]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                IP Admission Confirmed
              </div>
              <button onClick={() => setShowIpSlipModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-5 rounded-2xl space-y-3 font-sans">
              <div className="text-center border-b pb-2">
                <h4 className="font-black text-emerald-900 text-sm">CITY CARE GENERAL HOSPITAL</h4>
                <p className="text-[10px] text-slate-600 font-bold">INPATIENT ADMISSION CARD</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500 block text-[10px]">Admission ID</span><span className="font-mono font-bold text-emerald-700">{registeredIpAdmission['IP Admission ID']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">UHID</span><span className="font-mono font-bold">{registeredIpAdmission.UHID}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Patient Name</span><span className="font-bold">{registeredIpAdmission['Patient Name']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Admitting Doctor</span><span className="font-bold">{registeredIpAdmission['Admitting Doctor']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Ward / Room</span><span className="font-bold text-blue-900">{registeredIpAdmission.Ward} ({registeredIpAdmission.Room})</span></div>
                <div><span className="text-slate-500 block text-[10px]">Bed Number</span><span className="font-mono font-black text-emerald-600 text-sm">{registeredIpAdmission['Bed Number']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Deposit Amount</span><span className="font-mono font-bold text-emerald-600">{registeredIpAdmission['Deposit Amount']}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Status</span><span className="font-bold text-emerald-700">{registeredIpAdmission.Status}</span></div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-900 font-bold text-xs rounded-xl shadow">
                <Printer className="w-4 h-4 inline mr-1" /> Print Card
              </button>
              <button onClick={() => setShowIpSlipModal(false)} className="px-4 py-2 bg-white text-gray-600 font-bold text-xs rounded-xl">Done</button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
};

export default OPIPRegistration;
