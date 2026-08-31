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

const API_BASE = 'http://127.0.0.1:8000/api/v1/laboratory';

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
      ws = new WebSocket(`ws://127.0.0.1:8000/ws/laboratory:${sectionKey}`);
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
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-[#041c24] to-[#012f38] text-slate-100 p-4 sm:p-6 lg:p-8 rounded-3xl border border-teal-900/50 shadow-2xl relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white space-y-6">
      
      {/* Background Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#008080_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/25 ring-1 ring-white/20">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Laboratory Portal & Event Queue
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-950/80 text-teal-300 border border-teal-600/50 px-2.5 py-0.5 rounded-full">
                7 Sections Core
              </span>
            </div>
            <p className="text-xs text-teal-300/80 font-medium mt-0.5">
              Closed-loop lab order execution, specimen barcode tracking & real-time doctor result dispatch.
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          className="bg-teal-900/40 hover:bg-teal-800/60 border border-teal-700/50 text-teal-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Section Navigation Bar */}
      <div className="relative z-10">
        <LabSectionBar 
          activeSection={selectedSection} 
          onSectionChange={handleSectionChange}
          showDetails={true}
        />
      </div>

      {/* Dynamic Database-Derived Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
        {[
          { label: 'New Orders', val: counters.new_orders, color: 'text-amber-400', border: 'border-amber-500/30' },
          { label: 'Sample Pending', val: counters.sample_pending, color: 'text-orange-400', border: 'border-orange-500/30' },
          { label: 'Collected', val: counters.sample_collected, color: 'text-sky-400', border: 'border-sky-500/30' },
          { label: 'Processing', val: counters.processing, color: 'text-teal-400', border: 'border-teal-500/30' },
          { label: 'Results Pending', val: counters.results_pending, color: 'text-purple-400', border: 'border-purple-500/30' },
          { label: 'To Verify', val: counters.verification_pending, color: 'text-indigo-400', border: 'border-indigo-500/30' },
          { label: 'Completed Today', val: counters.completed_today, color: 'text-emerald-400', border: 'border-emerald-500/30' },
          { label: 'Critical Alerts', val: counters.critical_results, color: 'text-rose-400 font-black', border: 'border-rose-500/40' },
        ].map((c, i) => (
          <div key={i} className={`bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border ${c.border} flex flex-col items-center justify-center text-center shadow-lg`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.label}</span>
            <span className={`text-xl font-black ${c.color} mt-1`}>{c.val}</span>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-teal-900/40 relative z-10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Patient, UHID, or Order Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-teal-800/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'ORDERED', 'SAMPLE_COLLECTED', 'SAMPLE_RECEIVED', 'RESULT_ENTERED', 'RELEASED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                filterStatus === st
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'All' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-teal-900/50 overflow-hidden relative z-10 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-teal-400 text-[11px] uppercase tracking-wider font-bold border-b border-teal-900/60">
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
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    No orders currently in <span className="text-teal-400 font-bold">{selectedSection}</span> queue matching filters.
                  </td>
                </tr>
              ) : (
                filteredQueue.map(order => {
                  const spec = order.specimens?.[0];
                  return (
                    <tr key={order.id} className="hover:bg-teal-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-300">
                        {order.order_code}
                        <div className="text-[10px] text-slate-500 font-normal">{order.encounter_id}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{order.patient_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{order.patient_uhid} ({order.op_ip_status})</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-200">
                        <div className="font-medium">{order.ordering_doctor_name}</div>
                        <div className="text-[10px] text-teal-400/80">{order.department_name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-teal-200">{order.items?.[0]?.test_name || 'CBC Test'}</div>
                        <div className="text-[10px] text-slate-400">{order.items?.[0]?.laboratory_section || selectedSection}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          order.priority === 'STAT' ? 'bg-rose-950 text-rose-300 border border-rose-600' :
                          order.priority === 'URGENT' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {order.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {spec ? (
                          <div>
                            <div className="font-mono text-xs text-sky-300 font-bold flex items-center gap-1">
                              <Barcode className="w-3.5 h-3.5" />
                              {spec.specimen_code}
                            </div>
                            <div className="text-[10px] text-slate-400">{spec.specimen_type} ({spec.container_type})</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Pending ID</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                          order.status === 'RELEASED' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50' :
                          order.status === 'SAMPLE_COLLECTED' ? 'bg-sky-950/80 text-sky-300 border-sky-600/50' :
                          order.status === 'SAMPLE_RECEIVED' ? 'bg-teal-950/80 text-teal-300 border-teal-600/50' :
                          order.status === 'RESULT_ENTERED' ? 'bg-purple-950/80 text-purple-300 border-purple-600/50' :
                          'bg-amber-950/80 text-amber-300 border-amber-600/50'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === 'ORDERED' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveModal('COLLECT'); }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-all"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                              Collect Sample
                            </button>
                          )}

                          {order.status === 'SAMPLE_COLLECTED' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveModal('RECEIVE'); }}
                              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-all"
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
                              className="bg-purple-500 hover:bg-purple-400 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Result Entry
                            </button>
                          )}

                          {(order.status === 'RESULT_ENTERED' || order.status === 'VERIFICATION_PENDING') && (
                            <button
                              onClick={() => { setSelectedOrder(order); setActiveModal('VERIFY'); }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-md shadow-emerald-500/20"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Verify & Release
                            </button>
                          )}

                          {order.status === 'RELEASED' && (
                            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-600/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Barcode className="w-5 h-5" /> Sample Collection & Barcode Generation
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
              <div><span className="text-slate-500">Order:</span> {selectedOrder.order_code}</div>
              <div><span className="text-slate-500">Patient:</span> {selectedOrder.patient_name} ({selectedOrder.patient_uhid})</div>
              <div><span className="text-slate-500">Test:</span> {selectedOrder.items?.[0]?.test_name}</div>
              <div><span className="text-slate-500">Specimen ID:</span> <span className="text-sky-400 font-bold">SPC-2026-01051</span></div>
              <div><span className="text-slate-500">Container:</span> EDTA Lavender Tube (Whole Blood)</div>
            </div>

            <button
              onClick={() => handleCollectSample(selectedOrder)}
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all"
            >
              {isSubmitting ? 'Generating Barcode...' : 'Confirm Sample Collected'}
            </button>
          </div>
        </div>
      )}

      {/* SAMPLE RECEPTION & REJECTION MODAL */}
      {activeModal === 'RECEIVE' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-600/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-teal-300 flex items-center gap-2">
                <Check className="w-5 h-5" /> Sample Reception Desk
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <div><span className="text-slate-500">Patient:</span> <span className="font-bold text-white">{selectedOrder.patient_name}</span></div>
              <div><span className="text-slate-500">Specimen Code:</span> <span className="font-mono text-teal-300 font-bold">{selectedOrder.specimens?.[0]?.specimen_code || 'SPC-2026-01051'}</span></div>
              <div><span className="text-slate-500">Ordering Doctor:</span> {selectedOrder.ordering_doctor_name}</div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 font-bold uppercase">If Rejecting, Select Reason:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
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
                className="flex-1 bg-rose-950 hover:bg-rose-900 border border-rose-600 text-rose-300 font-bold py-2.5 rounded-xl text-xs uppercase"
              >
                Reject Specimen
              </button>
              <button
                onClick={() => handleReceiveSample(selectedOrder)}
                disabled={isSubmitting}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs uppercase shadow-lg"
              >
                Receive Sample
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT ENTRY MODAL */}
      {activeModal === 'ENTRY' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-600/50 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Dynamic Parameter Result Entry
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
              <div><span className="text-slate-500">Patient:</span> <span className="font-bold text-white">{selectedOrder.patient_name}</span></div>
              <div><span className="text-slate-500">Test:</span> <span className="text-teal-300 font-bold">{selectedOrder.items?.[0]?.test_name}</span></div>
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
                <div key={p.code} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-300">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-slate-500">{p.unit}</span>
                  </div>
                  <input
                    type="text"
                    value={paramValues[p.code] || ''}
                    onChange={(e) => setParamValues({ ...paramValues, [p.code]: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                  />
                  <div className="text-[9px] text-slate-500">Ref: {p.ref}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubmitResultEntry(selectedOrder)}
              disabled={isSubmitting}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all"
            >
              Submit for Technical Verification
            </button>
          </div>
        </div>
      )}

      {/* TECHNICAL VERIFICATION & RELEASE MODAL */}
      {activeModal === 'VERIFY' && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-600/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Technical Verification & Release
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <div><span className="text-slate-500">Patient:</span> <span className="font-bold text-white">{selectedOrder.patient_name}</span></div>
                <div><span className="text-slate-500">Target Doctor:</span> <span className="font-bold text-emerald-300">{selectedOrder.ordering_doctor_name} ONLY</span></div>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between"><span>Hemoglobin:</span> <span className="text-emerald-400 font-bold">13.5 g/dL (NORMAL)</span></div>
                <div className="flex justify-between"><span>WBC Count:</span> <span className="text-emerald-400 font-bold">8,500 /µL (NORMAL)</span></div>
                <div className="flex justify-between"><span>Platelets:</span> <span className="text-emerald-400 font-bold">245,000 /µL (NORMAL)</span></div>
              </div>
            </div>

            <div className="bg-teal-950/40 p-3 rounded-xl border border-teal-800/50 text-[11px] text-teal-200">
              ⚡ <strong>Targeted Delivery:</strong> Releasing this report will trigger an event routed exclusively to <strong>{selectedOrder.ordering_doctor_name}</strong>'s portal.
            </div>

            <button
              onClick={() => handleVerifyAndRelease(selectedOrder)}
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all"
            >
              Verify & Release Report Directly to Doctor
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
