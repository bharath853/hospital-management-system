import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import LabSectionBar, { LAB_SECTIONS_CONFIG } from '../../components/Laboratory/LabSectionBar';

const INITIAL_SECTION_DATA = {
  'Hematology': [
    { id: 101, reqId: 'LAB-HEM-101', patient: 'Aarav Kumar', test: 'Complete Blood Count (CBC) with Differential', priority: 'Normal', station: 'Hematology Beckman-X2', doctor: 'Dr. Madhavan', status: 'Completed', result: 'Hb: 14.2 g/dL (Normal), WBC: 7,200/uL, Platelets: 240,000/uL', time: '10:15 AM' },
    { id: 102, reqId: 'LAB-HEM-102', patient: 'Pooja Sharma', test: 'Prothrombin Time (PT/INR) & Coagulation Profile', priority: 'High', station: 'Hematology Beckman-X2', doctor: 'Dr. Priya Nair', status: 'In Processing', result: 'Pending Clotting Assay', time: '11:00 AM' },
    { id: 103, reqId: 'LAB-HEM-103', patient: 'Siddharth Roy', test: 'Erythrocyte Sedimentation Rate (ESR) Westergren', priority: 'Normal', station: 'Automated Slide Stainer-01', doctor: 'Dr. S. Karthikeyan', status: 'Sample Collected', result: 'Sample in tube rack', time: '11:45 AM' },
    { id: 104, reqId: 'LAB-HEM-104', patient: 'Karan Malhotra', test: 'Peripheral Blood Smear for Morphology', priority: 'Urgent', station: 'Hematology Manual Scope-02', doctor: 'Dr. Murugan Jeyaraman', status: 'Critical Alert', result: 'Microcytic Hypochromic Anemia (Hb: 7.1 g/dL)', time: '12:20 PM' },
  ],
  'Biochemistry': [
    { id: 201, reqId: 'LAB-BIO-201', patient: 'Aarav Kumar', test: 'Comprehensive Metabolic & Liver Function Test (LFT)', priority: 'Normal', station: 'Biochemistry Analyzer-01', doctor: 'Dr. Madhavan', status: 'Completed', result: 'ALT: 28 U/L, AST: 24 U/L, Bilirubin: 0.9 mg/dL (Normal)', time: '09:30 AM' },
    { id: 202, reqId: 'LAB-BIO-202', patient: 'Rajesh Patel', test: 'Kidney Function Test (KFT) & Serum Creatinine', priority: 'High', station: 'Cobas 6000 Bench-A', doctor: 'Dr. S. Karthikeyan', status: 'Completed', result: 'Serum Creatinine: 1.1 mg/dL, BUN: 14 mg/dL (Normal)', time: '10:45 AM' },
    { id: 203, reqId: 'LAB-BIO-203', patient: 'Anita Desai', test: 'Lipid Profile & HbA1c Glycated Hemoglobin', priority: 'Normal', station: 'Biochemistry Analyzer-01', doctor: 'Dr. Priya Nair', status: 'In Processing', result: 'Lipid Extraction in progress', time: '11:15 AM' },
    { id: 204, reqId: 'LAB-BIO-204', patient: 'Vikramaditya Rao', test: 'Serum Electrolytes Panel (Na+, K+, Cl-)', priority: 'Urgent', station: 'Electrolyte Analyzer-02', doctor: 'Dr. Raj Kanna', status: 'Critical Alert', result: 'Serum K+: 6.2 mEq/L (Hyperkalemia Alert - Phys Notified)', time: '12:00 PM' }
  ],
  'Microbiology': [
    { id: 301, reqId: 'LAB-MIC-301', patient: 'Master Vihaan Singh', test: 'Pediatric Sputum & Throat Swab Culture', priority: 'Normal', station: 'Microbiology Sterile Desk-04', doctor: 'Dr. Murugan Jeyaraman', status: 'Incubating', result: '24-hour incubation at 37°C. No growth at 18h.', time: '08:00 AM' },
    { id: 302, reqId: 'LAB-MIC-302', patient: 'Sunita Rao', test: 'Urine Culture & Automated Antibiotic Sensitivity', priority: 'Normal', station: 'Biosafety Cabinet-B2', doctor: 'Dr. Priya Nair', status: 'Completed', result: 'E. coli >10^5 CFU/mL. Sensitive to Nitrofurantoin, Ciprofloxacin.', time: '09:40 AM' },
    { id: 303, reqId: 'LAB-MIC-303', patient: 'Siddharth Roy', test: 'Blood Culture (BacT/Alert Bottle Pair)', priority: 'High', station: 'Blood Culture BacT-Alert', doctor: 'Dr. S. Karthikeyan', status: 'Incubating', result: 'Aerobic & Anaerobic bottles in continuous monitoring', time: '10:30 AM' }
  ],
  'Histopathology': [
    { id: 401, reqId: 'LAB-HIS-401', patient: 'Karan Malhotra', test: 'Right Knee Synovial Tissue Biopsy Examination', priority: 'High', station: 'Histology Tissue-Station-03', doctor: 'Dr. Raj Kanna', status: 'Tissue Grossing', result: 'Tissue fixed in 10% Formalin, paraffin block prepared.', time: 'Yesterday' },
    { id: 402, reqId: 'LAB-HIS-402', patient: 'Meera Shah', test: 'Cervical Pap Smear & ThinPrep Liquid Cytology', priority: 'Normal', station: 'Microtome Bench-02', doctor: 'Dr. Priya Nair', status: 'Completed', result: 'Negative for Intraepithelial Lesion or Malignancy (NILM)', time: '2026-08-22' },
    { id: 403, reqId: 'LAB-HIS-403', patient: 'Deepak Verma', test: 'Intraoperative Frozen Section Margin Clearance', priority: 'Stat', station: 'Cryostat Frozen Section', doctor: 'Dr. Madhavan', status: 'Completed', result: 'Surgical resection margins clear (>5mm tumor-free).', time: '11:10 AM' }
  ],
  'Blood Bank': [
    { id: 501, reqId: 'LAB-BB-501', patient: 'Siddharth Roy', test: 'ABO & Rh(D) Blood Grouping & Crossmatching', priority: 'High', station: 'Blood Bank Cold-Chain-01', doctor: 'Dr. S. Karthikeyan', status: 'Completed', result: 'B Positive (Rh+). 2 Units PRBC crossmatch compatible reserved.', time: '09:00 AM' },
    { id: 502, reqId: 'LAB-BB-502', patient: 'Emergency Trauma Patient #402', test: 'Stat O-Negative Universal PRBC Unit Allocation', priority: 'Urgent', station: 'Crossmatch Analyzer-02', doctor: 'Dr. Madhavan', status: 'Dispatched', result: '2 Units Uncrossmatched O-Neg PRBC issued to ER Trauma Bay 1', time: '10:05 AM' },
    { id: 503, reqId: 'LAB-BB-503', patient: 'Ananya Sen', test: 'Single Donor Platelet (SDP) Pheresis Allocation', priority: 'Normal', station: 'Platelet Agitator Station', doctor: 'Dr. Murugan Jeyaraman', status: 'Reserved', result: 'Platelet Unit #PLT-8801 reserved in 22°C Agitator', time: '11:30 AM' }
  ],
  'Emergency/POCT': [
    { id: 601, reqId: 'LAB-POC-601', patient: 'Trauma Resuscitation Bay 1', test: 'Stat Arterial Blood Gas (ABG) & Lactate', priority: 'Stat', station: 'Stat Blood Gas ABL-90', doctor: 'Dr. Madhavan', status: 'Completed', result: 'pH: 7.36, pO2: 92 mmHg, pCO2: 38 mmHg, Lactate: 1.8 mmol/L', time: '10:20 AM' },
    { id: 602, reqId: 'LAB-POC-602', patient: 'Rajesh Patel', test: 'High Sensitivity Cardiac Troponin-I (hs-cTnI)', priority: 'Stat', station: 'Troponin Rapid Analyzer', doctor: 'Dr. S. Karthikeyan', status: 'Completed', result: 'hs-cTnI: 0.012 ng/mL (Normal < 0.03 ng/mL). Cardiac Ischemia unlikely.', time: '11:05 AM' },
    { id: 603, reqId: 'LAB-POC-603', patient: 'Vikramaditya Rao', test: 'Point-of-Care Bedside RBS & Ketone Body', priority: 'Urgent', station: 'POCT Rapid Bench-A', doctor: 'Dr. Raj Kanna', status: 'Completed', result: 'Blood Glucose: 142 mg/dL, Blood Ketone: 0.2 mmol/L (Normal)', time: '12:15 PM' }
  ],
  'Admin/Billing': [
    { id: 701, reqId: 'LAB-ADM-701', patient: 'General Lab Ops', test: 'CAP & NABL Daily Quality Control Calibration Log', priority: 'Daily Routine', station: 'Central LIMS Audit Desk', doctor: 'Dr. Sarah Johnson', status: 'Verified', result: 'All 7 analytical benches within +/- 1.5 SD Levey-Jennings limits.', time: '07:30 AM' },
    { id: 702, reqId: 'LAB-ADM-702', patient: 'Aarav Kumar (IPD-301)', test: 'Consolidated Diagnostic Charges Audit & Tariff Sync', priority: 'Normal', station: 'QC & Validation Console', doctor: 'Accounts Lead', status: 'Billed', result: 'Total 4 tests ($145.00) synced to Central Billing Gateway.', time: '11:50 AM' },
    { id: 703, reqId: 'LAB-ADM-703', patient: 'Reagent Inventory Audit', test: 'Biochemistry & Hematology Reagent Batch Validation', priority: 'Weekly', station: 'Dispatch & Printing Desk', doctor: 'Anil Mehta', status: 'In Stock', result: 'All reagent lots valid. 42 days minimum remaining buffer.', time: '12:30 PM' }
  ]
};

