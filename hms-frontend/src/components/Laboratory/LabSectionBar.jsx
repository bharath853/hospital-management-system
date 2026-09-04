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
    id: 'Clinical Chemistry', 
    label: 'Clinical Chemistry', 
    icon: '🧪', 
    defaultStation: 'Biochemistry Analyzer-01',
    description: 'LFT, KFT, Serum Electrolytes, HbA1c & Enzymes',
    commonTests: ['Glycated Hemoglobin (HbA1c)', 'Serum Creatinine & KFT', 'Lipid Profile', 'Liver Function Test (LFT)', 'Serum Electrolytes'],
    tat: '60 mins',
    benchStatus: 'Online & Loaded (Cobas-6000)'
  },
  { 
    id: 'Hematology', 
    label: 'Hematology', 
    icon: '🩸', 
    defaultStation: 'Hematology Beckman-X2',
    description: 'CBC Blood Counts, ESR, Platelets & Coagulation',
    commonTests: ['Complete Blood Count (CBC)', 'Erythrocyte Sedimentation Rate (ESR)', 'Prothrombin Time (PT/INR)', 'Peripheral Blood Smear'],
    tat: '45 mins',
    benchStatus: 'Calibrated & Ready (Beckman-X2)'
  },
  { 
    id: 'Microbiology', 
    label: 'Microbiology', 
    icon: '🧫', 
    defaultStation: 'Microbiology Sterile Desk-04',
    description: 'Bacterial/Fungal Cultures, Gram Staining & Blood Cultures',
    commonTests: ['Blood Culture & Sensitivity Pair', 'Urine Culture', 'Sputum Gram Stain', 'Antibiotic Susceptibility Panel'],
    tat: '24-48 hrs',
    benchStatus: 'Sterile Incubator Active (37°C)'
  },
  { 
    id: 'Immunology', 
    label: 'Immunology / Serology', 
    icon: '🛡️', 
    defaultStation: 'Immunology Immunoassay Bench-02',
    description: 'Antinuclear Antibody (ANA), CRP, Rheumatoid Factor & Serology',
    commonTests: ['Antinuclear Antibody (ANA)', 'C-Reactive Protein (CRP)', 'Rheumatoid Factor', 'Viral Markers Serology'],
    tat: '180 mins',
    benchStatus: 'Fluorescence Immunoanalyzer Ready'
  },
  { 
    id: 'Blood Bank', 
    label: 'Immunohematology / Blood Bank', 
    icon: '💉', 
    defaultStation: 'Blood Bank Cold-Chain-01',
    description: 'ABO/Rh Blood Grouping, Crossmatching & PRBC Units',
    commonTests: ['ABO & Rh Blood Grouping', 'Major & Minor Crossmatching', 'Coombs Test', 'PRBC Component Reservation'],
    tat: '30 mins (Stat)',
    benchStatus: 'Cold-Chain 4°C Monitored'
  },
  { 
    id: 'Urinalysis', 
    label: 'Urinalysis / Clinical Microscopy', 
    icon: '💧', 
    defaultStation: 'Urinalysis Microscope Station-01',
    description: 'Urine Routine, Microscopic Sediment, Protein & Glucose',
    commonTests: ['Urine Routine & Clinical Microscopy', 'Urine Protein Quantitative', 'Bence Jones Protein', 'Stool Microscopy'],
    tat: '30 mins',
    benchStatus: 'Automated Sediment Analyzer Online'
  },
  { 
    id: 'Molecular Diagnostics', 
    label: 'Molecular Diagnostics / Pathology', 
    icon: '🔬', 
    defaultStation: 'Molecular PCR Workstation-03',
    description: 'Real-Time PCR Analysis, Gene Sequencing & Tissue Biopsy',
    commonTests: ['Pathogen Real-Time PCR', 'Tissue Biopsy Histopathology', 'Cytology Pap Smear', 'Target Ct Amplification'],
    tat: '120 mins',
    benchStatus: 'Thermal Cycler & PCR Bench Active'
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
    <div className="w-full bg-white text-[#10201B] rounded-2xl border border-[#DDE5E0] p-4 sm:p-5 shadow-card mb-6 relative">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Section Dropdown Box & Station ID */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Section Dropdown Box */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65756E] mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#087F5B]" />
              <span>LAB SECTION / SHIFT</span>
            </label>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between min-w-[220px] sm:min-w-[260px] bg-[#F6F8F6] border-2 border-[#087F5B] hover:border-[#07543F] rounded-2xl px-4 py-2 text-[#10201B] font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">{currentConfig.icon}</span>
                  <span className="text-[#10201B] font-bold tracking-wide">{currentConfig.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#087F5B] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  ></div>
                  <div className="absolute left-0 mt-2 w-72 bg-white border border-[#DDE5E0] rounded-2xl shadow-2xl z-50 py-2 animate-in zoom-in-95 duration-150 overflow-hidden text-[#10201B]">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#087F5B] uppercase tracking-wider border-b border-[#DDE5E0]">
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
                                ? 'bg-[#EEF7F1] text-[#052E24] font-bold'
                                : 'text-[#10201B] hover:bg-[#F6F8F6] hover:text-[#087F5B]'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-base">{sec.icon}</span>
                              <span>{sec.label}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65756E] mb-1.5 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[#087F5B]" />
              <span>STATION / BENCH ID</span>
            </label>
            <div className="flex items-center space-x-2 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl px-4 py-2 text-xs text-[#10201B] font-mono">
              <Cpu className="w-4 h-4 text-[#087F5B] shrink-0" />
              <span className="font-semibold text-[#10201B] truncate max-w-[180px] sm:max-w-[220px]">
                {activeStation}
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#12B886] animate-pulse ml-1 shrink-0" title="Bench Hardware Online"></span>
            </div>
          </div>
        </div>

        {/* Right: Section Meta Badges */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="px-3 py-1.5 rounded-xl bg-[#F6F8F6] border border-[#DDE5E0] text-[11px] text-[#65756E] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#087F5B]" />
            <span>Avg TAT: <strong className="text-[#10201B] font-bold">{currentConfig.tat}</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5 font-bold shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure Intranet (10.240.x)</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#F6F8F6] border border-[#DDE5E0] text-[11px] text-[#65756E] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#087F5B]" />
            <span>Tech: <strong className="text-[#10201B]">Anil Mehta</strong></span>
          </div>
        </div>

      </div>

      {/* Quick Section Switcher Pills */}
      <div className="mt-4 pt-3 border-t border-[#DDE5E0] flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-[#65756E] shrink-0 flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3 text-[#087F5B]" />
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
                  ? 'bg-[#052E24] text-white font-bold shadow-sm'
                  : 'bg-[#F6F8F6] text-[#10201B] border border-[#DDE5E0] hover:bg-[#EEF7F1] hover:text-[#087F5B]'
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
        <div className="mt-3 p-3 bg-[#EEF7F1] rounded-xl border border-[#087F5B]/30 text-xs text-[#10201B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentConfig.icon}</span>
            <div>
              <strong className="text-[#052E24] font-bold">{currentConfig.label} Workstation:</strong>{' '}
              <span className="text-[#65756E]">{currentConfig.description}</span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#087F5B] font-bold shrink-0">
            🟢 {currentConfig.benchStatus}
          </div>
        </div>
      )}

    </div>
  );
}
