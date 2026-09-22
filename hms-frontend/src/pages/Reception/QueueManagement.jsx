import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Calendar, Activity, ChevronRight, CheckCircle2, UserPlus, AlertCircle, X, Download, FileText, Settings, RefreshCw, HeartPulse, Clock, Filter, CreditCard } from 'lucide-react';

const QueueManagement = () => {
  const [queueData, setQueueData] = useState([]);
  const [stats, setStats] = useState({ waiting: 18, in_consultation: 3, completed: 42, no_show: 2 });
  const [loading, setLoading] = useState(true);

  // Check-In Form State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [arrivalType, setArrivalType] = useState('Appointment');
  const [priority, setPriority] = useState('Normal');
  const [consultationRoom, setConsultationRoom] = useState('Room 204');
  const [doctorName, setDoctorName] = useState('Dr. Madhavan');
  const [departmentName, setDepartmentName] = useState('Cardiology');
  const [submitting, setSubmitting] = useState(false);

  // Generated Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);

  const deptDoctors = {
    'Cardiology': 'Dr. Madhavan',
    'Neurology': 'Dr. S. Karthikeyan',
    'Pediatrics': 'Dr. Murugan Jeyaraman',
    'Orthopedics': 'Dr. Raj Kanna',
    'General Medicine': 'Dr. Priya Nair'
  };

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/reception/queue`);
      if (res.ok) {
        const data = await res.json();
        if (data.queue) {
          setQueueData(data.queue);
          if (data.stats) setStats(data.stats);
        } else if (Array.isArray(data)) {
          setQueueData(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [aptRes, ptRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/appointments`),
        fetch(`${API_BASE}/api/v1/patients`)
      ]);
      if (aptRes.ok) setAppointmentsList(await aptRes.json());
      if (ptRes.ok) setPatientsList(await ptRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchMetadata();
    // Auto-refresh queue periodically so newly checked-in patients appear automatically
    const interval = setInterval(() => {
      fetchQueue();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSearchMatch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSelectedMatch(null);
      return;
    }
    const q = query.toLowerCase();
    
    // Check appointments first
    const aptMatch = appointmentsList.find(a => 
      (a['Appointment ID'] || '').toLowerCase().includes(q) ||
      (a.Patient || a['Patient Name'] || '').toLowerCase().includes(q) ||
      (a.UHID || a['Patient ID'] || '').toLowerCase().includes(q)
    );

    if (aptMatch) {
      setSelectedMatch({
        type: 'Appointment',
        aptId: aptMatch.id,
        uhid: aptMatch.UHID || aptMatch['Patient ID'] || 'PT00125',
        name: aptMatch.Patient || aptMatch['Patient Name'],
        doctor: aptMatch.Doctor || 'Dr. Madhavan',
        department: aptMatch.Department || 'Cardiology',
        time: aptMatch['Date & Time'] || aptMatch.Time || '10:30 AM'
      });
      setDoctorName(aptMatch.Doctor || 'Dr. Madhavan');
      setDepartmentName(aptMatch.Department || 'Cardiology');
      setArrivalType('Appointment');
      return;
    }

    // Check patients list
    const ptMatch = patientsList.find(p => 
      (p.Name || p.full_name || '').toLowerCase().includes(q) ||
      (p.Phone || p.phone || '').toLowerCase().includes(q) ||
      (p['Patient ID'] || p.UHID || p.patient_code || '').toLowerCase().includes(q)
    );

    if (ptMatch) {
      setSelectedMatch({
        type: 'Walk-in',
        uhid: ptMatch['Patient ID'] || ptMatch.UHID || ptMatch.patient_code || `PT-${ptMatch.id}`,
        name: ptMatch.Name || ptMatch.full_name,
        doctor: ptMatch.Doctor || 'Dr. Madhavan',
        department: 'General OPD',
        time: 'Now'
      });
      setDoctorName(ptMatch.Doctor || 'Dr. Madhavan');
      setArrivalType('Walk-in');
    } else {
      setSelectedMatch(null);
    }
  };

  const handleDepartmentChange = (dept) => {
    setDepartmentName(dept);
    setDoctorName(deptDoctors[dept] || 'Dr. Madhavan');
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        "appointment_id": selectedMatch?.aptId,
        "patient_id": selectedMatch?.uhid || searchQuery,
        "UHID": selectedMatch?.uhid || searchQuery || "PT00125",
        "Patient Name": selectedMatch?.name || searchQuery || "Walk-in Patient",
        "Doctor": doctorName,
        "Department": departmentName,
        "Arrival Type": arrivalType,
        "Priority": priority,
        "Consultation Room": consultationRoom
      };

      const res = await fetch(`${API_BASE}/api/v1/reception/queue/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setShowCheckInModal(false);
        fetchQueue();

        setGeneratedToken({
          token: result.Token || result['Token No'] || result.token_number || 'C-015',
          uhid: result.UHID || selectedMatch?.uhid || 'PT00125',
          patientName: result.Patient || selectedMatch?.name || 'Walk-in Patient',
          doctor: doctorName,
          department: departmentName,
          position: result.Position || 1,
          waitTime: result['Wait Time'] || '5 min',
          room: consultationRoom,
          checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setShowTokenModal(true);

        // Reset check-in state
        setSearchQuery('');
        setSelectedMatch(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.detail || "Failed to process check-in.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process check-in. Please ensure backend server is reachable.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateQueueStatus = async (queueId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/reception/queue/${queueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchQueue();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-6 rounded-3xl border border-blue-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087F5B] font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reception Desk • Queue Management
          </div>
          <h1 className="text-2xl font-bold text-[#052E24]">Live Outpatient Queue & Token Engine</h1>
          <p className="text-gray-600 text-xs mt-1">
            Track patient arrivals, issue tokens, manage priorities (Emergency/Urgent/Appointment/Walk-in) & doctor consultation workflow.
          </p>
        </div>
        <button
          onClick={() => { setShowCheckInModal(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-gray-900 font-bold rounded-2xl text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          Check-In Patient (Issue Token)
        </button>
      </div>

      {/* TOP STATISTICS DASHBOARD (Matching User ASCII Diagram) */}
      <div className="bg-white/90 border border-gray-200 p-4 rounded-2xl shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-700">
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">Waiting Patients</span>
            <span className="text-3xl font-black text-amber-400 font-mono mt-1 block">{stats.waiting}</span>
            <span className="text-[10px] text-slate-500">In waiting lounge</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">In Consultation</span>
            <span className="text-3xl font-black text-[#087F5B] font-mono mt-1 block">{stats.in_consultation}</span>
            <span className="text-[10px] text-slate-500">Inside doctor rooms</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">Completed Today</span>
            <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">{stats.completed}</span>
            <span className="text-[10px] text-slate-500">Consultation finished</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">No Show / Skipped</span>
            <span className="text-3xl font-black text-rose-400 font-mono mt-1 block">{stats.no_show}</span>
            <span className="text-[10px] text-slate-500">Skipped or cancelled</span>
          </div>
        </div>
      </div>

      {/* QUEUE TABLE (Matching User ASCII Diagram) */}
      <div className="bg-white/80 border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#052E24] flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Live Queue Table & Priority Ranks
            </h2>
            <p className="text-xs text-gray-500">Sorted by Priority Rank (Emergency ➔ Urgent ➔ Appointment ➔ Walk-in) then Check-In Time</p>
          </div>
          <button 
            onClick={fetchQueue}
            className="p-2 text-gray-500 hover:text-gray-900 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all"
            title="Refresh Live Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Token</th>
                <th className="py-3.5 px-4">UHID</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Doctor & Dept</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Wait Time</th>
                <th className="py-3.5 px-4">Room</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">Loading live queue...</td>
                </tr>
              ) : queueData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">No patients in queue. Click "Check-In Patient" to add.</td>
                </tr>
              ) : (
                queueData.map((q) => {
                  const status = (q.queue_status || q.Status || 'WAITING').toUpperCase();
                  const priority = q.Priority || 'Normal';
                  return (
                    <tr key={q.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono font-black rounded-lg text-xs shadow">
                          {q.Token || q['Token No']}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#087F5B]">
                        {q.UHID || 'PT00125'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#052E24]">
                        {q.Patient || q['Patient Name']}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div className="font-semibold">{q.Doctor || 'Dr. Madhavan'}</div>
                        <div className="text-[10px] text-gray-500">{q.Department || 'Cardiology'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          priority === 'Emergency'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                            : priority === 'Urgent'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-300 font-semibold">
                        {q['Wait Time'] || q['Est. Time'] || '10 min'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {q.Room || 'Room 204'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          status === 'IN_CONSULTATION'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : status === 'CALLED'
                            ? 'bg-purple-950 text-purple-300 border-purple-800 animate-bounce'
                            : status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : status === 'SKIPPED'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {status === 'WAITING' && (
                          <>
                            <button
                              onClick={() => handleUpdateQueueStatus(q.id, 'CALLED')}
                              className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-gray-900 border border-purple-500/40 rounded-lg text-[11px] font-semibold transition-all"
                            >
                              [ Call Patient ]
                            </button>
                            <button
                              onClick={() => handleUpdateQueueStatus(q.id, 'SKIPPED')}
                              className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-[11px] font-semibold transition-all"
                            >
                              [ Skip ]
                            </button>
                          </>
                        )}
                        {status === 'CALLED' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(q.id, 'IN_CONSULTATION')}
                            className="px-2.5 py-1 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 rounded-lg text-[11px] font-semibold transition-all shadow"
                          >
                            [ Start Consult ]
                          </button>
                        )}
                        {status === 'IN_CONSULTATION' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(q.id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-gray-900 rounded-lg text-[11px] font-semibold transition-all shadow"
                          >
                            [ Complete ]
                          </button>
                        )}
                        {status === 'SKIPPED' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(q.id, 'RECALLED')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-gray-900 rounded-lg text-[11px] font-semibold transition-all shadow"
                          >
                            [ Recall ]
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECK-IN PATIENT MODAL */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-gray-100/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  Reception Check-In Desk
                </span>
                <h3 className="text-lg font-bold text-[#052E24] mt-1">Patient Check-In & Token Generation</h3>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              {/* Search Box */}
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Search UHID / Appointment ID / Mobile / Name *</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Type UHID-..., APT-..., Mobile, or Name..."
                    value={searchQuery}
                    onChange={(e) => handleSearchMatch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-[#052E24] font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Match Details Preview Card */}
              {selectedMatch && (
                <div className="bg-gradient-to-r from-slate-950 to-blue-950 border border-blue-800/60 p-3.5 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-[#052E24]">
                    <span>Patient: {selectedMatch.name}</span>
                    <span className="text-[#087F5B] font-mono">UHID: {selectedMatch.uhid}</span>
                  </div>
                  <p className="text-gray-500">Doctor: {selectedMatch.doctor} ({selectedMatch.department})</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Arrival Type *</label>
                  <select
                    value={arrivalType}
                    onChange={(e) => setArrivalType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    <option value="Appointment">Booked Appointment</option>
                    <option value="Walk-in">Direct Walk-in</option>
                    <option value="Emergency">Emergency Case</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    <option value="Normal">Normal Priority</option>
                    <option value="Urgent">Urgent Case</option>
                    <option value="Emergency">Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Department</label>
                  <select
                    value={departmentName}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    {Object.keys(deptDoctors).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Doctor</label>
                  <select
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                  >
                    {Object.values(deptDoctors).map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-medium">Consultation Room</label>
                <input
                  type="text"
                  value={consultationRoom}
                  onChange={(e) => setConsultationRoom(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-[#052E24]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowCheckInModal(false)} className="px-4 py-2 bg-white text-gray-600 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-900 font-bold rounded-xl shadow">
                  {submitting ? 'Checking In...' : 'Issue Token & Add to Queue ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATED TOKEN SLIP MODAL */}
      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 z-50 bg-gray-100/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-[#052E24]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Check-In Complete
              </div>
              <button onClick={() => setShowTokenModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Token Card Graphic */}
            <div className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-slate-300 shadow-inner space-y-4 font-sans text-center">
              <div className="border-b pb-2">
                <h4 className="font-black text-blue-900 text-sm">CITY CARE GENERAL HOSPITAL</h4>
                <p className="text-[10px] text-slate-600 font-medium">Outpatient Queue Token</p>
              </div>

              <div className="py-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Token Number</span>
                <span className="font-mono font-black text-4xl text-emerald-600 tracking-wider block mt-1">
                  {generatedToken.token}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-100 p-3 rounded-xl text-left border">
                <div>
                  <span className="text-slate-500 block text-[10px]">Queue Position</span>
                  <span className="font-bold text-slate-900 text-sm">#{generatedToken.position}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Est. Waiting Time</span>
                  <span className="font-bold text-amber-600 text-sm">{generatedToken.waitTime}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Patient Name</span>
                  <span className="font-semibold text-slate-800">{generatedToken.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Doctor / Room</span>
                  <span className="font-semibold text-blue-900">{generatedToken.doctor} ({generatedToken.room})</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#052E24] text-gray-900 font-bold text-xs rounded-xl shadow"
              >
                <Printer className="w-4 h-4 inline mr-1" /> Print Token Slip
              </button>
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2 bg-white text-gray-600 font-bold text-xs rounded-xl"
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

export default QueueManagement;