export default function LabSectionsPage() {
  const [selectedSection, setSelectedSection] = useState(() => {
    return localStorage.getItem('hms_active_lab_section') || 'Biochemistry';
  });
  
  const [sectionData, setSectionData] = useState(INITIAL_SECTION_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState('');
  const [newTest, setNewTest] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newDoctor, setNewDoctor] = useState('Dr. Madhavan');

  const currentConfig = LAB_SECTIONS_CONFIG.find(s => s.id === selectedSection) || LAB_SECTIONS_CONFIG[1];
  const records = sectionData[selectedSection] || [];

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      r.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.test.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reqId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || r.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const handleSectionChange = (secId) => {
    setSelectedSection(secId);
    setSearchQuery('');
    setFilterPriority('All');
  };

  // Add new diagnostic test order to this section
  const handleAddNewOrder = (e) => {
    e.preventDefault();
    if (!newPatient || !newTest) return;

    const newOrder = {
      id: Date.now(),
      reqId: `LAB-${selectedSection.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      patient: newPatient,
      test: newTest,
      priority: newPriority,
      station: currentConfig.defaultStation,
      doctor: newDoctor,
      status: 'Requested',
      result: 'Awaiting sample collection and analyzer loading',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSectionData((prev) => ({
      ...prev,
      [selectedSection]: [newOrder, ...prev[selectedSection]]
    }));

    setNewPatient('');
    setNewTest('');
    setShowAddModal(false);
  };

  // Fast Status Update
  const handleUpdateStatus = (recId, nextStatus) => {
    setSectionData((prev) => ({
      ...prev,
      [selectedSection]: prev[selectedSection].map((r) => 
        r.id === recId ? { ...r, status: nextStatus } : r
      )
    }));
  };

  // Section summary statistics
  const totalOrders = records.length;
  const completedOrders = records.filter(r => r.status === 'Completed' || r.status === 'Verified' || r.status === 'Billed').length;
  const inProgressOrders = records.filter(r => r.status === 'In Processing' || r.status === 'Incubating' || r.status === 'Tissue Grossing' || r.status === 'Sample Collected').length;
  const urgentAlerts = records.filter(r => r.priority === 'Urgent' || r.priority === 'Stat' || r.status === 'Critical Alert').length;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-[#041c24] to-[#012f38] text-slate-100 p-4 sm:p-6 lg:p-8 rounded-3xl border border-teal-900/50 shadow-2xl relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white space-y-6">
      
      {/* Background Clinical Grid & Glows matching Lab Login */}
      <div className="absolute inset-0 bg-[radial-gradient(#008080_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/25 ring-1 ring-white/20">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Laboratory Information Management System
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-950/80 text-teal-300 border border-teal-600/50 px-2.5 py-0.5 rounded-full">
                LIMS Core
              </span>
            </div>
            <p className="text-xs text-teal-300/80 font-medium mt-0.5">
              Multi-specialty pathology routing, analytical machine benches, and shift diagnostic queue.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-teal-500/25 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Order {currentConfig.label} Test</span>
          </button>
        </div>
      </div>

      {/* 1. Lab Section / Shift Selector Bar (Styled identically to Lab Login Theme) */}
      <div className="relative z-10">
        <LabSectionBar 
          activeSection={selectedSection} 
          onSectionChange={handleSectionChange}
          showDetails={true}
        />
      </div>

      {/* 2. Active Section Operational Metric Cards with Top Glow Lines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        
        {/* Metric 1 */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-800/50 rounded-2xl p-5 shadow-xl shadow-slate-950/60 relative overflow-hidden group hover:border-teal-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-teal-300/80 uppercase tracking-wider">Total Shift Orders</p>
              <h3 className="text-3xl font-black text-white mt-1 font-mono">{totalOrders}</h3>
              <span className="text-[11px] text-teal-400 font-medium">Synced with Prescriptions</span>
            </div>
            <div className="w-12 h-12 bg-teal-500/15 border border-teal-500/30 text-teal-400 rounded-2xl flex items-center justify-center font-bold shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-800/50 rounded-2xl p-5 shadow-xl shadow-slate-950/60 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider">Verified / Completed</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1 font-mono">{completedOrders}</h3>
              <span className="text-[11px] text-emerald-300 font-medium">Published to Patient EMR</span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center font-bold shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-800/50 rounded-2xl p-5 shadow-xl shadow-slate-950/60 relative overflow-hidden group hover:border-cyan-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-cyan-300/80 uppercase tracking-wider">In Processing</p>
              <h3 className="text-3xl font-black text-cyan-400 mt-1 font-mono">{inProgressOrders}</h3>
              <span className="text-[11px] text-cyan-300 font-medium">Avg TAT: {currentConfig.tat}</span>
            </div>
            <div className="w-12 h-12 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-2xl flex items-center justify-center font-bold shadow-inner">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-800/50 rounded-2xl p-5 shadow-xl shadow-slate-950/60 relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-300/80 uppercase tracking-wider">Critical / Stat Priority</p>
              <h3 className="text-3xl font-black text-rose-400 mt-1 font-mono">{urgentAlerts}</h3>
              <span className="text-[11px] text-rose-300 font-medium">Physician Panic Alert</span>
            </div>
            <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center font-bold shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Catalog Quick Template Order Buttons */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-teal-800/50 p-4 shadow-xl relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>Frequent {currentConfig.label} Diagnostic Panels</span>
          </h3>
          <span className="text-[10px] text-teal-300/70 font-mono">1-Click Fast Order</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentConfig.commonTests.map((t) => (
            <button
              key={t}
              onClick={() => {
                setNewTest(t);
                setNewPatient('Aarav Kumar');
                setShowAddModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-teal-950 hover:border-teal-400/80 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
            >
              <span>{t}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-teal-400" />
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Section Diagnostic Test Queue Table with LIMS Dark Cyber Aesthetics */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-teal-800/50 shadow-2xl overflow-hidden relative z-10">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-teal-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400/70" />
            <input
              type="text"
              placeholder={`Search ${currentConfig.label} tests, patients, IDs...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-teal-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-teal-300">Priority Filter:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-900 border border-teal-700/60 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
              <option value="Stat">Stat (Emergency)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-teal-300 uppercase font-mono text-[10px] tracking-wider border-b border-teal-900/60">
              <tr>
                <th className="py-3.5 px-4">Req ID & Time</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Diagnostic Test Name</th>
                <th className="py-3.5 px-4">Bench Station</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Findings / Results</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((row) => {
                  const isCritical = row.status === 'Critical Alert' || row.priority === 'Urgent' || row.priority === 'Stat';
                  return (
                    <tr key={row.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-300">
                        <div>{row.reqId}</div>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">{row.time}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {row.patient}
                        <div className="text-[10px] text-slate-400 font-normal">Req: {row.doctor}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-100 max-w-xs">
                        {row.test}
                      </td>
                      <td className="py-3.5 px-4 text-teal-200/90 font-mono text-[11px]">
                        {row.station}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.priority === 'Stat' || row.priority === 'Urgent'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 shadow-sm shadow-rose-950'
                            : row.priority === 'High'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={row.result}>
                        {row.result}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'Completed' || row.status === 'Verified' || row.status === 'Billed'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950'
                            : row.status === 'Critical Alert'
                            ? 'bg-rose-950/90 text-rose-300 border border-rose-500/70 animate-pulse shadow-sm shadow-rose-950'
                            : row.status === 'In Processing' || row.status === 'Incubating'
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedRecord(row)}
                            className="p-2 text-teal-400 hover:text-white bg-slate-950 hover:bg-teal-900/60 border border-teal-800/60 rounded-xl transition-all"
                            title="View Full Lab Report"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {row.status !== 'Completed' && (
                            <button
                              onClick={() => handleUpdateStatus(row.id, 'Completed')}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-xl text-[10px] font-bold border border-emerald-500/50 transition-colors cursor-pointer"
                              title="Mark as Verified & Complete"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No diagnostic records found for {currentConfig.label} matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. All 7 Laboratory Sections Overview Grid */}
      <div className="pt-2 relative z-10">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>All 7 Laboratory Subsystem Workstations</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {LAB_SECTIONS_CONFIG.map((sec) => {
            const isCurrent = sec.id === selectedSection;
            const secOrders = sectionData[sec.id]?.length || 0;
            return (
              <div 
                key={sec.id}
                onClick={() => handleSectionChange(sec.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl shadow-xl relative overflow-hidden ${
                  isCurrent 
                    ? 'bg-slate-900 border-teal-400 ring-2 ring-teal-400/50 shadow-teal-500/10' 
                    : 'bg-slate-900/60 border-teal-900/40 hover:border-teal-600/70 hover:bg-slate-850'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400"></div>
                )}
                
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{sec.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">{sec.label}</h4>
                      <p className="text-[10px] text-teal-300/70">TAT: {sec.tat}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950 text-teal-300 border border-teal-700/50 font-mono">
                    {secOrders} tests
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-3">
                  {sec.description}
                </p>

                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono truncate max-w-[130px]">
                    {sec.defaultStation}
                  </span>
                  <span className={`font-bold flex items-center gap-1 ${isCurrent ? 'text-teal-300' : 'text-slate-400'}`}>
                    {isCurrent ? 'Active Workstation' : 'Switch ➔'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Create New Diagnostic Test Request */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/50 rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400"></div>

            <div className="flex items-center justify-between pb-3 border-b border-teal-900/50 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{currentConfig.icon}</span>
                <div>
                  <h3 className="font-bold text-white text-base">New {currentConfig.label} Test Order</h3>
                  <p className="text-xs text-teal-300/80">Route to {currentConfig.defaultStation}</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewOrder} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-200 mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Kumar"
                  value={newPatient}
                  onChange={(e) => setNewPatient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-teal-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">Test Name / Panel</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count"
                  value={newTest}
                  onChange={(e) => setNewTest(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-teal-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-teal-700/60 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Stat">Stat (Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">Prescribing Doctor</label>
                  <select
                    value={newDoctor}
                    onChange={(e) => setNewDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-teal-700/60 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
                  >
                    <option value="Dr. Madhavan">Dr. Madhavan</option>
                    <option value="Dr. S. Karthikeyan">Dr. S. Karthikeyan</option>
                    <option value="Dr. Priya Nair">Dr. Priya Nair</option>
                    <option value="Dr. Murugan Jeyaraman">Dr. Murugan Jeyaraman</option>
                    <option value="Dr. Raj Kanna">Dr. Raj Kanna</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-teal-800/60 text-teal-300 text-[11px]">
                🔒 Assigned Bench: <strong className="text-white font-mono">{currentConfig.defaultStation}</strong>. Digital specimen barcode will be tracked for this shift.
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 rounded-xl font-bold shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  Confirm & Route to {selectedSection}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: View Detailed Section Diagnostic Report */}
      {/* ========================================================================= */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/50 rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400"></div>

            <div className="flex justify-between items-start border-b border-teal-900/60 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-700/50">
                  {selectedSection} Diagnostic Finding
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{selectedRecord.test}</h3>
                <p className="text-xs text-teal-400/80 font-mono">Req Ref: {selectedRecord.reqId}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">PATIENT</span>
                  <strong className="text-white">{selectedRecord.patient}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">REQUESTED BY</span>
                  <strong className="text-white">{selectedRecord.doctor}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ANALYZER BENCH</span>
                  <strong className="text-teal-300 font-mono text-[11px]">{selectedRecord.station}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TIME LOGGED</span>
                  <strong className="text-white">{selectedRecord.time}</strong>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-teal-800/70 text-slate-100 rounded-2xl space-y-1 font-mono text-xs shadow-inner">
                <span className="text-teal-400 text-[10px] font-bold uppercase tracking-wider block">Verified Clinical Result:</span>
                <p className="text-sm font-bold text-white">{selectedRecord.result}</p>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Verified by Senior Tech: <strong className="text-white">Anil Mehta</strong></span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> HIPAA Certified
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
