import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Monitor, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  ChevronDown, 
  Clock, 
  User, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Filter
} from 'lucide-react';

export const LAB_SECTIONS_CONFIG = [
  { 
    id: 'Hematology', 
    label: 'Hematology', 
    icon: '🩸', 
    color: 'from-rose-500/20 to-rose-600/10',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-400',
    defaultStation: 'Hematology Beckman-X2',
    description: 'CBC Blood Counts, ESR, Platelets, Coagulation & Peripheral Smears',
    commonTests: ['Complete Blood Count (CBC)', 'Erythrocyte Sedimentation Rate (ESR)', 'Prothrombin Time (PT/INR)', 'Peripheral Blood Smear', 'Reticulocyte Count'],
    tat: '45 mins',
    benchStatus: 'Calibrated & Ready (Beckman-X2)'
  },
  { 
    id: 'Biochemistry', 
    label: 'Biochemistry', 
    icon: '🧪', 
    color: 'from-teal-500/20 to-teal-600/10',
    borderColor: 'border-teal-500/40',
    textColor: 'text-teal-400',
    defaultStation: 'Biochemistry Analyzer-01',
    description: 'LFT, KFT, Serum Electrolytes, Blood Glucose, Lipid Profiles & Enzymes',
    commonTests: ['Liver Function Test (LFT)', 'Kidney Function Test (KFT)', 'Lipid Profile', 'HbA1c & Fasting Glucose', 'Serum Electrolytes (Na/K/Cl)'],
    tat: '60 mins',
    benchStatus: 'Online & Loaded (Cobas-6000)'
  },
  { 
    id: 'Microbiology', 
    label: 'Microbiology', 
    icon: '🧫', 
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    defaultStation: 'Microbiology Sterile Desk-04',
    description: 'Bacterial/Fungal Cultures, Gram Staining, Antibiograms & Blood Cultures',
    commonTests: ['Urine Culture & Sensitivity', 'Blood Culture (BacT/Alert)', 'Sputum Gram Stain', 'Stool Routine & Culture', 'Antibiotic Susceptibility Panel'],
    tat: '24-48 hrs',
    benchStatus: 'Sterile Incubator Active (37°C)'
  },
  { 
    id: 'Histopathology', 
    label: 'Histopathology', 
    icon: '🔬', 
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-400',
    defaultStation: 'Histology Tissue-Station-03',
    description: 'Biopsy Processing, Frozen Sections, Cytology, Pap Smear & IHC Staining',
    commonTests: ['Core Needle Biopsy Analysis', 'Excisional Tissue Gross & Micro', 'Frozen Section Intraoperative', 'FNAC & Pap Smear', 'IHC Marker Panel (ER/PR/HER2)'],
    tat: '3-5 days',
    benchStatus: 'Microtome & Cryostat Ready'
  },
  { 
    id: 'Blood Bank', 
    label: 'Blood Bank', 
    icon: '💉', 
    color: 'from-red-500/20 to-red-600/10',
    borderColor: 'border-red-500/40',
    textColor: 'text-red-400',
    defaultStation: 'Blood Bank Cold-Chain-01',
    description: 'ABO/Rh Blood Typing, Crossmatching, PRBC & Platelet Unit Inventory',
    commonTests: ['ABO & Rh Grouping', 'Major & Minor Crossmatching', 'Antibody Screening (Coombs)', 'Component Separation & Issue', 'Fresh Frozen Plasma (FFP) Prep'],
    tat: '30 mins (Stat)',
    benchStatus: 'Cold-Chain 4°C Monitored'
  },
  { 
    id: 'Emergency/POCT', 
    label: 'Emergency / POCT', 
    icon: '⚡', 
    color: 'from-amber-500/20 to-amber-600/10',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    defaultStation: 'POCT Rapid Bench-A',
    description: 'Stat Arterial Blood Gas (ABG), Troponin-I, D-Dimer & Critical Resuscitation',
    commonTests: ['Stat Arterial Blood Gas (ABG)', 'Cardiac Troponin-I Rapid', 'D-Dimer Quantitative', 'Stat Serum Lactate', 'Rapid Electrolytes & Toxic Screen'],
    tat: '15 mins (Urgent)',
    benchStatus: 'Stat POC Cartridge Online'
  },
  { 
    id: 'Admin/Billing', 
    label: 'Admin / Billing', 
    icon: '📊', 
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    defaultStation: 'Central LIMS Audit Desk',
    description: 'Diagnostic Pricing, CAP/NABL Quality Control, Reagent Stock & Audit Trail',
    commonTests: ['LIMS Shift Audit Report', 'Quality Control Levey-Jennings Log', 'Reagent Batch Validation', 'Billing Tariff Calibration', 'External QA Specimen Log'],
    tat: 'Real-time',
    benchStatus: 'Audit Console Verified'
  }
];

