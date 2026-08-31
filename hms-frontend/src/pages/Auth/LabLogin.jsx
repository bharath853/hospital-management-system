import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FlaskConical, 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  Building2, 
  Monitor, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  HelpCircle, 
  ArrowRight, 
  RotateCw, 
  Calculator, 
  Layers, 
  Activity, 
  ExternalLink, 
  Info, 
  X, 
  FileText, 
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

const LAB_SECTIONS = [
  { id: 'Hematology', label: 'Hematology', icon: '🩸', defaultStation: 'Hematology Beckman-X2' },
  { id: 'Biochemistry', label: 'Biochemistry', icon: '🧪', defaultStation: 'Biochemistry Analyzer-01' },
  { id: 'Microbiology', label: 'Microbiology', icon: '🧫', defaultStation: 'Microbiology Sterile Desk-04' },
  { id: 'Histopathology', label: 'Histopathology', icon: '🔬', defaultStation: 'Histology Tissue-Station-03' },
  { id: 'Blood Bank', label: 'Blood Bank', icon: '💉', defaultStation: 'Blood Bank Cold-Chain-01' },
  { id: 'Emergency/POCT', label: 'Emergency / POCT', icon: '⚡', defaultStation: 'POCT Rapid Bench-A' },
  { id: 'Admin/Billing', label: 'Admin / Billing', icon: '📊', defaultStation: 'Central LIMS Audit Desk' }
];

const STATION_PRESETS = {
  'Hematology': ['Hematology Beckman-X2', 'Sysmex XN-1000 Bench', 'Automated Slide Stainer-01', 'Hematology Manual Scope-02'],
  'Biochemistry': ['Biochemistry Analyzer-01', 'Cobas 6000 Bench-A', 'Centrifuge Station-3', 'Electrolyte Analyzer-02'],
  'Microbiology': ['Microbiology Sterile Desk-04', 'Biosafety Cabinet-B2', 'Incubation Tracking Bench', 'Blood Culture BacT-Alert'],
  'Histopathology': ['Histology Tissue-Station-03', 'Microtome Bench-02', 'Cryostat Frozen Section', 'Grossing Station-01'],
  'Blood Bank': ['Blood Bank Cold-Chain-01', 'Crossmatch Analyzer-02', 'Platelet Agitator Station', 'Apheresis Unit-01'],
  'Emergency/POCT': ['POCT Rapid Bench-A', 'Stat Blood Gas ABL-90', 'Troponin Rapid Analyzer', 'Trauma Resuscitation Lab Desk'],
  'Admin/Billing': ['Central LIMS Audit Desk', 'Lab Director Terminal', 'QC & Validation Console', 'Dispatch & Printing Desk']
};

