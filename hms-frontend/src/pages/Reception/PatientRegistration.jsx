import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, Activity, ChevronRight, CheckCircle2, UserPlus, AlertCircle, X, Download, FileText, Settings, RefreshCw, HeartPulse, Clock, Filter, CreditCard } from 'lucide-react';

const PatientRegistration = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegModal, setShowRegModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [activeSlip, setActiveSlip] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const COUNTRY_CODES = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵' }
  ];

  // Form State
  const initialForm = {
    full_name: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'O+',
    country_code: '+91',
    phone: '',
    email: '',
    address: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    department: 'Cardiology',
    doctor: 'Dr. Madhavan',
    visit_type: 'New Consultation',
    chief_complaint: '',
    emergency_contact_name: '',
    emergency_relationship: 'Parent',
    emergency_country_code: '+91',
    emergency_contact_phone: '',
    registration_fee: '₹500',
    payment_mode: 'Cash',
    payment_status: 'Paid'
  };

  const [formData, setFormData] = useState(initialForm);

  const deptDoctors = {
    'Cardiology': 'Dr. Madhavan',
    'Neurology': 'Dr. S. Karthikeyan',
    'Pediatrics': 'Dr. Murugan Jeyaraman',
    'Orthopedics': 'Dr. Raj Kanna',
    'General Medicine': 'Dr. Priya Nair'
  };

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} Yrs` : '';
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (e) {
      console.error("Failed to load patients:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDepartmentChange = (dept) => {
    const defaultDoc = deptDoctors[dept] || 'Dr. Madhavan';
    setFormData(prev => ({ ...prev, department: dept, doctor: defaultDoc }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => 
      (p.Name || p.full_name || '').toLowerCase().includes(q) ||
      (p.Phone || p.phone || '').toLowerCase().includes(q) ||
      (p['Patient ID'] || p.UHID || '').toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      alert("Full Name and Mobile Number are required!");
      return;
    }

    const fullPhone = formData.phone.startsWith('+') ? formData.phone : `${formData.country_code || '+91'} ${formData.phone.trim()}`;
    const fullEmergencyPhone = formData.emergency_contact_phone ? (
      formData.emergency_contact_phone.startsWith('+') ? formData.emergency_contact_phone : `${formData.emergency_country_code || '+91'} ${formData.emergency_contact_phone.trim()}`
    ) : '';

    const submissionData = {
      ...formData,
      phone: fullPhone,
      emergency_contact_phone: fullEmergencyPhone
    };

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/v1/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        const result = await res.json();
        setShowRegModal(false);
        setFormData(initialForm);
        fetchPatients();
        
        // Show Registration Slip
        setActiveSlip({
          uhid: result.UHID || result['Patient ID'],
          name: result.Name || formData.full_name,
          ageGender: `${calculateAge(formData.date_of_birth) || '30 Yrs'} / ${formData.gender}`,
          phone: result.Phone || formData.phone,
          bloodGroup: formData.blood_group,
          department: formData.department,
          doctor: formData.doctor,
          tokenNo: result['Token No'] || 'TK-01',
          visitType: formData.visit_type,
          chiefComplaint: formData.chief_complaint || 'General Checkup',
          registrationFee: formData.registration_fee,
          paymentMode: formData.payment_mode,
          paymentStatus: formData.payment_status,
          date: new Date().toLocaleString()
        });
        setShowSlipModal(true);
      } else {
        alert("Error registering patient. Please check inputs.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVisitForExisting = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...initialForm,
      full_name: patient.Name || patient.full_name || '',
      phone: patient.Phone || patient.phone || '',
      email: patient.email || '',
      gender: patient.gender || 'Male',
      blood_group: patient.blood_group || 'O+',
      visit_type: 'Follow-Up'
    }));
    setShowVisitModal(true);
  };

  const handleSubmitExistingVisit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        UHID: selectedPatient['Patient ID'] || selectedPatient.UHID,
        full_name: selectedPatient.Name || selectedPatient.full_name,
        phone: selectedPatient.Phone || selectedPatient.phone
      };
      
      const res = await fetch(`${API_BASE}/api/v1/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setShowVisitModal(false);
        fetchPatients();

        setActiveSlip({
          uhid: selectedPatient['Patient ID'] || selectedPatient.UHID,
          name: selectedPatient.Name || selectedPatient.full_name,
          ageGender: `${calculateAge(formData.date_of_birth) || 'Adult'} / ${formData.gender}`,
          phone: selectedPatient.Phone || selectedPatient.phone,
          bloodGroup: formData.blood_group,
          department: formData.department,
          doctor: formData.doctor,
          tokenNo: result['Token No'] || 'TK-02',
          visitType: formData.visit_type,
          chiefComplaint: formData.chief_complaint || 'Follow-Up Visit',
          registrationFee: formData.registration_fee,
          paymentMode: formData.payment_mode,
          paymentStatus: formData.payment_status,
          date: new Date().toLocaleString()
        });
        setShowSlipModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-3xl border border-blue-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087F5B] font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reception Desk • OP Workflow
          </div>
          <h1 className="text-2xl font-bold text-[#052E24]">Patient Registration & Visit Booking</h1>
          <p className="text-gray-600 text-xs mt-1">
            Register new patients with auto-UHID, contact details, emergency info & OPD queue tokens.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setFormData(initialForm); setShowRegModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-gray-900 font-bold rounded-2xl text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" />
            New Patient Registration
          </button>
        </div>
      </div>

      {/* Step 1: Search Existing Patient Flowchart Box */}
      <div className="bg-white/80 border border-gray-200 p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#087F5B]" />
              Search Existing Patient Database
            </h3>
            <p className="text-xs text-gray-500">Search by Name, Mobile Number, or Patient UHID before registering a new record.</p>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Type Patient Name, Mobile (+91...), or UHID-..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#052E24] focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-900 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Results / Flowchart Indicator */}
        {searchQuery && (
          <div className="mt-3 bg-gray-50/90 border border-gray-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-slate-800">
              <span>Matching Patient Search Results ({filteredPatients.length} Found)</span>
              {filteredPatients.length === 0 && <span className="text-amber-400 font-semibold">Patient Not Found ➔ Proceed to Register New Patient</span>}
            </div>

            {filteredPatients.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-gray-600">No patient found matching <span className="text-[#087F5B] font-mono">"{searchQuery}"</span></p>
                <button
                  onClick={() => {
                    setFormData({ ...initialForm, full_name: searchQuery, phone: searchQuery.match(/^\+?\d+$/) ? searchQuery : '' });
                    setShowRegModal(true);
                  }}
                  className="px-4 py-2 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 font-semibold text-xs rounded-xl transition-all shadow-md"
                >
                  ➕ Register New Patient with "{searchQuery}"
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                {filteredPatients.map(pt => (
                  <div key={pt.id} className="bg-white/90 border border-gray-200/70 hover:border-blue-500/50 p-3.5 rounded-xl space-y-2 text-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#052E24] text-sm">{pt.Name || pt.full_name}</span>
                      <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/50 rounded font-mono text-[11px] font-bold">
                        {pt['Patient ID'] || pt.UHID || `PAT-${pt.id}`}
                      </span>
                    </div>
                    <div className="text-gray-500 space-y-0.5">
                      <p>📱 Phone: {pt.Phone || pt.phone}</p>
                      <p>🩺 Assigned Doc: {pt.Doctor || 'Dr. Madhavan'}</p>
                    </div>
                    <button
                      onClick={() => handleCreateVisitForExisting(pt)}
                      className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-gray-900 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create New Visit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Directory Table */}
      <div className="bg-white/80 border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#052E24]">Registered Patient Records</h2>
            <p className="text-xs text-gray-500">Total active patient records with registration details & visit status</p>
          </div>
          <button 
            onClick={fetchPatients}
            className="p-2 text-gray-500 hover:text-gray-900 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Patient UHID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Mobile Number</th>
                <th className="py-3.5 px-4">Doctor Assigned</th>
                <th className="py-3.5 px-4">Chief Complaint / Disease</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">Loading registered patient records...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">No patient records found. Click "New Patient Registration" to add.</td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#087F5B]">
                      {p['Patient ID'] || p.UHID || `PAT-${p.id}`}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#052E24]">
                      {p.Name || p.full_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{p.Phone || p.phone}</td>
                    <td className="py-3 px-4 text-gray-600">{p.Doctor || 'Dr. Madhavan'}</td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{p.Disease || 'General Consultation'}</td>
                    <td className="py-3 px-4 text-gray-500">{p['Registered Date'] || '2026-08-25'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {p.Status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleCreateVisitForExisting(p)}
                        className="px-2.5 py-1 bg-[#087F5B]/30 hover:bg-[#087F5B] text-blue-300 hover:text-gray-900 border border-blue-500/40 rounded-lg text-[11px] font-medium transition-all"
                      >
                        ➕ Visit
                      </button>
                      <button
                        onClick={() => {
                          setActiveSlip({
                            uhid: p['Patient ID'] || p.UHID || `UHID-${p.id}`,
                            name: p.Name || p.full_name,
                            ageGender: `${p.gender || 'Adult'}`,
                            phone: p.Phone || p.phone,
                            bloodGroup: p.blood_group || 'O+',
                            department: 'General OPD',
                            doctor: p.Doctor || 'Dr. Madhavan',
                            tokenNo: 'TK-01',
                            visitType: 'Outpatient Consultation',
                            chiefComplaint: p.Disease || 'General Consultation',
                            registrationFee: '₹500',
                            paymentMode: 'Cash',
                            paymentStatus: 'Paid',
                            date: p['Registered Date'] || '2026-08-25'
                          });
                          setShowSlipModal(true);
                        }}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-medium transition-all"
                      >
                        📇 UHID Card
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL PATIENT REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-gray-100/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 border-b border-gray-200 flex items-center justify-between text-gray-900">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    New Patient Onboarding
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-mono text-[10px] font-bold">
                    AUTO UHID: UHID-2026-AUTO
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-1 text-[#052E24]">Full Patient Registration & OP Visit Form</h2>
              </div>
              <button 
                onClick={() => setShowRegModal(false)}
                className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmitRegistration} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-200">
              
              {/* SECTION 1: Patient Details */}
              <div className="bg-white/60 border border-gray-200/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80 text-[#087F5B] font-bold text-sm">
                  <span>👤</span>
                  <span>1. Patient Details</span>
                  <span className="text-[10px] font-normal text-gray-500 ml-auto">* Primary Identifiers</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Kumar"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Age (Auto-calculated)</label>
                    <div className="w-full p-2.5 bg-gray-100 border border-slate-800 rounded-xl text-[#087F5B] font-bold font-mono text-sm flex items-center justify-between">
                      <span>{calculateAge(formData.date_of_birth) || 'Enter DOB above'}</span>
                      <span className="text-[10px] text-slate-500 font-normal">Years</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => handleInputChange('blood_group', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-blue-500 focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">UHID / Patient ID</label>
                    <div className="w-full p-2.5 bg-gray-100 border border-slate-800 rounded-xl text-gray-500 font-mono text-xs italic">
                      Auto-generated upon save
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Contact Details */}
              <div className="bg-white/60 border border-gray-200/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80 text-emerald-400 font-bold text-sm">
                  <span>📞</span>
                  <span>2. Contact Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Country & Mobile Number *</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.country_code || '+91'}
                        onChange={(e) => handleInputChange('country_code', e.target.value)}
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none font-mono text-xs w-32"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code + c.country} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="98765 43210"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      placeholder="patient@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">City</label>
                    <input
                      type="text"
                      placeholder="Chennai"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-500 mb-1 font-medium">Residential Address</label>
                    <input
                      type="text"
                      placeholder="Street name, door no, landmark"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-500 mb-1 font-medium">State</label>
                      <input
                        type="text"
                        placeholder="Tamil Nadu"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1 font-medium">Pincode</label>
                      <input
                        type="text"
                        placeholder="600001"
                        value={formData.pincode}
                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Visit Details */}
              <div className="bg-white/60 border border-gray-200/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80 text-purple-400 font-bold text-sm">
                  <span>🩺</span>
                  <span>3. Visit Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Visit Date & Time (Auto-generated)</label>
                    <div className="w-full p-2.5 bg-gray-100 border border-slate-800 rounded-xl text-purple-300 font-mono text-xs">
                      {new Date().toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Department *</label>
                    <select
                      value={formData.department}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-purple-500 focus:outline-none"
                    >
                      {Object.keys(deptDoctors).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Assigned Doctor *</label>
                    <select
                      value={formData.doctor}
                      onChange={(e) => handleInputChange('doctor', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-purple-500 focus:outline-none"
                    >
                      {Object.values(deptDoctors).map(doc => (
                        <option key={doc} value={doc}>{doc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Visit Type</label>
                    <select
                      value={formData.visit_type}
                      onChange={(e) => handleInputChange('visit_type', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-purple-500 focus:outline-none"
                    >
                      <option value="New Consultation">New Consultation</option>
                      <option value="Follow-Up">Follow-Up</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Routine Checkup">Routine Checkup</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-500 mb-1 font-medium">Chief Complaint / Symptoms</label>
                    <input
                      type="text"
                      placeholder="e.g. High fever for 2 days, headache, chest tightness"
                      value={formData.chief_complaint}
                      onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Emergency Contact */}
              <div className="bg-white/60 border border-gray-200/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80 text-rose-400 font-bold text-sm">
                  <span>🚨</span>
                  <span>4. Emergency Contact</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="Next of kin / Relative name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Relationship</label>
                    <select
                      value={formData.emergency_relationship}
                      onChange={(e) => handleInputChange('emergency_relationship', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-rose-500 focus:outline-none"
                    >
                      {['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Relative', 'Other'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Emergency Contact Number</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.emergency_country_code || '+91'}
                        onChange={(e) => handleInputChange('emergency_country_code', e.target.value)}
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-rose-500 focus:outline-none font-mono text-xs w-32"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={'em_' + c.code + c.country} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="99999 00000"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                        className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-rose-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Payment */}
              <div className="bg-white/60 border border-gray-200/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80 text-amber-400 font-bold text-sm">
                  <span>💳</span>
                  <span>5. Payment Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Registration & Consultation Fee</label>
                    <input
                      type="text"
                      value={formData.registration_fee}
                      onChange={(e) => handleInputChange('registration_fee', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-amber-500 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Payment Mode</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI / QR Code">UPI / QR Code</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Health Insurance">Health Insurance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1 font-medium">Payment Status</label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => handleInputChange('payment_status', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[#052E24] focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Paid">Paid (Receipt Generated)</option>
                      <option value="Pending">Pending</option>
                      <option value="Waived">Waived / Free</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-700 text-gray-600 font-semibold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-gray-900 font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  {submitting ? 'Registering...' : 'Complete Registration & Generate UHID Card ➔'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VISIT CREATION MODAL (For Existing Patients) */}
      {showVisitModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-gray-100/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Existing Patient Visit Booking
                </span>
                <h3 className="text-lg font-bold text-[#052E24] mt-1">
                  Create Visit for {selectedPatient.Name || selectedPatient.full_name}
                </h3>
                <p className="text-gray-500 text-xs">UHID: {selectedPatient['Patient ID'] || selectedPatient.UHID} • Mobile: {selectedPatient.Phone || selectedPatient.phone}</p>
              </div>
              <button onClick={() => setShowVisitModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExistingVisit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    {Object.keys(deptDoctors).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Assigned Doctor</label>
                  <select
                    value={formData.doctor}
                    onChange={(e) => handleInputChange('doctor', e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    {Object.values(deptDoctors).map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Visit Type</label>
                <select
                  value={formData.visit_type}
                  onChange={(e) => handleInputChange('visit_type', e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                >
                  <option value="Follow-Up">Follow-Up Consultation</option>
                  <option value="New Consultation">New Consultation</option>
                  <option value="Emergency">Emergency Visit</option>
                  <option value="Routine Checkup">Routine Checkup</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Chief Complaint / Notes</label>
                <input
                  type="text"
                  placeholder="Reason for visit today..."
                  value={formData.chief_complaint}
                  onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Registration Fee</label>
                  <input
                    type="text"
                    value={formData.registration_fee}
                    onChange={(e) => handleInputChange('registration_fee', e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / QR Code">UPI / QR Code</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowVisitModal(false)} className="px-4 py-2 bg-white text-gray-600 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-900 font-bold rounded-xl shadow">
                  {submitting ? 'Booking...' : 'Issue Token & Generate Slip ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE DIGITAL UHID & REGISTRATION SLIP MODAL */}
      {showSlipModal && activeSlip && (
        <div className="fixed inset-0 z-50 bg-gray-100/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-[#052E24]">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm text-[#052E24]">Registration Complete</span>
              </div>
              <button onClick={() => setShowSlipModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Digital Card Content */}
            <div id="printable-uhid-slip" className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-slate-300 shadow-inner space-y-4 font-sans">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h3 className="font-black text-base text-blue-900 tracking-tight">CITY CARE GENERAL HOSPITAL</h3>
                  <p className="text-[10px] text-slate-600 font-medium">Outpatient Registration & UHID Slip</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-600 text-gray-900 font-mono font-black px-2.5 py-1 rounded-lg text-xs">
                    TOKEN: {activeSlip.tokenNo}
                  </span>
                </div>
              </div>

              {/* Barcode Visual */}
              <div className="bg-slate-100 border border-slate-300 p-2.5 rounded-xl text-center">
                <div className="font-mono font-bold text-lg text-slate-900 tracking-widest">{activeSlip.uhid}</div>
                {/* SVG Barcode bars graphic */}
                <div className="flex justify-center items-center gap-1 my-1.5 h-8">
                  {[4, 2, 6, 3, 5, 2, 7, 4, 3, 5, 2, 6, 4, 3, 7, 2, 5, 4, 3, 6, 2, 4, 5, 3].map((h, i) => (
                    <div key={i} className="bg-gray-50 w-1" style={{ height: `${h * 4}px` }}></div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 font-mono">Scan Barcode for Electronic Health Record (EHR)</p>
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-200 py-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">Patient Name</span>
                  <span className="font-bold text-slate-900">{activeSlip.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Age / Gender / Blood</span>
                  <span className="font-bold text-slate-900">{activeSlip.ageGender} ({activeSlip.bloodGroup})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Mobile Contact</span>
                  <span className="font-bold text-slate-900">{activeSlip.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Visit Date & Time</span>
                  <span className="font-semibold text-slate-800">{activeSlip.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Department</span>
                  <span className="font-bold text-blue-900">{activeSlip.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Assigned Doctor</span>
                  <span className="font-bold text-emerald-900">{activeSlip.doctor}</span>
                </div>
              </div>

              {/* Payment Details Footer */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">Chief Complaint</span>
                  <span className="font-medium text-slate-800">{activeSlip.chiefComplaint}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] block">Fee Paid</span>
                  <span className="font-black text-slate-900 text-sm">{activeSlip.registrationFee} ({activeSlip.paymentMode})</span>
                </div>
              </div>
            </div>

            {/* Slip Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 font-bold text-xs rounded-xl shadow transition-all"
              >
                <Printer className="w-4 h-4" />
                Print Registration Slip
              </button>
              <button
                onClick={() => alert(`Registration slip & Token ${activeSlip.tokenNo} sent to ${activeSlip.phone} via SMS/WhatsApp!`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-gray-900 font-bold text-xs rounded-xl shadow transition-all"
              >
                📱 Send SMS
              </button>
              <button
                onClick={() => setShowSlipModal(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-700 text-gray-600 font-bold text-xs rounded-xl transition-all"
              >
                Done
              </button>
            </div>

          </div>
        </div>

      )}
    </div>
  );
};

export default PatientRegistration;
