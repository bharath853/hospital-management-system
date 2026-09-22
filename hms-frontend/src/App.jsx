import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Download, Printer, RefreshCw, ChevronLeft, ChevronRight, X, FileText, AlertCircle, Calendar, Clock, CheckCircle2, Eye, Minimize2, Maximize2, UserCheck, BedDouble, Bed, Activity, FlaskConical, Stethoscope, Pill, Check, ArrowRight, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from './components/Layout/Layout';
import AdminPortalPage from './pages/Admin/AdminPortalPage';
import Login from './pages/Auth/Login';
import LabLogin from './pages/Auth/LabLogin';
import LabSectionsPage from './pages/Laboratory/LabSectionsPage';
import LabSectionBar from './components/Laboratory/LabSectionBar';
import LabPageLayout from './components/Laboratory/LabPageLayout';

// New Reception Imports
import ReceptionLayout from './pages/Reception/ReceptionLayout';
import PatientRegistration from './pages/Reception/PatientRegistration';
import AppointmentBooking from './pages/Reception/AppointmentBooking';
import QueueManagement from './pages/Reception/QueueManagement';
import OPIPRegistration from './pages/Reception/OPIPRegistration';
import ReceptionDashboard from './pages/Reception/ReceptionDashboard';
import ReceptionBillingModule from './pages/Reception/ReceptionBillingModule';
import ReceptionDailyCollection from './pages/Reception/ReceptionDailyCollection';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${API_BASE}`;
const WS_URL = import.meta.env.VITE_WS_URL || `${WS_URL}`;

const DOCTOR_OPTIONS = [
  'Dr. Madhavan',
  'Dr. S. Karthikeyan',
  'Dr. Murugan Jeyaraman',
  'Dr. Raj Kanna',
  'Dr. Priya Nair'
];

const MEDICINE_OPTIONS = [
  'Paracetamol 650mg',
  'Amoxicillin 500mg',
  'Pantoprazole 40mg',
  'Telmisartan 40mg',
  'Naproxen 250mg',
  'Omeprazole 20mg',
  'IV Ceftriaxone 1g',
  'Cefixime 200mg'
];

const STATUS_OPTIONS = [
  'Scheduled',
  'Confirmed',
  'Pending',
  'Checked In',
  'In Consultation',
  'Completed',
  'Active',
  'Available',
  'Occupied',
  'Dispatched'
];

// Helper component for status badges
const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  let bg = 'bg-slate-50 text-slate-700 border-slate-200';
  
  if (['active', 'completed', 'verified', 'available', 'paid', 'approved', 'checked_in', 'confirmed', 'released', 'ready'].some(k => s.includes(k))) {
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (['pending', 'scheduled', 'in progress', 'occupied', 'requested', 'in consultation', 'waiting', 'awaiting'].some(k => s.includes(k))) {
    bg = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (['urgent', 'high', 'critical', 'emergency', 'low stock', 'overdue', 'cancelled', 'on leave', 'rejected'].some(k => s.includes(k))) {
    bg = 'bg-rose-50 text-rose-800 border-rose-200';
  } else if (['processing', 'dispatched', 'admitted', 'inpatient'].some(k => s.includes(k))) {
    bg = 'bg-blue-50 text-blue-800 border-blue-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${bg}`}>
      {status}
    </span>
  );
};