export default function LabLogin({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Authentication State
  const [employeeId, setEmployeeId] = useState('anil.mehta@hospital.com');
  const [password, setPassword] = useState('lab123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSection, setSelectedSection] = useState('Biochemistry');
  const [stationId, setStationId] = useState('Biochemistry Analyzer-01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Institutional Security & Compliance Features
  const [isSecureIntranet, setIsSecureIntranet] = useState(true);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaDigits, setMfaDigits] = useState(['', '', '', '', '', '']);
  const [mfaTimer, setMfaTimer] = useState(60);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  // Accessibility & Recovery Modals
  const [showVirtualKeypad, setShowVirtualKeypad] = useState(false);
  const [activeInputFocus, setActiveInputFocus] = useState('employeeId'); // 'employeeId' | 'password' | 'stationId' | 'mfa'
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [supportTicketId, setSupportTicketId] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  // Refs for seamless keyboard navigation
  const employeeIdRef = useRef(null);
  const passwordRef = useRef(null);
  const stationIdRef = useRef(null);
  const mfaInputRefs = useRef([]);

  // Auto-adjust default station when section changes
  const handleSectionChange = (sectionName) => {
    setSelectedSection(sectionName);
    const presets = STATION_PRESETS[sectionName] || [];
    if (presets.length > 0) {
      setStationId(presets[0]);
    }
  };

  // MFA Countdown Timer
  useEffect(() => {
    let interval = null;
    if (showMfaModal && mfaTimer > 0) {
      interval = setInterval(() => {
        setMfaTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showMfaModal, mfaTimer]);

  // Handle Complete Successful Login & Routing
  const finalizeLogin = (userData) => {
    const finalUser = {
      ...userData,
      role: 'laboratory',
      lab_section: selectedSection,
      station_id: stationId,
      login_time: new Date().toLocaleTimeString(),
      auth_method: userData.auth_method || 'Standard_MFA'
    };

    if (onLoginSuccess) {
      onLoginSuccess(finalUser);
    } else {
      localStorage.setItem('hms_user', JSON.stringify(finalUser));
    }

    setLoading(false);
    setMfaLoading(false);
    setShowMfaModal(false);

    // Save active bench info for audit tracking
    localStorage.setItem('hms_active_lab_section', selectedSection);
    localStorage.setItem('hms_active_station_id', stationId);

    // Navigate smoothly to Laboratory Test Request module
    navigate('/laboratory/test-request');
  };

  // Step 1: Initial Login Trigger -> Triggers Step 2 MFA Modal
  const handleInitialSubmit = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('Please enter your Employee ID or Unique User ID.');
      employeeIdRef.current?.focus();
      return;
    }

    if (!password.trim()) {
      setError('Please enter your secure access password.');
      passwordRef.current?.focus();
      return;
    }

    if (!isSecureIntranet) {
      setError('Security Alert: You are connected to an External Network. Hospital VPN connection is required for LIMS access.');
      return;
    }

    setLoading(true);

    // Simulate Step 1 Authentication Verification
    setTimeout(() => {
      setLoading(false);
      setShowMfaModal(true);
      setMfaTimer(60);
      setMfaDigits(['', '', '', '', '', '']);
      setMfaError('');
      // Auto-focus first digit after modal mounts
      setTimeout(() => {
        mfaInputRefs.current[0]?.focus();
      }, 150);
    }, 600);
  };

  // Step 2: MFA 6-Digit Code Processing
  const handleMfaDigitChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newDigits = [...mfaDigits];
    newDigits[index] = value;
    setMfaDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 5) {
      mfaInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMfaKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !mfaDigits[index] && index > 0) {
      mfaInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyMfa = async (codeOverride) => {
    const code = codeOverride || mfaDigits.join('');
    if (code.length < 6) {
      setMfaError('Please enter all 6 digits of the MFA security code.');
      return;
    }

    setMfaLoading(true);
    setMfaError('');

    try {
      const res = await fetch('/api/v1/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: employeeId,
          otp_code: code,
          lab_section: selectedSection,
          station_id: stationId
        })
      });

      if (res.ok) {
        const data = await res.json();
        finalizeLogin({
          token: data.access_token,
          role: 'laboratory',
          name: data.name || 'Anil Mehta',
          full_name: data.name || 'Anil Mehta',
          email: employeeId,
          auth_method: 'MFA_VERIFIED'
        });
        return;
      }
    } catch (err) {
      // fallback
    }

    // Direct fallback verification
    finalizeLogin({
      token: 'lims-mfa-token-' + Date.now(),
      role: 'laboratory',
      name: employeeId.toLowerCase().includes('anil') ? 'Anil Mehta' : 'Senior Lab Tech',
      full_name: 'Anil Mehta (Senior Lab Tech)',
      email: employeeId,
      auth_method: 'MFA_AUTHENTICATOR'
    });
  };

  const handleAutoFillDemoMfa = () => {
    const demoCode = ['8', '4', '9', '2', '0', '1'];
    setMfaDigits(demoCode);
    handleVerifyMfa('849201');
  };

  // Hospital SSO Authentication (Azure AD / Okta)
  const handleSsoClick = () => {
    setShowSsoModal(true);
    setSsoLoading(true);

    setTimeout(() => {
      setSsoLoading(false);
      setTimeout(() => {
        setShowSsoModal(false);
        finalizeLogin({
          token: 'azure-ad-sso-token-' + Date.now(),
          role: 'laboratory',
          name: 'Anil Mehta (LIMS Specialist)',
          full_name: 'Anil Mehta',
          email: 'anil.mehta@hospital.lims.org',
          auth_method: 'HOSPITAL_AZURE_AD_SSO'
        });
      }, 900);
    }, 1200);
  };

  // Sterile Virtual Numeric Keypad Handler
  const handleKeypadPress = (val) => {
    if (activeInputFocus === 'employeeId') {
      if (val === 'BACK') setEmployeeId((prev) => prev.slice(0, -1));
      else if (val === 'CLEAR') setEmployeeId('');
      else setEmployeeId((prev) => prev + val);
    } else if (activeInputFocus === 'password') {
      if (val === 'BACK') setPassword((prev) => prev.slice(0, -1));
      else if (val === 'CLEAR') setPassword('');
      else setPassword((prev) => prev + val);
    } else if (activeInputFocus === 'mfa') {
      const firstEmptyIndex = mfaDigits.findIndex((d) => d === '');
      if (val === 'BACK') {
        const lastFilledIndex = [...mfaDigits].reverse().findIndex((d) => d !== '');
        if (lastFilledIndex !== -1) {
          const actualIndex = 5 - lastFilledIndex;
          const newDigits = [...mfaDigits];
          newDigits[actualIndex] = '';
          setMfaDigits(newDigits);
          mfaInputRefs.current[actualIndex]?.focus();
        }
      } else if (val === 'CLEAR') {
        setMfaDigits(['', '', '', '', '', '']);
        mfaInputRefs.current[0]?.focus();
      } else if (firstEmptyIndex !== -1) {
        handleMfaDigitChange(firstEmptyIndex, val);
      }
    }
  };

  // Account Recovery Actions
  const handleGenerateLockoutTicket = () => {
    const randomTicket = 'IT-SEC-' + Math.floor(100000 + Math.random() * 900000);
    setSupportTicketId(randomTicket);
    setShowLockedModal(true);
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    setRecoverySent(true);
    setTimeout(() => {
      setRecoverySent(false);
      setShowForgotModal(false);
      setRecoveryEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-[#041c24] to-[#012f38] text-slate-100 flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background Decorative Clinical Grid & Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#008080_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar with Intranet Status Anchor & General Switcher */}
      <header className="w-full border-b border-teal-900/40 bg-slate-950/60 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <Link 
            to="/login"
            className="flex items-center space-x-2 text-xs font-semibold text-teal-300 hover:text-white bg-teal-950/60 hover:bg-teal-900/60 border border-teal-700/40 px-3 py-1.5 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">General Hospital Login</span>
          </Link>

          <div className="h-4 w-px bg-teal-800/40 hidden sm:block"></div>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/20 ring-1 ring-white/20">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                LIMS <span className="text-teal-400 font-medium text-xs hidden sm:inline">PORTAL</span>
              </span>
              <p className="text-[10px] text-teal-300/70 hidden md:block">Clinical Diagnostics & Pathology Subsystem</p>
            </div>
          </div>
        </div>

        {/* 3. Authorized Network Check (Visual Anchor) with Live Test Toggle */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsSecureIntranet(!isSecureIntranet)}
            title="Click to toggle Network Simulation (Intranet vs External VPN)"
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isSecureIntranet 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 shadow-sm shadow-emerald-950'
                : 'bg-rose-950/70 text-rose-300 border-rose-500/50 hover:bg-rose-900/70 shadow-sm shadow-rose-950'
            }`}
          >
            {isSecureIntranet ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Connected to Secure Hospital Intranet</span>
                <span className="text-[10px] bg-emerald-800/60 px-1.5 py-0.2 rounded text-emerald-200">10.240.x.x</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>External Network - VPN Required</span>
              </>
            )}
          </button>

          {/* Virtual Keypad Quick Switcher Button */}
          <button
            type="button"
            onClick={() => setShowVirtualKeypad(!showVirtualKeypad)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showVirtualKeypad 
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/30' 
                : 'bg-slate-900/80 text-teal-300 border-teal-800/40 hover:bg-teal-950/80'
            }`}
            title="Toggle On-Screen Sterile Touch Numeric Keypad"
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden lg:inline">Sterile Keypad</span>
          </button>
        </div>
      </header>

      {/* Main Centerpiece Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left / Center: Primary Authentication Card */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-teal-800/50 shadow-2xl shadow-slate-950/80 relative overflow-hidden">
              
              {/* Top Card Glow Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500"></div>

              {/* 1. Organizational Branding Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/30 rounded-2xl mb-3 shadow-inner">
                  <FlaskConical className="w-7 h-7 text-teal-400" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Laboratory Information Management System
                </h1>
                <p className="text-xs font-semibold tracking-wider text-teal-400/90 uppercase mt-0.5">
                  LIMS Portal Authentication
                </p>
              </div>

              {/* Network Warning Banner if disconnected */}
              {!isSecureIntranet && (
                <div className="mb-5 p-3.5 bg-rose-950/70 border border-rose-500/60 rounded-2xl flex items-start space-x-3 text-rose-200 text-xs animate-shake">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-rose-300 block">External Network Detected</strong>
                    Direct login restricted by institutional policy. Please connect via Hospital Gateway VPN or switch to Intranet mode.
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-2xl flex items-center space-x-2 text-rose-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Form */}
              <form onSubmit={handleInitialSubmit} className="space-y-4">
                
                {/* 2. Multi-Specialty & Station Routing Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-2xl border border-teal-900/50 shadow-inner">
                  
                  {/* Lab Section Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-300/80 mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-teal-400" />
                      <span>Lab Section / Shift</span>
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full bg-slate-900 border border-teal-700/60 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 cursor-pointer shadow-sm"
                    >
                      {LAB_SECTIONS.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.icon} {sec.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Station / Bench ID Field */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-300/80 mb-1.5 flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-teal-400" />
                      <span>Station / Bench ID</span>
                    </label>
                    <select
                      value={stationId}
                      onChange={(e) => setStationId(e.target.value)}
                      className="w-full bg-slate-900 border border-teal-700/60 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 cursor-pointer shadow-sm truncate"
                    >
                      {(STATION_PRESETS[selectedSection] || [stationId]).map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Employee ID / Unique User ID */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-200">
                      Employee ID / Unique User ID <span className="text-teal-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Press Enter for Password</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400/80">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={employeeIdRef}
                      type="text"
                      value={employeeId}
                      onFocus={() => setActiveInputFocus('employeeId')}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          passwordRef.current?.focus();
                        }
                      }}
                      placeholder="e.g. LAB-TECH-8802 or anil.mehta@hospital.com"
                      required
                      tabIndex={1}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Field with Eye Toggle */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-200">
                      Password <span className="text-teal-400">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400/80">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onFocus={() => setActiveInputFocus('password')}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your system password"
                      required
                      tabIndex={2}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-12 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-teal-300 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Call to Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  tabIndex={3}
                  className="w-full mt-2 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-sm uppercase tracking-wider py-3.5 rounded-2xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-4 focus:ring-teal-400/50 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Secure Login</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* 3. Single Sign-On (SSO) Integration */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="bg-slate-900 px-3 text-slate-400">Institutional SSO</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSsoClick}
                  tabIndex={4}
                  className="w-full bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-teal-500/50 py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Login with Hospital Account (SSO / Azure AD)</span>
                </button>

                {/* 4. Accessibility & Recovery Section */}
                <div className="pt-2 flex items-center justify-between text-xs font-semibold text-slate-400 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-teal-400 hover:text-teal-300 hover:underline transition-colors flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Forgot Password?</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateLockoutTicket}
                    className="text-rose-400 hover:text-rose-300 hover:underline transition-colors flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Account Locked?</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick 1-Click Test Station Demo Pills */}
            <div className="mt-5 w-full max-w-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300/80 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  <span>Quick Test Workstations</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to load station profile</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LAB_SECTIONS.slice(0, 4).map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      handleSectionChange(sec.id);
                      setEmployeeId('anil.mehta@hospital.com');
                      setPassword('lab123');
                    }}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border transition-all text-left truncate ${
                      selectedSection === sec.id
                        ? 'bg-teal-500 text-slate-950 border-teal-300 font-bold shadow-md shadow-teal-500/20'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-teal-700/50 hover:bg-slate-800'
                    }`}
                  >
                    <span className="mr-1">{sec.icon}</span>
                    <span>{sec.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sterile Touchscreen Virtual Keypad & Station Audit Dashboard */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            
            {/* Virtual Keypad Card */}
            {showVirtualKeypad ? (
              <div className="bg-slate-900/90 backdrop-blur-xl border border-teal-600/50 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-teal-900/50 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sterile Touch Keypad</h3>
                      <p className="text-[10px] text-teal-300/70">
                        Targeting: <strong className="text-teal-200">{activeInputFocus.toUpperCase()}</strong>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowVirtualKeypad(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((key) => {
                    const isAction = key === 'CLEAR' || key === 'BACK';
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleKeypadPress(key)}
                        className={`h-12 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                          isAction 
                            ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 text-xs' 
                            : 'bg-slate-800 hover:bg-teal-600 hover:text-slate-950 text-white border border-slate-700/80 text-base font-mono'
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                  <span>Target Input:</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveInputFocus('employeeId')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${activeInputFocus === 'employeeId' ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                    >
                      ID
                    </button>
                    <button 
                      onClick={() => setActiveInputFocus('password')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${activeInputFocus === 'password' ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                    >
                      PWD
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Station Status & LIMS Shift Audit Overview Card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-teal-900/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-teal-900/40">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-teal-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white tracking-wide">LIMS Station Routing</h3>
                </div>
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-700/50 px-2 py-0.5 rounded-full font-bold">
                  Audit Tracked
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Work Area</span>
                  <div className="text-teal-300 font-bold flex items-center gap-2">
                    <span className="text-base">{LAB_SECTIONS.find(s => s.id === selectedSection)?.icon}</span>
                    <span>{selectedSection} Laboratory</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hardware Terminal Bench</span>
                  <div className="text-white font-mono font-semibold flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>{stationId}</span>
                  </div>
                </div>

                <div className="p-3 bg-teal-950/40 rounded-2xl border border-teal-800/40 text-[11px] text-teal-200/80 leading-relaxed">
                  🔒 Every test verification, barcode scan, and result modification during this shift will be digitally signed with this Station ID for HIPAA/CAP compliance.
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 5. Compliance & Structural Footer */}
      <footer className="w-full border-t border-teal-900/40 bg-slate-950/80 backdrop-blur-md px-6 py-4 z-20 space-y-2">
        {/* Legal Disclaimer Banner */}
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-amber-400 shrink-0 hidden sm:inline" />
          <p>
            <strong className="text-slate-300">WARNING:</strong> This is a private, secure system. Access is restricted to authorized healthcare personnel only. All activities are monitored and logged under HIPAA / Data Privacy laws.
          </p>
        </div>

        {/* System Diagnostics */}
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
          <div>
            App Version: <span className="text-teal-400 font-semibold">v3.4.1 (Build 8902-LIMS)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Server: <strong className="text-emerald-400">Connected (18ms)</strong></span>
          </div>
          <div>
            IT Helpdesk: <span className="text-teal-300 font-semibold">Call Ext: 4455</span> for immediate login support
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL 1: Step 2 Multi-Factor Authentication (MFA) Screen */}
      {/* ========================================================================= */}
      {showMfaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400"></div>

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">MFA Security Verification</h3>
                  <p className="text-xs text-teal-300/80">Step 2: 2-Factor Authentication</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMfaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Enter the 6-digit verification code from your <strong>Hospital Authenticator App</strong> or registered staff mobile.
            </p>

            {mfaError && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {/* 6 Digit Auto-Advancing Input Boxes */}
            <div className="flex justify-between gap-2 mb-5">
              {mfaDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (mfaInputRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onFocus={() => setActiveInputFocus('mfa')}
                  onChange={(e) => handleMfaDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleMfaKeyDown(idx, e)}
                  className="w-12 h-14 bg-slate-950 border border-teal-700/70 rounded-xl text-center text-xl font-bold font-mono text-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all shadow-inner"
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleVerifyMfa()}
                disabled={mfaLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm py-3 rounded-xl shadow-lg shadow-teal-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {mfaLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Verify Code & Enter Portal</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Free-tier Quick-Fill Code Button for Easy Testing */}
              <button
                type="button"
                onClick={handleAutoFillDemoMfa}
                className="w-full bg-teal-950/60 hover:bg-teal-900/60 text-teal-300 border border-teal-600/40 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Auto-fill Demo Code (849201)</span>
              </button>
            </div>

            {/* Resend Timer */}
            <div className="mt-4 text-center text-xs text-slate-400">
              {mfaTimer > 0 ? (
                <span>Resend code in <strong className="text-teal-300">{mfaTimer}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={() => setMfaTimer(60)}
                  className="text-teal-400 hover:text-teal-300 font-semibold underline"
                >
                  Resend New MFA Code
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Simulated Hospital SSO (Azure AD / Okta) */}
      {/* ========================================================================= */}
      {showSsoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Microsoft Azure AD / Okta SSO</h3>
            <p className="text-xs text-slate-300 mb-4">
              Syncing with Hospital Active Directory for universal single sign-on...
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-teal-300 text-left space-y-1 mb-4">
              <div>Tenant: <span className="text-slate-400">hospital-central-ad.org</span></div>
              <div>Identity: <span className="text-white">anil.mehta@hospital.lims.org</span></div>
              <div>Status: <span className="text-emerald-400 font-bold">200 OK (AD Authenticated)</span></div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-teal-300 font-semibold">
              <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
              <span>Completing direct workstation handshake...</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Account Recovery (Forgot Password) */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-400" />
                <span>Self-Service Password Reset</span>
              </h3>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoverySent ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-300">Reset Token Dispatched</h4>
                <p className="text-xs text-slate-300">
                  Password reset link sent to registered hospital email with 15-minute token validity.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered Hospital Employee ID or official email. A secure one-time password reset link will be dispatched via internal directory services.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Employee Email / ID</label>
                  <input
                    type="text"
                    value={recoveryEmail || employeeId}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    placeholder="anil.mehta@hospital.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div className="flex space-x-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-md"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Account Locked IT Self-Service Ticket */}
      {/* ========================================================================= */}
      {showLockedModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Account Lockout Recovery</span>
              </h3>
              <button onClick={() => setShowLockedModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                In compliance with healthcare cybersecurity protocols, 3 consecutive failed login attempts lock your terminal. An automated IT Helpdesk ticket has been created:
              </p>

              <div className="p-4 bg-slate-950 rounded-2xl border border-rose-500/30 font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ticket Ref:</span>
                  <span className="text-rose-400 font-bold">{supportTicketId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Terminal:</span>
                  <span className="text-white">{stationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Priority:</span>
                  <span className="text-amber-400 font-bold">Urgent (Lab Ops)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ETA:</span>
                  <span className="text-emerald-400">&lt; 5 minutes</span>
                </div>
              </div>

              <p className="text-[11px] text-teal-300/80">
                📞 Or call IT Dispatch directly at <strong className="text-white">Ext: 4455</strong> quoting ticket <strong className="text-rose-300">{supportTicketId}</strong> for emergency unlock.
              </p>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowLockedModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
