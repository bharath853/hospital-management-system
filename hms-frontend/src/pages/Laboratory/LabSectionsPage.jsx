import React, { useState, useEffect, useCallback } from 'react';
import { 
  FlaskConical, 
  Layers, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  Printer, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  ArrowUpRight, 
  X, 
  Eye, 
  User, 
  Calendar,
  Zap,
  ShieldAlert,
  ArrowRight,
  Barcode,
  Check,
  Ban,
  Send
} from 'lucide-react';
import LabSectionBar, { LAB_SECTIONS_CONFIG } from '../../components/Laboratory/LabSectionBar';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${API_BASE}`;
const WS_URL = import.meta.env.VITE_WS_URL || `${WS_URL}`;

export default function LabSectionsPage() {
  const [selectedSection, setSelectedSection] = useState(() => {
    return localStorage.getItem('hms_active_lab_section') || 'Hematology';
  });
  
  const [counters, setCounters] = useState({
    new_orders: 0,
    sample_pending: 0,
    sample_collected: 0,
    processing: 0,
    results_pending: 0,
    verification_pending: 0,
    completed_today: 0,
    critical_results: 0
  });

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'COLLECT', 'RECEIVE', 'ENTRY', 'VERIFY'
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState('Hemolysed specimen');
  const [paramValues, setParamValues] = useState({});
  const [verifierName, setVerifierName] = useState('Anil Mehta (Senior Lab Tech)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch counters
      const cntRes = await fetch(`${API_BASE}/dashboard-counters`);
      if (cntRes.ok) {
        const cntData = await cntRes.json();
        setCounters(cntData);
      }

      // 2. Fetch work queue for active section
      const qRes = await fetch(`${API_BASE}/work-queue?section=${encodeURIComponent(selectedSection)}`);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueue(qData);
      }
    } catch (e) {
      console.error("Error fetching lab data:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // WebSocket real-time listener for instant queue updates
  useEffect(() => {
    let ws = null;
    try {
      const sectionKey = selectedSection.toLowerCase().split(' ')[0];
      ws = new WebSocket(`${WS_URL}/ws/laboratory:${sectionKey}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (['LabOrderCreated', 'LabSampleCollected', 'LabSampleReceived', 'LabResultEntered', 'LabResultVerified'].includes(msg.event)) {
            fetchDashboardData();
          }
        } catch (err) {
          console.error("WS msg parse error:", err);
        }
      };
    } catch (e) {
      console.log("WS connect error:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [selectedSection, fetchDashboardData]);

  const handleSectionChange = (secId) => {
    setSelectedSection(secId);
    setSearchQuery('');
    setFilterStatus('All');
  };

  // Actions
  const handleCollectSample = async (order) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/specimens/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_order_id: order.id, collected_by: 'Phlebotomist Staff' })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchDashboardData();
      }
    } catch (e) {
      alert("Failed to collect sample: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveSample = async (order) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/specimens/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_order_id: order.id, received_by: 'Anil Mehta (Lab Tech)' })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchDashboardData();
      }
    } catch (e) {
      alert("Failed to receive sample: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSample = async (order) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/specimens/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lab_order_id: order.id, rejection_reason: rejectionReason })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchDashboardData();
      }
    } catch (e) {
      alert("Failed to reject sample: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitResultEntry = async (order) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/results/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lab_order_id: order.id,
          parameter_values: paramValues,
          entered_by: 'Anil Mehta (Lab Tech)'
        })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchDashboardData();
      }
    } catch (e) {
      alert("Failed to submit result: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRelease = async (order) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/results/verify-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lab_order_id: order.id,
          verified_by: verifierName
        })
      });
      if (res.ok) {
        setActiveModal(null);
        fetchDashboardData();
      }
    } catch (e) {
      alert("Failed to verify result: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQueue = queue.filter(q => {
    const matchesSearch = 
      q.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.patient_uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.order_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-full bg-[#F6F8F6] text-[#10201B] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* Header Bar - Pure Black */}
      <div className="bg-black border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#087F5B]/30 border border-[#087F5B]/50 flex items-center justify-center text-[#12B886] shadow-sm">
            <FlaskConical className="w-6 h-6 text-[#12B886]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Laboratory Portal & Event Queue
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#12B886]/20 text-[#12B886] border border-[#12B886]/30 px-2.5 py-0.5 rounded-full">
                7 Sections Core
              </span>
            </div>
            <p className="text-xs text-[#DDEFE5]/80 font-medium mt-0.5">
              Closed-loop lab order execution, specimen barcode tracking & real-time doctor result dispatch.
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          className="bg-[#052E24] hover:bg-[#07543F] border border-[#07543F] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-[#12B886] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Section Navigation Bar */}
      <div>
        <LabSectionBar 
          activeSection={selectedSection} 
          onSectionChange={handleSectionChange}
          showDetails={true}
        />
      </div>

      {/* Dynamic Database-Derived Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'New Orders', val: counters.new_orders, color: 'text-[#F59E0B]' },
          { label: 'Sample Pending', val: counters.sample_pending, color: 'text-orange-600' },
          { label: 'Collected', val: counters.sample_collected, color: 'text-sky-600' },
          { label: 'Processing', val: counters.processing, color: 'text-[#087F5B]' },
          { label: 'Results Pending', val: counters.results_pending, color: 'text-purple-600' },
          { label: 'To Verify', val: counters.verification_pending, color: 'text-indigo-600' },
          { label: 'Completed Today', val: counters.completed_today, color: 'text-[#087F5B]' },
          { label: 'Critical Alerts', val: counters.critical_results, color: 'text-rose-600 font-black animate-pulse' },
        ].map((c, i) => (
          <div key={i} className="bg-white border border-[#DDE5E0] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-card hover:shadow-card-hover transition-all">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65756E]">{c.label}</span>
            <span className={`text-xl font-black ${c.color} mt-1 font-mono`}>{c.val}</span>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#65756E] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Patient, UHID, or Order Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] placeholder-[#65756E] focus:outline-none focus:border-[#087F5B]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          {['All', 'ORDERED', 'SAMPLE_COLLECTED', 'SAMPLE_RECEIVED', 'RESULT_ENTERED', 'RELEASED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-[#052E24] text-white shadow-sm font-extrabold'
                  : 'bg-[#F6F8F6] text-[#65756E] hover:text-[#10201B] border border-[#DDE5E0]'
              }`}
            >
              {st === 'All' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-[#DDE5E0] overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#052E24] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">Order Code</th>
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Ordering Doctor</th>
                <th className="py-3.5 px-4">Test Name & Section</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Specimen & Barcode</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#65756E] font-medium">
                    No orders currently in <span className="text-[#087F5B] font-bold">{selectedSection}</span> queue matching filters.
                  </td>
                </tr>
              ) : (
                filteredQueue.map(order => {
                  const spec = order.specimens?.[0];
                  return (
                    <tr key={order.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#087F5B]">
                        {order.order_code}
                        <div className="text-[10px] text-[#65756E] font-normal">{order.encounter_id}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#10201B]">{order.patient_name}</div>
                        <div className="text-[10px] text-[#65756E] font-mono">{order.patient_uhid} ({order.op_ip_status})</div>
                      </td>

                      <td className="py-3.5 px-4 text-[#10201B]">
                        <div className="font-semibold">{order.ordering_doctor_name}</div>
                        <div className="text-[10px] text-[#65756E]">{order.department_name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#063C2F]">{order.items?.[0]?.test_name || 'CBC Test'}</div>
                        <div className="text-[10px] text-[#65756E]">{order.items?.[0]?.laboratory_section || selectedSection}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          order.priority === 'STAT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          order.priority === 'URGENT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-[#F6F8F6] text-[#65756E] border border-[#DDE5E0]'
                        }`}>
                          {order.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {spec ? (
                          <div>
                            <div className="font-mono text-xs text-sky-700 font-bold flex items-center gap-1">
                              <Barcode className="w-3.5 h-3.5" />
                              {spec.specimen_code}
                            </div>
                            <div className="text-[10px] text-[#65756E]">{spec.specimen_type} ({spec.container_type})</div>
                          </div>
                        ) : (
                          <span className="text-[#65756E] italic">Pending ID</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          order.status === 'RELEASED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          order.status === 'SAMPLE_COLLECTED' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          order.status === 'SAMPLE_RECEIVED' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          order.status === 'RESULT_ENTERED' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === 'ORDERED' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveModal('COLLECT'); }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 transition-all shadow-sm"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                              Collect Sample
                            </button>
                          )}

                          {order.status === 'SAMPLE_COLLECTED' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveModal('RECEIVE'); }}
                              className="bg-[#087F5B] hover:bg-[#07543F] text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 transition-all shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Receive Sample
                            </button>
                          )}

                          {(order.status === 'SAMPLE_RECEIVED' || order.status === 'PROCESSING') && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setParamValues({ HGB: '13.5', RBC: '4.7', WBC: '8500', PLT: '245000', HCT: '41.0', MCV: '88.0', MCH: '29.0', MCHC: '34.0' });
                                setActiveModal('ENTRY');
                              }}
                              className="bg-[#063C2F] hover:bg-[#052E24] text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 transition-all shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Result Entry
                            </button>
                          )}

                          {(order.status === 'RESULT_ENTERED' || order.status === 'VERIFICATION_PENDING') && (
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveModal('VERIFY'); }}
                              className="bg-[#087F5B] hover:bg-[#07543F] text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 transition-all shadow-sm"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Verify & Release
                            </button>
                          )}

                          {order.status === 'RELEASED' && (
                            <span className="text-[#087F5B] font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Delivered to Doctor
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SAMPLE COLLECTION MODAL */}
      {activeModal === 'COLLECT' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-[#10201B]">
            <div className="flex justify-between items-center border-b border-[#DDE5E0] pb-3">
              <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                <Barcode className="w-5 h-5 text-amber-600" /> Sample Collection & Barcode Generation
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-2 text-xs bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0] font-mono">
              <div><span className="text-[#65756E]">Order:</span> <span className="text-[#10201B] font-bold">{selectedOrder.order_code}</span></div>
              <div><span className="text-[#65756E]">Patient:</span> <span className="text-[#10201B] font-bold">{selectedOrder.patient_name} ({selectedOrder.patient_uhid})</span></div>
              <div><span className="text-[#65756E]">Test:</span> <span className="text-[#10201B]">{selectedOrder.items?.[0]?.test_name}</span></div>
              <div><span className="text-[#65756E]">Specimen ID:</span> <span className="text-sky-700 font-bold">SPC-2026-01051</span></div>
              <div><span className="text-[#65756E]">Container:</span> <span className="text-[#10201B]">EDTA Lavender Tube (Whole Blood)</span></div>
            </div>

            <button
              onClick={() => handleCollectSample(selectedOrder)}
              disabled={isSubmitting}
              className="w-full bg-[#087F5B] hover:bg-[#07543F] text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-sm transition-all"
            >
              {isSubmitting ? 'Generating Barcode...' : 'Confirm Sample Collected'}
            </button>
          </div>
        </div>
      )}

      {/* SAMPLE RECEPTION & REJECTION MODAL */}
      {activeModal === 'RECEIVE' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-[#10201B]">
            <div className="flex justify-between items-center border-b border-[#DDE5E0] pb-3">
              <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                <Check className="w-5 h-5 text-[#087F5B]" /> Sample Reception Desk
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5"/></button>
            </div>

            <div className="text-xs bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0] space-y-1.5">
              <div><span className="text-[#65756E]">Patient:</span> <span className="font-bold text-[#10201B]">{selectedOrder.patient_name}</span></div>
              <div><span className="text-[#65756E]">Specimen Code:</span> <span className="font-mono text-[#087F5B] font-bold">{selectedOrder.specimens?.[0]?.specimen_code || 'SPC-2026-01051'}</span></div>
              <div><span className="text-[#65756E]">Ordering Doctor:</span> <span className="text-[#10201B]">{selectedOrder.ordering_doctor_name}</span></div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-[#65756E] font-bold uppercase">If Rejecting, Select Reason:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl p-2.5 text-xs text-[#10201B] focus:border-[#087F5B]"
              >
                <option value="Hemolysed specimen">Hemolysed specimen</option>
                <option value="Clotted specimen">Clotted specimen</option>
                <option value="Wrong container">Wrong container</option>
                <option value="Insufficient quantity">Insufficient quantity</option>
                <option value="Incorrect labeling">Incorrect labeling</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleRejectSample(selectedOrder)}
                disabled={isSubmitting}
                className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2.5 rounded-xl text-xs uppercase transition"
              >
                Reject Specimen
              </button>
              <button
                onClick={() => handleReceiveSample(selectedOrder)}
                disabled={isSubmitting}
                className="flex-1 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold py-2.5 rounded-xl text-xs uppercase shadow-sm transition"
              >
                Receive Sample
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT ENTRY MODAL */}
      {activeModal === 'ENTRY' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-[#10201B]">
            <div className="flex justify-between items-center border-b border-[#DDE5E0] pb-3">
              <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#087F5B]" /> Dynamic Parameter Result Entry
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5"/></button>
            </div>

            <div className="text-xs bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0] flex justify-between">
              <div><span className="text-[#65756E]">Patient:</span> <span className="font-bold text-[#10201B]">{selectedOrder.patient_name}</span></div>
              <div><span className="text-[#65756E]">Test:</span> <span className="text-[#087F5B] font-bold">{selectedOrder.items?.[0]?.test_name}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {[
                { code: 'HGB', name: 'Hemoglobin', unit: 'g/dL', ref: '12.0 - 17.5' },
                { code: 'RBC', name: 'RBC Count', unit: 'million/µL', ref: '4.2 - 5.9' },
                { code: 'WBC', name: 'WBC Count', unit: '/µL', ref: '4000 - 11000' },
                { code: 'PLT', name: 'Platelet Count', unit: '/µL', ref: '150000 - 450000' },
                { code: 'HCT', name: 'Hematocrit', unit: '%', ref: '36.0 - 50.0' },
                { code: 'MCV', name: 'MCV', unit: 'fL', ref: '80.0 - 100.0' },
              ].map(p => (
                <div key={p.code} className="bg-[#F6F8F6] p-3 rounded-xl border border-[#DDE5E0] space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-[#10201B]">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-[#65756E]">{p.unit}</span>
                  </div>
                  <input
                    type="text"
                    value={paramValues[p.code] || ''}
                    onChange={(e) => setParamValues({ ...paramValues, [p.code]: e.target.value })}
                    className="w-full bg-white border border-[#DDE5E0] rounded-lg p-1.5 text-xs text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                  <div className="text-[9px] text-[#65756E]">Ref: {p.ref}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubmitResultEntry(selectedOrder)}
              disabled={isSubmitting}
              className="w-full bg-[#087F5B] hover:bg-[#07543F] text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-sm transition-all"
            >
              Submit for Technical Verification
            </button>
          </div>
        </div>
      )}

      {/* TECHNICAL VERIFICATION & RELEASE MODAL */}
      {activeModal === 'VERIFY' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#10201B]">
            <div className="flex justify-between items-center border-b border-[#DDE5E0] pb-3">
              <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#087F5B]" /> Technical Verification & Release
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5"/></button>
            </div>

            <div className="bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0] space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-[#DDE5E0] pb-2">
                <div><span className="text-[#65756E]">Patient:</span> <span className="font-bold text-[#10201B]">{selectedOrder.patient_name}</span></div>
                <div><span className="text-[#65756E]">Target Doctor:</span> <span className="font-bold text-[#087F5B]">{selectedOrder.ordering_doctor_name} ONLY</span></div>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-[#10201B]"><span>Hemoglobin:</span> <span className="text-[#087F5B] font-bold">13.5 g/dL (NORMAL)</span></div>
                <div className="flex justify-between text-[#10201B]"><span>WBC Count:</span> <span className="text-[#087F5B] font-bold">8,500 /µL (NORMAL)</span></div>
                <div className="flex justify-between text-[#10201B]"><span>Platelets:</span> <span className="text-[#087F5B] font-bold">245,000 /µL (NORMAL)</span></div>
              </div>
            </div>

            <div className="bg-[#EEF7F1] p-3.5 rounded-xl border border-[#087F5B]/30 text-[11px] text-[#052E24]">
              ⚡ <strong>Targeted Delivery:</strong> Releasing this report will trigger an event routed exclusively to <strong>{selectedOrder.ordering_doctor_name}</strong>'s portal.
            </div>

            <button
              onClick={() => handleVerifyAndRelease(selectedOrder)}
              disabled={isSubmitting}
              className="w-full bg-[#087F5B] hover:bg-[#07543F] text-white font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-sm transition-all"
            >
              Verify & Release Report Directly to Doctor
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