// Pain Scale Info Helper (Wong-Baker & Numerical 0-10 Scale)
const getPainLevelInfo = (val) => {
  let score = 3;
  if (typeof val === 'number') {
    score = val;
  } else if (val) {
    const str = String(val).trim();
    // 1. Check for "X/10" format first (e.g. "7/10")
    const matchSlash = str.match(/(\d+)\s*\/\s*10/);
    if (matchSlash) {
      score = parseInt(matchSlash[1], 10);
    } else {
      // 2. Check for standalone single/double digit 0-10 (prevents PAT-2007 matching 2007)
      const matchStandalone = str.match(/\b(10|[0-9])\b/);
      if (matchStandalone) {
        score = parseInt(matchStandalone[1], 10);
      } else {
        const matchAny = str.match(/\d+/);
        if (matchAny) {
          const parsed = parseInt(matchAny[0], 10);
          score = parsed <= 10 ? parsed : 3;
        }
      }
    }
  }
  if (score > 10) score = 10;
  if (score < 0) score = 0;

  if (score === 0) {
    return { score, emoji: '😊', title: 'No pain', desc: 'No pain felt', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
  } else if (score <= 2) {
    return { score, emoji: '🙂', title: 'Discomforting', desc: 'Very mild pain', bg: 'bg-lime-50 text-lime-800 border-lime-300' };
  } else if (score <= 4) {
    return { score, emoji: '😐', title: 'Distressing', desc: 'Tolerable pain', bg: 'bg-amber-50 text-amber-900 border-amber-300' };
  } else if (score <= 6) {
    return { score, emoji: '🙁', title: 'Intense', desc: 'Very distressing', bg: 'bg-orange-50 text-orange-900 border-orange-300' };
  } else if (score <= 8) {
    return { score, emoji: '😣', title: 'Utterly horrible', desc: 'Very intense', bg: 'bg-rose-50 text-rose-900 border-rose-300' };
  } else {
    return { score, emoji: '😭', title: 'Unimaginable unspeakable', desc: 'Excruciating unbearable', bg: 'bg-red-100 text-red-950 border-red-400 font-extrabold animate-pulse' };
  }
};

const PainScaleBadge = ({ val }) => {
  const info = getPainLevelInfo(val);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${info.bg} space-x-1.5 shadow-sm`}>
      <span className="text-sm">{info.emoji}</span>
      <span className="font-bold">{info.score}/10</span>
      <span className="text-[11px] opacity-85 font-medium hidden sm:inline">• {info.title}</span>
    </span>
  );
};

// Interactive Wong-Baker Visual Pain Scale Selector Component
const WongBakerPainScaleSelector = ({ value, onChange }) => {
  const info = getPainLevelInfo(value);
  const currentScore = info.score;

  const faces = [
    { minScore: 0, maxScore: 0, defaultVal: 0, emoji: '😊', topLabel: 'No pain', label: '0/10', color: 'border-emerald-500 text-emerald-600 bg-emerald-50' },
    { minScore: 1, maxScore: 2, defaultVal: 2, emoji: '🙂', topLabel: 'Discomforting', label: '1-2/10', color: 'border-lime-500 text-lime-600 bg-lime-50' },
    { minScore: 3, maxScore: 4, defaultVal: 4, emoji: '😐', topLabel: 'Distressing', label: '3-4/10', color: 'border-amber-500 text-amber-600 bg-amber-50' },
    { minScore: 5, maxScore: 6, defaultVal: 6, emoji: '🙁', topLabel: 'Intense', label: '5-6/10', color: 'border-orange-500 text-orange-600 bg-orange-50' },
    { minScore: 7, maxScore: 8, defaultVal: 7, emoji: '😣', topLabel: 'Utterly horrible', label: '7-8/10', color: 'border-rose-500 text-rose-600 bg-rose-50' },
    { minScore: 9, maxScore: 10, defaultVal: 9, emoji: '😭', topLabel: 'Unimaginable', label: '9-10/10', color: 'border-red-600 text-red-700 bg-red-50' }
  ];

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{info.emoji}</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Wong-Baker Pain Scale Visual Chart</h4>
            <p className="text-sm font-bold text-slate-800">{info.score}/10 — {info.title}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${info.bg}`}>
          {info.desc}
        </span>
      </div>

      {/* Faces Grid */}
      <div className="grid grid-cols-6 gap-1.5 text-center">
        {faces.map((f, fIdx) => {
          const isSelected = currentScore >= f.minScore && currentScore <= f.maxScore;

          const handleFaceClick = () => {
            if (currentScore >= f.minScore && currentScore <= f.maxScore) {
              onChange(`${currentScore}/10`);
            } else {
              onChange(`${f.defaultVal}/10`);
            }
          };

          return (
            <button
              key={fIdx}
              type="button"
              onClick={handleFaceClick}
              className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                isSelected
                  ? `${f.color} ring-2 ring-blue-500 shadow-md scale-105 font-bold`
                  : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-600'
              }`}
            >
              <span className="text-xl sm:text-2xl mb-1">{f.emoji}</span>
              <span className="text-[10px] font-bold leading-tight hidden sm:block">{f.topLabel}</span>
              <span className="text-[9px] text-slate-400 mt-0.5">{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Numerical Slider 0 to 10 */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 px-1">
          <span>0 (No Pain)</span>
          <span className="text-blue-600 font-extrabold text-sm">Selected Score: {currentScore}/10</span>
          <span>10 (Excruciating)</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={currentScore}
          onChange={(e) => onChange(`${e.target.value}/10`)}
          className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between px-0.5 text-[10px] font-semibold text-slate-400">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(`${num}/10`)}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                currentScore === num ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const isDateTimeField = (col) => {
  const c = col.toLowerCase();
  return (
    c.includes('date') ||
    c.includes('time') ||
    c === 'recorded at' ||
    c === 'created at' ||
    c === 'logged at' ||
    c === 'updated at'
  );
};

// --- CUSTOM INTERACTIVE DATE & TIME PICKER COMPONENT ---
const DateTimePicker = ({ value, onChange, placeholder = "Select Date & Time" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  // Parse date/time string to component state
  const parseVal = (valStr) => {
    let d = new Date();
    let hours = d.getHours();
    let minutes = Math.floor(d.getMinutes() / 5) * 5;
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    if (valStr) {
      try {
        const str = String(valStr).trim();
        const parts = str.split(' ');
        if (parts.length >= 2) {
          const dateParts = parts[0].split('-');
          if (dateParts.length === 3) {
            d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          }
          if (parts[1]) {
            const timeParts = parts[1].split(':');
            if (timeParts.length >= 2) {
              hours = parseInt(timeParts[0]);
              minutes = parseInt(timeParts[1]);
            }
          }
          if (parts[2] && (parts[2] === 'AM' || parts[2] === 'PM')) {
            ampm = parts[2];
          }
        } else if (str.includes('T')) {
          const dt = new Date(str);
          if (!isNaN(dt.getTime())) {
            d = dt;
            let h = d.getHours();
            ampm = h >= 12 ? 'PM' : 'AM';
            hours = h % 12 || 12;
            minutes = d.getMinutes();
          }
        }
      } catch (e) {}
    }

    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hour: hours,
      minute: minutes,
      ampm: ampm
    };
  };

  const [state, setState] = useState(() => parseVal(value));

  useEffect(() => {
    if (value) {
      setState(parseVal(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const formatResult = (s) => {
    const mm = String(s.month + 1).padStart(2, '0');
    const dd = String(s.day).padStart(2, '0');
    const yyyy = s.year;
    const hh = String(s.hour).padStart(2, '0');
    const min = String(s.minute).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min} ${s.ampm}`;
  };

  const updateStateAndEmit = (newState) => {
    setState(newState);
    const formatted = formatResult(newState);
    onChange(formatted);
  };

  const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(state.year, state.month, 1).getDay();

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const todayHour = now.getHours();
  const todayMinute = now.getMinutes();

  // Check if navigating to prev month is allowed (cannot go before current month)
  const isPrevMonthDisabled =
    state.year < todayYear || (state.year === todayYear && state.month <= todayMonth);

  // Check if a day cell is in the past
  const isDayInPast = (dNum) => {
    if (state.year < todayYear) return true;
    if (state.year === todayYear && state.month < todayMonth) return true;
    if (state.year === todayYear && state.month === todayMonth && dNum < todayDay) return true;
    return false;
  };

  // Check if selected date is TODAY
  const isTodaySelected =
    state.year === todayYear && state.month === todayMonth && state.day === todayDay;

  // Check if hour is in past (if today is selected)
  const isHourInPast = (h, ap) => {
    if (!isTodaySelected) return false;
    let h24 = ap === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    return h24 < todayHour;
  };

  // Check if minute is in past (if today & current hour are selected)
  const isMinuteInPast = (m) => {
    if (!isTodaySelected) return false;
    let currentSelH24 = state.ampm === 'PM' ? (state.hour === 12 ? 12 : state.hour + 12) : (state.hour === 12 ? 0 : state.hour);
    if (currentSelH24 < todayHour) return true;
    if (currentSelH24 === todayHour && m < todayMinute) return true;
    return false;
  };

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    let m = state.month - 1;
    let y = state.year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    const maxDays = new Date(y, m + 1, 0).getDate();
    updateStateAndEmit({ ...state, month: m, year: y, day: Math.min(state.day, maxDays) });
  };

  const handleNextMonth = () => {
    let m = state.month + 1;
    let y = state.year;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    const maxDays = new Date(y, m + 1, 0).getDate();
    updateStateAndEmit({ ...state, month: m, year: y, day: Math.min(state.day, maxDays) });
  };

  const handleSelectDay = (d) => {
    if (isDayInPast(d)) return;
    updateStateAndEmit({ ...state, day: d });
  };

  const handleSelectHour = (h) => {
    if (isHourInPast(h, state.ampm)) return;
    updateStateAndEmit({ ...state, hour: h });
  };

  const handleSelectMinute = (m) => {
    if (isMinuteInPast(m)) return;
    updateStateAndEmit({ ...state, minute: m });
  };

  const handleToggleAmPm = (ampm) => {
    updateStateAndEmit({ ...state, ampm: ampm });
  };

  const handleToday = () => {
    const cur = new Date();
    let h = cur.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const newState = {
      year: cur.getFullYear(),
      month: cur.getMonth(),
      day: cur.getDate(),
      hour: h,
      minute: Math.floor(cur.getMinutes() / 5) * 5,
      ampm: ampm
    };
    updateStateAndEmit(newState);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const formattedDisplay = value ? value : formatResult(state);
  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 bg-white cursor-pointer flex items-center justify-between text-sm font-medium text-slate-800 shadow-sm hover:border-slate-300 transition-colors"
      >
        <span className={value ? "text-slate-800 font-semibold" : "text-slate-400"}>
          {formattedDisplay}
        </span>
        <div className="flex items-center space-x-1 text-slate-400">
          <Calendar className="w-4 h-4 text-blue-600" />
          <Clock className="w-4 h-4 text-blue-500" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4 animate-in zoom-in-95 duration-150 min-w-[340px]">
          {/* Calendar Section (Left Side) */}
          <div className="flex-1 min-w-[210px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-bold text-slate-800 text-sm">
                {monthNames[state.month]} {state.year}
              </span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  disabled={isPrevMonthDisabled}
                  onClick={handlePrevMonth}
                  className={`p-1 rounded-lg transition-colors ${
                    isPrevMonthDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mb-1">
              {daysOfWeek.map((day, idx) => (
                <div key={idx} className="py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 text-center text-xs gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="py-1.5" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected = state.day === dayNum;
                const isPast = isDayInPast(dayNum);
                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isPast}
                    onClick={() => !isPast && handleSelectDay(dayNum)}
                    className={`py-1.5 rounded-lg font-medium transition-all ${
                      isPast
                        ? 'text-slate-300 cursor-not-allowed opacity-40 line-through'
                        : isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-500 hover:text-slate-800 font-medium"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-blue-600 hover:text-blue-700 font-bold"
              >
                Today
              </button>
            </div>
          </div>

          <div className="hidden md:block w-[1px] bg-slate-100 self-stretch" />

          {/* Time Section (Right Side) */}
          <div className="w-full md:w-32 flex flex-col">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 text-center">
              Time
            </div>

            <div className="flex gap-1.5 justify-center flex-1">
              {/* Hours Column */}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {hoursList.map((h) => {
                  const isSel = state.hour === h;
                  const isPast = isHourInPast(h, state.ampm);
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={isPast}
                      onClick={() => !isPast && handleSelectHour(h)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isPast
                          ? 'text-slate-300 cursor-not-allowed opacity-40'
                          : isSel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>

              {/* Minutes Column */}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {minutesList.map((m) => {
                  const isSel = state.minute === m;
                  const isPast = isMinuteInPast(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={isPast}
                      onClick={() => !isPast && handleSelectMinute(m)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isPast
                          ? 'text-slate-300 cursor-not-allowed opacity-40'
                          : isSel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>

              {/* AM / PM Column */}
              <div className="flex flex-col gap-1">
                {['AM', 'PM'].map((ap) => {
                  const isSel = state.ampm === ap;
                  return (
                    <button
                      key={ap}
                      type="button"
                      onClick={() => handleToggleAmPm(ap)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {ap}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
            className="mt-3 w-full py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// Generic Interactive Page Component
const GenericPage = ({ title, description, cols, defaultData = [], apiEndpoint, isLabReport = false, isBilling = false, allowAdd = true }) => {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedViewRecord, setSelectedViewRecord] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [dateError, setDateError] = useState('');
  const [statusUpdateRow, setStatusUpdateRow] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');

  // Handle status update
  const handleStatusUpdate = (rowId, newStatus) => {
    setData((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          const updated = { ...item, Status: newStatus };
          if (item['Payment Status']) updated['Payment Status'] = newStatus;
          if (item.status) updated.status = newStatus;

          if (apiEndpoint) {
            fetch(`${apiEndpoint}/${rowId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            }).catch(() => {});
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Get logged-in doctor name from stored session (if logged in as Doctor)
  const loggedDoctorName = useMemo(() => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (!saved) return null;
      const obj = JSON.parse(saved);
      const r = String(obj?.role || '').toLowerCase();
      if (r === 'doctor' || r.includes('doctor')) {
        return obj?.full_name || obj?.name || 'Dr. Madhavan';
      }
      return null;
    } catch (e) { return null; }
  }, []);

  // Get logged-in nurse name from stored session (if logged in as Nurse)
  const loggedNurseName = useMemo(() => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (!saved) return null;
      const obj = JSON.parse(saved);
      const r = String(obj?.role || '').toLowerCase();
      if (r === 'nurse' || r.includes('nurse')) {
        return obj?.full_name || obj?.name || 'Selvi. V. Mary';
      }
      return null;
    } catch (e) { return null; }
  }, []);

  const doctorNameFilter = loggedDoctorName;

  const pageSize = 5;

  // Fetch from backend
  const fetchLatestData = useCallback(() => {
    if (apiEndpoint) {
      setLoading(true);
      let userObj = {};
      try { userObj = JSON.parse(localStorage.getItem('hms_user') || '{}'); } catch (e) {}
      let url = apiEndpoint;
      const isDoctorUser = userObj?.role === 'doctor';
      const doctorName = userObj?.full_name || userObj?.name;
      if (isDoctorUser && doctorName) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}doctor_name=${encodeURIComponent(doctorName)}`;
      }

      fetch(url)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('API fetch failed');
        })
        .then((apiItems) => {
          if (Array.isArray(apiItems)) {
            const mapped = apiItems.map((item, idx) => ({ ...item, id: item.id || idx + 1 }));
            setData(mapped);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchLatestData();
  }, [fetchLatestData, doctorNameFilter]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Doctor Isolation Guard: If logged in as Doctor, only show records matching this doctor
      if (doctorNameFilter) {
        const rowDoctor = String(row.Doctor || row['Doctor Name'] || row['Attending Doctor'] || row.doctor || '').toLowerCase();
        const loggedDoc = doctorNameFilter.toLowerCase();
        if (rowDoctor) {
          const docKeys = ["madhavan", "karthik", "murugan", "raj", "priya"];
          const matchesKey = docKeys.some(k => loggedDoc.includes(k) && rowDoctor.includes(k));
          const matchesFull = rowDoctor.includes(loggedDoc) || loggedDoc.includes(rowDoctor);
          if (!matchesKey && !matchesFull) return false;
        }
      }

      const matchesSearch = cols.some((col) => {
        const val = row[col] || Object.values(row).join(' ');
        return String(val).toLowerCase().includes(searchQuery.toLowerCase());
      });

      if (filterStatus === 'All') return matchesSearch;
      const statusVal = String(row.Status || row.status || row.Availability || '').toLowerCase();
      return matchesSearch && statusVal.includes(filterStatus.toLowerCase());
    });
  }, [data, cols, searchQuery, filterStatus, doctorNameFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const handleOpenModal = () => {
    setDateError('');
    const initialForm = {};
    const now = new Date();
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(h).padStart(2, '0');
    const min = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    const localIsoDateTime = `${yyyy}-${mm}-${dd} ${hh}:${min} ${ampm}`;

    cols.forEach((col) => {
      const colLower = col.toLowerCase();
      if (colLower.includes('id') || colLower.includes('code') || colLower.includes('token') || colLower.includes('batch')) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        if (colLower.includes('patient')) initialForm[col] = `PAT-${rand}`;
        else if (colLower.includes('appointment')) initialForm[col] = `APT-${rand}`;
        else if (colLower.includes('invoice') || colLower.includes('bill')) initialForm[col] = `INV-2026-${rand}`;
        else if (colLower.includes('token')) initialForm[col] = `TK-${Math.floor(10 + Math.random() * 90)}`;
        else initialForm[col] = `ID-${rand}`;
      } else if (isDateTimeField(col)) {
        initialForm[col] = localIsoDateTime;
      } else if (colLower.includes('doctor') || (loggedDoctorName && (colLower.includes('attending') || colLower.includes('prescribed by')))) {
        initialForm[col] = loggedDoctorName || DOCTOR_OPTIONS[0];
      } else if (loggedNurseName && (colLower.includes('recorded by') || colLower.includes('nurse in-charge') || colLower.includes('administered by') || colLower.includes('added by') || colLower.includes('nurse'))) {
        initialForm[col] = loggedNurseName;
      } else if (colLower.includes('consultation fee') || colLower.includes('consultation')) {
        initialForm[col] = '$50.00';
      } else if (colLower.includes('lab charges') || colLower.includes('lab')) {
        initialForm[col] = '$35.00';
      } else if (colLower.includes('pharmacy charges') || colLower.includes('pharmacy')) {
        initialForm[col] = '$24.50';
      } else if (colLower.includes('room charges') || colLower.includes('room')) {
        initialForm[col] = '$0.00';
      } else if (colLower.includes('total amount')) {
        initialForm[col] = '$109.50';
      } else if (colLower.includes('medicine') || colLower.includes('tablet')) {
        initialForm[col] = MEDICINE_OPTIONS[0];
      } else if (colLower.includes('status') || colLower.includes('availability')) {
        initialForm[col] = 'Scheduled';
      }
    });
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleInputChange = (col, val) => {
    setDateError('');
    setFormData((prev) => ({ ...prev, [col]: val }));
  };

  const handleCreateNew = (e) => {
    e.preventDefault();
    setDateError('');

    // Strict Past Date & Time Validation
    for (const col of cols) {
      if (isDateTimeField(col)) {
        const valStr = formData[col];
        if (valStr) {
          try {
            const parts = String(valStr).trim().split(' ');
            if (parts.length >= 2) {
              const dateParts = parts[0].split('-');
              const timeParts = parts[1].split(':');
              if (dateParts.length === 3 && timeParts.length >= 2) {
                let y = parseInt(dateParts[0]);
                let m = parseInt(dateParts[1]) - 1;
                let d = parseInt(dateParts[2]);
                let h = parseInt(timeParts[0]);
                let min = parseInt(timeParts[1]);
                let ap = parts[2] || 'AM';

                if (ap === 'PM' && h < 12) h += 12;
                if (ap === 'AM' && h === 12) h = 0;

                const selectedDate = new Date(y, m, d, h, min);
                const now = new Date();
                if (selectedDate.getTime() < now.getTime() - 2 * 60000) {
                  setDateError(`Error: Invalid Selection! "${col}" cannot be a previous/past date & time (${valStr}). Please select today or an upcoming date & time.`);
                  return;
                }
              }
            }
          } catch (err) {}
        }
      }
    }

    const newEntry = { ...formData };
    if (loggedDoctorName) {
      cols.forEach((col) => {
        const colLower = col.toLowerCase();
        if (colLower.includes('doctor') || colLower.includes('attending') || colLower.includes('prescribed by')) {
          newEntry[col] = loggedDoctorName;
        }
      });
    }

    if (loggedNurseName) {
      cols.forEach((col) => {
        const colLower = col.toLowerCase();
        if (colLower.includes('recorded by') || colLower.includes('nurse in-charge') || colLower.includes('administered by') || colLower.includes('added by') || colLower.includes('nurse')) {
          newEntry[col] = loggedNurseName;
        }
      });
    }

    // Auto calculate Total Amount if charge columns exist and Total Amount not specified
    if (cols.some(c => c.toLowerCase().includes('total amount')) && !newEntry['Total Amount']) {
      let sum = 0;
      ['Consultation Fee', 'Lab Charges', 'Pharmacy Charges', 'Room Charges'].forEach(k => {
        if (newEntry[k]) {
          const num = parseFloat(String(newEntry[k]).replace('$', '').replace(',', '').trim()) || 0;
          sum += num;
        }
      });
      newEntry['Total Amount'] = sum > 0 ? `$${sum.toFixed(2)}` : '$109.50';
    }

    cols.forEach((col) => {
      if (!newEntry[col]) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        newEntry[col] = isDateTimeField(col) ? `${yyyy}-${mm}-${dd} 10:00 AM` : `Sample ${col}`;
      }
    });


    if (apiEndpoint) {
      let postUrl = apiEndpoint;
      if (loggedDoctorName) {
        const separator = postUrl.includes('?') ? '&' : '?';
        postUrl = `${postUrl}${separator}doctor_name=${encodeURIComponent(loggedDoctorName)}`;
      }
      fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((createdItem) => {
          if (createdItem) {
            setData((prev) => [createdItem, ...prev.filter((i) => i.id !== createdItem.id)]);
          } else {
            setData((prev) => [{ id: Date.now(), ...newEntry }, ...prev]);
          }
          fetchLatestData();
        })
        .catch(() => {
          setData((prev) => [{ id: Date.now(), ...newEntry }, ...prev]);
        });
    } else {
      setData((prev) => [{ id: Date.now(), ...newEntry }, ...prev]);
    }

    setFormData({});
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (apiEndpoint) {
      fetch(`${apiEndpoint}/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    setData(data.filter((item) => item.id !== id));
  };

  const handleDownloadReport = (row) => {
    const patientName = row.Patient || row['Patient Name'] || 'Patient';
    const reportTitle = row['Report Name'] || row['Test Name'] || row['File Name'] || 'Lab Report';

    const reportContent = `
=====================================================
            CITY CARE GENERAL HOSPITAL
            OFFICIAL DIAGNOSTIC LAB REPORT
=====================================================

Date Generated : ${new Date().toLocaleString()}
Report Title   : ${reportTitle}
Patient Name   : ${patientName}
Status         : Verified & Completed

SUMMARY OF DIAGNOSTIC FINDINGS:
-----------------------------------------------------
- All blood count parameters within normal ranges.
- Hemoglobin: 14.2 g/dL (Normal)
- Platelet Count: 260,000 /mcL (Normal)
- Verified By: Anil Mehta (Senior Diagnostic Technologist)
=====================================================
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${patientName.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadInvoicePDF = async (row) => {
    const name = row.Name || row.Patient || row['Patient Name'] || 'Aarav Kumar';
    const invoiceId = row['Invoice ID'] || row['Bill ID'] || row['Transaction ID'] || `INV-2026-${row.id || '01'}`;
    const consultCharge = row['Consultation Charge'] || row['Consultation Fee'] || row.Consultation || '$50.00';
    const labCharge = row['Lab Charge'] || row['Lab Charges'] || row.Lab || '$35.00';
    const pharmacyCharge = row['Pharmacy Charge'] || row['Pharmacy Charges'] || row.Pharmacy || '$24.50';
    const total = row.Total || row['Total Amount'] || row.Amount || '$109.50';
    const status = row.Status || row['Payment Status'] || 'Paid';
    const paymentMode = row['Payment Mode'] || row.Method || row['Payment Method'] || 'Online Payment Desk';
    const dateStr = row.Date || row['Due Date'] || '2026-08-20 11:30 AM';

    const element = document.getElementById('printable-invoice-receipt');
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Invoice_${invoiceId.replace(/[^a-z0-9]/gi, '_')}_${name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        return;
      } catch (err) {
        console.error('Canvas capture failed, generating vector PDF', err);
      }
    }

    // Direct jsPDF Vector PDF Generator
    const doc = new jsPDF('p', 'mm', 'a4');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('CITY CARE GENERAL HOSPITAL', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Multi-Specialty Healthcare & Medical Research Center • Phone: +91 98765 00000', 14, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 94, 89);
    doc.text('OFFICIAL TAX INVOICE', 196, 20, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(invoiceId, 196, 26, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${dateStr}`, 196, 31, { align: 'right' });

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.75);
    doc.line(14, 36, 196, 36);

    // Box Container
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 42, 182, 114, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 42, 182, 114, 3, 3, 'D');

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('name', 22, 54);
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(name, 186, 54, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(22, 60, 186, 60);

    // Consultation Charge
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('consulation charge', 22, 70);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(consultCharge, 186, 70, { align: 'right' });

    // Lab Charge
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('lab charge', 22, 82);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(labCharge, 186, 82, { align: 'right' });

    // Pharmacy Charge
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('pharmacy charge', 22, 94);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(pharmacyCharge, 186, 94, { align: 'right' });

    // Total :
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.75);
    doc.line(22, 102, 186, 102);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('total :', 22, 114);
    doc.setFontSize(16);
    doc.setTextColor(29, 78, 216);
    doc.text(total, 186, 114, { align: 'right' });

    // Status : & Payment Mode :
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(22, 122, 186, 122);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('status :', 22, 132);
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(11);
    doc.text(status, 186, 132, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('payment mode :', 22, 144);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(paymentMode, 186, 144, { align: 'right' });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Computer Generated Official Receipt • City Care General Hospital • Valid without signature', 14, 168);

    doc.save(`Invoice_${invoiceId.replace(/[^a-z0-9]/gi, '_')}_${name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const handlePrintInvoice = (row) => {
    const name = row.Name || row.Patient || row['Patient Name'] || 'Aarav Kumar';
    const invoiceId = row['Invoice ID'] || row['Bill ID'] || row['Transaction ID'] || `INV-2026-${row.id || '01'}`;
    const consultCharge = row['Consultation Charge'] || row['Consultation Fee'] || row.Consultation || '$50.00';
    const labCharge = row['Lab Charge'] || row['Lab Charges'] || row.Lab || '$35.00';
    const pharmacyCharge = row['Pharmacy Charge'] || row['Pharmacy Charges'] || row.Pharmacy || '$24.50';
    const total = row.Total || row['Total Amount'] || row.Amount || '$109.50';
    const status = row.Status || row['Payment Status'] || 'Paid';
    const paymentMode = row['Payment Mode'] || row.Method || row['Payment Method'] || 'Online Payment Desk';
    const dateStr = row.Date || row['Due Date'] || '2026-08-20 11:30 AM';

    const printWin = window.open('', '_blank', 'width=850,height=950');
    if (!printWin) {
      setSelectedInvoiceModal(row);
      setTimeout(() => window.print(), 300);
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
            body { margin: 0; padding: 30px; color: #0f172a; background: #ffffff; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
            .badge { display: inline-block; background: #ccfbf1; color: #115e59; font-weight: 800; padding: 4px 10px; border-radius: 9999px; font-size: 10px; text-transform: uppercase; border: 1px solid #99f6e4; margin-bottom: 6px; }
            
            .invoice-card {
              background: #f8fafc;
              border: 1.5px solid #e2e8f0;
              border-radius: 16px;
              padding: 28px;
              max-width: 600px;
              margin: 0 auto;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .item-row:last-child {
              border-bottom: none;
            }
            .name-label {
              font-size: 13px;
              font-weight: 700;
              color: #64748b;
              text-transform: capitalize;
            }
            .name-value {
              font-size: 17px;
              font-weight: 900;
              color: #0f172a;
            }
            .charge-label {
              font-size: 14px;
              font-weight: 600;
              color: #334155;
            }
            .charge-val {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
            }
            .total-section {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 0 12px 0;
              border-top: 2.5px solid #0f172a;
              border-bottom: 1px solid #e2e8f0;
              margin-top: 10px;
            }
            .total-label {
              font-size: 16px;
              font-weight: 900;
              color: #0f172a;
              text-transform: capitalize;
            }
            .total-val {
              font-size: 22px;
              font-weight: 900;
              color: #1d4ed8;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              font-size: 13px;
            }
            .footer-note {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 36px;
              border-top: 1px solid #e2e8f0;
              padding-top: 14px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">CITY CARE GENERAL HOSPITAL</h1>
              <p class="subtitle">Multi-Specialty Healthcare & Medical Research Center</p>
              <p class="subtitle">100 Healthcare Blvd, Sector 4 • Phone: +91 98765 00000</p>
            </div>
            <div style="text-align: right;">
              <span class="badge">Official Tax Invoice</span>
              <p style="font-size: 13px; font-weight: 800; margin: 4px 0 0 0;">${invoiceId}</p>
              <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Date: ${dateStr}</p>
            </div>
          </div>

          <div class="invoice-card">
            <div class="item-row" style="border-bottom: 2px solid #cbd5e1; padding-bottom: 14px;">
              <span class="name-label" style="font-weight: 800; color: #475569;">name</span>
              <span class="name-value">${name}</span>
            </div>

            <div class="item-row">
              <span class="charge-label">consulation charge</span>
              <span class="charge-val">${consultCharge}</span>
            </div>

            <div class="item-row">
              <span class="charge-label">lab charge</span>
              <span class="charge-val">${labCharge}</span>
            </div>

            <div class="item-row">
              <span class="charge-label">pharmacy charge</span>
              <span class="charge-val">${pharmacyCharge}</span>
            </div>

            <div class="total-section">
              <span class="total-label">total :</span>
              <span class="total-val">${total}</span>
            </div>

            <div class="meta-row">
              <span class="name-label">status :</span>
              <span style="font-weight: 800; color: #059669;">${status}</span>
            </div>

            <div class="meta-row">
              <span class="name-label">payment mode :</span>
              <span style="font-weight: 700; color: #0f172a;">${paymentMode}</span>
            </div>
          </div>

          <div class="footer-note">
            <span>Computer Generated Official Receipt • City Care General Hospital</span>
            <span>Valid without signature • Official Seal Applied</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-md z-[99999] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#10201B]">
          <div className="flex justify-between items-center px-6 py-4 md:px-10 md:py-5 border-b border-[#07543F] bg-[#052E24] text-white shrink-0 shadow-md">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-[#087F5B] rounded-2xl text-white shadow-md shadow-[#052E24]/40">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Add New Entry — {title}</h2>
                <p className="text-xs text-[#DDEFE5]/80 mt-0.5">Fill out complete record details below</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex items-center space-x-2 px-4 py-2 bg-[#07543F] hover:bg-rose-950/80 text-white hover:text-rose-300 rounded-xl text-xs font-bold transition-all border border-[#087F5B]/30">
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleCreateNew} className="flex flex-col flex-1 overflow-hidden bg-[#F6F8F6]">
            <div className="p-6 md:p-12 overflow-y-auto flex-1 scrollbar-thin">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white p-8 rounded-3xl border border-[#DDE5E0] shadow-card">
                {cols.map((col, idx) => {
                  const colLower = col.toLowerCase();
                  const isDoctor = colLower.includes('doctor') || (loggedDoctorName && (colLower.includes('attending') || colLower.includes('prescribed by')));
                  const isNurseField = loggedNurseName && (colLower.includes('recorded by') || colLower.includes('nurse in-charge') || colLower.includes('administered by') || colLower.includes('added by') || colLower.includes('nurse'));
                  const isMedicine = colLower.includes('medicine') || colLower.includes('tablet');
                  const isStatus = colLower.includes('status') || colLower.includes('availability');
                  const isPain = colLower.includes('pain');
                  const isDateTime = isDateTimeField(col);
                  return (
                    <div key={idx} className={isPain ? "col-span-full" : "col-span-1"}>
                      <label className="block text-xs font-bold text-[#65756E] uppercase tracking-wider mb-2">{col}</label>
                      {isPain ? (
                        <WongBakerPainScaleSelector value={formData[col] || '3/10'} onChange={(val) => handleInputChange(col, val)} />
                      ) : isDoctor ? (
                        loggedDoctorName ? (
                          <div className="relative">
                            <select
                              value={loggedDoctorName}
                              disabled
                              className="w-full px-4 py-3 border border-[#DDE5E0] bg-[#EEF7F1] rounded-xl font-bold text-[#052E24] shadow-sm cursor-not-allowed appearance-none pr-12 text-sm"
                            >
                              <option value={loggedDoctorName}>{loggedDoctorName}</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-[10px] bg-[#087F5B] text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                You
                              </span>
                            </div>
                          </div>
                        ) : (
                          <select
                            value={formData[col] || DOCTOR_OPTIONS[0]}
                            onChange={(e) => handleInputChange(col, e.target.value)}
                            className="w-full px-4 py-3 border border-[#DDE5E0] rounded-xl focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] text-sm bg-white font-medium text-[#10201B] shadow-sm"
                          >
                            {DOCTOR_OPTIONS.map((doc, dIdx) => (
                              <option key={dIdx} value={doc}>{doc}</option>
                            ))}
                          </select>
                        )
                      ) : isNurseField ? (
                        <div className="relative">
                          <select
                            value={loggedNurseName}
                            disabled
                            className="w-full px-4 py-3 border border-[#DDE5E0] bg-[#EEF7F1] rounded-xl font-bold text-[#052E24] shadow-sm cursor-not-allowed appearance-none pr-12 text-sm"
                          >
                            <option value={loggedNurseName}>{loggedNurseName}</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span className="text-[10px] bg-[#087F5B] text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                              Nurse (You)
                            </span>
                          </div>
                        </div>
                      ) : isMedicine ? (
                        <select value={formData[col] || MEDICINE_OPTIONS[0]} onChange={(e) => handleInputChange(col, e.target.value)} className="w-full px-4 py-3 border border-[#DDE5E0] rounded-xl focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] text-sm bg-white font-medium text-[#10201B] shadow-sm">
                          {MEDICINE_OPTIONS.map((med, mIdx) => <option key={mIdx} value={med}>{med}</option>)}
                        </select>
                      ) : isStatus ? (
                        <select value={formData[col] || STATUS_OPTIONS[0]} onChange={(e) => handleInputChange(col, e.target.value)} className="w-full px-4 py-3 border border-[#DDE5E0] rounded-xl focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] text-sm bg-white font-medium text-[#10201B] shadow-sm">
                          {STATUS_OPTIONS.map((st, sIdx) => <option key={sIdx} value={st}>{st}</option>)}
                        </select>
                      ) : isDateTime ? (
                        <DateTimePicker value={formData[col] || ''} onChange={(val) => handleInputChange(col, val)} />
                      ) : (
                        <input type="text" required={idx === 0} value={formData[col] || ''} onChange={(e) => handleInputChange(col, e.target.value)} className="w-full px-4 py-3 border border-[#DDE5E0] rounded-xl focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] text-sm font-medium text-[#10201B] shadow-sm bg-white" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 md:px-10 md:py-5 border-t border-[#DDE5E0] flex items-center justify-between bg-white shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-[#65756E] hover:bg-[#F6F8F6] rounded-xl transition-colors border border-[#DDE5E0]">Cancel</button>
              <button type="submit" className="px-8 py-3 text-sm font-black text-white bg-[#087F5B] hover:bg-[#07543F] rounded-xl shadow-md shadow-[#087F5B]/30 transition-all">Save Record</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {statusUpdateRow && createPortal(
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150 text-[#10201B]">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#DDE5E0] space-y-5">
            <div className="flex justify-between items-center border-b border-[#DDE5E0] pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#EEF7F1] text-[#087F5B] rounded-xl border border-[#087F5B]/30">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#10201B] text-lg">Update Patient Status</h3>
                  <p className="text-xs text-[#65756E]">{statusUpdateRow['Patient Name'] || statusUpdateRow['Patient'] || statusUpdateRow['Name'] || 'Patient Record'}</p>
                </div>
              </div>
              <button onClick={() => setStatusUpdateRow(null)} className="text-[#65756E] hover:text-[#10201B] p-1.5 rounded-lg hover:bg-[#F6F8F6]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#65756E] uppercase tracking-wider">Select Current Clinical Status</label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value)}
                className="w-full px-4 py-3 border border-[#DDE5E0] rounded-xl focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] font-bold text-[#10201B] bg-white cursor-pointer shadow-sm text-sm"
              >
                <option value="Scheduled">Scheduled (Waiting for Consultation)</option>
                <option value="In Consultation">In Consultation (Doctor Examining)</option>
                <option value="Seen / Completed">Seen / Completed (Consultation Finished)</option>
                <option value="Checked In">Checked In (Arrived at Hospital)</option>
                <option value="Follow-up Scheduled">Follow-up Scheduled (Review Needed)</option>
                <option value="Discharged">Discharged (Cleared)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#DDE5E0]">
              <button onClick={() => setStatusUpdateRow(null)} className="px-5 py-2.5 text-xs font-bold text-[#65756E] hover:bg-[#F6F8F6] rounded-xl border border-[#DDE5E0]">Cancel</button>
              <button
                onClick={() => {
                  handleStatusUpdate(statusUpdateRow.id, selectedNewStatus);
                  setStatusUpdateRow(null);
                }}
                className="px-6 py-2.5 text-xs font-black text-white bg-[#087F5B] hover:bg-[#07543F] rounded-xl shadow-md transition-all"
              >
                Save & Update Status
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedViewRecord && createPortal(
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-md z-[99999] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#10201B]">
          <div className="flex justify-between items-center px-6 py-4 md:px-10 md:py-5 border-b border-[#07543F] bg-[#052E24] text-white shrink-0 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[#087F5B] rounded-2xl text-white shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">{title} — Record Details</h2>
                <p className="text-xs text-[#DDEFE5]/80 mt-0.5">Comprehensive audit-logged entry</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                type="button" 
                onClick={() => setSelectedViewRecord(null)} 
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#07543F] hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all border border-[#087F5B]/30 shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>Close Window</span>
              </button>
            </div>
          </div>
          <div className="p-6 md:p-12 overflow-y-auto flex-1 space-y-8 bg-[#F6F8F6] scrollbar-thin">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(selectedViewRecord).map(([key, val], kIdx) => {
                if (key === 'id') return null;
                const isPain = key.toLowerCase().includes('pain');
                const isStatus = key.toLowerCase().includes('status') || key.toLowerCase().includes('availability');
                return (
                  <div key={kIdx} className="p-6 bg-white border border-[#DDE5E0] rounded-2xl shadow-card hover:border-[#087F5B]/40 transition-all flex flex-col justify-between">
                    <span className="block text-xs font-bold text-[#65756E] uppercase tracking-wider mb-3">{key}</span>
                    <div>
                      {isPain ? (
                        <PainScaleBadge val={val} />
                      ) : isStatus ? (
                        <StatusBadge status={val} />
                      ) : (
                        <span className="text-xl font-black text-[#10201B] leading-relaxed break-words">{String(val || 'N/A')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#10201B] tracking-tight">{title}</h1>
          <p className="text-sm text-[#65756E] mt-1 font-medium">{description}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => fetchLatestData ? fetchLatestData() : setData([...data].reverse())} className="flex items-center space-x-1.5 px-4 py-2 bg-white border border-[#DDE5E0] hover:bg-[#F6F8F6] rounded-xl text-xs font-bold text-[#10201B] shadow-sm transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-[#087F5B]" />
            <span>Refresh</span>
          </button>
          {allowAdd && (
            <button onClick={handleOpenModal} className="flex items-center space-x-1.5 px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white rounded-xl text-xs font-bold shadow-md shadow-[#087F5B]/20 transition-all">
              <Plus className="w-4 h-4" />
              <span>Add New Entry</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#DDE5E0] shadow-card overflow-hidden text-[#10201B]">
        <div className="p-4 border-b border-[#DDE5E0] flex flex-col sm:flex-row gap-4 justify-between bg-[#F6F8F6]/70">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65756E]" />
            <input type="text" placeholder="Search records..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] placeholder-[#65756E] focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]" />
          </div>
          <select value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-white border border-[#DDE5E0] rounded-xl text-xs font-semibold text-[#10201B] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#052E24] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                {cols.map((col, idx) => (
                  <th key={idx} className="px-6 py-3.5 font-bold">{col}</th>
                ))}
                <th className="px-6 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE8]">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr 
                    key={row.id || rowIdx} 
                    className={`hover:bg-[#EEF7F1]/60 transition-colors group ${isBilling ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      if (isBilling && !e.target.closest('button')) {
                        setSelectedInvoiceModal(row);
                      }
                    }}
                  >
                    {cols.map((col, colIdx) => {
                      const rawVal = row[col] !== undefined && row[col] !== null
                        ? row[col]
                        : (col.toLowerCase().includes('doctor')
                            ? (row.Doctor || row['Doctor Name'] || row['Attending Doctor'] || row.doctor || loggedDoctorName || 'Dr. Madhavan')
                            : (col.toLowerCase().includes('recorded by') || col.toLowerCase().includes('nurse in-charge') || col.toLowerCase().includes('administered by') || col.toLowerCase().includes('added by') || col.toLowerCase().includes('nurse'))
                              ? (row['Recorded By'] || row['Nurse In-charge'] || row['Administered By'] || row['Added By'] || loggedNurseName || 'Selvi. V. Mary')
                              : (col.toLowerCase() === 'name' || col.toLowerCase() === 'patient' || col.toLowerCase() === 'patient name')
                                ? (row.Name || row.Patient || row['Patient Name'] || 'Aarav Kumar')
                                : (row[col.toLowerCase()] !== undefined ? row[col.toLowerCase()] : 'N/A'));
                      const val = typeof rawVal === 'object' && rawVal !== null ? JSON.stringify(rawVal) : (rawVal !== undefined && rawVal !== null ? String(rawVal) : 'N/A');
                      const isStatusCol = col.toLowerCase().includes('status') || col.toLowerCase().includes('availability');
                      const isPainCol = col.toLowerCase().includes('pain');
                      const isNameCol = col.toLowerCase() === 'name' || col.toLowerCase() === 'patient' || col.toLowerCase() === 'patient name';

                      return (
                        <td key={colIdx} className="px-6 py-4 text-[#10201B]">
                          {colIdx === 0 ? (
                            <span className="font-bold text-[#10201B]">{val}</span>
                          ) : isNameCol && isBilling ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedInvoiceModal(row); }}
                              className="font-bold text-[#087F5B] hover:text-[#063C2F] hover:underline text-left inline-flex items-center space-x-1"
                              title="Click to view and print invoice"
                            >
                              <span>{val}</span>
                              <FileText className="w-3.5 h-3.5 text-[#087F5B] opacity-80" />
                            </button>
                          ) : isPainCol ? (
                            <PainScaleBadge val={val} />
                          ) : isStatusCol ? (
                            <StatusBadge status={val} />
                          ) : (
                            <span className="font-medium text-[#10201B]">{val}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right relative space-x-2 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setStatusUpdateRow(row);
                          setSelectedNewStatus(row.Status || row.status || 'In Consultation');
                        }}
                        title="Update Patient Current Status"
                        className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-[#087F5B] bg-[#EEF7F1] hover:bg-[#DDEFE5] rounded-lg transition-all border border-[#087F5B]/30 mr-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Update Status
                      </button>
                      <button
                        onClick={() => { setSelectedViewRecord(row); setIsFullScreen(false); }}
                        title="View Details in Full Screen"
                        className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-[#10201B] bg-white hover:bg-[#F6F8F6] rounded-lg transition-all border border-[#DDE5E0]"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-[#087F5B]" />
                        View
                      </button>
                      {isLabReport && (
                        <button
                          onClick={() => handleDownloadReport(row)}
                          title="Download Lab Report"
                          className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#07543F] rounded-lg transition-all shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Download
                        </button>
                      )}
                      {isBilling && (
                        <>
                          <button
                            onClick={() => handlePrintInvoice(row)}
                            title="Print Official Bill"
                            className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#07543F] rounded-lg transition-all shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Print Bill
                          </button>
                          <button
                            onClick={() => handleDownloadInvoicePDF(row)}
                            title="Download Invoice PDF"
                            className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-[#052E24] bg-[#DDEFE5] hover:bg-[#A3BFB5] rounded-lg transition-all"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            PDF
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(row.id)}
                        title="Delete record"
                        className="text-[#65756E] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={cols.length + 1} className="px-6 py-12 text-center text-[#65756E]">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t border-[#DDE5E0] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#65756E] bg-[#F6F8F6]">
          <span>
            Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
          </span>
          
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-[#DDE5E0] rounded-lg hover:bg-[#EEF7F1] bg-white text-[#10201B] disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  currentPage === pg
                    ? 'bg-[#052E24] text-white shadow-sm'
                    : 'bg-white text-[#10201B] border border-[#DDE5E0] hover:bg-[#EEF7F1]'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-[#DDE5E0] rounded-lg hover:bg-[#EEF7F1] bg-white text-[#10201B] disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Printable Hospital Invoice & Bill Modal */}
      {selectedInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-8 border border-slate-100">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Patient Tax Invoice</h3>
              </div>
              <button onClick={() => setSelectedInvoiceModal(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto" id="printable-invoice-content">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4 shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-wide">CITY CARE GENERAL HOSPITAL</h2>
                    <p className="text-xs text-slate-500 font-medium">Multi-Specialty Healthcare & Medical Center</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Official Receipt</span>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">{selectedInvoiceModal['Invoice ID'] || selectedInvoiceModal['Bill ID'] || `INV-2026-${selectedInvoiceModal.id}`}</p>
                  </div>
                </div>

                {/* Requested Format */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">name</span>
                    <span className="text-base font-black text-slate-900">{selectedInvoiceModal.Name || selectedInvoiceModal.Patient || selectedInvoiceModal['Patient Name'] || 'Aarav Kumar'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">consulation charge</span>
                    <span className="font-bold text-slate-900">{selectedInvoiceModal['Consultation Charge'] || selectedInvoiceModal['Consultation Fee'] || selectedInvoiceModal.Consultation || '$50.00'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">lab charge</span>
                    <span className="font-bold text-slate-900">{selectedInvoiceModal['Lab Charge'] || selectedInvoiceModal['Lab Charges'] || selectedInvoiceModal.Lab || '$35.00'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">pharmacy charge</span>
                    <span className="font-bold text-slate-900">{selectedInvoiceModal['Pharmacy Charge'] || selectedInvoiceModal['Pharmacy Charges'] || selectedInvoiceModal.Pharmacy || '$24.50'}</span>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center">
                    <span className="text-base font-black text-slate-900 uppercase tracking-wide">total :</span>
                    <span className="text-xl font-black text-blue-700">{selectedInvoiceModal.Total || selectedInvoiceModal['Total Amount'] || selectedInvoiceModal.Amount || '$109.50'}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-100">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">status :</span>
                    <span className="font-bold text-emerald-600 text-sm">{selectedInvoiceModal.Status || selectedInvoiceModal['Payment Status'] || 'Paid'}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">payment mode :</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedInvoiceModal['Payment Mode'] || selectedInvoiceModal.Method || selectedInvoiceModal['Payment Method'] || 'Online Payment Desk'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedInvoiceModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadInvoicePDF(selectedInvoiceModal)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center shadow-sm"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF
              </button>
              <button
                onClick={() => handlePrintInvoice(selectedInvoiceModal)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center shadow-md shadow-blue-200"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODULE PAGES WITH SMART DROPDOWNS & DOWNLOAD FUNCTIONALITY ---

// 1. Admin
const UserManagement = () => <GenericPage title="User Management" description="Manage system users, login roles, and permissions." cols={['Name', 'Role', 'Email', 'Status']} apiEndpoint="/api/v1/admin/users" defaultData={[{ id: 1, Name: 'Dr. Sarah Johnson', Role: 'Chief Admin', Email: 'sarah.j@hospital.org', Status: 'Active' }]} />;
const DoctorManagement = () => <GenericPage title="Doctor Management" description="Manage active doctors and specializations." cols={['Doctor Name', 'Department', 'Phone', 'Availability']} apiEndpoint="/api/v1/admin/doctors" defaultData={[{ id: 1, 'Doctor Name': 'Dr. Priya Nair', Department: 'Cardiology', Phone: '+91 98765 12345', Availability: 'Available' }]} />;
const DepartmentManagement = () => <GenericPage title="Department Management" description="Manage hospital wings and medical heads." cols={['Dept Name', 'Head of Dept', 'Total Staff', 'Status']} apiEndpoint="/api/v1/admin/departments" defaultData={[{ id: 1, 'Dept Name': 'Cardiology', 'Head of Dept': 'Dr. Priya Nair', 'Total Staff': '18 Staff', Status: 'Active' }]} />;


// 3. Doctor Portal Complete Workstation (Encounter-Driven Clinical Architecture)
const DoctorPortalWorkstation = ({ initialSection = 'queue', user }) => {
  const doctorUser = useMemo(() => {
    let u = user || {};
    try {
      const stored = JSON.parse(localStorage.getItem('hms_user') || '{}');
      u = { ...stored, ...u };
    } catch (e) {}
    return u;
  }, [user]);

  const doctorId = doctorUser.doctor_id || doctorUser.id || 1;
  const doctorName = doctorUser.full_name || doctorUser.name || 'Dr. Madhavan';
  const doctorSpec = doctorUser.specialization || 'Cardiology Specialist';

  // Navigation State
  const [activeView, setActiveView] = useState(() => {
    if (initialSection === 'lab_reports') return 'lab_reports';
    if (initialSection === 'queue') return 'queue';
    return 'consultation';
  });
  const [clinicalTab, setClinicalTab] = useState(
    ['history', 'exam', 'lab', 'diagnosis', 'prescription', 'followup'].includes(initialSection)
      ? initialSection
      : 'history'
  );

  useEffect(() => {
    if (initialSection === 'lab_reports') {
      setActiveView('lab_reports');
    } else if (initialSection === 'queue') {
      setActiveView('queue');
    } else if (['history', 'exam', 'lab', 'diagnosis', 'prescription', 'followup'].includes(initialSection)) {
      setActiveView('consultation');
      setClinicalTab(initialSection);
    }
  }, [initialSection]);

  // All Received Lab Reports State (Cross-Encounter & Direct Access)
  const [allLabReports, setAllLabReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsFilter, setReportsFilter] = useState('ALL'); // ALL, UNACKNOWLEDGED, CRITICAL, ACKNOWLEDGED
  const [reportsSearch, setReportsSearch] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');
  const [selectedReportForModal, setSelectedReportForModal] = useState(null);
  const [ackModalReport, setAckModalReport] = useState(null);
  const [ackDoctorNotes, setAckDoctorNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [queueFilter, setQueueFilter] = useState('ALL_ACTIVE'); // ALL_ACTIVE, WAITING, IN_CONSULTATION, AWAITING_LAB, RESULTS_READY, COMPLETED
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationToast, setNotificationToast] = useState(null);

  // Queue & Encounter State
  const [queueList, setQueueList] = useState([]);
  const [selectedEncounterCode, setSelectedEncounterCode] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [encounterDetail, setEncounterDetail] = useState(null);
  const [labResultsList, setLabResultsList] = useState([]);
  const [consultationStatus, setConsultationStatus] = useState('WAITING_DOCTOR');

  // Consultation Clinical Form State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpiNotes, setHpiNotes] = useState('');
  const [pastHistory, setPastHistory] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology');
  const [examFindings, setExamFindings] = useState('');
  const [primaryDiag, setPrimaryDiag] = useState('');
  const [secondaryDiag, setSecondaryDiag] = useState('');
  const [differentialDiag, setDifferentialDiag] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [prescriptions, setPrescriptions] = useState([
    { name: 'Aspirin 75mg', dose: '75 mg', route: 'Oral', freq: '1-0-0', duration: '30 Days', instructions: 'After food' },
    { name: 'Clopidogrel 75mg', dose: '75 mg', route: 'Oral', freq: '1-0-0', duration: '30 Days', instructions: 'After food' },
    { name: 'Atorvastatin 40mg', dose: '40 mg', route: 'Oral', freq: '0-0-1', duration: '30 Days', instructions: 'At bedtime' }
  ]);

  // Drug Builder State
  const [drugName, setDrugName] = useState('');
  const [drugDose, setDrugDose] = useState('500 mg');
  const [drugRoute, setDrugRoute] = useState('Oral');
  const [drugFreq, setDrugFreq] = useState('1-0-1');
  const [drugDuration, setDrugDuration] = useState('5 Days');
  const [drugInst, setDrugInst] = useState('After food');

  // Follow-up State
  const [followupRequired, setFollowupRequired] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupInstructions, setFollowupInstructions] = useState('');
  const [referralRequired, setReferralRequired] = useState(false);
  const [referralSpecialty, setReferralSpecialty] = useState('General Medicine');
  const [referralNotes, setReferralNotes] = useState('');

  // Investigation Order Modals
  const [showLabModal, setShowLabModal] = useState(false);
  const [labTestName, setLabTestName] = useState('CBC (Complete Blood Count)');
  const [labPriority, setLabPriority] = useState('Routine');
  const [labIndication, setLabIndication] = useState('');

  const [showImgModal, setShowImgModal] = useState(false);
  const [imgType, setImgType] = useState('CT Scan');
  const [imgBodyPart, setImgBodyPart] = useState('Chest');
  const [imgPriority, setImgPriority] = useState('Urgent');

  // Completed Today Counter State
  const [completedCount, setCompletedCount] = useState(0);

  // Fetch Doctor's Genuine Queue
  const fetchDoctorData = useCallback(async () => {
    try {
      setLoading(true);
      const [resQ, resC] = await Promise.all([
        fetch(`${API_BASE}/api/v1/doctor/me/queue?doctor_id=${doctorId}&doctor_name=${encodeURIComponent(doctorName)}`),
        fetch(`${API_BASE}/api/v1/doctor/dashboard-counters?doctor_id=${doctorId}&doctor_name=${encodeURIComponent(doctorName)}`)
      ]);

      if (resQ.ok) {
        const qData = await resQ.json();
        const items = qData.queue || qData.data || [];
        setQueueList(items);

        // If no encounter is currently selected, auto-select the first actionable encounter
        if (!selectedEncounterCode && items.length > 0) {
          setSelectedEncounterCode(items[0].encounter_code);
          setSelectedPatientId(items[0].patient_id);
        }
      }

      if (resC.ok) {
        const cData = await resC.json();
        setCompletedCount(cData.completed_today ?? 0);
      }
    } catch (e) {
      console.error('Error fetching doctor queue:', e);
    } finally {
      setLoading(false);
    }
  }, [doctorId, doctorName, selectedEncounterCode]);

  // Fetch Encounter Detail & Lab Results
  const fetchEncounterDetails = useCallback(async (encCode) => {
    if (!encCode) return;
    try {
      const [resEnc, resLab] = await Promise.all([
        fetch(`${API_BASE}/api/v1/doctor/encounters/${encCode}?doctor_id=${doctorId}`),
        fetch(`${API_BASE}/api/v1/doctor/encounters/${encCode}/lab-results?doctor_id=${doctorId}&doctor_name=${encodeURIComponent(doctorName)}`)
      ]);

      if (resEnc.ok) {
        const data = await resEnc.json();
        setEncounterDetail(data);
        if (data.encounter?.status) {
          setConsultationStatus(data.encounter.status);
        }

        // Pre-fill form from consultation draft or nurse assessment
        const c = data.consultation;
        const a = data.nursing_assessment;
        setChiefComplaint(c?.chief_complaint || data.encounter?.chief_complaint || a?.chief_complaint || '');
        setHpiNotes(c?.hpi_notes || '');
        setPastHistory(c?.past_medical_history || '');
        setAllergiesInput(c?.allergy_notes || a?.allergies || 'No Known Allergies (NKDA)');
        setSpecialty(c?.specialty_name || 'Cardiology');
        setExamFindings(c?.specialty_examination || c?.general_examination || '');
        setPrimaryDiag(c?.primary_diagnosis || '');
        setSecondaryDiag(c?.secondary_diagnosis || '');
        setDifferentialDiag(c?.differential_diagnosis || '');
        setTreatmentPlan(c?.treatment_plan || '');
        if (c?.prescription_json) {
          try {
            const parsed = JSON.parse(c.prescription_json);
            if (Array.isArray(parsed)) setPrescriptions(parsed);
          } catch (e) {}
        }
        setFollowupRequired(Boolean(c?.followup_required));
        setFollowupDate(c?.followup_date || '');
        setFollowupInstructions(c?.followup_instructions || '');
      }

      if (resLab.ok) {
        const labData = await resLab.json();
        const results = Array.isArray(labData) ? labData : labData.results || [];
        setLabResultsList(results);
      }
    } catch (e) {
      console.error('Error fetching encounter details:', e);
    }
  }, [doctorId, doctorName]);

  // Fetch All Lab Reports Received (cross-encounter)
  const fetchAllLabReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const res = await fetch(`${API_BASE}/api/v1/doctor/encounters/all/lab-results?doctor_id=${doctorId}&doctor_name=${encodeURIComponent(doctorName)}`);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : data.results || [];
        setAllLabReports(results);
      }
    } catch (e) {
      console.error('Error fetching all lab reports:', e);
    } finally {
      setLoadingReports(false);
    }
  }, [doctorId, doctorName]);

  // Initial fetch and on encounter code change
  useEffect(() => {
    fetchDoctorData();
    fetchAllLabReports();
  }, [fetchDoctorData, fetchAllLabReports]);

  useEffect(() => {
    if (selectedEncounterCode) {
      fetchEncounterDetails(selectedEncounterCode);
    }
  }, [selectedEncounterCode, fetchEncounterDetails]);

  // WebSocket Live Listener
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(`${WS_URL}/ws?channel=doctor:${doctorId}`);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const ev = msg.event;

          if (ev === 'LabResultReleased') {
            setNotificationToast({
              type: 'lab',
              title: '🧪 Lab Results Released!',
              message: `Results verified for encounter ${msg.encounter_code || ''}. Ready for doctor review.`
            });
            fetchDoctorData();
            fetchAllLabReports();
            if (selectedEncounterCode) fetchEncounterDetails(selectedEncounterCode);
          } else if (ev === 'NursingAssessmentCompleted') {
            setNotificationToast({
              type: 'nurse',
              title: '👩‍⚕️ Nurse Assessment Complete',
              message: `Patient ${msg.patient_name || ''} triaged and added to your queue.`
            });
            fetchDoctorData();
          } else if (['ConsultationStarted', 'ConsultationCompleted', 'LabResultAcknowledged', 'ClinicalAlertCreated'].includes(ev)) {
            fetchDoctorData();
            fetchAllLabReports();
            if (selectedEncounterCode) fetchEncounterDetails(selectedEncounterCode);
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (ws && ws.readyState === 1) ws.close();
    };
  }, [doctorId, selectedEncounterCode, fetchDoctorData, fetchAllLabReports, fetchEncounterDetails]);

  // Auto-dismiss toast
  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => setNotificationToast(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  // Actions
  const handleSelectPatient = (q) => {
    setSelectedEncounterCode(q.encounter_code);
    setSelectedPatientId(q.patient_id);
    setActiveView('consultation');
  };

  const handleStartConsultation = async () => {
    if (!selectedEncounterCode) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/doctor/consultation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          encounter_code: selectedEncounterCode,
          doctor_id: doctorId
        })
      });
      if (res.ok) {
        setConsultationStatus('IN_CONSULTATION');
        fetchDoctorData();
        fetchEncounterDetails(selectedEncounterCode);
      } else {
        const err = await res.json();
        alert(`Notice: ${err.detail || 'Could not start consultation'}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedEncounterCode) return;
    try {
      const payload = {
        encounter_code: selectedEncounterCode,
        doctor_id: doctorId,
        chief_complaint: chiefComplaint,
        hpi_notes: hpiNotes,
        past_medical_history: pastHistory,
        allergy_notes: allergiesInput,
        general_examination: examFindings,
        specialty_name: specialty,
        specialty_examination: examFindings,
        primary_diagnosis: primaryDiag,
        secondary_diagnosis: secondaryDiag,
        differential_diagnosis: differentialDiag,
        treatment_plan: treatmentPlan,
        prescription_json: JSON.stringify(prescriptions),
        followup_required: followupRequired,
        followup_date: followupDate,
        followup_instructions: followupInstructions,
        referral_required: referralRequired,
        referral_specialty: referralSpecialty,
        referral_notes: referralNotes
      };
      const res = await fetch(`${API_BASE}/api/v1/doctor/consultation/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNotificationToast({
          type: 'success',
          title: 'Draft Saved',
          message: 'Clinical notes and prescription draft recorded.'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledgeLabResult = async (resultId, notes = '') => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/doctor/lab-results/${resultId}/acknowledge?doctor_id=${doctorId}&doctor_name=${encodeURIComponent(doctorName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          clinical_notes: notes
        })
      });
      if (res.ok) {
        setConsultationStatus('DOCTOR_REVIEW');
        fetchDoctorData();
        fetchAllLabReports();
        if (selectedEncounterCode) fetchEncounterDetails(selectedEncounterCode);
        setSelectedReportForModal((prev) => {
          if (prev && (prev.id === resultId || prev.result_id === resultId)) {
            return {
              ...prev,
              doctor_acknowledged: true,
              doctor_acknowledged_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
              doctor_notes: notes || prev.doctor_notes
            };
          }
          return prev;
        });
        setAckModalReport(null);
        setAckDoctorNotes('');
        setNotificationToast({
          type: 'success',
          title: 'Lab Result Acknowledged',
          message: 'Report acknowledged. Encounter updated to DOCTOR_REVIEW.'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEncounterFromReport = (rep) => {
    if (rep.encounter_id) {
      setSelectedEncounterCode(rep.encounter_id);
    }
    if (rep.patient_id) {
      setSelectedPatientId(rep.patient_id);
    }
    setActiveView('consultation');
    setClinicalTab('lab');
    if (selectedReportForModal) {
      setSelectedReportForModal(null);
    }
  };

  const handleOrderLab = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/doctor/lab-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Doctor: doctorName,
          doctor_id: doctorId,
          patient_id: selectedPatientId,
          encounter_id: selectedEncounterCode,
          tests: [labTestName],
          priority: labPriority,
          clinical_indication: labIndication || chiefComplaint || 'Routine Clinical Diagnostic Workup'
        })
      });
      if (res.ok) {
        setShowLabModal(false);
        setLabIndication('');
        setConsultationStatus('AWAITING_RESULTS');
        fetchDoctorData();
        fetchEncounterDetails(selectedEncounterCode);
        setNotificationToast({
          type: 'lab',
          title: 'Lab Order Placed',
          message: `Order dispatched to Laboratory. Encounter is now AWAITING_RESULTS.`
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOrderImaging = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/doctor/orders/imaging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          encounter_code: selectedEncounterCode,
          ordering_doctor_id: doctorId,
          imaging_type: imgType,
          body_part: imgBodyPart,
          priority: imgPriority
        })
      });
      if (res.ok) {
        setShowImgModal(false);
        fetchEncounterDetails(selectedEncounterCode);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDrug = () => {
    if (!drugName.trim()) return;
    setPrescriptions([...prescriptions, {
      name: drugName,
      dose: drugDose,
      route: drugRoute,
      freq: drugFreq,
      duration: drugDuration,
      instructions: drugInst
    }]);
    setDrugName('');
  };

  const handleRemoveDrug = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleCompleteConsultation = async () => {
    try {
      // 1. Save consultation details
      await handleSaveConsultation();

      // 2. Complete consultation API
      const res = await fetch(`${API_BASE}/api/v1/doctor/consultation/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          encounter_code: selectedEncounterCode,
          doctor_id: doctorId
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.message || 'Consultation processed successfully!'}`);
        fetchDoctorData();
        setActiveView('queue');
      } else {
        const err = await res.json();
        alert(`⚠️ ${err.detail || 'Could not complete consultation.'}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Derived Metrics from genuine Doctor Queue
  const waitingCount = queueList.filter(q => q.status === 'WAITING_DOCTOR' || q.status === 'NURSING_COMPLETED').length;
  const inConsultCount = queueList.filter(q => q.status === 'IN_CONSULTATION').length;
  const awaitingLabCount = queueList.filter(q => q.status === 'AWAITING_RESULTS').length;
  const resultsReadyCount = queueList.filter(q => q.status === 'RESULTS_AVAILABLE' || q.status === 'DOCTOR_REVIEW').length;
  const criticalAlertsCount = encounterDetail?.alerts?.length || 0;

  // Derived Metrics & Filtering for Received Lab Reports
  const unacknowledgedReportsCount = useMemo(() => {
    return allLabReports.filter(r => !r.doctor_acknowledged).length;
  }, [allLabReports]);

  const criticalReportsCount = useMemo(() => {
    return allLabReports.filter(r => Boolean(r.is_critical) || (r.parameters || []).some(p => p.is_critical || ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'].includes(p.flag))).length;
  }, [allLabReports]);

  const distinctSections = useMemo(() => {
    const s = new Set();
    allLabReports.forEach(r => {
      if (r.laboratory_section) s.add(r.laboratory_section);
    });
    return Array.from(s);
  }, [allLabReports]);

  const filteredLabReports = useMemo(() => {
    return allLabReports.filter((r) => {
      if (reportsSearch.trim()) {
        const q = reportsSearch.trim().toLowerCase();
        const matchesPatient = (r.patient_name || '').toLowerCase().includes(q);
        const matchesUhid = (r.patient_uhid || '').toLowerCase().includes(q);
        const matchesEnc = (r.encounter_id || '').toLowerCase().includes(q);
        const matchesOrder = (r.order_code || '').toLowerCase().includes(q);
        const matchesTest = (r.test_name || '').toLowerCase().includes(q);
        if (!matchesPatient && !matchesUhid && !matchesEnc && !matchesOrder && !matchesTest) return false;
      }

      if (selectedSectionFilter !== 'ALL') {
        if ((r.laboratory_section || '').toLowerCase() !== selectedSectionFilter.toLowerCase()) {
          return false;
        }
      }

      if (reportsFilter === 'UNACKNOWLEDGED') return !r.doctor_acknowledged;
      if (reportsFilter === 'ACKNOWLEDGED') return Boolean(r.doctor_acknowledged);
      if (reportsFilter === 'CRITICAL') {
        return Boolean(r.is_critical) || (r.parameters || []).some(p => p.is_critical || ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'].includes(p.flag));
      }

      return true;
    });
  }, [allLabReports, reportsFilter, reportsSearch, selectedSectionFilter]);

  // Filtered Queue List
  const filteredQueue = useMemo(() => {
    return queueList.filter((item) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.patient_name || '').toLowerCase().includes(q);
        const matchesUhid = (item.patient_uhid || '').toLowerCase().includes(q);
        const matchesCode = (item.encounter_code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesUhid && !matchesCode) return false;
      }

      // Status chip filter
      if (queueFilter === 'WAITING') return item.status === 'WAITING_DOCTOR' || item.status === 'NURSING_COMPLETED';
      if (queueFilter === 'IN_CONSULTATION') return item.status === 'IN_CONSULTATION';
      if (queueFilter === 'AWAITING_LAB') return item.status === 'AWAITING_RESULTS';
      if (queueFilter === 'RESULTS_READY') return item.status === 'RESULTS_AVAILABLE' || item.status === 'DOCTOR_REVIEW';
      if (queueFilter === 'COMPLETED') return item.status === 'COMPLETED';
      // ALL_ACTIVE excludes COMPLETED from the active triage queue
      return item.status !== 'COMPLETED';
    });
  }, [queueList, queueFilter, searchQuery]);

  // Current Patient and Clinical data
  const pt = encounterDetail?.patient || {};
  const enc = encounterDetail?.encounter || {};
  const latestV = encounterDetail?.vitals || {};
  const nursingA = encounterDetail?.nursing_assessment || {};
  const alerts = encounterDetail?.alerts || [];
  const labOrders = encounterDetail?.lab_orders || [];
  const imagingOrders = encounterDetail?.imaging_orders || [];

  return (
    <div className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-6 text-[#10201B] font-sans">
      
      {/* TOAST NOTIFICATION POPUP */}
      {notificationToast && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in-right bg-white border border-[#087F5B]/40 p-4 rounded-2xl shadow-xl backdrop-blur-md max-w-sm flex items-start gap-3 text-[#10201B]">
          <div className="w-9 h-9 rounded-xl bg-[#EEF7F1] text-[#087F5B] flex items-center justify-center shrink-0 font-bold">
            {notificationToast.type === 'lab' ? '🧪' : '👩‍⚕️'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-[#10201B]">{notificationToast.title}</div>
            <div className="text-xs text-[#65756E] mt-0.5">{notificationToast.message}</div>
          </div>
          <button onClick={() => setNotificationToast(null)} className="text-[#65756E] hover:text-[#10201B] text-xs">✕</button>
        </div>
      )}

      {/* TOP HEADER & WORKSPACE NAVIGATION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#063C2F] p-6 rounded-3xl border border-[#07543F] shadow-hero text-white">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-[#12B886]" />
              {doctorName}’s Clinical Workstation
            </h1>
            <span className="px-3 py-1 bg-[#07543F] text-[#DDEFE5] text-xs font-semibold rounded-full border border-[#087F5B]/30">
              {doctorSpec}
            </span>
            <span className="px-3 py-1 bg-[#07543F] text-[#12B886] text-xs font-semibold rounded-full border border-[#087F5B]/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#12B886] animate-pulse"></span>
              Live Channel: doctor:{doctorId}
            </span>
          </div>
          <p className="text-xs text-[#DDEFE5]/80 mt-1.5">
            Real-Time Encounter-Driven Clinical Workflow • Zero Re-entry Triage & Closed-Loop Diagnostics
          </p>
        </div>

        {/* Primary View Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-[#052E24] p-1.5 rounded-2xl border border-[#07543F]">
          <button
            onClick={() => setActiveView('queue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeView === 'queue'
                ? 'bg-[#087F5B] text-white shadow-md shadow-[#052E24]/30'
                : 'text-[#DDEFE5] hover:text-white hover:bg-[#07543F]/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Consultation Queue
            <span className="px-1.5 py-0.5 rounded-full bg-[#052E24] text-[10px] font-black text-[#12B886]">
              {queueList.filter(q => q.status !== 'COMPLETED').length}
            </span>
          </button>

          <button
            onClick={() => {
              if (selectedEncounterCode) setActiveView('consultation');
              else if (queueList.length > 0) handleSelectPatient(queueList[0]);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeView === 'consultation'
                ? 'bg-[#087F5B] text-white shadow-md shadow-[#052E24]/30'
                : 'text-[#DDEFE5] hover:text-white hover:bg-[#07543F]/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Active Encounter
            {selectedEncounterCode && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#052E24] text-[10px] font-mono text-[#12B886]">
                {selectedEncounterCode}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('lab_reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeView === 'lab_reports'
                ? 'bg-[#087F5B] text-white shadow-md shadow-[#052E24]/30'
                : 'text-[#DDEFE5] hover:text-white hover:bg-[#07543F]/50'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-[#12B886]" />
            Received Lab Reports
            {unacknowledgedReportsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-[#12B886] text-[#052E24] font-black text-[10px] animate-pulse">
                {unacknowledgedReportsCount} Action Required
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-[#052E24] text-[10px] font-bold text-[#DDEFE5]/70">
                {allLabReports.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 6 DYNAMIC SYNCHRONIZED DASHBOARD COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card hover:shadow-card-hover transition-all text-[#10201B]">
          <div className="text-[11px] font-bold text-[#65756E] uppercase tracking-wider">Waiting for Doctor</div>
          <div className="text-3xl font-black text-[#087F5B] mt-1">{waitingCount}</div>
          <div className="text-[11px] text-[#65756E] mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#087F5B]"></span> Nurse Assessed
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card hover:shadow-card-hover transition-all text-[#10201B]">
          <div className="text-[11px] font-bold text-[#65756E] uppercase tracking-wider">In Consultation</div>
          <div className="text-3xl font-black text-[#F59E0B] mt-1">{inConsultCount}</div>
          <div className="text-[11px] text-[#65756E] mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span> Active Exam
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card hover:shadow-card-hover transition-all text-[#10201B]">
          <div className="text-[11px] font-bold text-[#65756E] uppercase tracking-wider">Awaiting Lab</div>
          <div className="text-3xl font-black text-[#3B82F6] mt-1">{awaitingLabCount}</div>
          <div className="text-[11px] text-[#65756E] mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span> Specimen at LIMS
          </div>
        </div>

        <div 
          onClick={() => setActiveView('lab_reports')}
          className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card hover:shadow-card-hover cursor-pointer transition-all text-[#10201B] group hover:border-[#087F5B]/50"
        >
          <div className="text-[11px] font-bold text-[#65756E] uppercase tracking-wider group-hover:text-[#087F5B] transition-colors flex items-center justify-between">
            <span>Lab Results Ready</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#087F5B]" />
          </div>
          <div className="text-3xl font-black text-[#087F5B] mt-1 flex items-center gap-2">
            {unacknowledgedReportsCount || resultsReadyCount}
            {(unacknowledgedReportsCount > 0 || resultsReadyCount > 0) && <span className="w-2.5 h-2.5 rounded-full bg-[#12B886] animate-ping"></span>}
          </div>
          <div className="text-[11px] text-[#65756E] mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#087F5B]"></span> View Received Reports
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card hover:shadow-card-hover transition-all text-[#10201B]">
          <div className="text-[11px] font-bold text-[#65756E] uppercase tracking-wider">Critical Alerts</div>
          <div className="text-3xl font-black text-rose-600 mt-1">{criticalAlertsCount}</div>
          <div className="text-[11px] text-[#65756E] mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Vital Alarms
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card hover:shadow-card-hover transition-all text-[#10201B]">
          <div className="text-[11px] font-bold text-[#65756E] uppercase tracking-wider">Completed Today</div>
          <div className="text-3xl font-black text-[#10201B] mt-1">{completedCount}</div>
          <div className="text-[11px] text-[#65756E] mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#65756E]"></span> Discharged / History
          </div>
        </div>
      </div>

      {/* VIEW 1: ENCOUNTER CONSULTATION QUEUE */}
      {activeView === 'queue' && (
        <div className="bg-white border border-[#DDE5E0] rounded-3xl p-6 shadow-card space-y-5 text-[#10201B]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#10201B] flex items-center gap-2">
                <span>Active Consultation Queue</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF7F1] text-[#087F5B] font-semibold border border-[#087F5B]/30">
                  Assigned to {doctorName}
                </span>
              </h2>
              <p className="text-xs text-[#65756E] mt-0.5">
                Real-time patient status machine. Completed encounters automatically transition out of the active waiting queue.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#65756E] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter patient, UHID, encounter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] placeholder:text-[#65756E] w-64 focus:outline-none focus:ring-2 focus:ring-[#087F5B]/20 focus:border-[#087F5B]"
                />
              </div>

              <button
                onClick={fetchDoctorData}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F6F8F6] text-[#10201B] border border-[#DDE5E0] rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#087F5B] ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* QUEUE FILTER CHIPS */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#DDE5E0]">
            <button
              onClick={() => setQueueFilter('ALL_ACTIVE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                queueFilter === 'ALL_ACTIVE' ? 'bg-[#052E24] text-white shadow-sm' : 'bg-[#F6F8F6] text-[#65756E] hover:bg-[#EEF7F1] hover:text-[#10201B]'
              }`}
            >
              All Active ({queueList.filter(q => q.status !== 'COMPLETED').length})
            </button>
            <button
              onClick={() => setQueueFilter('WAITING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                queueFilter === 'WAITING' ? 'bg-[#052E24] text-white shadow-sm' : 'bg-[#F6F8F6] text-[#65756E] hover:bg-[#EEF7F1] hover:text-[#10201B]'
              }`}
            >
              Waiting for Doctor ({waitingCount})
            </button>
            <button
              onClick={() => setQueueFilter('IN_CONSULTATION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                queueFilter === 'IN_CONSULTATION' ? 'bg-[#F59E0B] text-white shadow-sm' : 'bg-[#F6F8F6] text-[#65756E] hover:bg-[#EEF7F1] hover:text-[#10201B]'
              }`}
            >
              In Consultation ({inConsultCount})
            </button>
            <button
              onClick={() => setQueueFilter('AWAITING_LAB')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                queueFilter === 'AWAITING_LAB' ? 'bg-[#3B82F6] text-white shadow-sm' : 'bg-[#F6F8F6] text-[#65756E] hover:bg-[#EEF7F1] hover:text-[#10201B]'
              }`}
            >
              Awaiting Lab ({awaitingLabCount})
            </button>
            <button
              onClick={() => setQueueFilter('RESULTS_READY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                queueFilter === 'RESULTS_READY' ? 'bg-[#087F5B] text-white shadow-sm' : 'bg-[#F6F8F6] text-[#65756E] hover:bg-[#EEF7F1] hover:text-[#10201B]'
              }`}
            >
              Results Ready ({resultsReadyCount})
            </button>
            <button
              onClick={() => setQueueFilter('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                queueFilter === 'COMPLETED' ? 'bg-[#10201B] text-white shadow-sm' : 'bg-[#F6F8F6] text-[#65756E] hover:bg-[#EEF7F1] hover:text-[#10201B]'
              }`}
            >
              Completed History
            </button>
          </div>

          {/* QUEUE TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-[#DDE5E0]">
            <table className="w-full text-left text-xs text-[#10201B]">
              <thead className="bg-[#052E24] text-white uppercase text-[11px] tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Token</th>
                  <th className="py-3.5 px-4 font-bold">Patient Demographics</th>
                  <th className="py-3.5 px-4 font-bold">Priority</th>
                  <th className="py-3.5 px-4 font-bold">Nursing Triage</th>
                  <th className="py-3.5 px-4 font-bold">Encounter Status</th>
                  <th className="py-3.5 px-4 font-bold">Wait Time</th>
                  <th className="py-3.5 px-4 font-bold text-right">Clinical Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5ECE8] bg-white">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-[#65756E] text-xs italic">
                      No patients currently match this queue filter.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((q) => {
                    const isResultsAvailable = q.status === 'RESULTS_AVAILABLE';
                    const isDoctorReview = q.status === 'DOCTOR_REVIEW';
                    const isAwaitingResults = q.status === 'AWAITING_RESULTS';
                    const isInConsult = q.status === 'IN_CONSULTATION';
                    const isWaiting = q.status === 'WAITING_DOCTOR' || q.status === 'NURSING_COMPLETED';
                    const isCompleted = q.status === 'COMPLETED';

                    return (
                      <tr
                        key={q.encounter_code || q.token}
                        className={`hover:bg-[#EEF7F1]/60 transition-colors ${
                          selectedEncounterCode === q.encounter_code ? 'bg-[#EEF7F1]/80' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#087F5B]">
                          {q.token || 'TK-01'}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#10201B] flex items-center gap-2">
                            {q.patient_name}
                            {q.blood_group && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F6F8F6] text-[#65756E] border border-[#DDE5E0] font-semibold">
                                {q.blood_group}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#65756E] font-mono mt-0.5">
                            {q.patient_uhid} • {q.patient_age ? `${q.patient_age}y` : 'Adult'} • {q.patient_gender || 'M'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              q.priority === 'Emergency'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : q.priority === 'Urgent'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-[#F6F8F6] text-[#65756E] border border-[#DDE5E0]'
                            }`}
                          >
                            {q.priority || 'Normal'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {q.nursing_completed ? (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#EEF7F1] text-[#087F5B] text-xs font-bold border border-[#087F5B]/30 flex items-center gap-1 w-fit">
                                ✓ TRIAGE DONE
                              </span>
                              {q.chief_complaint && (
                                <div className="text-[11px] text-[#65756E] truncate max-w-xs mt-1">
                                  {q.chief_complaint}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-semibold">Pending Triage</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isResultsAvailable && (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1.5 w-fit">
                              <span className="w-2 h-2 rounded-full bg-[#087F5B] animate-ping"></span>
                              RESULTS READY
                            </span>
                          )}
                          {isDoctorReview && (
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1.5 w-fit">
                              DOCTOR REVIEW
                            </span>
                          )}
                          {isAwaitingResults && (
                            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 w-fit">
                              ⏳ AWAITING LAB
                            </span>
                          )}
                          {isInConsult && (
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1.5 w-fit">
                              IN CONSULTATION
                            </span>
                          )}
                          {isWaiting && (
                            <span className="px-3 py-1 rounded-full bg-[#EEF7F1] text-[#087F5B] text-xs font-bold border border-[#087F5B]/30 flex items-center gap-1.5 w-fit">
                              READY FOR DOCTOR
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                              COMPLETED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#65756E] text-xs font-mono">
                          {q.wait_time || '5 min'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleSelectPatient(q)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              isResultsAvailable
                                ? 'bg-[#087F5B] hover:bg-[#07543F] text-white animate-pulse'
                                : isInConsult || isDoctorReview
                                ? 'bg-[#063C2F] hover:bg-[#052E24] text-white'
                                : 'bg-[#087F5B] hover:bg-[#07543F] text-white'
                            }`}
                          >
                            {isResultsAvailable
                              ? 'Review Results'
                              : isInConsult
                              ? 'Continue Workup'
                              : isDoctorReview
                              ? 'Resume Review'
                              : 'Open Encounter'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CONNECTED ENCOUNTER CLINICAL WORKSTATION */}
      {activeView === 'consultation' && (
        <div className="space-y-6">

          {/* ACTIVE CLINICAL ALERTS BANNER */}
          {alerts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm text-rose-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xl animate-bounce">
                  🚨
                </div>
                <div>
                  <h3 className="font-bold text-rose-800 text-sm">Critical Clinical Vital Alert Detected</h3>
                  <p className="text-xs text-rose-600 mt-0.5">{alerts[0].message || 'Abnormal SpO2 / Blood Pressure'}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200">
                Severity: {alerts[0].severity || 'HIGH'}
              </span>
            </div>
          )}

          {/* RESULTS AVAILABLE CALLOUT BANNER */}
          {(consultationStatus === 'RESULTS_AVAILABLE' || labResultsList.some(r => r.status === 'RELEASED' && !r.doctor_acknowledged)) && (
            <div className="bg-[#EEF7F1] border border-[#087F5B]/40 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm text-[#052E24]">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-[#087F5B]/30 text-[#087F5B] flex items-center justify-center font-black text-2xl shadow-sm">
                  🧪
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#052E24] text-sm">Diagnostic Lab Results Verified & Released!</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white text-[#087F5B] text-[10px] font-bold border border-[#087F5B]/20">
                      Direct Delivery to {doctorName}
                    </span>
                  </div>
                  <p className="text-xs text-[#65756E] mt-0.5">
                    Specimens have been analyzed and verified by Pathologist. Acknowledge findings to transition to DOCTOR_REVIEW.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const unack = labResultsList.find(r => !r.doctor_acknowledged) || labResultsList[0];
                  if (unack) handleAcknowledgeLabResult(unack.id);
                  setClinicalTab('lab');
                }}
                className="px-5 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Acknowledge Lab Results & Review
              </button>
            </div>
          )}

          {/* STICKY PATIENT DEMOGRAPHICS & ENCOUNTER HEADER (ZERO RE-ENTRY) */}
          <div className="bg-white border border-[#DDE5E0] p-6 rounded-3xl shadow-card flex flex-wrap items-center justify-between gap-6 text-[#10201B]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF7F1] border border-[#087F5B]/30 text-[#087F5B] flex items-center justify-center text-2xl font-black shadow-sm">
                {pt.full_name ? pt.full_name[0] : 'P'}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-[#10201B]">{pt.full_name || 'Patient'}</h2>
                  <span className="px-2.5 py-0.5 bg-[#F6F8F6] text-[#087F5B] text-xs font-mono font-bold rounded-lg border border-[#DDE5E0]">
                    {pt.patient_code || 'PT-2026'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-[#F6F8F6] text-[#65756E] text-xs font-mono font-semibold rounded-lg border border-[#DDE5E0]">
                    {selectedEncounterCode}
                  </span>
                  {enc.priority === 'Emergency' && (
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
                      EMERGENCY
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#65756E] mt-1.5 font-mono">
                  <span>Age: {pt.age ? `${pt.age} yrs` : 'Adult'}</span>
                  <span>Gender: {pt.gender || 'Male'}</span>
                  <span>Blood Group: <strong className="text-[#10201B]">{pt.blood_group || 'O+'}</strong></span>
                  <span>Mobile: {pt.mobile || '+91 98765 43210'}</span>
                </div>
              </div>
            </div>

            {/* ENCOUNTER STATUS & WORKFLOW ACTIONS */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Live Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F6F8F6] rounded-xl border border-[#DDE5E0] text-xs font-bold">
                <span className="text-[#65756E]">Encounter Status:</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${
                  consultationStatus === 'IN_CONSULTATION' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  consultationStatus === 'AWAITING_RESULTS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  consultationStatus === 'RESULTS_AVAILABLE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse' :
                  consultationStatus === 'DOCTOR_REVIEW' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  consultationStatus === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                  'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  {consultationStatus}
                </span>
              </div>

              {/* Start Consultation Button */}
              {(consultationStatus === 'WAITING_DOCTOR' || consultationStatus === 'NURSING_COMPLETED') && (
                <button
                  onClick={handleStartConsultation}
                  className="px-5 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Start Consultation
                </button>
              )}

              {/* Order Lab & Save Draft Buttons */}
              {['IN_CONSULTATION', 'DOCTOR_REVIEW', 'RESULTS_AVAILABLE'].includes(consultationStatus) && (
                <>
                  <button
                    onClick={() => setShowLabModal(true)}
                    className="px-4 py-2.5 bg-[#063C2F] hover:bg-[#052E24] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    + Order Lab
                  </button>

                  <button
                    onClick={handleSaveConsultation}
                    className="px-4 py-2.5 bg-white hover:bg-[#F6F8F6] text-[#10201B] font-bold rounded-xl text-xs border border-[#DDE5E0] shadow-sm transition-all"
                  >
                    Save Draft
                  </button>

                  <button
                    onClick={handleCompleteConsultation}
                    className="px-5 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Consultation
                  </button>
                </>
              )}

              {consultationStatus === 'AWAITING_RESULTS' && (
                <button
                  onClick={() => setShowLabModal(true)}
                  className="px-4 py-2.5 bg-[#063C2F] hover:bg-[#052E24] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  + Order More Tests
                </button>
              )}
            </div>
          </div>

          {/* CLINICAL SUB-NAVIGATION BAR (CONNECTS ALL DOCTOR MODULES) */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#DDE5E0] shadow-sm">
            <button
              onClick={() => setClinicalTab('history')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                clinicalTab === 'history' ? 'bg-[#052E24] text-white shadow-sm' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              1. Triage & Vitals
            </button>

            <button
              onClick={() => setClinicalTab('exam')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                clinicalTab === 'exam' ? 'bg-[#052E24] text-white shadow-sm' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              2. Clinical Notes & Exam
            </button>

            <button
              onClick={() => setClinicalTab('lab')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                clinicalTab === 'lab' ? 'bg-[#052E24] text-white shadow-sm' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              3. Laboratory & Investigations
              {labResultsList.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#EEF7F1] text-[10px] text-[#087F5B] font-bold border border-[#087F5B]/20">
                  {labResultsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setClinicalTab('diagnosis')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                clinicalTab === 'diagnosis' ? 'bg-[#052E24] text-white shadow-sm' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              4. Diagnosis
            </button>

            <button
              onClick={() => setClinicalTab('prescription')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                clinicalTab === 'prescription' ? 'bg-[#052E24] text-white shadow-sm' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              5. Prescription
              {prescriptions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#EEF7F1] text-[10px] text-[#087F5B] font-bold border border-[#087F5B]/20">
                  {prescriptions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setClinicalTab('followup')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                clinicalTab === 'followup' ? 'bg-[#052E24] text-white shadow-sm' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              6. Follow-up & Disposition
            </button>
          </div>

          {/* TAB CONTENT PANELS */}

          {/* SUBTAB 1: TRIAGE & PRE-CONSULTATION VITALS (ZERO RE-ENTRY) */}
          {clinicalTab === 'history' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* NURSE VITALS CARD */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-5 text-[#10201B]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#10201B] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#087F5B]" />
                    Latest Vital Signs
                  </h3>
                  <span className="text-xs text-[#087F5B] font-mono bg-[#EEF7F1] px-2.5 py-1 rounded-lg border border-[#087F5B]/20">
                    Recorded by Nurse • {latestV.recorded_at || 'Today'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <div className="text-[11px] text-[#65756E] font-medium">Temperature</div>
                    <div className="text-xl font-bold text-[#10201B] mt-1">{latestV.temperature || '98.6'} °F</div>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <div className="text-[11px] text-[#65756E] font-medium">Pulse Rate</div>
                    <div className="text-xl font-bold text-[#10201B] mt-1">{latestV.pulse_rate || '78'} bpm</div>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <div className="text-[11px] text-[#65756E] font-medium">Blood Pressure</div>
                    <div className="text-xl font-bold text-[#10201B] mt-1">
                      {latestV.systolic_bp || '120'} / {latestV.diastolic_bp || '80'}
                    </div>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <div className="text-[11px] text-[#65756E] font-medium">SpO₂ Oxygen</div>
                    <div className={`text-xl font-bold mt-1 ${Number(latestV.spo2 || 98) < 95 ? 'text-rose-600' : 'text-[#087F5B]'}`}>
                      {latestV.spo2 || '98'} %
                    </div>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <div className="text-[11px] text-[#65756E] font-medium">Resp. Rate</div>
                    <div className="text-xl font-bold text-[#10201B] mt-1">{latestV.respiratory_rate || '18'} /min</div>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <div className="text-[11px] text-[#65756E] font-medium">Pain Score</div>
                    <div className="text-xl font-bold text-[#F59E0B] mt-1">{latestV.pain_score ?? 2} / 10</div>
                  </div>
                </div>

                <div className="bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0] flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[#65756E]">Random Blood Glucose: </span>
                    <strong className="text-[#10201B] font-mono">{latestV.blood_glucose || '110'} mg/dL</strong>
                  </div>
                  <div>
                    <span className="text-[#65756E]">BMI: </span>
                    <strong className="text-[#087F5B] font-mono">{latestV.bmi || '23.5'}</strong>
                  </div>
                </div>
              </div>

              {/* NURSE TRIAGE ASSESSMENT CARD */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-4 text-[#10201B]">
                <h3 className="font-bold text-sm text-[#10201B] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#087F5B]" />
                  Pre-Consultation Nursing Assessment
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <span className="text-[#65756E] font-semibold block mb-1">Chief Complaint recorded by Nurse:</span>
                    <span className="text-[#10201B] font-medium">{nursingA.chief_complaint || 'Chest discomfort & exertional dyspnea.'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F6F8F6] p-3 rounded-2xl border border-[#DDE5E0]">
                      <span className="text-[#65756E] font-semibold block mb-0.5">General Condition:</span>
                      <span className="text-[#087F5B] font-bold">{nursingA.general_condition || 'Stable'}</span>
                    </div>

                    <div className="bg-[#F6F8F6] p-3 rounded-2xl border border-[#DDE5E0]">
                      <span className="text-[#65756E] font-semibold block mb-0.5">Mobility / Fall Risk:</span>
                      <span className="text-[#10201B]">{nursingA.mobility || 'Independent'} ({nursingA.fall_risk || 'Low Risk'})</span>
                    </div>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <span className="text-[#65756E] font-semibold block mb-1">Nursing Clinical Observations:</span>
                    <span className="text-[#65756E]">{nursingA.observations || 'Patient oriented to time, place, and person. No acute distress observed.'}</span>
                  </div>

                  <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0]">
                    <span className="text-[#65756E] font-semibold block mb-1">Documented Allergies:</span>
                    <span className="text-amber-800 font-bold">{nursingA.allergies || 'No Known Allergies (NKDA)'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: CLINICAL NOTES & PHYSICAL EXAMINATION */}
          {clinicalTab === 'exam' && (
            <div className="bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-6 text-[#10201B]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#052E24] uppercase tracking-wider">
                  Clinical Examination & Findings
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#65756E]">Specialty Mode:</span>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="bg-[#F6F8F6] border border-[#DDE5E0] text-xs font-semibold text-[#10201B] px-3 py-1.5 rounded-xl focus:border-[#087F5B]"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                    Chief Complaint (Auto-populated from Triage)
                  </label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] font-medium focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                    Documented Allergies
                  </label>
                  <input
                    type="text"
                    value={allergiesInput}
                    onChange={(e) => setAllergiesInput(e.target.value)}
                    className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-amber-800 font-medium focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                  History of Present Illness (HPI)
                </label>
                <textarea
                  rows={3}
                  value={hpiNotes}
                  onChange={(e) => setHpiNotes(e.target.value)}
                  placeholder="Describe onset, duration, location, radiation, aggravating/relieving factors..."
                  className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                  Past Medical & Surgical History
                </label>
                <textarea
                  rows={2}
                  value={pastHistory}
                  onChange={(e) => setPastHistory(e.target.value)}
                  placeholder="E.g. HTN (5 yrs on ARBs), DM Type 2, Previous appendectomy..."
                  className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                  {specialty} Physical Examination Findings
                </label>
                <textarea
                  rows={3}
                  value={examFindings}
                  onChange={(e) => setExamFindings(e.target.value)}
                  placeholder="Systematic examination notes: CVS, Respiratory, Abdomen, CNS..."
                  className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                />
              </div>
            </div>
          )}

          {/* SUBTAB 3: CLOSED-LOOP INVESTIGATIONS & LAB RESULTS */}
          {clinicalTab === 'lab' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-5 text-[#10201B]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#052E24] uppercase tracking-wider flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-[#087F5B]" />
                      Laboratory Orders & Diagnostic Results
                    </h3>
                    <p className="text-xs text-[#65756E] mt-0.5">
                      Closed-loop tracking: Orders placed appear directly in Laboratory portal, and released reports return here for your acknowledgement.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowLabModal(true)}
                      className="px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Order Lab Test
                    </button>
                    <button
                      onClick={() => setShowImgModal(true)}
                      className="px-4 py-2 bg-[#063C2F] hover:bg-[#052E24] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Order Imaging
                    </button>
                  </div>
                </div>

                {/* VERIFIED & RELEASED LAB RESULTS SECTION */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-[#10201B] flex items-center justify-between">
                    <span>Verified Laboratory Reports ({labResultsList.length})</span>
                    <span className="text-[11px] text-[#087F5B] font-mono font-semibold">Released to Ordering Doctor</span>
                  </div>

                  {labResultsList.length === 0 ? (
                    <div className="bg-[#F6F8F6] p-6 rounded-2xl border border-[#DDE5E0] text-center text-xs text-[#65756E] italic">
                      No lab results released yet for this encounter. Click "+ Order Lab Test" to place diagnostic requests.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {labResultsList.map((r) => (
                        <div
                          key={r.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            !r.doctor_acknowledged
                              ? 'bg-[#EEF7F1]/60 border-[#087F5B]/50 shadow-sm'
                              : 'bg-white border-[#DDE5E0]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5ECE8] pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#087F5B]"></span>
                              <h4 className="font-bold text-sm text-[#10201B]">{r.test_name}</h4>
                              <span className="text-xs text-[#65756E] font-mono">#{r.result_code || `RES-${r.id}`}</span>
                              {r.laboratory_section && (
                                <span className="px-2 py-0.5 rounded-full bg-[#EEF7F1] text-[#087F5B] text-[10px] font-semibold border border-[#087F5B]/30">
                                  {r.laboratory_section}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedReportForModal({
                                  ...r,
                                  patient_name: pt?.name || encounterDetail?.patient?.name,
                                  patient_uhid: pt?.uhid || encounterDetail?.patient?.uhid,
                                  patient_age: pt?.age || encounterDetail?.patient?.age,
                                  patient_gender: pt?.gender || encounterDetail?.patient?.gender,
                                  encounter_id: selectedEncounterCode,
                                  doctor_name: doctorName
                                })}
                                className="px-3 py-1.5 bg-white hover:bg-[#F6F8F6] text-[#087F5B] font-bold text-xs rounded-xl border border-[#087F5B]/30 flex items-center gap-1.5 transition-all shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Official Report
                              </button>

                              {r.doctor_acknowledged ? (
                                <span className="px-3 py-1.5 bg-[#EEF7F1] text-[#087F5B] font-bold text-xs rounded-xl border border-[#087F5B]/20 flex items-center gap-1">
                                  ✓ Doctor Acknowledged
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAcknowledgeLabResult(r.id)}
                                  className="px-4 py-1.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  Acknowledge & Proceed to Review
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quantitative Parameters Table if Present */}
                          {r.parameters && r.parameters.length > 0 ? (
                            <div className="my-3 overflow-x-auto rounded-xl border border-[#DDE5E0] bg-[#F6F8F6]">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-[#DDE5E0] bg-[#052E24] text-[10px] font-bold text-white uppercase">
                                    <th className="py-2 px-3">Parameter</th>
                                    <th className="py-2 px-3 text-center">Result</th>
                                    <th className="py-2 px-3 text-center">Unit</th>
                                    <th className="py-2 px-3 text-center">Reference Interval</th>
                                    <th className="py-2 px-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5ECE8] bg-white">
                                  {r.parameters.map((param, idx) => {
                                    const flag = (param.flag || 'NORMAL').toUpperCase();
                                    const isAbn = ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'].includes(flag) || param.is_critical;

                                    return (
                                      <tr key={idx} className={isAbn ? 'bg-rose-50/50' : 'hover:bg-[#EEF7F1]/50'}>
                                        <td className="py-2 px-3 font-semibold text-[#10201B]">{param.parameter_name}</td>
                                        <td className={`py-2 px-3 text-center font-mono font-bold ${
                                          flag === 'HIGH' || flag === 'CRITICAL_HIGH' ? 'text-amber-700 font-black' :
                                          flag === 'LOW' || flag === 'CRITICAL_LOW' ? 'text-blue-700 font-black' :
                                          'text-[#087F5B]'
                                        }`}>
                                          {param.value}
                                        </td>
                                        <td className="py-2 px-3 text-center text-[#65756E] font-mono text-[10px]">{param.unit || '-'}</td>
                                        <td className="py-2 px-3 text-center text-[#65756E] font-mono text-[10px]">{param.reference_range || param.normal_range || 'Normal'}</td>
                                        <td className="py-2 px-3 text-center">
                                          {flag === 'HIGH' && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[9px] border border-amber-200">High</span>}
                                          {flag === 'LOW' && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-200">Low</span>}
                                          {(flag === 'CRITICAL_HIGH' || flag === 'CRITICAL_LOW' || param.is_critical) && (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-black text-[9px] border border-rose-200 animate-pulse">Critical</span>
                                          )}
                                          {flag === 'NORMAL' && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[9px] border border-emerald-200">Normal</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : null}

                          <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[#65756E] font-semibold block mb-1">Diagnostic Findings / Values:</span>
                              <div className="bg-[#F6F8F6] p-3 rounded-xl border border-[#DDE5E0] font-mono text-[#087F5B] whitespace-pre-wrap">
                                {r.result_data || 'Within Normal Biological Reference Interval.'}
                              </div>
                            </div>

                            <div>
                              <span className="text-[#65756E] font-semibold block mb-1">Pathologist Interpretation & Notes:</span>
                              <div className="bg-[#F6F8F6] p-3 rounded-xl border border-[#DDE5E0] text-[#65756E]">
                                {r.notes || r.pathologist_comments || 'Verified by Central Pathology Laboratory. Clinically correlated.'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* IMAGING REPORTS SECTION */}
                {imagingOrders.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#DDE5E0]">
                    <div className="text-xs font-bold text-[#10201B]">Radiology Imaging Reports</div>
                    <div className="space-y-2">
                      {imagingOrders.map((img) => (
                        <div key={img.id} className="bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0] text-xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-[#10201B]">{img.imaging_type} — {img.body_part}</div>
                            <div className="text-[#65756E] text-[11px] mt-0.5">{img.impression || 'Scan completed; report uploaded.'}</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            img.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {img.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 4: DIAGNOSIS ENGINE */}
          {clinicalTab === 'diagnosis' && (
            <div className="bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-6 text-[#10201B]">
              <h3 className="text-sm font-bold text-[#052E24] uppercase tracking-wider">
                Clinical Diagnosis Engine
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                    Primary Diagnosis (Working / Final)
                  </label>
                  <input
                    type="text"
                    value={primaryDiag}
                    onChange={(e) => setPrimaryDiag(e.target.value)}
                    placeholder="E.g. Acute Coronary Syndrome, Unstable Angina, Type 2 DM..."
                    className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] font-bold focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Acute Coronary Syndrome', 'Essential Hypertension', 'Type 2 Diabetes', 'Acute Gastroenteritis'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPrimaryDiag(s)}
                        className="px-2 py-0.5 bg-[#EEF7F1] hover:bg-[#DDEFE5] text-[10px] text-[#087F5B] font-bold rounded-lg border border-[#087F5B]/30 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                    Secondary Diagnosis / Comorbidities
                  </label>
                  <input
                    type="text"
                    value={secondaryDiag}
                    onChange={(e) => setSecondaryDiag(e.target.value)}
                    placeholder="E.g. Essential Hypertension Stage 1, Dyslipidemia..."
                    className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                  Differential Diagnoses Evaluated
                </label>
                <textarea
                  rows={2}
                  value={differentialDiag}
                  onChange={(e) => setDifferentialDiag(e.target.value)}
                  placeholder="E.g. Gastroesophageal Reflux Disease (GERD), Musculoskeletal Chest Wall Pain..."
                  className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                />
              </div>
            </div>
          )}

          {/* SUBTAB 5: PRESCRIPTION BUILDER */}
          {clinicalTab === 'prescription' && (
            <div className="bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-6 text-[#10201B]">
              <h3 className="text-sm font-bold text-[#052E24] uppercase tracking-wider">
                Prescription & Medication Orders
              </h3>

              {/* DRUG BUILDER BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0]">
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-[#65756E] block mb-1 font-bold">Medication Name</label>
                  <input
                    type="text"
                    placeholder="Drug name (e.g. Paracetamol 650mg)"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-[#65756E] block mb-1 font-bold">Dose</label>
                  <input
                    type="text"
                    value={drugDose}
                    onChange={(e) => setDrugDose(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-[#65756E] block mb-1 font-bold">Route</label>
                  <select
                    value={drugRoute}
                    onChange={(e) => setDrugRoute(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                  >
                    <option value="Oral">Oral</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="Sublingual">Sublingual</option>
                    <option value="Topical">Topical</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-[#65756E] block mb-1 font-bold">Frequency</label>
                  <input
                    type="text"
                    value={drugFreq}
                    onChange={(e) => setDrugFreq(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    onClick={handleAddDrug}
                    className="w-full py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>
              </div>

              {/* PRESCRIPTION TABLE */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#65756E]">Current Prescribed Items ({prescriptions.length})</div>
                <div className="divide-y divide-[#E5ECE8] rounded-2xl border border-[#DDE5E0] overflow-hidden bg-white">
                  {prescriptions.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 text-xs hover:bg-[#EEF7F1]/50">
                      <div>
                        <div className="font-bold text-[#10201B] flex items-center gap-2">
                          <Pill className="w-3.5 h-3.5 text-[#087F5B]" />
                          {m.name}
                        </div>
                        <div className="text-[11px] text-[#65756E] mt-0.5">
                          {m.dose} • {m.route} • {m.freq} • {m.duration} • ({m.instructions})
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveDrug(idx)}
                        className="text-[#65756E] hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 6: FOLLOW-UP & DISPOSITION */}
          {clinicalTab === 'followup' && (
            <div className="bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card space-y-6 text-[#10201B]">
              <h3 className="text-sm font-bold text-[#052E24] uppercase tracking-wider">
                Follow-Up Schedule & Clinical Disposition
              </h3>

              <div>
                <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                  Final Treatment Plan & Lifestyle Advice
                </label>
                <textarea
                  rows={3}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Dietary precautions, activity guidelines, warning signs to report immediately..."
                  className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl text-xs text-[#10201B] focus:border-[#087F5B] focus:ring-2 focus:ring-[#087F5B]/20"
                />
              </div>

              {/* FOLLOW-UP SCHEDULE BOX */}
              <div className="bg-[#F6F8F6] p-5 rounded-2xl border border-[#DDE5E0] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#087F5B]" />
                    <span className="text-xs font-bold text-[#10201B]">Schedule Patient Follow-Up Visit</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#65756E] cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={followupRequired}
                      onChange={(e) => setFollowupRequired(e.target.checked)}
                      className="rounded accent-[#087F5B] w-4 h-4"
                    />
                    Follow-Up Required
                  </label>
                </div>

                {followupRequired && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[11px] text-[#65756E] block mb-1 font-semibold">Scheduled Follow-up Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#65756E] block mb-1 font-semibold">Follow-up Instructions / Goal</label>
                      <input
                        type="text"
                        placeholder="E.g. Repeat ECG and Blood Pressure check in 7 days"
                        value={followupInstructions}
                        onChange={(e) => setFollowupInstructions(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* REFERRAL BOX */}
              <div className="bg-[#F6F8F6] p-5 rounded-2xl border border-[#DDE5E0] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-[#063C2F]" />
                    <span className="text-xs font-bold text-[#10201B]">Inter-Departmental Referral</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#65756E] cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={referralRequired}
                      onChange={(e) => setReferralRequired(e.target.checked)}
                      className="rounded accent-[#087F5B] w-4 h-4"
                    />
                    Referral Required
                  </label>
                </div>

                {referralRequired && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[11px] text-[#65756E] block mb-1 font-semibold">Target Specialty</label>
                      <select
                        value={referralSpecialty}
                        onChange={(e) => setReferralSpecialty(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                      >
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Endocrinology">Endocrinology</option>
                        <option value="General Surgery">General Surgery</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#65756E] block mb-1 font-semibold">Referral Reason / Clinical Note</label>
                      <input
                        type="text"
                        placeholder="Reason for specialist consultation..."
                        value={referralNotes}
                        onChange={(e) => setReferralNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* COMPLETE CONSULTATION FINAL BAR */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#DDE5E0]">
                <button
                  onClick={handleSaveConsultation}
                  className="px-5 py-3 bg-white hover:bg-[#F6F8F6] text-[#10201B] font-bold rounded-2xl text-xs border border-[#DDE5E0] shadow-sm transition-all"
                >
                  Save Consultation Draft
                </button>
                <button
                  onClick={handleCompleteConsultation}
                  className="px-6 py-3 bg-[#087F5B] hover:bg-[#07543F] text-white font-black rounded-2xl text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Consultation & Finalize Encounter
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW 3: RECEIVED LAB REPORTS (CROSS-ENCOUNTER REPOSITORY) */}
      {activeView === 'lab_reports' && (
        <div className="space-y-6 animate-fade-in text-[#10201B]">
          {/* Header Card with Quick Stats & Actions */}
          <div className="bg-white p-6 rounded-3xl border border-[#DDE5E0] shadow-card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#DDE5E0] pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EEF7F1] text-[#087F5B] flex items-center justify-center font-black border border-[#087F5B]/30">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#10201B] tracking-tight flex items-center gap-2">
                      Verified Diagnostic Laboratory Reports
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF7F1] text-[#087F5B] font-mono border border-[#087F5B]/30 font-semibold">
                        LIS / LIMS Stream
                      </span>
                    </h2>
                    <p className="text-xs text-[#65756E] mt-0.5">
                      Review released laboratory investigations, assess quantitative parameters with reference ranges, acknowledge verification, and update clinical decisions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAllLabReports}
                  disabled={loadingReports}
                  className="px-4 py-2.5 bg-white hover:bg-[#F6F8F6] disabled:opacity-50 text-[#10201B] text-xs font-semibold rounded-xl border border-[#DDE5E0] flex items-center gap-2 transition-all shadow-sm"
                  title="Refresh Reports"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#087F5B] ${loadingReports ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    if (queueList.length > 0) handleSelectPatient(queueList[0]);
                    else setActiveView('queue');
                  }}
                  className="px-4 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Go to Consultation
                </button>
              </div>
            </div>

            {/* Quick Filter Strip & Search */}
            <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 bg-[#F6F8F6] p-1 rounded-2xl border border-[#DDE5E0]">
                <button
                  onClick={() => setReportsFilter('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    reportsFilter === 'ALL'
                      ? 'bg-[#052E24] text-white shadow-sm'
                      : 'text-[#65756E] hover:text-[#10201B]'
                  }`}
                >
                  All Reports ({allLabReports.length})
                </button>
                <button
                  onClick={() => setReportsFilter('UNACKNOWLEDGED')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    reportsFilter === 'UNACKNOWLEDGED'
                      ? 'bg-[#087F5B] text-white shadow-sm'
                      : 'text-[#087F5B] hover:text-[#063C2F]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#12B886] animate-pulse"></span>
                  Needs Doctor Review ({unacknowledgedReportsCount})
                </button>
                <button
                  onClick={() => setReportsFilter('CRITICAL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    reportsFilter === 'CRITICAL'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-600 hover:text-rose-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Abnormal / Critical ({criticalReportsCount})
                </button>
                <button
                  onClick={() => setReportsFilter('ACKNOWLEDGED')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    reportsFilter === 'ACKNOWLEDGED'
                      ? 'bg-[#052E24] text-white shadow-sm'
                      : 'text-[#65756E] hover:text-[#10201B]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Acknowledged ({allLabReports.length - unacknowledgedReportsCount})
                </button>
              </div>

              {/* Department Dropdown & Search Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {distinctSections.length > 0 && (
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B] font-medium"
                  >
                    <option value="ALL">All Laboratory Sections</option>
                    {distinctSections.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                )}

                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-[#65756E] absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search patient, UHID, encounter, test..."
                    value={reportsSearch}
                    onChange={(e) => setReportsSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] placeholder:text-[#65756E] focus:border-[#087F5B] focus:outline-none font-medium"
                  />
                  {reportsSearch && (
                    <button
                      onClick={() => setReportsSearch('')}
                      className="absolute right-3 top-2.5 text-xs text-[#65756E] hover:text-[#10201B]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* List of Reports */}
          {loadingReports ? (
            <div className="bg-white p-12 rounded-3xl border border-[#DDE5E0] text-center space-y-3 shadow-card">
              <RefreshCw className="w-8 h-8 text-[#087F5B] animate-spin mx-auto" />
              <div className="text-sm font-bold text-[#10201B]">Synchronizing laboratory reports stream...</div>
              <div className="text-xs text-[#65756E]">Connecting to LIMS and pathology database</div>
            </div>
          ) : filteredLabReports.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#DDE5E0] text-center space-y-3 shadow-card">
              <FlaskConical className="w-10 h-10 text-[#65756E] mx-auto opacity-50" />
              <div className="text-sm font-bold text-[#10201B]">No laboratory reports match your current filter</div>
              <p className="text-xs text-[#65756E] max-w-md mx-auto">
                {reportsSearch
                  ? `No results found for "${reportsSearch}". Try a different keyword or clear search.`
                  : 'There are no reports under this classification.'}
              </p>
              {(reportsSearch || reportsFilter !== 'ALL' || selectedSectionFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setReportsSearch('');
                    setReportsFilter('ALL');
                    setSelectedSectionFilter('ALL');
                  }}
                  className="px-4 py-2 bg-[#F6F8F6] hover:bg-[#EEF7F1] text-[#087F5B] text-xs font-semibold rounded-xl border border-[#DDE5E0]"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLabReports.map((rep) => {
                const isAck = Boolean(rep.doctor_acknowledged);
                const hasAbnormal = Boolean(rep.is_critical) || (rep.parameters || []).some(p => p.is_critical || ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'].includes(p.flag));

                return (
                  <div
                    key={rep.id || rep.result_id}
                    className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-card ${
                      !isAck
                        ? 'bg-white border-[#087F5B]/50 hover:border-[#087F5B]'
                        : 'bg-white border-[#DDE5E0]'
                    }`}
                  >
                    {/* Top Status Stripe */}
                    <div className={`px-6 py-2.5 flex flex-wrap items-center justify-between text-xs font-bold border-b ${
                      !isAck
                        ? 'bg-[#EEF7F1] border-[#087F5B]/30 text-[#087F5B]'
                        : 'bg-[#F6F8F6] border-[#DDE5E0] text-[#65756E]'
                    }`}>
                      <div className="flex items-center gap-2">
                        {!isAck ? (
                          <span className="flex items-center gap-1.5 text-[#087F5B] font-extrabold">
                            <span className="w-2 h-2 rounded-full bg-[#12B886] animate-ping"></span>
                            AWAITING DOCTOR ACKNOWLEDGEMENT & REVIEW
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[#087F5B] font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            ACKNOWLEDGED BY {rep.doctor_acknowledged_by_name || rep.doctor_name || 'DOCTOR'} {rep.doctor_acknowledged_at ? `(${rep.doctor_acknowledged_at})` : ''}
                          </span>
                        )}
                        {hasAbnormal && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> ABNORMAL VALUES DETECTED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-[#65756E]">Order Ref: <strong className="text-[#10201B]">{rep.order_code || 'ORD-LAB'}</strong></span>
                        <span>•</span>
                        <span className="text-[#65756E]">Released: <strong className="text-[#10201B]">{rep.result_released_at || rep.verified_at || rep.created_at || 'Just now'}</strong></span>
                      </div>
                    </div>

                    {/* Main Report Content */}
                    <div className="p-6 space-y-4">
                      {/* Patient & Order Metadata Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5ECE8] pb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#EEF7F1] border border-[#087F5B]/30 text-[#087F5B] flex items-center justify-center font-bold text-lg shrink-0">
                            {rep.patient_name ? rep.patient_name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="text-base font-bold text-[#10201B]">{rep.patient_name || 'Patient'}</h3>
                              <span className="px-2 py-0.5 rounded-md bg-[#F6F8F6] text-[#087F5B] text-xs font-mono font-bold border border-[#DDE5E0]">
                                UHID: {rep.patient_uhid || 'N/A'}
                              </span>
                              {rep.patient_age && (
                                <span className="text-xs text-[#65756E]">
                                  {rep.patient_age} yrs • {rep.patient_gender || ''}
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenEncounterFromReport(rep)}
                                className="px-2.5 py-0.5 rounded-full bg-[#EEF7F1] hover:bg-[#DDEFE5] text-[#087F5B] text-xs font-mono border border-[#087F5B]/30 flex items-center gap-1 transition-all"
                                title="Click to open this encounter"
                              >
                                Enc #{rep.encounter_id || rep.encounter_code} <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#65756E] mt-1 font-mono">
                              <span>Specimen: <strong className="text-[#10201B]">{rep.specimen_type || 'Blood'}</strong></span>
                              <span>•</span>
                              <span>Section: <strong className="text-[#087F5B]">{rep.laboratory_section || 'Clinical Diagnostics'}</strong></span>
                              <span>•</span>
                              <span>Ordering Doctor: <strong className="text-[#10201B]">{rep.doctor_name || doctorName}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
                          <button
                            onClick={() => setSelectedReportForModal(rep)}
                            className="px-4 py-2 bg-white hover:bg-[#F6F8F6] text-[#087F5B] font-bold text-xs rounded-xl border border-[#087F5B]/30 flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Official Report
                          </button>

                          <button
                            onClick={() => handleOpenEncounterFromReport(rep)}
                            className="px-4 py-2 bg-[#F6F8F6] hover:bg-[#EEF7F1] text-[#063C2F] font-bold text-xs rounded-xl border border-[#DDE5E0] flex items-center gap-1.5 transition-all"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Open Encounter
                          </button>

                          {!isAck ? (
                            <button
                              onClick={() => setAckModalReport(rep)}
                              className="px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              Acknowledge
                            </button>
                          ) : (
                            <span className="px-3 py-2 bg-[#EEF7F1] text-[#087F5B] font-bold text-xs rounded-xl border border-[#087F5B]/20 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Acknowledged
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Test Title & Summary Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#087F5B]"></span>
                          <span className="font-extrabold text-sm text-[#10201B]">{rep.test_name}</span>
                          <span className="text-xs text-[#65756E] font-mono">({rep.result_code || `RES-${rep.id || rep.result_id}`})</span>
                        </div>
                        <div className="text-xs text-[#65756E] flex items-center gap-2">
                          <span>Verified By: <strong className="text-[#10201B]">{rep.verified_by_name || 'Central Pathologist'}</strong></span>
                        </div>
                      </div>

                      {/* Parameter Breakdown Table (if available) */}
                      {rep.parameters && rep.parameters.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-[#DDE5E0] bg-[#F6F8F6]">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#DDE5E0] bg-[#052E24] text-[11px] font-bold text-white uppercase tracking-wider">
                                <th className="py-2.5 px-4">Parameter</th>
                                <th className="py-2.5 px-4 text-center">Result Value</th>
                                <th className="py-2.5 px-4 text-center">Unit</th>
                                <th className="py-2.5 px-4 text-center">Reference Interval</th>
                                <th className="py-2.5 px-4 text-center">Interpretation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5ECE8] bg-white">
                              {rep.parameters.map((param, idx) => {
                                const flag = (param.flag || 'NORMAL').toUpperCase();
                                const isParamAbnormal = ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'].includes(flag) || param.is_critical;

                                return (
                                  <tr key={idx} className={isParamAbnormal ? 'bg-rose-50/50' : 'hover:bg-[#EEF7F1]/50'}>
                                    <td className="py-2.5 px-4 font-semibold text-[#10201B] flex items-center gap-2">
                                      {isParamAbnormal && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />}
                                      <span>{param.parameter_name}</span>
                                    </td>
                                    <td className={`py-2.5 px-4 text-center font-mono font-bold ${
                                      flag === 'HIGH' || flag === 'CRITICAL_HIGH' ? 'text-amber-700 font-black' :
                                      flag === 'LOW' || flag === 'CRITICAL_LOW' ? 'text-blue-700 font-black' :
                                      'text-[#087F5B]'
                                    }`}>
                                      {param.value}
                                    </td>
                                    <td className="py-2.5 px-4 text-center text-[#65756E] font-mono text-[11px]">{param.unit || '-'}</td>
                                    <td className="py-2.5 px-4 text-center text-[#65756E] font-mono text-[11px]">{param.reference_range || param.normal_range || 'Normal Range'}</td>
                                    <td className="py-2.5 px-4 text-center">
                                      {flag === 'HIGH' && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                                          ↑ High
                                        </span>
                                      )}
                                      {flag === 'LOW' && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                          ↓ Low
                                        </span>
                                      )}
                                      {(flag === 'CRITICAL_HIGH' || flag === 'CRITICAL_LOW' || param.is_critical) && (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-200 animate-pulse">
                                          ⚠️ Critical
                                        </span>
                                      )}
                                      {flag === 'NORMAL' && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                          ✓ Normal
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0]">
                          <span className="text-[#65756E] font-semibold text-xs block mb-1">Diagnostic Findings / Values:</span>
                          <div className="font-mono text-[#087F5B] text-xs whitespace-pre-wrap">
                            {rep.result_data || 'Within Normal Biological Reference Interval.'}
                          </div>
                        </div>
                      )}

                      {/* Pathologist Comments & Doctor Acknowledgment Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0] space-y-1">
                          <span className="text-[#65756E] font-bold text-[11px] uppercase tracking-wider block">Pathologist Clinical Interpretation:</span>
                          <p className="text-[#10201B] leading-relaxed">
                            {rep.notes || rep.pathologist_comments || 'Results verified according to standard ISO-15189 laboratory reference procedures. Clinically correlated with patient profile.'}
                          </p>
                        </div>

                        {rep.doctor_notes ? (
                          <div className="bg-[#EEF7F1] p-3.5 rounded-2xl border border-[#087F5B]/30 space-y-1">
                            <span className="text-[#087F5B] font-bold text-[11px] uppercase tracking-wider block">Doctor Review Notes:</span>
                            <p className="text-[#052E24] leading-relaxed font-medium">
                              {rep.doctor_notes}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-[#F6F8F6] p-3.5 rounded-2xl border border-[#DDE5E0] flex flex-col justify-between">
                            <div>
                              <span className="text-[#65756E] font-bold text-[11px] uppercase tracking-wider block">Doctor Review Status:</span>
                              <p className="text-[#65756E] italic mt-0.5">
                                {!isAck ? 'Pending clinical acknowledgement and doctor sign-off.' : 'Acknowledged with no additional clinical notes.'}
                              </p>
                            </div>
                            {!isAck && (
                              <button
                                onClick={() => setAckModalReport(rep)}
                                className="mt-2 text-left text-xs text-[#087F5B] hover:text-[#063C2F] font-bold flex items-center gap-1"
                              >
                                + Add clinical interpretation & acknowledge →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LAB ORDER MODAL */}
      {showLabModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#087F5B]" />
                Order Laboratory Investigation
              </h3>
              <button onClick={() => setShowLabModal(false)} className="text-[#65756E] hover:text-[#10201B]">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#65756E] block mb-1.5">Select Test Catalog</label>
              <select
                value={labTestName}
                onChange={(e) => setLabTestName(e.target.value)}
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] font-medium focus:border-[#087F5B]"
              >
                <option value="CBC (Complete Blood Count)">CBC (Complete Blood Count)</option>
                <option value="Lipid Profile Assessment">Lipid Profile Assessment</option>
                <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                <option value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</option>
                <option value="Cardiac Troponin I">Cardiac Troponin I</option>
                <option value="Serum Electrolytes">Serum Electrolytes</option>
                <option value="HbA1c Glycated Hemoglobin">HbA1c Glycated Hemoglobin</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#65756E] block mb-1.5">Clinical Priority</label>
              <select
                value={labPriority}
                onChange={(e) => setLabPriority(e.target.value)}
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B]"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#65756E] block mb-1.5">Clinical Indication / Reason</label>
              <input
                type="text"
                value={labIndication}
                onChange={(e) => setLabIndication(e.target.value)}
                placeholder="E.g. Evaluate retrosternal tightness / rule out ACS"
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B]"
              />
            </div>

            <div className="p-3 bg-[#EEF7F1] rounded-xl border border-[#087F5B]/20 text-[11px] text-[#087F5B]">
              ℹ️ Placing this order transitions encounter status to <strong>AWAITING_RESULTS</strong> and automatically sends sample request to Laboratory.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5E0]">
              <button
                onClick={() => setShowLabModal(false)}
                className="px-4 py-2 bg-white hover:bg-[#F6F8F6] text-[#65756E] border border-[#DDE5E0] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleOrderLab}
                className="px-5 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Submit Order to Lab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGING ORDER MODAL */}
      {showImgModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="text-base font-bold text-[#10201B]">Order Radiology Scan / Imaging</h3>
              <button onClick={() => setShowImgModal(false)} className="text-[#65756E] hover:text-[#10201B]">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#65756E] block mb-1">Scan Type</label>
              <select
                value={imgType}
                onChange={(e) => setImgType(e.target.value)}
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B]"
              >
                <option value="CT Scan">CT Scan</option>
                <option value="X-Ray">X-Ray</option>
                <option value="MRI">MRI</option>
                <option value="Ultrasound">Ultrasound</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#65756E] block mb-1">Body Part</label>
              <select
                value={imgBodyPart}
                onChange={(e) => setImgBodyPart(e.target.value)}
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B]"
              >
                <option value="Chest">Chest</option>
                <option value="Abdomen">Abdomen</option>
                <option value="Brain">Brain</option>
                <option value="Knee">Knee</option>
                <option value="Spine">Spine</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5E0]">
              <button onClick={() => setShowImgModal(false)} className="px-4 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#65756E] text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={handleOrderImaging} className="px-4 py-2 bg-[#063C2F] hover:bg-[#052E24] text-white text-xs font-bold rounded-xl shadow-sm">Order Scan</button>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC LAB REPORT OFFICIAL MODAL */}
      {selectedReportForModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Top Bar */}
            <div className="p-4 bg-[#052E24] text-white border-b border-[#07543F] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#12B886]" />
                <h3 className="font-bold text-sm text-white">Official Diagnostic Laboratory Report</h3>
                <span className="text-xs text-[#DDEFE5]/70 font-mono">#{selectedReportForModal.result_code || `RES-${selectedReportForModal.id || selectedReportForModal.result_id}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#07543F] hover:bg-[#087F5B] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button
                  onClick={() => setSelectedReportForModal(null)}
                  className="w-8 h-8 rounded-xl bg-[#07543F] hover:bg-rose-900 text-white flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-white text-[#10201B]">
              {/* Hospital & Lab Official Header */}
              <div className="border-b-2 border-[#DDE5E0] pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs tracking-widest uppercase font-extrabold text-[#087F5B]">MEDITRACK HEALTHCARE SYSTEM</div>
                  <h1 className="text-xl font-black text-[#10201B] mt-0.5">CENTRAL CLINICAL DIAGNOSTIC LABORATORY</h1>
                  <p className="text-xs text-[#65756E]">ISO 15189:2022 Accredited • Department of Laboratory Medicine & Pathology</p>
                </div>
                <div className="text-right text-xs font-mono text-[#65756E] space-y-0.5">
                  <div>Report Status: <strong className="text-[#087F5B]">VERIFIED & RELEASED</strong></div>
                  <div>Report Date: {selectedReportForModal.result_released_at || selectedReportForModal.verified_at || 'Current'}</div>
                  <div>Encounter: <strong className="text-[#063C2F]">#{selectedReportForModal.encounter_id || selectedReportForModal.encounter_code}</strong></div>
                </div>
              </div>

              {/* Patient Demographics & Test Order Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F6F8F6] border border-[#DDE5E0] text-xs">
                <div>
                  <span className="text-[#65756E] font-semibold block">Patient Name:</span>
                  <span className="text-[#10201B] font-bold">{selectedReportForModal.patient_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Patient UHID:</span>
                  <span className="text-[#087F5B] font-mono font-bold">{selectedReportForModal.patient_uhid || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Age / Gender:</span>
                  <span className="text-[#10201B]">{selectedReportForModal.patient_age || '42'} yrs / {selectedReportForModal.patient_gender || 'Male'}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Ordering Doctor:</span>
                  <span className="text-[#10201B] font-semibold">{selectedReportForModal.doctor_name || doctorName}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Specimen Type:</span>
                  <span className="text-[#10201B]">{selectedReportForModal.specimen_type || 'Venous Whole Blood'}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Laboratory Section:</span>
                  <span className="text-[#087F5B] font-semibold">{selectedReportForModal.laboratory_section || 'Clinical Diagnostics'}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Collection Time:</span>
                  <span className="text-[#10201B]">{selectedReportForModal.specimen_collected_at || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#65756E] font-semibold block">Verification Time:</span>
                  <span className="text-[#10201B]">{selectedReportForModal.verified_at || selectedReportForModal.result_released_at || 'Verified'}</span>
                </div>
              </div>

              {/* Test Name Header */}
              <div className="bg-[#F6F8F6] p-3.5 rounded-xl border border-[#DDE5E0] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#65756E] uppercase tracking-wider font-bold block">Investigation:</span>
                  <span className="text-base font-black text-[#10201B]">{selectedReportForModal.test_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#65756E] uppercase tracking-wider font-bold block">Test Code:</span>
                  <span className="text-xs font-mono text-[#10201B] font-bold">{selectedReportForModal.test_code || selectedReportForModal.order_code || 'LAB-TEST'}</span>
                </div>
              </div>

              {/* Parameter Table */}
              {selectedReportForModal.parameters && selectedReportForModal.parameters.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[#DDE5E0]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#DDE5E0] bg-[#052E24] text-[11px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3 px-4">Test Parameter</th>
                        <th className="py-3 px-4 text-center">Result</th>
                        <th className="py-3 px-4 text-center">Unit</th>
                        <th className="py-3 px-4 text-center">Biological Reference Range</th>
                        <th className="py-3 px-4 text-center">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5ECE8] bg-white">
                      {selectedReportForModal.parameters.map((p, idx) => {
                        const flag = (p.flag || 'NORMAL').toUpperCase();
                        const isAbnormal = ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'].includes(flag) || p.is_critical;

                        return (
                          <tr key={idx} className={isAbnormal ? 'bg-rose-50/60' : 'bg-white'}>
                            <td className="py-3 px-4 font-semibold text-[#10201B]">
                              {p.parameter_name}
                            </td>
                            <td className={`py-3 px-4 text-center font-mono font-bold ${
                              flag === 'HIGH' || flag === 'CRITICAL_HIGH' ? 'text-amber-700 font-black' :
                              flag === 'LOW' || flag === 'CRITICAL_LOW' ? 'text-blue-700 font-black' :
                              'text-[#087F5B]'
                            }`}>
                              {p.value}
                            </td>
                            <td className="py-3 px-4 text-center text-[#65756E] font-mono">{p.unit || '-'}</td>
                            <td className="py-3 px-4 text-center text-[#65756E] font-mono">{p.reference_range || p.normal_range || 'Normal Range'}</td>
                            <td className="py-3 px-4 text-center">
                              {flag === 'HIGH' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">High</span>}
                              {flag === 'LOW' && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">Low</span>}
                              {(flag === 'CRITICAL_HIGH' || flag === 'CRITICAL_LOW' || p.is_critical) && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-200 animate-pulse">Critical</span>
                              )}
                              {flag === 'NORMAL' && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">Normal</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F6F8F6] border border-[#DDE5E0] space-y-1.5">
                  <span className="text-xs font-bold text-[#65756E] uppercase tracking-wider block">Findings & Results:</span>
                  <div className="font-mono text-[#087F5B] text-xs whitespace-pre-wrap">
                    {selectedReportForModal.result_data || 'Within Normal Biological Reference Interval.'}
                  </div>
                </div>
              )}

              {/* Pathologist Notes & Correlation */}
              <div className="p-4 rounded-2xl bg-[#F6F8F6] border border-[#DDE5E0] space-y-1.5 text-xs">
                <span className="font-bold text-[#65756E] uppercase tracking-wider block">Pathologist Clinical Interpretation:</span>
                <p className="text-[#10201B] leading-relaxed">
                  {selectedReportForModal.notes || selectedReportForModal.pathologist_comments || 'Results verified according to standard ISO-15189 laboratory reference procedures. Clinically correlated with patient profile.'}
                </p>
              </div>

              {/* Doctor Review Notes or Inline Acknowledgment */}
              {selectedReportForModal.doctor_acknowledged ? (
                <div className="p-4 rounded-2xl bg-[#EEF7F1] border border-[#087F5B]/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#087F5B] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Doctor Acknowledged & Reviewed
                    </span>
                    <span className="text-[#65756E] font-mono">{selectedReportForModal.doctor_acknowledged_at || 'Verified'}</span>
                  </div>
                  {selectedReportForModal.doctor_notes && (
                    <p className="text-[#052E24] font-medium">{selectedReportForModal.doctor_notes}</p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#EEF7F1]/60 border border-[#087F5B]/40 space-y-3">
                  <div className="text-xs font-bold text-[#087F5B] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#12B886] animate-ping"></span>
                    Doctor Acknowledgment Required
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#65756E] block mb-1">
                      Clinical Notes / Plan Adjustment (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="E.g. Reviewed. Patient to continue current therapy. Recheck in 2 weeks..."
                      value={ackDoctorNotes}
                      onChange={(e) => setAckDoctorNotes(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] focus:border-[#087F5B] font-medium"
                    />
                  </div>
                  <button
                    onClick={() => handleAcknowledgeLabResult(selectedReportForModal.id || selectedReportForModal.result_id, ackDoctorNotes)}
                    className="w-full py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    Acknowledge Lab Report & Update Consultation Status
                  </button>
                </div>
              )}

              {/* Digital Signature Footer */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-[#DDE5E0] text-[11px] text-[#65756E]">
                <div>
                  <span className="block text-[#65756E] font-semibold">Analyzed by Technologist:</span>
                  <span className="text-[#10201B] font-medium">{selectedReportForModal.lab_tech_name || 'Senior Medical Technologist'}</span>
                </div>
                <div>
                  <span className="block text-[#65756E] font-semibold">Verified by Pathologist:</span>
                  <span className="text-[#10201B] font-medium">{selectedReportForModal.verified_by_name || 'Consultant Pathologist, MD'}</span>
                </div>
                <div>
                  <span className="block text-[#65756E] font-semibold">Reviewing Physician:</span>
                  <span className="text-[#087F5B] font-medium">{doctorName}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-4 bg-[#F6F8F6] border-t border-[#DDE5E0] flex items-center justify-between">
              <button
                onClick={() => handleOpenEncounterFromReport(selectedReportForModal)}
                className="px-4 py-2 bg-[#EEF7F1] hover:bg-[#DDEFE5] text-[#087F5B] font-bold text-xs rounded-xl border border-[#087F5B]/30 flex items-center gap-1.5 transition-all"
              >
                <Activity className="w-3.5 h-3.5" />
                Go to Encounter Consultation
              </button>
              <button
                onClick={() => setSelectedReportForModal(null)}
                className="px-5 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] font-bold text-xs rounded-xl transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACKNOWLEDGE MODAL */}
      {ackModalReport && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="text-sm font-bold text-[#10201B] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
                Acknowledge Diagnostic Report
              </h3>
              <button onClick={() => setAckModalReport(null)} className="text-[#65756E] hover:text-[#10201B]">✕</button>
            </div>

            <div className="bg-[#F6F8F6] p-3 rounded-xl border border-[#DDE5E0] text-xs space-y-1">
              <div>Test: <strong className="text-[#10201B]">{ackModalReport.test_name}</strong></div>
              <div>Patient: <strong className="text-[#10201B]">{ackModalReport.patient_name}</strong> ({ackModalReport.patient_uhid})</div>
              <div>Encounter: <span className="font-mono text-[#087F5B]">#{ackModalReport.encounter_id || ackModalReport.encounter_code}</span></div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#65756E] block mb-1.5">
                Doctor Review Notes (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="E.g. Normal finding. Patient informed and treatment unchanged."
                value={ackDoctorNotes}
                onChange={(e) => setAckDoctorNotes(e.target.value)}
                className="w-full p-3 bg-white border border-[#DDE5E0] rounded-xl text-xs text-[#10201B] placeholder:text-[#65756E] focus:border-[#087F5B] font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5E0]">
              <button
                onClick={() => {
                  setAckModalReport(null);
                  setAckDoctorNotes('');
                }}
                className="px-4 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#65756E] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcknowledgeLabResult(ackModalReport.id || ackModalReport.result_id, ackDoctorNotes)}
                className="px-5 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Confirm Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// 4. Enterprise Nurse Portal & Pre-Consultation Workstation
const NursePortalDashboard = ({ initialTab = 'dashboard' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Selected Patient State
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [patientName, setPatientName] = useState('Arun Kumar');
  const [patientUhid, setPatientUhid] = useState('PT-2026-00125');
  const [doctorName, setDoctorName] = useState('Dr. Rajesh');
  const [deptName, setDeptName] = useState('Cardiology');
  const [encounterCode, setEncounterCode] = useState('C-015');

  // Vitals State
  const [vitalsList, setVitalsList] = useState([]);
  const [temp, setTemp] = useState('98.6');
  const [pulse, setPulse] = useState('78');
  const [respRate, setRespRate] = useState('18');
  const [sysBp, setSysBp] = useState('120');
  const [diaBp, setDiaBp] = useState('80');
  const [spo2, setSpo2] = useState('98');
  const [weight, setWeight] = useState('72');
  const [height, setHeight] = useState('175');
  const [painScore, setPainScore] = useState(2);
  const [bloodGlucose, setBloodGlucose] = useState('110');
  const [vitalAlertMsg, setVitalAlertMsg] = useState(null);

  // Nursing Assessment State
  const [assessmentList, setAssessmentList] = useState([]);
  const [chiefComplaint, setChiefComplaint] = useState('Chest discomfort and shortness of breath upon exertion.');
  const [generalCond, setGeneralCond] = useState('Stable');
  const [mobility, setMobility] = useState('Independent');
  const [fallRisk, setFallRisk] = useState('Low');
  const [allergies, setAllergies] = useState('No Known Allergies (NKDA)');
  const [observations, setObservations] = useState('Patient alert and oriented x 3, in no acute distress.');

  // MAR State
  const [marList, setMarList] = useState([]);
  const [medName, setMedName] = useState('Paracetamol 650mg');
  const [medDose, setMedDose] = useState('650 mg');
  const [medRoute, setMedRoute] = useState('Oral');
  const [medStatus, setMedStatus] = useState('Given');
  const [medReason, setMedReason] = useState('');

  // Nursing Notes State
  const [notesList, setNotesList] = useState([]);
  const [noteType, setNoteType] = useState('Routine Nursing Note');
  const [noteObs, setNoteObs] = useState('Patient reports mild chest discomfort. Vitals monitored.');
  const [noteInterv, setNoteInterv] = useState('Adjusted posture and administered prescribed medication.');
  const [noteResp, setNoteResp] = useState('Patient expressed comfort and relief.');
  const [docNotified, setDocNotified] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/nurse/dashboard`);
      if (res.ok) setDashboardData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientClinicalData = async (ptId) => {
    try {
      const [resV, resA, resM, resN] = await Promise.all([
        fetch(`${API_BASE}/api/v1/nurse/vitals/${ptId}`),
        fetch(`${API_BASE}/api/v1/nurse/assessments/${ptId}`),
        fetch(`${API_BASE}/api/v1/nurse/medication-admin/${ptId}`),
        fetch(`${API_BASE}/api/v1/nurse/nursing-notes/${ptId}`)
      ]);

      if (resV.ok) setVitalsList(await resV.json());
      if (resA.ok) setAssessmentList(await resA.json());
      if (resM.ok) setMarList(await resM.json());
      if (resN.ok) setNotesList(await resN.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchPatientClinicalData(selectedPatientId);

    // REAL-TIME EVENT-DRIVEN WEBSOCKET LISTENER
    let ws;
    try {
      ws = new WebSocket(`${WS_URL}/ws`);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if ([
            'PatientCheckedIn',
            'NursingAssessmentStarted',
            'VitalsRecorded',
            'NursingAssessmentCompleted',
            'ClinicalAlertCreated',
            'ClinicalAlertResolved'
          ].includes(msg.event)) {
            fetchDashboard();
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (ws && ws.readyState === 1) ws.close();
    };
  }, [selectedPatientId]);

  const selectPatientFromQueue = (pt) => {
    if (!pt) return;
    const pid = pt.patient_id || pt.id || 1;
    setSelectedPatientId(pid);
    setPatientName(pt.patient_name || "Patient");
    setPatientUhid(pt.uhid || "PT-2026-001");
    setDoctorName(pt.doctor || "Dr. Attending");
    setDeptName(pt.department || "General Medicine");
    setEncounterCode(pt.token || "C-000");
  };

  const handleStartAssessment = async (pt) => {
    selectPatientFromQueue(pt);
    try {
      await fetch(`${API_BASE}/api/v1/nurse/assessments/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: pt.id, patient_id: pt.patient_id })
      });
      await fetchDashboard();
      setActiveTab('vitals');
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishAssessment = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/v1/nurse/assessments/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId, encounter_id: encounterCode })
      });

      if (res.ok) {
        alert("🎉 Nursing Assessment Finished! Patient has been automatically moved to the Doctor Consultation Queue.");
        fetchDashboard();
        setActiveTab('dashboard');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to finish assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/nurse/alerts/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      });
      if (res.ok) {
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time BMI Calculation
  const bmiCalc = useMemo(() => {
    const w = parseFloat(weight || 0);
    const h = parseFloat(height || 0);
    if (w > 0 && h > 0) {
      return (w / ((h / 100) ** 2)).toFixed(1);
    }
    return '23.5';
  }, [weight, height]);

  // Real-time Clinical Alert Checker
  const vitalAlerts = useMemo(() => {
    const alerts = [];
    const sp = parseFloat(spo2 || 98);
    const sbp = parseInt(sysBp || 120);
    const dbp = parseInt(diaBp || 80);
    const t = parseFloat(temp || 98.6);
    const p = parseInt(pulse || 78);

    if (sp < 92) alerts.push({ level: 'CRITICAL', text: `Hypoxia Alert: SpO₂ is ${sp}% (< 92%)` });
    if (sbp > 140 || dbp > 90) alerts.push({ level: 'ABNORMAL', text: `Hypertension Alert: BP is ${sbp}/${dbp} mmHg` });
    if (t > 100.4) alerts.push({ level: 'ABNORMAL', text: `Pyrexia Alert: Temperature is ${t}°F` });
    if (p > 100 || p < 50) alerts.push({ level: 'ABNORMAL', text: `Heart Rate Alert: Pulse is ${p} bpm` });

    return alerts;
  }, [spo2, sysBp, diaBp, temp, pulse]);

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        patient_id: selectedPatientId,
        encounter_id: encounterCode,
        temperature: parseFloat(temp),
        pulse_rate: parseInt(pulse),
        respiratory_rate: parseInt(respRate),
        systolic_bp: parseInt(sysBp),
        diastolic_bp: parseInt(diaBp),
        spo2: parseFloat(spo2),
        weight: parseFloat(weight),
        height: parseFloat(height),
        pain_score: parseInt(painScore),
        blood_glucose: parseFloat(bloodGlucose)
      };

      const res = await fetch(`${API_BASE}/api/v1/nurse/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setVitalAlertMsg(data.message);
        fetchPatientClinicalData(selectedPatientId);
        fetchDashboard();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save patient vitals.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        patient_id: selectedPatientId,
        encounter_id: encounterCode,
        chief_complaint: chiefComplaint,
        general_condition: generalCond,
        mobility_status: mobility,
        fall_risk: fallRisk,
        pain_score: parseInt(painScore),
        allergy_status: allergies,
        observations: observations
      };

      const res = await fetch(`${API_BASE}/api/v1/nurse/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Pre-consultation nursing assessment saved.");
        fetchPatientClinicalData(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        patient_id: selectedPatientId,
        medicine_name: medName,
        dose: medDose,
        route: medRoute,
        status: medStatus,
        reason_not_given: medReason
      };

      const res = await fetch(`${API_BASE}/api/v1/nurse/medication-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchPatientClinicalData(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        patient_id: selectedPatientId,
        encounter_id: encounterCode,
        note_type: noteType,
        observation: noteObs,
        intervention: noteInterv,
        patient_response: noteResp,
        doctor_notified: docNotified
      };

      const res = await fetch(`${API_BASE}/api/v1/nurse/nursing-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchPatientClinicalData(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#10201B]">
      {/* Top Banner */}
      <div className="bg-[#063C2F] p-6 rounded-3xl border border-[#07543F] text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#12B886] font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-[#12B886] animate-pulse"></span>
            Pre-Consultation Clinical Workstation
          </div>
          <h1 className="text-2xl font-bold text-white">Nurse Clinical Portal & Assessment Engine</h1>
          <p className="text-[#DDEFE5]/80 text-xs mt-1">
            Verifies checked-in patients post reception arrival, records vital signs with automated clinical threshold rules, conducts nursing assessments, and logs bedside MAR.
          </p>
        </div>
      </div>

      {/* 6-Tab Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-[#DDE5E0] flex flex-wrap gap-1 shadow-sm text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'bg-[#052E24] text-white shadow-sm font-bold' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
          }`}
        >
          <Clock className="w-4 h-4" /> Checked-In Queue
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'vitals' ? 'bg-[#052E24] text-white shadow-sm font-bold' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Patient Vitals & Alerts
        </button>
        <button
          onClick={() => setActiveTab('assessment')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'assessment' ? 'bg-[#052E24] text-white shadow-sm font-bold' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
          }`}
        >
          <FileText className="w-4 h-4" /> Nursing Assessment
        </button>
        <button
          onClick={() => setActiveTab('ward')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'ward' ? 'bg-[#052E24] text-white shadow-sm font-bold' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
          }`}
        >
          <BedDouble className="w-4 h-4" /> Ward Management
        </button>
        <button
          onClick={() => setActiveTab('mar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'mar' ? 'bg-[#052E24] text-white shadow-sm font-bold' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
          }`}
        >
          <Plus className="w-4 h-4" /> Medication Admin (MAR)
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'notes' ? 'bg-[#052E24] text-white shadow-sm font-bold' : 'text-[#65756E] hover:text-[#10201B] hover:bg-[#EEF7F1]'
          }`}
        >
          <Printer className="w-4 h-4" /> Nursing Notes
        </button>
      </div>

      {/* Selected Patient Verification Bar */}
      <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-[#10201B]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF7F1] border border-[#087F5B]/30 flex items-center justify-center font-bold text-[#087F5B]">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[#65756E] text-[10px] block font-semibold">Verified Patient & Encounter</span>
            <span className="font-bold text-[#10201B] text-sm">{patientName}</span>
            <span className="font-mono text-[#087F5B] text-[11px] ml-2 font-bold">({patientUhid})</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div><span className="text-[#65756E] text-[10px] block font-semibold">Token / Encounter</span><span className="text-[#10201B] font-bold">{encounterCode}</span></div>
          <div><span className="text-[#65756E] text-[10px] block font-semibold">Attending Doctor</span><span className="text-[#10201B] font-bold">{doctorName}</span></div>
          <div><span className="text-[#65756E] text-[10px] block font-semibold">Department</span><span className="text-[#087F5B] font-bold">{deptName}</span></div>
        </div>
      </div>

      {/* TAB 1: CHECKED-IN QUEUE & WORKLOAD DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 6 Workload Counters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card text-center hover:shadow-card-hover transition-all">
              <span className="text-[#65756E] text-[11px] uppercase tracking-wider block font-semibold">Waiting Assessment</span>
              <span className="text-2xl font-bold text-[#087F5B] font-mono">{dashboardData?.counters?.waiting_assessment ?? 0}</span>
            </div>
            <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card text-center hover:shadow-card-hover transition-all">
              <span className="text-[#65756E] text-[11px] uppercase tracking-wider block font-semibold">Vitals Pending</span>
              <span className="text-2xl font-bold text-[#F59E0B] font-mono">{dashboardData?.counters?.vitals_pending ?? 0}</span>
            </div>
            <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card text-center hover:shadow-card-hover transition-all">
              <span className="text-[#65756E] text-[11px] uppercase tracking-wider block font-semibold">Medications Due</span>
              <span className="text-2xl font-bold text-[#3B82F6] font-mono">{dashboardData?.counters?.medications_due ?? 0}</span>
            </div>
            <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card text-center hover:shadow-card-hover transition-all">
              <span className="text-[#65756E] text-[11px] uppercase tracking-wider block font-semibold">In Ward</span>
              <span className="text-2xl font-bold text-[#07543F] font-mono">{dashboardData?.counters?.in_ward ?? 0}</span>
            </div>
            <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card text-center hover:shadow-card-hover transition-all">
              <span className="text-[#65756E] text-[11px] uppercase tracking-wider block font-semibold">Critical Alerts</span>
              <span className="text-2xl font-bold text-rose-600 font-mono animate-pulse">{dashboardData?.counters?.critical_alerts ?? 0}</span>
            </div>
            <div className="bg-white border border-[#DDE5E0] p-4 rounded-2xl shadow-card text-center hover:shadow-card-hover transition-all">
              <span className="text-[#65756E] text-[11px] uppercase tracking-wider block font-semibold">Completed</span>
              <span className="text-2xl font-bold text-[#10201B] font-mono">{dashboardData?.counters?.completed ?? 0}</span>
            </div>
          </div>

          {/* Checked-In Patient Queue Table */}
          <div className="bg-white border border-[#DDE5E0] rounded-3xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-[#DDE5E0] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#087F5B]" />
                  Checked-In Patients Waiting for Nurse Assessment
                </h3>
                <p className="text-xs text-[#65756E]">Arrived patients waiting for vital signs recording and pre-consultation nursing evaluation</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#10201B]">
                <thead className="bg-[#052E24] text-white uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Token</th>
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">UHID</th>
                    <th className="py-3.5 px-4">Assigned Doctor</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Nursing Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white">
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-8 text-[#65756E]">Loading checked-in queue...</td></tr>
                  ) : !dashboardData?.patient_queue || dashboardData.patient_queue.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8 text-[#65756E]">No checked-in patients in queue.</td></tr>
                  ) : (
                    dashboardData.patient_queue.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-[#EEF7F1]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#087F5B]">{pt.token}</td>
                        <td className="py-3.5 px-4 font-bold text-[#10201B]">{pt.patient_name}</td>
                        <td className="py-3.5 px-4 font-mono text-[#65756E]">{pt.uhid}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#10201B]">{pt.doctor}</td>
                        <td className="py-3.5 px-4 text-[#65756E]">{pt.department}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pt.priority === 'Emergency' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            pt.priority === 'Urgent' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-[#F6F8F6] text-[#65756E] border border-[#DDE5E0]'
                          }`}>
                            {pt.priority || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            pt.nursing_status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            pt.nursing_status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {pt.nursing_status === 'COMPLETED' ? '🟢 Assessed' : (pt.nursing_status === 'IN_PROGRESS' ? '🔵 In Progress' : '🟡 Waiting')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {pt.nursing_status === 'WAITING' ? (
                            <button
                              onClick={() => handleStartAssessment(pt)}
                              className="px-3.5 py-1.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold text-[11px] rounded-xl shadow-sm transition-all"
                            >
                              Start Assessment
                            </button>
                          ) : pt.nursing_status === 'IN_PROGRESS' ? (
                            <button
                              onClick={() => { selectPatientFromQueue(pt); setActiveTab('vitals'); }}
                              className="px-3.5 py-1.5 bg-[#063C2F] hover:bg-[#052E24] text-white font-bold text-[11px] rounded-xl shadow-sm transition-all"
                            >
                              Continue Assessment
                            </button>
                          ) : (
                            <button
                              onClick={() => { selectPatientFromQueue(pt); setActiveTab('vitals'); }}
                              className="px-3.5 py-1.5 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] font-bold text-[11px] rounded-xl shadow-sm transition-all"
                            >
                              View Assessment
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Clinical Alerts Section */}
          {dashboardData?.active_alerts && dashboardData.active_alerts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-3xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2 border-b border-rose-200 pb-2">
                <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
                Active Unresolved Clinical Alerts ({dashboardData.active_alerts.length})
              </h3>
              <div className="space-y-2">
                {dashboardData.active_alerts.map((alt) => (
                  <div key={alt.id} className="bg-white border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
                    <div>
                      <span className="font-bold text-[#10201B]">{alt.patient_name}</span>
                      <span className="text-rose-600 font-mono font-bold ml-2">{alt.message}</span>
                      <span className="text-[#65756E] text-[10px] block mt-0.5">{alt.created_at}</span>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alt.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow-sm transition-all whitespace-nowrap"
                    >
                      Resolve Alert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PATIENT VITALS & CLINICAL ALERT THRESHOLD ENGINE */}
      {activeTab === 'vitals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vitals Form */}
          <div className="lg:col-span-2 bg-white border border-[#DDE5E0] p-6 rounded-3xl shadow-card space-y-5 text-xs text-[#10201B]">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#10201B] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#087F5B]" />
                  Record Patient Vitals & Physiological Metrics
                </h3>
                <p className="text-xs text-[#65756E]">Inputs validate automatically against clinical threshold rules</p>
              </div>
            </div>

            {/* AUTOMATIC VITAL ALERT BANNER */}
            {vitalAlerts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-2 text-rose-800 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                  <AlertCircle className="w-5 h-5 animate-pulse text-rose-600" />
                  🚨 AUTOMATIC CLINICAL VITAL ALERTS DETECTED
                </div>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs text-rose-700 font-semibold">
                  {vitalAlerts.map((a, i) => (
                    <li key={i}>{a.text}</li>
                  ))}
                </ul>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => alert(`Doctor ${doctorName} has been notified of critical vitals.`)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Notify Doctor Immediately
                  </button>
                </div>
              </div>
            )}

            {vitalAlertMsg && (
              <div className="bg-[#EEF7F1] border border-[#087F5B]/30 text-[#087F5B] p-3.5 rounded-xl font-semibold">
                {vitalAlertMsg}
              </div>
            )}

            <form onSubmit={handleVitalsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Temperature (°F) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Pulse / Heart Rate (bpm) *</label>
                  <input
                    type="number"
                    required
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Resp Rate (/min) *</label>
                  <input
                    type="number"
                    required
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>

                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Systolic BP (mmHg) *</label>
                  <input
                    type="number"
                    required
                    value={sysBp}
                    onChange={(e) => setSysBp(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Diastolic BP (mmHg) *</label>
                  <input
                    type="number"
                    required
                    value={diaBp}
                    onChange={(e) => setDiaBp(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">SpO₂ Oxygen (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#087F5B] font-mono font-bold focus:border-[#087F5B]"
                  />
                </div>

                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">BMI (Auto-Calculated)</label>
                  <input
                    type="text"
                    readOnly
                    value={`${bmiCalc} kg/m²`}
                    className="w-full p-2.5 bg-[#EEF7F1] border border-[#087F5B]/20 rounded-xl text-[#087F5B] font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Pain Score (0 to 10 scale)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={painScore}
                      onChange={(e) => setPainScore(parseInt(e.target.value))}
                      className="w-full accent-[#087F5B]"
                    />
                    <span className="font-mono font-bold text-[#10201B] text-sm w-8">{painScore}/10</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] font-mono focus:border-[#087F5B]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-between gap-3 border-t border-[#DDE5E0]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-white hover:bg-[#F6F8F6] text-[#10201B] font-bold rounded-xl border border-[#DDE5E0] shadow-sm transition-all text-xs"
                >
                  {submitting ? 'Saving Vitals...' : 'Save & Submit Vitals'}
                </button>

                <button
                  type="button"
                  onClick={handleFinishAssessment}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2"
                >
                  Finish Assessment ➔
                </button>
              </div>
            </form>
          </div>

          {/* Vitals History */}
          <div className="lg:col-span-1 bg-white border border-[#DDE5E0] p-5 rounded-3xl shadow-card space-y-4 text-xs text-[#10201B]">
            <h3 className="text-sm font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#087F5B]" /> Vitals History
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {vitalsList.length === 0 ? (
                <p className="text-[#65756E] text-center py-4">No vital records logged yet.</p>
              ) : (
                vitalsList.map((v, i) => (
                  <div key={i} className="bg-[#F6F8F6] border border-[#DDE5E0] p-3.5 rounded-2xl space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-[#65756E]">
                      <span>{v.recorded_at}</span>
                      <span className="text-[#087F5B] font-bold">{v.recorded_by}</span>
                    </div>
                    <div className="text-[#10201B] grid grid-cols-2 gap-1 font-semibold">
                      <span>Temp: {v.temperature}°F</span>
                      <span>Pulse: {v.pulse_rate} bpm</span>
                      <span>BP: {v.bp_display}</span>
                      <span>SpO₂: {v.spo2}%</span>
                    </div>
                    {v.is_abnormal && (
                      <span className="text-rose-600 font-bold block text-[10px]">{v.alert_notes}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRE-CONSULTATION NURSING ASSESSMENT */}
      {activeTab === 'assessment' && (
        <div className="bg-white border border-[#DDE5E0] p-6 rounded-3xl shadow-card space-y-5 text-xs text-[#10201B] max-w-3xl">
          <h3 className="text-base font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#087F5B]" /> Pre-Consultation Clinical Assessment
          </h3>

          <form onSubmit={handleAssessmentSubmit} className="space-y-4">
            <div>
              <label className="block text-[#65756E] mb-1 font-semibold">Chief Complaint & Symptoms *</label>
              <textarea
                rows="3"
                required
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[#65756E] mb-1 font-semibold">General Condition</label>
                <select
                  value={generalCond}
                  onChange={(e) => setGeneralCond(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                >
                  <option value="Stable">Stable</option>
                  <option value="Needs Attention">Needs Attention</option>
                  <option value="Critical / Escalate">Critical / Escalate</option>
                </select>
              </div>
              <div>
                <label className="block text-[#65756E] mb-1 font-semibold">Mobility Status</label>
                <select
                  value={mobility}
                  onChange={(e) => setMobility(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                >
                  <option value="Independent">Independent</option>
                  <option value="Assisted">Assisted</option>
                  <option value="Bedridden">Bedridden</option>
                </select>
              </div>
              <div>
                <label className="block text-[#65756E] mb-1 font-semibold">Fall Risk</label>
                <select
                  value={fallRisk}
                  onChange={(e) => setFallRisk(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[#65756E] mb-1 font-semibold">Allergy Information</label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-amber-800 font-semibold focus:border-[#087F5B]"
              />
            </div>

            <div>
              <label className="block text-[#65756E] mb-1 font-semibold">Nursing Clinical Observations</label>
              <textarea
                rows="3"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-md"
              >
                {submitting ? 'Saving...' : 'Save Nursing Assessment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: WARD MANAGEMENT */}
      {activeTab === 'ward' && (
        <div className="bg-white border border-[#DDE5E0] p-6 rounded-3xl shadow-card space-y-4 text-xs text-[#10201B]">
          <h3 className="text-base font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3 flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-[#087F5B]" /> Inpatient Ward Care Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#F6F8F6] border border-[#DDE5E0] p-4 rounded-2xl space-y-2">
              <div className="flex justify-between font-bold text-[#10201B] text-sm">
                <span>Room 201 - Bed 01</span>
                <span className="text-[#087F5B]">Occupied</span>
              </div>
              <p className="text-[#10201B] font-semibold">Arun Kumar (PT-2026-00125)</p>
              <p className="text-[#65756E] text-[11px]">Doctor: Dr. Rajesh • Ward: General Medicine</p>
              <div className="pt-2 flex gap-2">
                <button onClick={() => setActiveTab('vitals')} className="px-3 py-1 bg-[#087F5B] hover:bg-[#07543F] text-white rounded-lg font-bold">Vitals</button>
                <button onClick={() => setActiveTab('mar')} className="px-3 py-1 bg-[#063C2F] hover:bg-[#052E24] text-white rounded-lg font-bold">MAR</button>
              </div>
            </div>
            <div className="bg-[#F6F8F6] border border-[#DDE5E0] p-4 rounded-2xl space-y-2">
              <div className="flex justify-between font-bold text-[#10201B] text-sm">
                <span>Room 201 - Bed 02</span>
                <span className="text-[#65756E]">Available</span>
              </div>
              <p className="text-[#65756E] italic">No patient assigned</p>
            </div>
            <div className="bg-[#F6F8F6] border border-[#DDE5E0] p-4 rounded-2xl space-y-2">
              <div className="flex justify-between font-bold text-[#10201B] text-sm">
                <span>Room 301 - Bed ICU-01</span>
                <span className="text-[#087F5B]">Occupied</span>
              </div>
              <p className="text-[#10201B] font-semibold">Tanvi (PT-2026-00126)</p>
              <p className="text-[#65756E] text-[11px]">Doctor: Dr. Raj Kanna • Ward: ICU Block</p>
              <div className="pt-2 flex gap-2">
                <button onClick={() => setActiveTab('vitals')} className="px-3 py-1 bg-[#087F5B] hover:bg-[#07543F] text-white rounded-lg font-bold">Vitals</button>
                <button onClick={() => setActiveTab('mar')} className="px-3 py-1 bg-[#063C2F] hover:bg-[#052E24] text-white rounded-lg font-bold">MAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MEDICATION ADMINISTRATION RECORD (MAR) */}
      {activeTab === 'mar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#DDE5E0] p-6 rounded-3xl shadow-card space-y-4 text-xs text-[#10201B]">
            <h3 className="text-base font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#087F5B]" /> Bedside Medication Administration Logger (MAR)
            </h3>

            <form onSubmit={handleMarSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Dose *</label>
                  <input
                    type="text"
                    required
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Route</label>
                  <select
                    value={medRoute}
                    onChange={(e) => setMedRoute(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  >
                    <option value="Oral">Oral</option>
                    <option value="IV">IV Injection / Infusion</option>
                    <option value="IM">IM Injection</option>
                    <option value="Topical">Topical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Administration Status *</label>
                  <select
                    value={medStatus}
                    onChange={(e) => setMedStatus(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  >
                    <option value="Given">Given / Administered</option>
                    <option value="Refused">Refused by Patient</option>
                    <option value="Held">Held (Clinical Reason)</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Reason if Omitted/Held</label>
                  <input
                    type="text"
                    placeholder="Optional reason"
                    value={medReason}
                    onChange={(e) => setMedReason(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-sm">
                  {submitting ? 'Recording...' : 'Record Administration'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 bg-white border border-[#DDE5E0] p-5 rounded-3xl shadow-card space-y-4 text-xs text-[#10201B]">
            <h3 className="text-sm font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3">Recent MAR Log</h3>
            <div className="space-y-3">
              {marList.map((m, i) => (
                <div key={i} className="bg-[#F6F8F6] border border-[#DDE5E0] p-3 rounded-xl font-mono text-[11px]">
                  <div className="flex justify-between font-bold text-[#10201B]">
                    <span>{m.medicine_name} ({m.dose})</span>
                    <span className="text-[#087F5B]">{m.status}</span>
                  </div>
                  <div className="text-[#65756E] text-[10px] mt-1">Route: {m.route} • Time: {m.administered_time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SIGNED NURSING NOTES */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#DDE5E0] p-6 rounded-3xl shadow-card space-y-4 text-xs text-[#10201B]">
            <h3 className="text-base font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3 flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#087F5B]" /> Signed Clinical Nursing Progress Notes
            </h3>

            <form onSubmit={handleNoteSubmit} className="space-y-4">
              <div>
                <label className="block text-[#65756E] mb-1 font-semibold">Note Type</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                >
                  <option value="Routine Nursing Note">Routine Nursing Note</option>
                  <option value="Doctor Visit Note">Doctor Visit Note</option>
                  <option value="Shift Handover">Shift Handover</option>
                  <option value="Emergency Escalation">Emergency Escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-[#65756E] mb-1 font-semibold">Observation *</label>
                <textarea
                  rows="2"
                  required
                  value={noteObs}
                  onChange={(e) => setNoteObs(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Intervention</label>
                  <input
                    type="text"
                    value={noteInterv}
                    onChange={(e) => setNoteInterv(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  />
                </div>
                <div>
                  <label className="block text-[#65756E] mb-1 font-semibold">Patient Response</label>
                  <input
                    type="text"
                    value={noteResp}
                    onChange={(e) => setNoteResp(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl text-[#10201B] focus:border-[#087F5B]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="docNotifiedChk"
                  checked={docNotified}
                  onChange={(e) => setDocNotified(e.target.checked)}
                  className="w-4 h-4 accent-[#087F5B]"
                />
                <label htmlFor="docNotifiedChk" className="text-[#10201B] font-medium">Attending doctor notified of clinical changes</label>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-sm">
                  {submitting ? 'Signing...' : 'Save Signed Clinical Note'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 bg-white border border-[#DDE5E0] p-5 rounded-3xl shadow-card space-y-4 text-xs text-[#10201B]">
            <h3 className="text-sm font-bold text-[#10201B] border-b border-[#DDE5E0] pb-3">Signed Clinical Audit Trail</h3>
            <div className="space-y-3">
              {notesList.map((n, i) => (
                <div key={i} className="bg-[#F6F8F6] border border-[#DDE5E0] p-3 rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-[#087F5B]">
                    <span>{n.note_type}</span>
                    <span className="text-[#65756E]">{n.signed_at}</span>
                  </div>
                  <p className="text-[#10201B]">{n.observation}</p>
                  <p className="text-[#65756E] text-[10px]">Intervention: {n.intervention}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NurseDashboard = () => <NursePortalDashboard initialTab="dashboard" />;
const PatientVitals = () => <NursePortalDashboard initialTab="vitals" />;
const WardManagement = () => <NursePortalDashboard initialTab="ward" />;
const MedicationAdmin = () => <NursePortalDashboard initialTab="mar" />;
const NursingNotes = () => <NursePortalDashboard initialTab="notes" />;

// 5. Laboratory
const TestRequestLab = () => (
  <LabPageLayout 
    title="Test Requests & Shift Prescriptions" 
    description="Diagnostic test requests automatically synced from doctor clinical prescriptions with workstation routing."
  >
    <GenericPage title="Test Request" description="Diagnostic test requests automatically synced from doctor clinical prescriptions (Auto-synced from doctor portal)." cols={['Req ID', 'Patient', 'Test Type', 'Priority', 'Requested By', 'Status']} apiEndpoint="/api/v1/laboratory/test-request" allowAdd={false} defaultData={[{ id: 1, 'Req ID': 'LAB-401', Patient: 'Aarav Kumar', 'Test Type': 'CBC Blood Profile & Lipid', Priority: 'Normal', 'Requested By': 'Dr. Madhavan', Status: 'Requested' }, { id: 2, 'Req ID': 'LAB-402', Patient: 'Rajesh Patel', 'Test Type': 'EEG & Brain MRI Scan', Priority: 'High', 'Requested By': 'Dr. S. Karthikeyan', Status: 'Requested' }]} />
  </LabPageLayout>
);
const SampleCollection = () => (
  <LabPageLayout 
    title="Sample Collection & Barcode Tracking" 
    description="Track specimen barcode status, phlebotomy timestamps, and tube racks across all 7 shift sections."
  >
    <GenericPage title="Sample Collection" description="Track sample barcode status across all 7 laboratory shift sections." cols={['Sample ID', 'Patient', 'Test Name', 'Collected By', 'Status']} apiEndpoint="/api/v1/laboratory/sample-collection" defaultData={[{ id: 1, 'Sample ID': 'SMP-991', Patient: 'Aarav Kumar', 'Test Name': 'CBC Blood Sample', 'Collected By': 'Anil Mehta', Status: 'Collected' }]} />
  </LabPageLayout>
);
const ReportEntry = () => (
  <LabPageLayout 
    title="Report Entry & Result Verification" 
    description="Enter diagnostic laboratory findings with section-specific normal biological reference ranges."
  >
    <GenericPage title="Report Entry" description="Enter diagnostic laboratory findings with section normal reference ranges." cols={['Test ID', 'Patient', 'Result Summary', 'Verified By', 'Status']} apiEndpoint="/api/v1/laboratory/report-entry" isLabReport={true} defaultData={[{ id: 1, 'Test ID': 'LAB-401', Patient: 'Aarav Kumar', 'Result Summary': 'Hemoglobin 14.2 g/dL (Normal)', 'Verified By': 'Anil Mehta', Status: 'Verified' }]} />
  </LabPageLayout>
);
const ReportUpload = () => (
  <LabPageLayout 
    title="Report Upload & Document Archive" 
    description="Upload and download scanned diagnostic reports across all laboratory sections."
  >
    <GenericPage title="Report Upload" description="Upload and download scanned diagnostic reports across all laboratory sections." cols={['Document ID', 'Patient', 'File Name', 'Upload Date', 'Status']} apiEndpoint="/api/v1/laboratory/report-upload" isLabReport={true} defaultData={[{ id: 1, 'Document ID': 'DOC-201', Patient: 'Siddharth Roy', 'File Name': 'Knee_MRI_Scan.pdf', 'Upload Date': '2026-08-20 14:20 PM', Status: 'Completed' }]} />
  </LabPageLayout>
);


// 6. Pharmacy
const MedicineInventory = () => <GenericPage title="Medicine Inventory" description="Manage pharmacy stock and expiry dates." cols={['Medicine Name', 'Batch No', 'Expiry Date', 'Stock Qty', 'Status']} apiEndpoint="/api/v1/pharmacy/inventory" defaultData={[{ id: 1, 'Medicine Name': 'Paracetamol 650mg', 'Batch No': 'BAT-2024-X', 'Expiry Date': '2027-11-30 23:59 PM', 'Stock Qty': '1,200 Tabs', Status: 'Available' }]} />;
const PrescriptionProcessing = () => <GenericPage title="Prescription Processing" description="Dispense medicines for prescriptions." cols={['Prescription ID', 'Patient', 'Doctor', 'Status']} apiEndpoint="/api/v1/pharmacy/prescription-processing" defaultData={[{ id: 1, 'Prescription ID': 'RX-501', Patient: 'Aarav Kumar', Doctor: 'Dr. Priya Nair', Status: 'Ready for Dispense' }]} />;
const MedicineBilling = () => <GenericPage title="Medicine Billing" description="Bill medicines to patients." cols={['Bill ID', 'Patient', 'Total Amount', 'Payment Status']} apiEndpoint="/api/v1/pharmacy/medicine-billing" defaultData={[{ id: 1, 'Bill ID': 'PH-901', Patient: 'Aarav Kumar', 'Total Amount': '$24.50', 'Payment Status': 'Paid' }]} />;
const StockAlerts = () => <GenericPage title="Stock Alerts" description="Low stock and re-order alerts." cols={['Medicine Name', 'Alert Type', 'Current Stock', 'Action Required']} apiEndpoint="/api/v1/pharmacy/stock-alerts" defaultData={[{ id: 1, 'Medicine Name': 'Pantoprazole 40mg', 'Alert Type': 'Low Stock', 'Current Stock': '80 Tabs', 'Action Required': 'Re-order 500 Tabs' }]} />;

// 7. Inpatient (IP)
const RoomAllocation = () => <GenericPage title="Room Allocation" description="Assign beds and rooms to patients." cols={['Room No', 'Ward Type', 'Patient', 'Status']} apiEndpoint="/api/v1/inpatient/room-allocation" defaultData={[{ id: 1, 'Room No': 'Room 101', 'Ward Type': 'Deluxe Private', Patient: 'Siddharth Roy', Status: 'Occupied' }]} />;
const Admission = () => <GenericPage title="Admission" description="Manage IP admissions." cols={['Admission ID', 'Patient', 'Admitted Date', 'Attending Doctor', 'Status']} apiEndpoint="/api/v1/inpatient/admissions" defaultData={[{ id: 1, 'Admission ID': 'IPD-301', Patient: 'Siddharth Roy', 'Admitted Date': '2026-08-10 11:45 AM', 'Attending Doctor': 'Dr. Vikram Malhotra', Status: 'Admitted' }]} />;
const TreatmentRecords = () => <GenericPage title="Treatment Records" description="Inpatient treatment history." cols={['Patient', 'Treatment Details', 'Date', 'Doctor']} apiEndpoint="/api/v1/inpatient/treatment-records" defaultData={[{ id: 1, Patient: 'Siddharth Roy', 'Treatment Details': 'Knee Surgery', Date: '2026-08-11 10:00 AM', Doctor: 'Dr. Vikram Malhotra' }]} />;
const DailyProgress = () => <GenericPage title="Daily Progress" description="Daily clinical notes for IP." cols={['Patient', 'Progress Note', 'Added By', 'Date']} apiEndpoint="/api/v1/inpatient/daily-progress" defaultData={[{ id: 1, Patient: 'Siddharth Roy', 'Progress Note': 'Post-op Day 1: Wound clean, active motion exercises started.', 'Added By': 'Dr. Vikram Malhotra', Date: '2026-08-20 09:00 AM' }]} />;
const DischargeSummary = () => <GenericPage title="Discharge Summary" description="Prepare discharge summaries." cols={['Patient', 'Discharge Date', 'Summary Status', 'Prepared By']} apiEndpoint="/api/v1/inpatient/discharge-summary" isLabReport={true} defaultData={[{ id: 1, Patient: 'Karan Malhotra', 'Discharge Date': '2026-08-20 16:30 PM', 'Summary Status': 'Completed', 'Prepared By': 'Dr. Robert Chen' }]} />;

// 8. Billing
const LabCharges = () => <GenericPage title="Lab Charges" description="Manage diagnostic charges breakdown." cols={['Patient', 'Test Name', 'Amount', 'Status']} apiEndpoint="/api/v1/billing/lab-charges" defaultData={[{ id: 1, Patient: 'Aarav Kumar', 'Test Name': 'CBC Blood Profile', Amount: '₹350.00', Status: 'Paid' }]} />;
const PharmacyCharges = () => <GenericPage title="Pharmacy Charges" description="Medicine charges breakdown." cols={['Patient', 'Bill ID', 'Amount', 'Date', 'Status']} apiEndpoint="/api/v1/billing/pharmacy-charges" defaultData={[{ id: 1, Patient: 'Aarav Kumar', 'Bill ID': 'PH-901', Amount: '₹245.00', Date: '2026-08-20 11:00 AM', Status: 'Paid' }]} />;
const RoomCharges = () => <GenericPage title="Room Charges" description="IPD room and bed charges breakdown." cols={['Patient', 'Days Stayed', 'Total Amount', 'Status']} apiEndpoint="/api/v1/billing/room-charges" defaultData={[{ id: 1, Patient: 'Siddharth Roy', 'Days Stayed': '2 Days', 'Total Amount': '₹3,000.00', Status: 'Pending' }]} />;
const PaymentGateway = () => <GenericPage title="Payment Gateway" description="Online transaction logs." cols={['Transaction ID', 'Patient', 'Amount', 'Method', 'Status']} apiEndpoint="/api/v1/billing/payment-gateway" defaultData={[{ id: 1, 'Transaction ID': 'TXN-9901', Patient: 'Aarav Kumar', Amount: '₹1,095.00', Method: 'UPI', Status: 'Completed' }]} />;
const InvoiceGeneration = () => <GenericPage 
  title="Invoice Generation" 
  description="Consolidated patient tax invoice generation with instant Print and PDF receipts." 
  cols={['Invoice ID', 'Name', 'Consultation Charge', 'Lab Charge', 'Pharmacy Charge', 'Total', 'Status', 'Payment Mode', 'Date']} 
  apiEndpoint="/api/v1/billing/invoices" 
  isBilling={true} 
  defaultData={[
    { 
      id: 1, 
      'Invoice ID': 'INV-2026-01', 
      Name: 'Aarav Kumar', 
      Patient: 'Aarav Kumar', 
      'Consultation Charge': '₹500.00', 
      'Lab Charge': '₹350.00', 
      'Pharmacy Charge': '₹245.00', 
      Total: '₹1,095.00', 
      'Total Amount': '₹1,095.00', 
      Date: '2026-08-20 11:30 AM', 
      Status: 'Paid',
      'Payment Mode': 'UPI / Online Desk'
    },
    { 
      id: 2, 
      'Invoice ID': 'INV-2026-02', 
      Name: 'Rajesh Patel', 
      Patient: 'Rajesh Patel', 
      'Consultation Charge': '₹600.00', 
      'Lab Charge': '₹850.00', 
      'Pharmacy Charge': '₹350.00', 
      Total: '₹1,800.00', 
      'Total Amount': '₹1,800.00', 
      Date: '2026-08-20 12:45 PM', 
      Status: 'Paid',
      'Payment Mode': 'Credit Card'
    },
    { 
      id: 3, 
      'Invoice ID': 'INV-2026-03', 
      Name: 'Siddharth Roy', 
      Patient: 'Siddharth Roy', 
      'Consultation Charge': '₹750.00', 
      'Lab Charge': '₹1,200.00', 
      'Pharmacy Charge': '₹650.00', 
      Total: '₹2,600.00', 
      'Total Amount': '₹2,600.00', 
      Date: '2026-08-20 02:15 PM', 
      Status: 'Pending',
      'Payment Mode': 'Cash Desk'
    }
  ]} 
/>;

// 8a. Rule-Based Billing Engine Dashboard Component
const ConsultationCharges = () => {
  const [searchQuery, setSearchQuery] = useState('PT-2026-00125');
  const [loading, setLoading] = useState(true);
  const [billData, setBillData] = useState(null);
  const [serviceMasterList, setServiceMasterList] = useState([]);

  // Modals State
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Add Charge Form State
  const [selectedServiceCode, setSelectedServiceCode] = useState('');
  const [chargeDescription, setChargeDescription] = useState('Dressing & Wound Care');
  const [chargeCategory, setChargeCategory] = useState('PROCEDURE');
  const [chargeQty, setChargeQty] = useState(1);
  const [chargeRate, setChargeRate] = useState(200);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchServiceMaster = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/service-master`);
      if (res.ok) setServiceMasterList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const calculateBill = async (identifier) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/billing/calculate-bill/${encodeURIComponent(identifier || 'PT-2026-00125')}`);
      if (res.ok) {
        const data = await res.json();
        setBillData(data);
        setPaymentAmount(data.financials.outstanding_balance || data.financials.total_bill);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceMaster();
    calculateBill('PT-2026-00125');
  }, []);

  const handleServiceMasterSelect = (code) => {
    setSelectedServiceCode(code);
    const svc = serviceMasterList.find(s => s.service_code === code);
    if (svc) {
      setChargeDescription(svc.service_name);
      setChargeCategory(svc.category.toUpperCase());
      setChargeRate(svc.op_rate || 500);
    }
  };

  const handleAddChargeSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        "billing_account_id": billData?.billing_account_id,
        "description": chargeDescription,
        "category": chargeCategory,
        "quantity": chargeQty,
        "unit_price": chargeRate
      };

      const res = await fetch(`${API_BASE}/api/v1/billing/add-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddChargeModal(false);
        calculateBill(searchQuery);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to add service charge.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        "billing_account_id": billData?.billing_account_id,
        "amount": parseFloat(paymentAmount || 0),
        "payment_method": paymentMethod,
        "transaction_reference": paymentRef || "TXN-CASH"
      };

      const res = await fetch(`${API_BASE}/api/v1/billing/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowPaymentModal(false);
        calculateBill(searchQuery);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-6 rounded-3xl border border-blue-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Hospital Finance & Revenue Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Automated Patient Billing & Services Engine</h1>
          <p className="text-slate-300 text-xs mt-1">
            Rule-based automatic bill calculation from OP encounters, IP admissions (auto-calculating bed days), lab orders, and pharmacy prescriptions.
          </p>
        </div>
      </div>

      {/* Patient / Encounter Search Banner (Matching User ASCII Diagram) */}
      <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Patient / Encounter Billing Search
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search UHID, OPV-..., IP-..., or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none w-full sm:w-64"
            />
            <button
              onClick={() => calculateBill(searchQuery)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow"
            >
              Calculate Bill ➔
            </button>
          </div>
        </div>

        {billData?.patient && (
          <div className="bg-gradient-to-r from-slate-950 to-blue-950 border border-blue-800/60 p-4 rounded-xl text-xs grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] block">Patient Name & UHID</span>
              <span className="font-bold text-slate-100 text-sm">{billData.patient.name}</span>
              <span className="font-mono text-blue-400 text-[11px] block">{billData.patient.uhid}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Patient Type & Encounter</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                billData.patient.type === 'IP' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
              }`}>
                {billData.patient.type === 'IP' ? 'Inpatient (IP)' : 'Outpatient (OP)'}
              </span>
              <span className="font-mono text-slate-300 text-[11px] block mt-0.5">{billData.patient.encounter_code}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Attending Doctor / Dept</span>
              <span className="font-semibold text-slate-100">{billData.patient.doctor}</span>
              <span className="text-slate-400 text-[11px] block">{billData.patient.department}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Ward / Room / Bed</span>
              <span className="font-mono text-emerald-300 font-semibold">{billData.patient.ward}</span>
              <span className="text-slate-400 text-[11px] block">{billData.patient.room} • {billData.patient.bed}</span>
            </div>
          </div>
        )}
      </div>

      {/* BILLABLE SERVICES TABLE & SUMMARY (Matching User ASCII Diagram) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billable Items Table */}
        <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Billable Services Breakdown
              </h3>
              <p className="text-xs text-slate-400">Services, consultation, bed days, lab tests, & pharmacy orders recorded for patient</p>
            </div>
            <button
              onClick={() => setShowAddChargeModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow"
            >
              <Plus className="w-4 h-4" /> Add Service Charge
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Service Description</th>
                  <th className="py-3.5 px-4 text-center">Qty / Days</th>
                  <th className="py-3.5 px-4 text-right">Rate</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">Calculating patient bill...</td>
                  </tr>
                ) : !billData || !billData.items || billData.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">No billable services recorded.</td>
                  </tr>
                ) : (
                  billData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'Consultation' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          item.category === 'Bed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          item.category === 'Laboratory' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                          item.category === 'Imaging' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                          item.category === 'Pharmacy' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-900 text-slate-300 border border-slate-700'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-100">
                        {item.service_name}
                        <span className="text-[10px] text-slate-500 font-mono block">Audit Ref: {item.source_id}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {item.qty} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        ₹{item.rate.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        ₹{item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Actions Card (Matching User ASCII Diagram) */}
        {billData?.financials && (
          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-xl space-y-5 text-xs text-slate-200 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100 border-b border-slate-700 pb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Rule-Based Financial Summary
              </h3>

              <div className="space-y-2.5 font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-100">₹{billData.financials.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount:</span>
                  <span className="text-emerald-400">- ₹{billData.financials.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Insurance Coverage:</span>
                  <span className="text-blue-400">- ₹{billData.financials.insurance_adjustment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST / Tax (5%):</span>
                  <span className="text-slate-300">+ ₹{billData.financials.tax.toFixed(2)}</span>
                </div>

                <div className="border-t border-slate-700 pt-3 flex justify-between text-sm font-bold text-slate-100">
                  <span>TOTAL BILL:</span>
                  <span className="text-emerald-400 text-base">₹{billData.financials.total_bill.toFixed(2)}</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl space-y-1.5 border border-slate-700/80">
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>Amount Paid:</span>
                    <span className="font-bold text-emerald-400">₹{billData.financials.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span>Outstanding Balance:</span>
                    <span className={billData.financials.outstanding_balance > 0 ? "text-rose-400 text-sm" : "text-emerald-400 text-sm"}>
                      ₹{billData.financials.outstanding_balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Matching User ASCII Diagram) */}
            <div className="space-y-2 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={billData.financials.outstanding_balance <= 0}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                [ Add Payment ]
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow transition-all"
                >
                  [ Generate Invoice ]
                </button>
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] rounded-xl shadow transition-all"
                >
                  [ Print Receipt ]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD CHARGE MODAL */}
      {showAddChargeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-base font-bold text-slate-100">Add Service Charge to Bill</h3>
              <button onClick={() => setShowAddChargeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChargeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Master Pricing Service</label>
                <select
                  value={selectedServiceCode}
                  onChange={(e) => handleServiceMasterSelect(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="">-- Select from Pricing Catalog --</option>
                  {serviceMasterList.map(s => (
                    <option key={s.service_code} value={s.service_code}>
                      {s.service_name} ({s.category}) - ₹{s.op_rate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Service Description *</label>
                <input
                  type="text"
                  required
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Quantity / Days</label>
                  <input
                    type="number"
                    min="1"
                    value={chargeQty}
                    onChange={(e) => setChargeQty(parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Unit Rate (₹)</label>
                  <input
                    type="number"
                    value={chargeRate}
                    onChange={(e) => setChargeRate(parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddChargeModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow">
                  {submitting ? 'Adding...' : 'Add Charge ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Record Patient Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono font-bold text-base text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Cash">Cash Payment</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Insurance">Insurance Claim Settlement</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Transaction Reference / Ref No</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-99881100"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow">
                  {submitting ? 'Processing...' : 'Complete Payment ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT OFFICIAL INVOICE / RECEIPT MODAL */}
      {showReceiptModal && billData && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Printer className="w-5 h-5" /> Official Hospital Invoice Receipt
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-6 rounded-2xl space-y-4 font-sans text-xs">
              <div className="text-center border-b pb-3">
                <h4 className="font-black text-blue-900 text-base">CITY CARE GENERAL HOSPITAL</h4>
                <p className="text-[10px] text-slate-600 font-bold">CONSOLIDATED PATIENT BILL RECEIPT</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3">
                <div><span className="text-slate-500 block text-[10px]">Patient Name</span><span className="font-bold">{billData.patient.name}</span></div>
                <div><span className="text-slate-500 block text-[10px]">UHID</span><span className="font-mono font-bold text-blue-900">{billData.patient.uhid}</span></div>
                <div><span className="text-slate-500 block text-[10px]">Encounter</span><span>{billData.patient.type} ({billData.patient.encounter_code})</span></div>
                <div><span className="text-slate-500 block text-[10px]">Doctor</span><span>{billData.patient.doctor}</span></div>
              </div>

              <table className="w-full text-left text-[11px] border-b pb-2">
                <thead>
                  <tr className="border-b font-bold text-slate-700">
                    <th className="py-1">Service</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {billData.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{i.service_name}</td>
                      <td className="py-1 text-center">{i.qty}</td>
                      <td className="py-1 text-right font-mono">₹{i.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 font-mono text-right text-xs">
                <div>Total Bill: <span className="font-bold text-blue-900">₹{billData.financials.total_bill.toFixed(2)}</span></div>
                <div>Amount Paid: <span className="font-bold text-emerald-600">₹{billData.financials.amount_paid.toFixed(2)}</span></div>
                <div className="font-bold text-sm">Outstanding Balance: ₹{billData.financials.outstanding_balance.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => window.print()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow">
                <Printer className="w-4 h-4 inline mr-1" /> Print Official Bill
              </button>
              <button onClick={() => setShowReceiptModal(false)} className="px-5 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 9. Patient Portal
const PortalLogin = () => <GenericPage title="Portal Login Settings" description="Manage portal access." cols={['Patient User', 'Last Login', 'Account Status']} apiEndpoint="/api/v1/portal/login-settings" defaultData={[{ id: 1, 'Patient User': 'aarav.kumar@email.com', 'Last Login': 'Today 09:15 AM', 'Account Status': 'Active' }]} />;
const BookApptPortal = () => <GenericPage title="Book Appointment" description="Appointments booked via portal." cols={['Patient', 'Doctor', 'Requested Date', 'Status']} apiEndpoint="/api/v1/portal/book-appointment" defaultData={[{ id: 1, Patient: 'Meera Shah', Doctor: 'Dr. Robert Chen', 'Requested Date': '2026-08-14 10:00 AM', Status: 'Confirmed' }]} />;
const ViewPrescriptionsPortal = () => <GenericPage title="View Prescriptions" description="Prescriptions shared to portal." cols={['Patient', 'Doctor', 'Prescription Date', 'Medicines', 'Status']} apiEndpoint="/api/v1/portal/view-prescriptions" defaultData={[{ id: 1, Patient: 'Aarav Kumar', Doctor: 'Dr. Priya Nair', 'Prescription Date': '2026-08-13 10:30 AM', Medicines: 'Paracetamol 650mg', Status: 'Active' }]} />;
const DownloadLabReports = () => <GenericPage title="Download Lab Reports" description="Reports accessed by patients with download button." cols={['Patient', 'Report Name', 'Download Date', 'Status']} apiEndpoint="/api/v1/portal/download-reports" isLabReport={true} defaultData={[{ id: 1, Patient: 'Aarav Kumar', 'Report Name': 'CBC_Blood_Report', 'Download Date': '2026-08-13 11:15 AM', Status: 'Downloaded' }]} />;
const OnlinePayment = () => <GenericPage title="Online Payment" description="Payments made via portal." cols={['Patient', 'Amount', 'Date', 'Reference ID', 'Status']} apiEndpoint="/api/v1/portal/online-payment" defaultData={[{ id: 1, Patient: 'Aarav Kumar', Amount: '$109.50', Date: '2026-08-13 12:45 PM', 'Reference ID': 'PAY-88219', Status: 'Successful' }]} />;
const MedicalHistory = () => <GenericPage title="Medical History" description="Patient EMR access logs." cols={['Patient', 'Accessed Data', 'Date', 'Status']} apiEndpoint="/api/v1/portal/medical-history" defaultData={[{ id: 1, Patient: 'Aarav Kumar', 'Accessed Data': 'Immunization & EMR Logs', Date: '2026-08-13 14:00 PM', Status: 'Verified' }]} />;



const getRoleDefaultRoute = (role) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('doctor')) return '/doctor/appointments';
  if (r.includes('reception')) return '/reception/patient-registration';
  if (r.includes('lab') || r.includes('laboratory')) return '/laboratory/test-request';
  if (r.includes('nurse')) return '/nurse/patient-vitals';
  if (r.includes('pharmacy')) return '/pharmacy/medicine-inventory';
  if (r.includes('inpatient')) return '/inpatient/room-allocation';
  if (r.includes('billing')) return '/billing/consultation-charges';
  if (r.includes('portal')) return '/portal/login';
  return '/admin/dashboard';
};

const isRouteAllowed = (role, path) => {
  const r = String(role || '').toLowerCase();
  if (r === 'admin' || r.includes('admin')) return true;
  if (r.includes('doctor')) return path.startsWith('/doctor');
  if (r.includes('reception')) return path.startsWith('/reception') || path.startsWith('/billing');
  if (r.includes('lab') || r.includes('laboratory')) return path.startsWith('/laboratory');
  if (r.includes('nurse')) return path.startsWith('/nurse');
  if (r.includes('pharmacy')) return path.startsWith('/pharmacy');
  if (r.includes('inpatient')) return path.startsWith('/inpatient');
  if (r.includes('portal')) return path.startsWith('/portal');
  return false;
};

const ProtectedRoute = ({ user, path, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const role = user.role || 'doctor';
  if (!isRouteAllowed(role, path)) {
    const defaultRoute = getRoleDefaultRoute(role);
    if (defaultRoute === path) {
      return children;
    }
    return <Navigate to={defaultRoute} replace />;
  }
  return children;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("HMS Boundary Catch:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error ? (this.state.error.message || String(this.state.error)) : '';
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-lg w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Session Reset Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click below to reset application state and return to Sign In cleanly.
            </p>
            {errMsg && (
              <div className="bg-slate-950/80 text-rose-300 p-3 rounded-xl text-left font-mono text-[11px] break-words border border-rose-900/50 max-h-40 overflow-y-auto">
                <span className="font-bold text-rose-400 block mb-1">Runtime Exception:</span>
                {errMsg}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30"
            >
              Reset Session & Sign In
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main Router App Component
function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        if (!parsed.role) parsed.role = 'doctor';
        return parsed;
      }
      return null;
    } catch (e) {
      localStorage.removeItem('hms_user');
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('hms_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hms_user');
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
        <Route 
          path="/login" 
          element={
            <Login onLoginSuccess={handleLoginSuccess} />
          } 
        />
        <Route 
          path="/laboratory/login" 
          element={
            <LabLogin onLoginSuccess={handleLoginSuccess} />
          } 
        />

        <Route 
          path="/" 
          element={
            user ? <Navigate to={getRoleDefaultRoute(user.role)} replace /> : <Navigate to="/login" replace />
          } 
        />
        
        {/* Reception Layout Group */}
        <Route element={user && String(user.role || '').toLowerCase().includes('reception') ? <ReceptionLayout onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route path="/reception/dashboard" element={<ProtectedRoute user={user} path="/reception/dashboard"><ReceptionDashboard /></ProtectedRoute>} />
          <Route path="/reception/patient-registration" element={<ProtectedRoute user={user} path="/reception/patient-registration"><PatientRegistration /></ProtectedRoute>} />
          <Route path="/reception/appointment-booking" element={<ProtectedRoute user={user} path="/reception/appointment-booking"><AppointmentBooking /></ProtectedRoute>} />
          <Route path="/reception/queue-management" element={<ProtectedRoute user={user} path="/reception/queue-management"><QueueManagement /></ProtectedRoute>} />
          <Route path="/reception/op-ip-registration" element={<ProtectedRoute user={user} path="/reception/op-ip-registration"><OPIPRegistration /></ProtectedRoute>} />
          <Route path="/reception/billing" element={<ProtectedRoute user={user} path="/reception/billing"><ReceptionBillingModule /></ProtectedRoute>} />
          <Route path="/reception/daily-collection" element={<ProtectedRoute user={user} path="/reception/daily-collection"><ReceptionDailyCollection /></ProtectedRoute>} />
        </Route>
        
        <Route element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          {/* 1. Admin */}
          <Route path="/admin/dashboard" element={<ProtectedRoute user={user} path="/admin/dashboard"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute user={user} path="/admin/users"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/rbac" element={<ProtectedRoute user={user} path="/admin/rbac"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/doctors" element={<ProtectedRoute user={user} path="/admin/doctors"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute user={user} path="/admin/departments"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute user={user} path="/admin/staff"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/masters" element={<ProtectedRoute user={user} path="/admin/masters"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/lab-masters" element={<ProtectedRoute user={user} path="/admin/lab-masters"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/pharmacy-masters" element={<ProtectedRoute user={user} path="/admin/pharmacy-masters"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/wards-beds" element={<ProtectedRoute user={user} path="/admin/wards-beds"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute user={user} path="/admin/pricing"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute user={user} path="/admin/audit"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/health" element={<ProtectedRoute user={user} path="/admin/health"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute user={user} path="/admin/reports"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute user={user} path="/admin/settings"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/admin/deleted-records" element={<ProtectedRoute user={user} path="/admin/deleted-records"><AdminPortalPage /></ProtectedRoute>} />
          
          {/* 2. Reception (OLD, replaced by new layout outside) */}
          
          {/* 3. Doctor Workstation */}
          <Route path="/doctor/appointments" element={<ProtectedRoute user={user} path="/doctor/appointments"><DoctorPortalWorkstation initialSection="queue" user={user} /></ProtectedRoute>} />
          <Route path="/doctor/patient-history" element={<ProtectedRoute user={user} path="/doctor/patient-history"><DoctorPortalWorkstation initialSection="history" user={user} /></ProtectedRoute>} />
          <Route path="/doctor/diagnosis" element={<ProtectedRoute user={user} path="/doctor/diagnosis"><DoctorPortalWorkstation initialSection="diagnosis" user={user} /></ProtectedRoute>} />
          <Route path="/doctor/prescription" element={<ProtectedRoute user={user} path="/doctor/prescription"><DoctorPortalWorkstation initialSection="prescription" user={user} /></ProtectedRoute>} />
          <Route path="/doctor/lab-test-request" element={<ProtectedRoute user={user} path="/doctor/lab-test-request"><DoctorPortalWorkstation initialSection="lab" user={user} /></ProtectedRoute>} />
          <Route path="/doctor/lab-reports" element={<ProtectedRoute user={user} path="/doctor/lab-reports"><DoctorPortalWorkstation initialSection="lab_reports" user={user} /></ProtectedRoute>} />
          <Route path="/doctor/follow-up" element={<ProtectedRoute user={user} path="/doctor/follow-up"><DoctorPortalWorkstation initialSection="followup" user={user} /></ProtectedRoute>} />
          
          {/* 4. Nurse */}
          <Route path="/nurse" element={<ProtectedRoute user={user} path="/nurse/dashboard"><NurseDashboard /></ProtectedRoute>} />
          <Route path="/nurse/dashboard" element={<ProtectedRoute user={user} path="/nurse/dashboard"><NurseDashboard /></ProtectedRoute>} />
          <Route path="/nurse/patient-vitals" element={<ProtectedRoute user={user} path="/nurse/patient-vitals"><PatientVitals /></ProtectedRoute>} />
          <Route path="/nurse/nursing-assessment" element={<ProtectedRoute user={user} path="/nurse/patient-vitals"><NursePortalDashboard initialTab="assessment" /></ProtectedRoute>} />
          <Route path="/nurse/ward-management" element={<ProtectedRoute user={user} path="/nurse/ward-management"><WardManagement /></ProtectedRoute>} />
          <Route path="/nurse/medication-admin" element={<ProtectedRoute user={user} path="/nurse/medication-admin"><MedicationAdmin /></ProtectedRoute>} />
          <Route path="/nurse/nursing-notes" element={<ProtectedRoute user={user} path="/nurse/nursing-notes"><NursingNotes /></ProtectedRoute>} />
          
          {/* 5. Laboratory */}
          <Route path="/laboratory/sections" element={<ProtectedRoute user={user} path="/laboratory/sections"><LabSectionsPage /></ProtectedRoute>} />
          <Route path="/laboratory/test-request" element={<ProtectedRoute user={user} path="/laboratory/test-request"><TestRequestLab /></ProtectedRoute>} />
          <Route path="/laboratory/sample-collection" element={<ProtectedRoute user={user} path="/laboratory/sample-collection"><SampleCollection /></ProtectedRoute>} />
          <Route path="/laboratory/report-entry" element={<ProtectedRoute user={user} path="/laboratory/report-entry"><ReportEntry /></ProtectedRoute>} />
          <Route path="/laboratory/report-upload" element={<ProtectedRoute user={user} path="/laboratory/report-upload"><ReportUpload /></ProtectedRoute>} />
          <Route path="/laboratory/login" element={<ProtectedRoute user={user} path="/laboratory/login"><LabLogin onLoginSuccess={handleLoginSuccess} /></ProtectedRoute>} />
          
          {/* 6. Pharmacy */}
          <Route path="/pharmacy/medicine-inventory" element={<ProtectedRoute user={user} path="/pharmacy/medicine-inventory"><MedicineInventory /></ProtectedRoute>} />
          <Route path="/pharmacy/prescription-processing" element={<ProtectedRoute user={user} path="/pharmacy/prescription-processing"><PrescriptionProcessing /></ProtectedRoute>} />
          <Route path="/pharmacy/medicine-billing" element={<ProtectedRoute user={user} path="/pharmacy/medicine-billing"><MedicineBilling /></ProtectedRoute>} />
          <Route path="/pharmacy/stock-alerts" element={<ProtectedRoute user={user} path="/pharmacy/stock-alerts"><StockAlerts /></ProtectedRoute>} />
          
          {/* 7. Inpatient */}
          <Route path="/inpatient/room-allocation" element={<ProtectedRoute user={user} path="/inpatient/room-allocation"><RoomAllocation /></ProtectedRoute>} />
          <Route path="/inpatient/admission" element={<ProtectedRoute user={user} path="/inpatient/admission"><Admission /></ProtectedRoute>} />
          <Route path="/inpatient/treatment-records" element={<ProtectedRoute user={user} path="/inpatient/treatment-records"><TreatmentRecords /></ProtectedRoute>} />
          <Route path="/inpatient/daily-progress" element={<ProtectedRoute user={user} path="/inpatient/daily-progress"><DailyProgress /></ProtectedRoute>} />
          <Route path="/inpatient/discharge-summary" element={<ProtectedRoute user={user} path="/inpatient/discharge-summary"><DischargeSummary /></ProtectedRoute>} />
          
          {/* 8. Billing */}
          <Route path="/billing/consultation-charges" element={<ProtectedRoute user={user} path="/billing/consultation-charges"><ConsultationCharges /></ProtectedRoute>} />
          <Route path="/billing/lab-charges" element={<ProtectedRoute user={user} path="/billing/lab-charges"><LabCharges /></ProtectedRoute>} />
          <Route path="/billing/pharmacy-charges" element={<ProtectedRoute user={user} path="/billing/pharmacy-charges"><PharmacyCharges /></ProtectedRoute>} />
          <Route path="/billing/room-charges" element={<ProtectedRoute user={user} path="/billing/room-charges"><RoomCharges /></ProtectedRoute>} />
          <Route path="/billing/payment-gateway" element={<ProtectedRoute user={user} path="/billing/payment-gateway"><PaymentGateway /></ProtectedRoute>} />
          <Route path="/billing/invoice-generation" element={<ProtectedRoute user={user} path="/billing/invoice-generation"><InvoiceGeneration /></ProtectedRoute>} />
          
          {/* 9. Portal */}
          <Route path="/portal/login" element={<ProtectedRoute user={user} path="/portal/login"><PortalLogin /></ProtectedRoute>} />
          <Route path="/portal/book-appointment" element={<ProtectedRoute user={user} path="/portal/book-appointment"><BookApptPortal /></ProtectedRoute>} />
          <Route path="/portal/view-prescriptions" element={<ProtectedRoute user={user} path="/portal/view-prescriptions"><ViewPrescriptionsPortal /></ProtectedRoute>} />
          <Route path="/portal/download-reports" element={<ProtectedRoute user={user} path="/portal/download-reports"><DownloadLabReports /></ProtectedRoute>} />
          <Route path="/portal/online-payment" element={<ProtectedRoute user={user} path="/portal/online-payment"><OnlinePayment /></ProtectedRoute>} />
          <Route path="/portal/medical-history" element={<ProtectedRoute user={user} path="/portal/medical-history"><MedicalHistory /></ProtectedRoute>} />
        </Route>

        {/* Fallback Catch-all Route */}
        <Route path="*" element={user ? <Navigate to={getRoleDefaultRoute(user.role)} replace /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
  );
}

export default App;