export default function LabSectionBar({ activeSection: activeSectionProp, onSectionChange, showDetails = false }) {
  const [activeSection, setActiveSection] = useState(() => {
    if (activeSectionProp) return activeSectionProp;
    return localStorage.getItem('hms_active_lab_section') || 'Biochemistry';
  });

  const [activeStation, setActiveStation] = useState(() => {
    return localStorage.getItem('hms_active_station_id') || 'Biochemistry Analyzer-01';
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (activeSectionProp) {
      setActiveSection(activeSectionProp);
    }
  }, [activeSectionProp]);

  const handleSelect = (secId) => {
    setActiveSection(secId);
    localStorage.setItem('hms_active_lab_section', secId);
    
    const config = LAB_SECTIONS_CONFIG.find(s => s.id === secId);
    if (config) {
      setActiveStation(config.defaultStation);
      localStorage.setItem('hms_active_station_id', config.defaultStation);
    }

    if (onSectionChange) {
      onSectionChange(secId, config?.defaultStation);
    }
    setIsDropdownOpen(false);
  };

  const currentConfig = LAB_SECTIONS_CONFIG.find(s => s.id === activeSection) || LAB_SECTIONS_CONFIG[1];

  return (
    <div className="w-full bg-slate-900 text-white rounded-2xl border border-teal-800/40 p-4 shadow-xl mb-6 relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-80 h-full bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        
        {/* Left: Interactive Section Dropdown (Styled identically to attached screenshot) */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Section Dropdown Box */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-300/80 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>LAB SECTION / SHIFT</span>
            </label>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between min-w-[220px] sm:min-w-[260px] bg-slate-950/90 border-2 border-teal-400/90 hover:border-teal-300 rounded-2xl px-4 py-2.5 text-white font-bold text-sm shadow-lg shadow-teal-500/10 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">{currentConfig.icon}</span>
                  <span className="text-white font-bold tracking-wide">{currentConfig.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-teal-300 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  ></div>
                  <div className="absolute left-0 mt-2 w-72 bg-slate-950 border border-teal-500/50 rounded-2xl shadow-2xl z-50 py-2 animate-in zoom-in-95 duration-150 overflow-hidden backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-teal-400 uppercase tracking-wider border-b border-slate-800">
                      Select Laboratory Section
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {LAB_SECTIONS_CONFIG.map((sec) => {
                        const isSelected = sec.id === activeSection;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSelect(sec.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white font-bold'
                                : 'text-slate-200 hover:bg-slate-800/90 hover:text-teal-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-base">{sec.icon}</span>
                              <span>{sec.label}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-teal-200" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Station / Bench ID Field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-300/80 mb-1.5 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-teal-400" />
              <span>STATION / BENCH ID</span>
            </label>
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-teal-800/60 rounded-2xl px-4 py-2.5 text-xs text-slate-200 font-mono">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-[220px]">
                {activeStation}
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1 shrink-0" title="Bench Hardware Online"></span>
            </div>
          </div>
        </div>

        {/* Right: Section Meta Badges (TAT, Technician & Intranet) */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Avg TAT: <strong className="text-teal-200">{currentConfig.tat}</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-1.5 font-medium shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Intranet (10.240.x)</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-teal-950/60 border border-teal-600/40 text-[11px] text-teal-200 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-teal-400" />
            <span>Tech: <strong>Anil Mehta</strong></span>
          </div>
        </div>

      </div>

      {/* Quick Section Switcher Pills for Instant 1-Click Navigation */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3 text-teal-400" />
          <span>Sections:</span>
        </span>
        {LAB_SECTIONS_CONFIG.map((sec) => {
          const isSel = sec.id === activeSection;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleSelect(sec.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                isSel
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                  : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-teal-700/50 hover:bg-slate-800'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Section Description if enabled */}
      {showDetails && (
        <div className="mt-3 p-3 bg-slate-950/70 rounded-xl border border-teal-900/40 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentConfig.icon}</span>
            <div>
              <strong className="text-teal-300 font-bold">{currentConfig.label} Workstation:</strong>{' '}
              <span className="text-slate-300">{currentConfig.description}</span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 font-semibold shrink-0">
            🟢 {currentConfig.benchStatus}
          </div>
        </div>
      )}

    </div>
  );
}
