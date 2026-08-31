import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Download, Printer, RefreshCw, ChevronLeft, ChevronRight, X, FileText, AlertCircle, Calendar, Clock, CheckCircle2, Eye, Minimize2, Maximize2, UserCheck, BedDouble, Bed } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from './components/Layout/Layout';
import AdminDashboard from './pages/Admin/Dashboard';
import Login from './pages/Auth/Login';
import LabLogin from './pages/Auth/LabLogin';
import LabSectionsPage from './pages/Laboratory/LabSectionsPage';
import LabSectionBar from './components/Laboratory/LabSectionBar';
import LabPageLayout from './components/Laboratory/LabPageLayout';

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
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  
  if (['active', 'completed', 'verified', 'available', 'paid', 'approved', 'checked_in', 'confirmed'].some(k => s.includes(k))) {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['pending', 'scheduled', 'in progress', 'occupied', 'requested', 'in consultation', 'waiting'].some(k => s.includes(k))) {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['urgent', 'high', 'critical', 'low stock', 'overdue', 'cancelled', 'on leave'].some(k => s.includes(k))) {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[99999] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="flex justify-between items-center px-6 py-4 md:px-10 md:py-5 border-b border-emerald-500/20 bg-[#021f19] shrink-0 shadow-md">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl text-slate-950 shadow-lg shadow-emerald-600/30">
                <Plus className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Add New Entry — {title}</h2>
                <p className="text-xs text-emerald-300/80 mt-0.5">Fill out complete record details below</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex items-center space-x-2 px-4 py-2 bg-emerald-950/70 hover:bg-rose-950/80 text-emerald-200 hover:text-rose-300 rounded-xl text-xs font-bold transition-all border border-emerald-500/30">
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleCreateNew} className="flex flex-col flex-1 overflow-hidden bg-[#011712]">
            <div className="p-6 md:p-12 overflow-y-auto flex-1 scrollbar-thin">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <label className="block text-xs font-bold text-emerald-300/90 uppercase tracking-wider mb-2">{col}</label>
                      {isPain ? (
                        <WongBakerPainScaleSelector value={formData[col] || '3/10'} onChange={(val) => handleInputChange(col, val)} />
                      ) : isDoctor ? (
                        loggedDoctorName ? (
                          <div className="relative">
                            <select
                              value={loggedDoctorName}
                              disabled
                              className="w-full px-4 py-3 border border-emerald-500/40 bg-emerald-950/80 rounded-xl font-bold text-emerald-200 shadow-sm cursor-not-allowed appearance-none pr-12"
                            >
                              <option value={loggedDoctorName}>{loggedDoctorName}</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                You
                              </span>
                            </div>
                          </div>
                        ) : (
                          <select
                            value={formData[col] || DOCTOR_OPTIONS[0]}
                            onChange={(e) => handleInputChange(col, e.target.value)}
                            className="w-full px-4 py-3 border border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-400 text-sm bg-[#021f19] font-medium text-white shadow-sm"
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
                            className="w-full px-4 py-3 border border-teal-500/40 bg-teal-950/80 rounded-xl font-bold text-teal-200 shadow-sm cursor-not-allowed appearance-none pr-12"
                          >
                            <option value={loggedNurseName}>{loggedNurseName}</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span className="text-[10px] bg-teal-600 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                              Nurse (You)
                            </span>
                          </div>
                        </div>
                      ) : isMedicine ? (
                        <select value={formData[col] || MEDICINE_OPTIONS[0]} onChange={(e) => handleInputChange(col, e.target.value)} className="w-full px-4 py-3 border border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-400 text-sm bg-[#021f19] font-medium text-white shadow-sm">
                          {MEDICINE_OPTIONS.map((med, mIdx) => <option key={mIdx} value={med}>{med}</option>)}
                        </select>
                      ) : isStatus ? (
                        <select value={formData[col] || STATUS_OPTIONS[0]} onChange={(e) => handleInputChange(col, e.target.value)} className="w-full px-4 py-3 border border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-400 text-sm bg-[#021f19] font-medium text-white shadow-sm">
                          {STATUS_OPTIONS.map((st, sIdx) => <option key={sIdx} value={st}>{st}</option>)}
                        </select>
                      ) : isDateTime ? (
                        <DateTimePicker value={formData[col] || ''} onChange={(val) => handleInputChange(col, val)} />
                      ) : (
                        <input type="text" required={idx === 0} value={formData[col] || ''} onChange={(e) => handleInputChange(col, e.target.value)} className="w-full px-4 py-3 border border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-400 text-sm font-medium text-white shadow-sm bg-[#021f19]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 md:px-10 md:py-5 border-t border-emerald-500/20 flex items-center justify-between bg-[#021f19] shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="px-8 py-3 text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-lg shadow-emerald-950/60 transition-all">Save Record</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {statusUpdateRow && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="bg-[#021f19] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-emerald-500/30 space-y-5">
            <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/40">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Update Patient Status</h3>
                  <p className="text-xs text-emerald-300/70">{statusUpdateRow['Patient Name'] || statusUpdateRow['Patient'] || statusUpdateRow['Name'] || 'Patient Record'}</p>
                </div>
              </div>
              <button onClick={() => setStatusUpdateRow(null)} className="text-emerald-300/70 hover:text-white p-1.5 rounded-lg hover:bg-emerald-500/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-emerald-300/90 uppercase tracking-wider">Select Current Clinical Status</label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value)}
                className="w-full px-4 py-3 border border-emerald-500/40 rounded-xl focus:ring-2 focus:ring-emerald-400 font-bold text-white bg-emerald-950/80 cursor-pointer shadow-sm text-sm"
              >
                <option value="Scheduled">Scheduled (Waiting for Consultation)</option>
                <option value="In Consultation">In Consultation (Doctor Examining)</option>
                <option value="Seen / Completed">Seen / Completed (Consultation Finished)</option>
                <option value="Checked In">Checked In (Arrived at Hospital)</option>
                <option value="Follow-up Scheduled">Follow-up Scheduled (Review Needed)</option>
                <option value="Discharged">Discharged (Cleared)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-emerald-500/20">
              <button onClick={() => setStatusUpdateRow(null)} className="px-5 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  handleStatusUpdate(statusUpdateRow.id, selectedNewStatus);
                  setStatusUpdateRow(null);
                }}
                className="px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
              >
                Save & Update Status
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedViewRecord && createPortal(
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="flex justify-between items-center px-6 py-4 md:px-10 md:py-5 border-b border-emerald-500/20 bg-[#021f19] text-white shrink-0 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 shadow-md shadow-emerald-600/30">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">{title} — Full Screen Record Detail</h2>
                <p className="text-xs text-emerald-300/80">Complete clinical data record snapshot</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                type="button" 
                onClick={() => setSelectedViewRecord(null)} 
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-950/70 hover:bg-rose-950/80 text-emerald-200 hover:text-rose-300 rounded-xl text-xs font-bold transition-all border border-emerald-500/30 shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>Close Full Screen</span>
              </button>
            </div>
          </div>
          <div className="p-6 md:p-12 overflow-y-auto flex-1 space-y-8 bg-[#011712] scrollbar-thin">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(selectedViewRecord).map(([key, val], kIdx) => {
                if (key === 'id') return null;
                const isPain = key.toLowerCase().includes('pain');
                const isStatus = key.toLowerCase().includes('status') || key.toLowerCase().includes('availability');
                return (
                  <div key={kIdx} className="p-6 bg-[#021f19] border border-emerald-500/20 rounded-2xl shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                    <span className="block text-xs font-bold text-emerald-400/80 uppercase tracking-wider mb-3">{key}</span>
                    <div>
                      {isPain ? (
                        <PainScaleBadge val={val} />
                      ) : isStatus ? (
                        <StatusBadge status={val} />
                      ) : (
                        <span className="text-xl font-black text-white leading-relaxed break-words">{String(val || 'N/A')}</span>
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
          <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
          <p className="text-sm text-emerald-300/80 mt-1 font-medium">{description}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => fetchLatestData ? fetchLatestData() : setData([...data].reverse())} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-950/70 border border-emerald-500/30 hover:bg-emerald-900/90 rounded-xl text-sm font-bold text-emerald-200 shadow-sm transition-colors">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Refresh</span>
          </button>
          {allowAdd && (
            <button onClick={handleOpenModal} className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-950/60 transition-all">
              <Plus className="w-4 h-4" />
              <span>Add New Entry</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#021f19]/75 backdrop-blur-2xl rounded-2xl border border-emerald-500/20 shadow-2xl overflow-hidden text-slate-100">
        <div className="p-4 border-b border-emerald-500/20 flex flex-col sm:flex-row gap-4 justify-between bg-[#011712]/60">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400/60" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-xl text-sm text-white placeholder-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50" />
          </div>
          <select value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-emerald-950/70 border border-emerald-500/30 rounded-xl text-sm font-semibold text-emerald-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/50">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#011712]/80 text-emerald-300/80 uppercase font-bold text-[11px] tracking-wider border-b border-emerald-500/20">
              <tr>
                {cols.map((col, idx) => (
                  <th key={idx} className="px-6 py-4">{col}</th>
                ))}
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr 
                    key={row.id || rowIdx} 
                    className={`hover:bg-emerald-500/10 transition-colors group ${isBilling ? 'cursor-pointer' : ''}`}
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
                        <td key={colIdx} className="px-6 py-4 text-emerald-100">
                          {colIdx === 0 ? (
                            <span className="font-bold text-white">{val}</span>
                          ) : isNameCol && isBilling ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedInvoiceModal(row); }}
                              className="font-bold text-emerald-300 hover:text-white hover:underline text-left inline-flex items-center space-x-1"
                              title="Click to view and print invoice"
                            >
                              <span>{val}</span>
                              <FileText className="w-3.5 h-3.5 text-emerald-400 opacity-80" />
                            </button>
                          ) : isPainCol ? (
                            <PainScaleBadge val={val} />
                          ) : isStatusCol ? (
                            <StatusBadge status={val} />
                          ) : (
                            val
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
                        className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 rounded-lg transition-all border border-emerald-500/40 shadow-sm mr-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Update Status
                      </button>
                      <button
                        onClick={() => { setSelectedViewRecord(row); setIsFullScreen(false); }}
                        title="View Details in Full Screen"
                        className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-slate-200 bg-emerald-950/60 hover:bg-emerald-900/80 rounded-lg transition-all border border-emerald-500/25"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        View
                      </button>
                      {isLabReport && (
                        <button
                          onClick={() => handleDownloadReport(row)}
                          title="Download Lab Report"
                          className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 rounded-lg transition-all border border-teal-500/30"
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
                            className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/90 rounded-lg transition-all border border-emerald-500/30"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Print Bill
                          </button>
                          <button
                            onClick={() => handleDownloadInvoicePDF(row)}
                            title="Download Invoice PDF"
                            className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-teal-300 bg-teal-950/70 hover:bg-teal-900/90 rounded-lg transition-all border border-teal-500/30"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            PDF
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(row.id)}
                        title="Delete record"
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={cols.length + 1} className="px-6 py-12 text-center text-emerald-400/60">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t border-emerald-500/20 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-emerald-300/80 bg-[#011712]/60">
          <span>
            Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
          </span>
          
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-emerald-500/30 rounded-lg hover:bg-emerald-900/80 bg-emerald-950/70 text-emerald-200 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                  currentPage === pg
                    ? 'bg-white text-emerald-950 shadow-md scale-105'
                    : 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-900/80'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-emerald-500/30 rounded-lg hover:bg-emerald-900/80 bg-emerald-950/70 text-emerald-200 disabled:opacity-30 transition-all"
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
const StaffManagement = () => <GenericPage title="Staff Management" description="Manage nursing, lab, and administrative personnel." cols={['Staff Name', 'Role', 'Department', 'Shift']} apiEndpoint="/api/v1/admin/staff" defaultData={[{ id: 1, 'Staff Name': 'Sunita Rao', Role: 'Head Nurse', Department: 'ICU Ward', Shift: 'Morning Shift' }]} />;
const ReportsAnalytics = () => <GenericPage title="Reports & Analytics" description="System reports and clinical exports." cols={['Report Name', 'Generated By', 'Date', 'Type']} apiEndpoint="/api/v1/admin/reports" isLabReport={true} defaultData={[{ id: 1, 'Report Name': 'Monthly Patient Flow Analysis', 'Generated By': 'Admin Bot', Date: '2026-08-13 10:30 AM', Type: 'Operational' }]} />;
const SystemSettings = () => <GenericPage title="System Settings" description="Global application configuration." cols={['Setting Key', 'Value', 'Last Updated', 'Status']} apiEndpoint="/api/v1/admin/settings" defaultData={[{ id: 1, 'Setting Key': 'Hospital Name', Value: 'City Care General Hospital', 'Last Updated': '2026-08-13 12:00 PM', Status: 'Active' }]} />;
const DeletedRecordsLog = () => <GenericPage title="Deleted Records Audit Log" description="All records marked as deleted in database and archived in deleted_records audit table." cols={['Category', 'Record ID', 'Deleted Data Snapshot', 'Deleted Timestamp', 'Status']} apiEndpoint="/api/v1/admin/deleted-records" defaultData={[]} />;

// 2. Reception - Upgraded Patient Registration & Visit Flow Component
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

  // Form State
  const initialForm = {
    full_name: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'O+',
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/patients');
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

    try {
      setSubmitting(true);
      const res = await fetch('http://127.0.0.1:8000/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
      
      const res = await fetch('http://127.0.0.1:8000/api/v1/patients', {
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
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reception Desk • OP Workflow
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Patient Registration & Visit Booking</h1>
          <p className="text-slate-300 text-xs mt-1">
            Register new patients with auto-UHID, contact details, emergency info & OPD queue tokens.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setFormData(initialForm); setShowRegModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" />
            New Patient Registration
          </button>
        </div>
      </div>

      {/* Step 1: Search Existing Patient Flowchart Box */}
      <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              Search Existing Patient Database
            </h3>
            <p className="text-xs text-slate-400">Search by Name, Mobile Number, or Patient UHID before registering a new record.</p>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Type Patient Name, Mobile (+91...), or UHID-..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Results / Flowchart Indicator */}
        {searchQuery && (
          <div className="mt-3 bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span>Matching Patient Search Results ({filteredPatients.length} Found)</span>
              {filteredPatients.length === 0 && <span className="text-amber-400 font-semibold">Patient Not Found ➔ Proceed to Register New Patient</span>}
            </div>

            {filteredPatients.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-slate-300">No patient found matching <span className="text-blue-400 font-mono">"{searchQuery}"</span></p>
                <button
                  onClick={() => {
                    setFormData({ ...initialForm, full_name: searchQuery, phone: searchQuery.match(/^\+?\d+$/) ? searchQuery : '' });
                    setShowRegModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md"
                >
                  ➕ Register New Patient with "{searchQuery}"
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                {filteredPatients.map(pt => (
                  <div key={pt.id} className="bg-slate-800/90 border border-slate-700/70 hover:border-blue-500/50 p-3.5 rounded-xl space-y-2 text-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{pt.Name || pt.full_name}</span>
                      <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/50 rounded font-mono text-[11px] font-bold">
                        {pt['Patient ID'] || pt.UHID || `PAT-${pt.id}`}
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-0.5">
                      <p>📱 Phone: {pt.Phone || pt.phone}</p>
                      <p>🩺 Assigned Doc: {pt.Doctor || 'Dr. Madhavan'}</p>
                    </div>
                    <button
                      onClick={() => handleCreateVisitForExisting(pt)}
                      className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow"
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
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">Registered Patient Records</h2>
            <p className="text-xs text-slate-400">Total active patient records with registration details & visit status</p>
          </div>
          <button 
            onClick={fetchPatients}
            className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
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
                  <td colSpan="8" className="text-center py-8 text-slate-400">Loading registered patient records...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">No patient records found. Click "New Patient Registration" to add.</td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {p['Patient ID'] || p.UHID || `PAT-${p.id}`}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      {p.Name || p.full_name}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{p.Phone || p.phone}</td>
                    <td className="py-3 px-4 text-slate-300">{p.Doctor || 'Dr. Madhavan'}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{p.Disease || 'General Consultation'}</td>
                    <td className="py-3 px-4 text-slate-400">{p['Registered Date'] || '2026-08-25'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {p.Status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleCreateVisitForExisting(p)}
                        className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-[11px] font-medium transition-all"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 border-b border-slate-700 flex items-center justify-between text-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    New Patient Onboarding
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-mono text-[10px] font-bold">
                    AUTO UHID: UHID-2026-AUTO
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-1 text-slate-100">Full Patient Registration & OP Visit Form</h2>
              </div>
              <button 
                onClick={() => setShowRegModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmitRegistration} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-200">
              
              {/* SECTION 1: Patient Details */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/80 text-blue-400 font-bold text-sm">
                  <span>👤</span>
                  <span>1. Patient Details</span>
                  <span className="text-[10px] font-normal text-slate-400 ml-auto">* Primary Identifiers</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Kumar"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Age (Auto-calculated)</label>
                    <div className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-blue-400 font-bold font-mono text-sm flex items-center justify-between">
                      <span>{calculateAge(formData.date_of_birth) || 'Enter DOB above'}</span>
                      <span className="text-[10px] text-slate-500 font-normal">Years</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => handleInputChange('blood_group', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">UHID / Patient ID</label>
                    <div className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs italic">
                      Auto-generated upon save
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Contact Details */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/80 text-emerald-400 font-bold text-sm">
                  <span>📞</span>
                  <span>2. Contact Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      placeholder="patient@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">City</label>
                    <input
                      type="text"
                      placeholder="Chennai"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 mb-1 font-medium">Residential Address</label>
                    <input
                      type="text"
                      placeholder="Street name, door no, landmark"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">State</label>
                      <input
                        type="text"
                        placeholder="Tamil Nadu"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Pincode</label>
                      <input
                        type="text"
                        placeholder="600001"
                        value={formData.pincode}
                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Visit Details */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/80 text-purple-400 font-bold text-sm">
                  <span>🩺</span>
                  <span>3. Visit Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Visit Date & Time (Auto-generated)</label>
                    <div className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-purple-300 font-mono text-xs">
                      {new Date().toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Department *</label>
                    <select
                      value={formData.department}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      {Object.keys(deptDoctors).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Assigned Doctor *</label>
                    <select
                      value={formData.doctor}
                      onChange={(e) => handleInputChange('doctor', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      {Object.values(deptDoctors).map(doc => (
                        <option key={doc} value={doc}>{doc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Visit Type</label>
                    <select
                      value={formData.visit_type}
                      onChange={(e) => handleInputChange('visit_type', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="New Consultation">New Consultation</option>
                      <option value="Follow-Up">Follow-Up</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Routine Checkup">Routine Checkup</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 mb-1 font-medium">Chief Complaint / Symptoms</label>
                    <input
                      type="text"
                      placeholder="e.g. High fever for 2 days, headache, chest tightness"
                      value={formData.chief_complaint}
                      onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Emergency Contact */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/80 text-rose-400 font-bold text-sm">
                  <span>🚨</span>
                  <span>4. Emergency Contact</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="Next of kin / Relative name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Relationship</label>
                    <select
                      value={formData.emergency_relationship}
                      onChange={(e) => handleInputChange('emergency_relationship', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-rose-500 focus:outline-none"
                    >
                      {['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Relative', 'Other'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Emergency Contact Number</label>
                    <input
                      type="text"
                      placeholder="+91 99999 00000"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Payment */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/80 text-amber-400 font-bold text-sm">
                  <span>💳</span>
                  <span>5. Payment Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Registration & Consultation Fee</label>
                    <input
                      type="text"
                      value={formData.registration_fee}
                      onChange={(e) => handleInputChange('registration_fee', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Payment Mode</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none"
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
                    <label className="block text-slate-400 mb-1 font-medium">Payment Status</label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => handleInputChange('payment_status', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none"
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
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Existing Patient Visit Booking
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  Create Visit for {selectedPatient.Name || selectedPatient.full_name}
                </h3>
                <p className="text-slate-400 text-xs">UHID: {selectedPatient['Patient ID'] || selectedPatient.UHID} • Mobile: {selectedPatient.Phone || selectedPatient.phone}</p>
              </div>
              <button onClick={() => setShowVisitModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExistingVisit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    {Object.keys(deptDoctors).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Assigned Doctor</label>
                  <select
                    value={formData.doctor}
                    onChange={(e) => handleInputChange('doctor', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    {Object.values(deptDoctors).map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Visit Type</label>
                <select
                  value={formData.visit_type}
                  onChange={(e) => handleInputChange('visit_type', e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Follow-Up">Follow-Up Consultation</option>
                  <option value="New Consultation">New Consultation</option>
                  <option value="Emergency">Emergency Visit</option>
                  <option value="Routine Checkup">Routine Checkup</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Chief Complaint / Notes</label>
                <input
                  type="text"
                  placeholder="Reason for visit today..."
                  value={formData.chief_complaint}
                  onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Registration Fee</label>
                  <input
                    type="text"
                    value={formData.registration_fee}
                    onChange={(e) => handleInputChange('registration_fee', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / QR Code">UPI / QR Code</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowVisitModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow">
                  {submitting ? 'Booking...' : 'Issue Token & Generate Slip ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE DIGITAL UHID & REGISTRATION SLIP MODAL */}
      {showSlipModal && activeSlip && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm text-slate-100">Registration Complete</span>
              </div>
              <button onClick={() => setShowSlipModal(false)} className="text-slate-400 hover:text-white">
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
                  <span className="bg-emerald-600 text-white font-mono font-black px-2.5 py-1 rounded-lg text-xs">
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
                    <div key={i} className="bg-slate-900 w-1" style={{ height: `${h * 4}px` }}></div>
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
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all"
              >
                <Printer className="w-4 h-4" />
                Print Registration Slip
              </button>
              <button
                onClick={() => alert(`Registration slip & Token ${activeSlip.tokenNo} sent to ${activeSlip.phone} via SMS/WhatsApp!`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all"
              >
                📱 Send SMS
              </button>
              <button
                onClick={() => setShowSlipModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
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

// 2b. Upgraded Appointment Booking Component
const AppointmentBooking = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Step 1: Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Booking Form State
  const [department, setDepartment] = useState('Cardiology');
  const [doctor, setDoctor] = useState('Dr. Madhavan');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [appointmentType, setAppointmentType] = useState('New Consultation');
  const [priority, setPriority] = useState('Normal');
  const [reason, setReason] = useState('');
  const [referralSource, setReferralSource] = useState('Self');
  
  const [consultationFee, setConsultationFee] = useState('₹500');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  
  const [reminder, setReminder] = useState('Yes');
  const [receptionNotes, setReceptionNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [bookedTicket, setBookedTicket] = useState(null);

  const deptDoctors = {
    'Cardiology': 'Dr. Madhavan',
    'Neurology': 'Dr. S. Karthikeyan',
    'Pediatrics': 'Dr. Murugan Jeyaraman',
    'Orthopedics': 'Dr. Raj Kanna',
    'General Medicine': 'Dr. Priya Nair'
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/api/v1/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSlots = async (docName, dateStr) => {
    if (!docName || !dateStr) return;
    try {
      setLoadingSlots(true);
      const url = `http://127.0.0.1:8000/api/v1/appointments/available-slots?doctor=${encodeURIComponent(docName)}&date=${encodeURIComponent(dateStr)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        // Auto-select first available slot if none selected
        const firstAvail = (data.slots || []).find(s => s.is_available);
        if (firstAvail) setSelectedSlot(firstAvail);
        else setSelectedSlot(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchSlots(doctor, appointmentDate);
  }, [doctor, appointmentDate]);

  const handlePatientSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = patients.filter(p => 
      (p.Name || p.full_name || '').toLowerCase().includes(q) ||
      (p.Phone || p.phone || '').toLowerCase().includes(q) ||
      (p['Patient ID'] || p.UHID || '').toLowerCase().includes(q)
    );
    setSearchResults(matches);
  };

  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    const defaultDoc = deptDoctors[newDept] || 'Dr. Madhavan';
    setDoctor(defaultDoc);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Please search and select an existing patient first!");
      return;
    }
    if (!selectedSlot || !selectedSlot.is_available) {
      alert("Please select an available time slot!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        "patient_id": selectedPatient.id,
        "Patient ID": selectedPatient['Patient ID'] || selectedPatient.UHID,
        "UHID": selectedPatient['Patient ID'] || selectedPatient.UHID,
        "Patient Name": selectedPatient.Name || selectedPatient.full_name,
        "Doctor": doctor,
        "Department": department,
        "Appointment Date": appointmentDate,
        "start_time": selectedSlot.start_time,
        "end_time": selectedSlot.end_time,
        "Time Slot": selectedSlot.slot_label,
        "Appointment Type": appointmentType,
        "Priority": priority,
        "Reason for Visit": reason || "Consultation",
        "Referral Source": referralSource,
        "Consultation Fee": consultationFee,
        "Payment Mode": paymentMode,
        "Payment Status": paymentStatus,
        "SMS/WhatsApp Reminder": reminder,
        "Reception Notes": receptionNotes
      };

      const res = await fetch('http://127.0.0.1:8000/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        fetchAppointments();
        fetchSlots(doctor, appointmentDate);

        setBookedTicket({
          id: result["Appointment ID"] || "APT-2026-101",
          patientName: selectedPatient.Name || selectedPatient.full_name,
          uhid: selectedPatient['Patient ID'] || selectedPatient.UHID,
          doctor: doctor,
          department: department,
          date: appointmentDate,
          timeSlot: selectedSlot.slot_label,
          type: appointmentType,
          fee: consultationFee,
          paymentStatus: paymentStatus,
          reminder: reminder
        });
        setShowTicketModal(true);

        // Reset inputs
        setReason('');
        setReceptionNotes('');
      } else {
        const errJson = await res.json();
        alert(errJson.detail || "Error booking appointment. Time slot might be unavailable.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchAppointments();
        fetchSlots(doctor, appointmentDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 rounded-3xl border border-indigo-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reception Desk • Scheduling Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Doctor Appointment Booking</h1>
          <p className="text-slate-300 text-xs mt-1">
            Connect existing patients to doctor schedules with real-time slot availability, department filtering & double-booking prevention.
          </p>
        </div>
      </div>

      {/* STEP 1: Search & Select Existing Patient */}
      <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Step 1: Search & Select Existing Patient *
          </h3>
          {selectedPatient && (
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Patient Selected
            </span>
          )}
        </div>

        {/* User Diagram Styled Search Bar */}
        {!selectedPatient ? (
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-700/80 p-4 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                UHID / Patient ID / Mobile / Name
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Type UHID-..., PT-..., Mobile number, or Name..."
                    value={searchQuery}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePatientSearch(searchQuery)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all"
                >
                  [ Search ]
                </button>
              </div>
            </div>

            {/* Search Results Display */}
            {searchQuery && (
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="text-xs text-slate-400 font-medium">
                  Search Results ({searchResults.length} Patients Found)
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-amber-400 py-2">
                    No existing patient record found for "{searchQuery}". (Appointment booking requires a valid registered patient ID).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.map(p => (
                      <div key={p.id} className="bg-slate-800 border border-slate-700 p-3.5 rounded-xl text-xs space-y-1.5 hover:border-blue-500/50 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100 text-sm">{p.Name || p.full_name}</span>
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 font-mono text-[10px] font-bold rounded border border-blue-800">
                            {p['Patient ID'] || p.UHID || `PAT-${p.id}`}
                          </span>
                        </div>
                        <p className="text-slate-400">📱 Mobile: {p.Phone || p.phone}</p>
                        <p className="text-slate-400">👤 Gender: {p.gender || 'Male'} • Blood: {p.blood_group || 'O+'}</p>
                        <button
                          onClick={() => { setSelectedPatient(p); setSearchQuery(''); }}
                          className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow"
                        >
                          [ Select Patient ]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Selected Patient Card Display */
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-800/60 p-4 rounded-xl flex items-center justify-between text-xs text-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-base text-slate-100">{selectedPatient.Name || selectedPatient.full_name}</span>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded font-mono font-bold">
                  UHID: {selectedPatient['Patient ID'] || selectedPatient.UHID || `PAT-${selectedPatient.id}`}
                </span>
              </div>
              <p className="text-slate-400">📱 Mobile: {selectedPatient.Phone || selectedPatient.phone} • Email: {selectedPatient.email || 'N/A'}</p>
            </div>
            <button
              onClick={() => setSelectedPatient(null)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
            >
              Change Patient
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: Appointment Details & Schedule Picker */}
      {selectedPatient && (
        <form onSubmit={handleBookAppointment} className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-6 text-xs text-slate-200">
          <div className="border-b border-slate-700 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              Step 2: Department, Doctor Schedule & Available Time Slots
            </h3>
            <span className="text-slate-400 text-[11px]">Real-time Availability Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Department Selector */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Department *</label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {Object.keys(deptDoctors).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Doctor Selector (Filtered) */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Assigned Doctor (Filtered) *</label>
              <select
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {Object.values(deptDoctors).map(docName => (
                  <option key={docName} value={docName}>{docName}</option>
                ))}
              </select>
            </div>

            {/* Appointment Date Picker */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Appointment Date *</label>
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Time Slot Picker Grid */}
          <div className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Available 30-Minute Working Schedule Slots for {doctor} ({appointmentDate})
              </span>
              <span className="text-[10px] text-slate-400">Green = Available • Red/Disabled = Booked</span>
            </div>

            {loadingSlots ? (
              <p className="text-slate-400 text-center py-4">Checking schedule availability...</p>
            ) : slots.length === 0 ? (
              <p className="text-amber-400 text-center py-4">No slots configured for this date.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {slots.map((s, idx) => {
                  const isSelected = selectedSlot && selectedSlot.start_time === s.start_time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!s.is_available}
                      onClick={() => setSelectedSlot(s)}
                      className={`p-2.5 rounded-xl border text-center font-mono text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                        !s.is_available
                          ? 'bg-rose-950/40 text-rose-400 border-rose-900/50 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400'
                          : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500 hover:bg-slate-750'
                      }`}
                    >
                      <span>{s.start_time}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {s.is_available ? (isSelected ? 'Selected' : 'Available') : 'Booked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 3: Visit Details, Payment & Communication */}
          <div className="border-t border-slate-700 pt-4 space-y-4">
            <h4 className="font-bold text-slate-200">Step 3: Visit Metadata, Fee & Reminders</h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Appointment Type *</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="New Consultation">New Consultation</option>
                  <option value="Follow-Up">Follow-Up Consultation</option>
                  <option value="Routine Consultation">Routine Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Referral Source</label>
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Self">Self / Direct Walk-In</option>
                  <option value="Doctor">Doctor Referral</option>
                  <option value="Hospital">Hospital Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Consultation Fee (Auto)</label>
                <input
                  type="text"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Insurance">Health Insurance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Waived">Waived</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">SMS/WhatsApp Reminder</label>
                <select
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Yes">Yes (Send Confirmation & Reminder)</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Reason for Visit *</label>
              <input
                type="text"
                required
                placeholder="Short description of patient symptoms or visit reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Receptionist Notes</label>
              <textarea
                rows="2"
                placeholder="Additional administrative notes..."
                value={receptionNotes}
                onChange={(e) => setReceptionNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || !selectedSlot || !selectedSlot.is_available}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
            >
              {submitting ? 'Confirming Appointment...' : 'Confirm & Schedule Appointment ➔'}
            </button>
          </div>
        </form>
      )}

      {/* APPOINTMENTS DIRECTORY TABLE */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">Scheduled Appointments List</h2>
            <p className="text-xs text-slate-400">All active appointments with status tracking & cancellation slot release</p>
          </div>
          <button 
            onClick={fetchAppointments}
            className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3.5 px-4">Appointment ID</th>
                <th className="py-3.5 px-4">Patient UHID</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Doctor & Dept</th>
                <th className="py-3.5 px-4">Date & Time Slot</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Fee Status</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">Loading appointments...</td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">No scheduled appointments.</td>
                </tr>
              ) : (
                appointments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {a['Appointment ID'] || `APT-${a.id}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {a['Patient ID'] || a.UHID || 'UHID-100'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      {a.Patient || a['Patient Name']}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{a.Doctor || 'Dr. Madhavan'}</div>
                      <div className="text-[10px] text-slate-400">{a.Department || 'Cardiology'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {a['Date & Time'] || a.Time || '2026-08-25 10:00 AM'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{a.Type || 'Consultation'}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{a['Consultation Fee'] || '₹500'}</span>
                      <span className="block text-[10px] text-emerald-400">{a['Payment Status'] || 'Paid'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        (a.Status || a['Appointment Status']) === 'Cancelled'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : (a.Status || a['Appointment Status']) === 'Completed'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : (a.Status || a['Appointment Status']) === 'Checked-In'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        {a.Status || a['Appointment Status'] || 'Scheduled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {(a.Status || a['Appointment Status']) !== 'Cancelled' && (a.Status || a['Appointment Status']) !== 'Completed' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(a.id, 'Checked-In')}
                            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 rounded text-[10px]"
                          >
                            Check-In
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(a.id, 'Cancelled')}
                            className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded text-[10px]"
                            title="Cancel appointment and free up time slot"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TICKET CONFIRMATION MODAL */}
      {showTicketModal && bookedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Appointment Confirmed
              </div>
              <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-slate-300 shadow-inner space-y-3 font-sans">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="font-black text-blue-900 text-sm">CITY CARE GENERAL HOSPITAL</h4>
                  <p className="text-[10px] text-slate-600">Appointment Confirmation Ticket</p>
                </div>
                <span className="font-mono font-black text-xs bg-blue-900 text-white px-2 py-1 rounded">
                  {bookedTicket.id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p><span className="text-slate-500">Patient:</span> <strong className="text-slate-900">{bookedTicket.patientName}</strong> ({bookedTicket.uhid})</p>
                <p><span className="text-slate-500">Doctor:</span> <strong className="text-emerald-900">{bookedTicket.doctor}</strong> ({bookedTicket.department})</p>
                <p><span className="text-slate-500">Scheduled Date:</span> <strong>{bookedTicket.date}</strong></p>
                <p><span className="text-slate-500">Time Slot:</span> <strong className="text-blue-900 font-mono">{bookedTicket.timeSlot}</strong></p>
                <p><span className="text-slate-500">Fee:</span> <strong>{bookedTicket.fee} ({bookedTicket.paymentStatus})</strong></p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-lg text-[10px] font-semibold text-center">
                📱 Confirmation & Reminder sent via SMS / WhatsApp
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow"
              >
                <Printer className="w-4 h-4 inline mr-1" /> Print Ticket
              </button>
              <button
                onClick={() => setShowTicketModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 2c. Upgraded Queue Management Component
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/queue');
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
        fetch('http://127.0.0.1:8000/api/v1/appointments'),
        fetch('http://127.0.0.1:8000/api/v1/patients')
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
      (p['Patient ID'] || p.UHID || '').toLowerCase().includes(q)
    );

    if (ptMatch) {
      setSelectedMatch({
        type: 'Walk-in',
        uhid: ptMatch['Patient ID'] || ptMatch.UHID || `PT-${ptMatch.id}`,
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
        "patient_id": selectedMatch?.uhid,
        "UHID": selectedMatch?.uhid || "PT00125",
        "Patient Name": selectedMatch?.name || searchQuery || "Arun Kumar",
        "Doctor": doctorName,
        "Department": departmentName,
        "Arrival Type": arrivalType,
        "Priority": priority,
        "Consultation Room": consultationRoom
      };

      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/queue/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setShowCheckInModal(false);
        fetchQueue();

        setGeneratedToken({
          token: result.Token || result['Token No'] || 'C-015',
          uhid: result.UHID || selectedMatch?.uhid || 'PT00125',
          patientName: result.Patient || selectedMatch?.name || 'Arun Kumar',
          doctor: doctorName,
          department: departmentName,
          position: result.Position || 5,
          waitTime: result['Wait Time'] || '20 min',
          room: consultationRoom,
          checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setShowTokenModal(true);

        // Reset check-in state
        setSearchQuery('');
        setSelectedMatch(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateQueueStatus = async (queueId, newStatus) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/reception/queue/${queueId}/status`, {
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
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reception Desk • Queue Management
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Live Outpatient Queue & Token Engine</h1>
          <p className="text-slate-300 text-xs mt-1">
            Track patient arrivals, issue tokens, manage priorities (Emergency/Urgent/Appointment/Walk-in) & doctor consultation workflow.
          </p>
        </div>
        <button
          onClick={() => { setShowCheckInModal(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          Check-In Patient (Issue Token)
        </button>
      </div>

      {/* TOP STATISTICS DASHBOARD (Matching User ASCII Diagram) */}
      <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-700">
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Waiting Patients</span>
            <span className="text-3xl font-black text-amber-400 font-mono mt-1 block">{stats.waiting}</span>
            <span className="text-[10px] text-slate-500">In waiting lounge</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">In Consultation</span>
            <span className="text-3xl font-black text-blue-400 font-mono mt-1 block">{stats.in_consultation}</span>
            <span className="text-[10px] text-slate-500">Inside doctor rooms</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Completed Today</span>
            <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">{stats.completed}</span>
            <span className="text-[10px] text-slate-500">Consultation finished</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">No Show / Skipped</span>
            <span className="text-3xl font-black text-rose-400 font-mono mt-1 block">{stats.no_show}</span>
            <span className="text-[10px] text-slate-500">Skipped or cancelled</span>
          </div>
        </div>
      </div>

      {/* QUEUE TABLE (Matching User ASCII Diagram) */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Live Queue Table & Priority Ranks
            </h2>
            <p className="text-xs text-slate-400">Sorted by Priority Rank (Emergency ➔ Urgent ➔ Appointment ➔ Walk-in) then Check-In Time</p>
          </div>
          <button 
            onClick={fetchQueue}
            className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all"
            title="Refresh Live Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
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
                  <td colSpan="9" className="text-center py-8 text-slate-400">Loading live queue...</td>
                </tr>
              ) : queueData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-400">No patients in queue. Click "Check-In Patient" to add.</td>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        {q.UHID || 'PT00125'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-100">
                        {q.Patient || q['Patient Name']}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-semibold">{q.Doctor || 'Dr. Madhavan'}</div>
                        <div className="text-[10px] text-slate-400">{q.Department || 'Cardiology'}</div>
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
                      <td className="py-3.5 px-4 font-mono text-slate-300">
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
                              className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 rounded-lg text-[11px] font-semibold transition-all"
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
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow"
                          >
                            [ Start Consult ]
                          </button>
                        )}
                        {status === 'IN_CONSULTATION' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(q.id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow"
                          >
                            [ Complete ]
                          </button>
                        )}
                        {status === 'SKIPPED' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(q.id, 'RECALLED')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  Reception Check-In Desk
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">Patient Check-In & Token Generation</h3>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              {/* Search Box */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Search UHID / Appointment ID / Mobile / Name *</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Type UHID-..., APT-..., Mobile, or Name..."
                    value={searchQuery}
                    onChange={(e) => handleSearchMatch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Match Details Preview Card */}
              {selectedMatch && (
                <div className="bg-gradient-to-r from-slate-950 to-blue-950 border border-blue-800/60 p-3.5 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-100">
                    <span>Patient: {selectedMatch.name}</span>
                    <span className="text-blue-400 font-mono">UHID: {selectedMatch.uhid}</span>
                  </div>
                  <p className="text-slate-400">Doctor: {selectedMatch.doctor} ({selectedMatch.department})</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Arrival Type *</label>
                  <select
                    value={arrivalType}
                    onChange={(e) => setArrivalType(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="Appointment">Booked Appointment</option>
                    <option value="Walk-in">Direct Walk-in</option>
                    <option value="Emergency">Emergency Case</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="Normal">Normal Priority</option>
                    <option value="Urgent">Urgent Case</option>
                    <option value="Emergency">Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Department</label>
                  <select
                    value={departmentName}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    {Object.keys(deptDoctors).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Doctor</label>
                  <select
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    {Object.values(deptDoctors).map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Consultation Room</label>
                <input
                  type="text"
                  value={consultationRoom}
                  onChange={(e) => setConsultationRoom(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowCheckInModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow">
                  {submitting ? 'Checking In...' : 'Issue Token & Add to Queue ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATED TOKEN SLIP MODAL */}
      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Check-In Complete
              </div>
              <button onClick={() => setShowTokenModal(false)} className="text-slate-400 hover:text-white">
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow"
              >
                <Printer className="w-4 h-4 inline mr-1" /> Print Token Slip
              </button>
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
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

// 2d. Upgraded OP/IP Registration & Bed Allocation Component
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/op-visits');
      if (res.ok) setOpVisitsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIPAdmissions = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/ip-admissions');
      if (res.ok) setIpAdmissionsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBedMatrix = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/bed-matrix');
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/patients');
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/op-visits', {
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/reception/ip-admissions', {
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
      const res = await fetch(`http://127.0.0.1:8000/api/v1/reception/ip-admissions/${admissionId}/discharge`, {
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 rounded-3xl border border-indigo-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            Reception Desk • OP / IP Registration
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Outpatient Encounters & Inpatient Admission Module</h1>
          <p className="text-slate-300 text-xs mt-1">
            Register OP consultation encounters or admit patients into wards with real-time interactive bed matrix allocation.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('OP')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'OP'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Outpatient (OP) Registration
          </button>
          <button
            onClick={() => setActiveTab('IP')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'IP'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inpatient (IP) Bed Allocation
          </button>
        </div>
      </div>

      {/* Patient Search Card */}
      <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
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
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {selectedPatient ? (
          <div className="bg-gradient-to-r from-slate-950 to-blue-950 border border-blue-800/60 p-4 rounded-xl text-xs grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] block">Patient Name</span>
              <span className="font-bold text-slate-100 text-sm">{selectedPatient.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">UHID / Patient ID</span>
              <span className="font-mono font-bold text-blue-400">{selectedPatient.uhid}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Age / Gender</span>
              <span className="font-semibold">{selectedPatient.age} yrs / {selectedPatient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Mobile Number</span>
              <span className="font-mono text-emerald-400">{selectedPatient.mobile}</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            * Search existing patient records or leave blank for quick registration.
          </p>
        )}
      </div>

      {/* TAB 1: OUTPATIENT (OP) REGISTRATION */}
      {activeTab === 'OP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* OP Registration Form */}
          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-700 pb-3">
              <UserCheck className="w-4 h-4 text-blue-400" />
              New OP Encounter Registration
            </h3>

            <form onSubmit={handleOpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Visit Type *</label>
                <select
                  value={opVisitType}
                  onChange={(e) => setOpVisitType(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="New Visit">New Visit (Routine OP)</option>
                  <option value="Follow-up Visit">Follow-up Visit</option>
                  <option value="Consultation">Specialist Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Department *</label>
                <select
                  value={opDepartment}
                  onChange={(e) => { setOpDepartment(e.target.value); setOpDoctor(deptDoctors[e.target.value] || 'Dr. Madhavan'); }}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  {Object.keys(deptDoctors).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Attending Doctor *</label>
                <select
                  value={opDoctor}
                  onChange={(e) => setOpDoctor(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  {Object.values(deptDoctors).map(doc => (
                    <option key={doc} value={doc}>{doc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Chief Complaint *</label>
                <textarea
                  rows="2"
                  value={opComplaint}
                  onChange={(e) => setOpComplaint(e.target.value)}
                  placeholder="Describe chief complaint or symptoms..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Referral Source</label>
                <select
                  value={opReferral}
                  onChange={(e) => setOpReferral(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Self">Self / Direct Walk-in</option>
                  <option value="Doctor">Referred by Doctor</option>
                  <option value="Hospital">Referred by Hospital</option>
                  <option value="Other">Other Source</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Consultation Fee</label>
                  <input
                    type="text"
                    value={opFee}
                    onChange={(e) => setOpFee(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payment Mode</label>
                  <select
                    value={opPaymentMode}
                    onChange={(e) => setOpPaymentMode(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
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
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                {submitting ? 'Registering...' : 'Register OP Encounter ➔'}
              </button>
            </form>
          </div>

          {/* OP Encounters List Table */}
          <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Registered OP Encounters</h3>
                <p className="text-xs text-slate-400">Outpatient clinical visits registered today</p>
              </div>
              <button onClick={fetchOPVisits} className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
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
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{v['OP Visit ID']}</td>
                      <td className="py-3 px-4 font-mono">{v.UHID}</td>
                      <td className="py-3 px-4 font-semibold text-slate-100">{v['Patient Name']}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{v.Doctor}</div>
                        <div className="text-[10px] text-slate-400">{v.Department}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{v['Chief Complaint']}</td>
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
            <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-700 pb-3">
                <BedDouble className="w-4 h-4 text-emerald-400" />
                IP Patient Admission Form
              </h3>

              <form onSubmit={handleIpSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Admission Type *</label>
                    <select
                      value={ipAdmissionType}
                      onChange={(e) => setIpAdmissionType(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                    >
                      <option value="Elective">Elective Admission</option>
                      <option value="Emergency">Emergency Admission</option>
                      <option value="Transfer">Transfer from Ward</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Admission Source *</label>
                    <select
                      value={ipAdmissionSource}
                      onChange={(e) => setIpAdmissionSource(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
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
                    <label className="block text-slate-400 mb-1 font-medium">Department *</label>
                    <select
                      value={ipDepartment}
                      onChange={(e) => { setIpDepartment(e.target.value); setIpDoctor(deptDoctors[e.target.value] || 'Dr. Madhavan'); }}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                    >
                      {Object.keys(deptDoctors).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Admitting Doctor *</label>
                    <select
                      value={ipDoctor}
                      onChange={(e) => setIpDoctor(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                    >
                      {Object.values(deptDoctors).map(doc => (
                        <option key={doc} value={doc}>{doc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Provisional Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={ipDiagnosis}
                    onChange={(e) => setIpDiagnosis(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Reason for Admission</label>
                  <textarea
                    rows="2"
                    value={ipReason}
                    onChange={(e) => setIpReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>

                {/* Selected Bed Highlight Card */}
                {selectedBed ? (
                  <div className="bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-700/70 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Selected Bed Allocated ✓</span>
                    <div className="flex justify-between font-bold text-slate-100">
                      <span>{selectedWard?.ward_name} ({selectedBed.room_number})</span>
                      <span className="font-mono text-emerald-300">{selectedBed.bed_number}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">Type: {selectedBed.bed_type} • Rate: {selectedBed.daily_rate}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-[11px]">
                    * Select an AVAILABLE bed from the visual Bed Grid on the right!
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Initial Deposit</label>
                    <input
                      type="text"
                      value={ipDepositAmount}
                      onChange={(e) => setIpDepositAmount(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Insurance Provider</label>
                    <input
                      type="text"
                      value={ipInsuranceProvider}
                      onChange={(e) => setIpInsuranceProvider(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedBed}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  {submitting ? 'Admitting...' : 'Confirm IP Admission & Bed Allocation ➔'}
                </button>
              </form>
            </div>

            {/* INTERACTIVE VISUAL BED MATRIX GRID */}
            <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Bed className="w-4 h-4 text-emerald-400" />
                    Interactive Bed Matrix & Room Availability Map
                  </h3>
                  <p className="text-xs text-slate-400">Green = Available 🟢 (Click to select), Red = Occupied 🔴</p>
                </div>
                <button onClick={fetchBedMatrix} className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-xl">
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
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {ward.ward_name} ({ward.total_beds - ward.occupied_beds} Available)
                  </button>
                ))}
              </div>

              {/* Rooms & Bed Grid Display */}
              {selectedWard && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-slate-100">{selectedWard.ward_name}</span>
                      <span className="text-slate-400 ml-2">({selectedWard.ward_type} • Nurse In-Charge: {selectedWard.nurse_in_charge})</span>
                    </div>
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-emerald-400 font-bold">🟢 {selectedWard.total_beds - selectedWard.occupied_beds} Available</span>
                      <span className="text-rose-400 font-bold">🔴 {selectedWard.occupied_beds} Occupied</span>
                    </div>
                  </div>

                  {selectedWard.rooms.map((room) => (
                    <div key={room.room_number} className="bg-slate-900/60 border border-slate-700/80 p-4 rounded-xl space-y-2">
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
                                  ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-xs">{b.bed_number}</span>
                                <span className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">{b.bed_type}</div>
                              <div className="text-[10px] font-mono mt-0.5 text-slate-300">
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
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Current Inpatient (IP) Admissions</h3>
                <p className="text-xs text-slate-400">Patients currently admitted in hospital wards</p>
              </div>
              <button onClick={fetchIPAdmissions} className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
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
                      <td className="py-3 px-4 font-semibold text-slate-100">{adm['Patient Name']}</td>
                      <td className="py-3 px-4">{adm['Admitting Doctor']}</td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-blue-300">{adm.Ward}</div>
                        <div className="text-[10px] text-slate-400">{adm.Room} - {adm['Bed Number']}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{adm.Diagnosis}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{adm['Deposit Amount']}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          adm.Status === 'Discharged'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                OP Encounter Registered
              </div>
              <button onClick={() => setShowOpSlipModal(false)} className="text-slate-400 hover:text-white">
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
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow">
                <Printer className="w-4 h-4 inline mr-1" /> Print Slip
              </button>
              <button onClick={() => setShowOpSlipModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* IP ADMISSION SLIP MODAL */}
      {showIpSlipModal && registeredIpAdmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                IP Admission Confirmed
              </div>
              <button onClick={() => setShowIpSlipModal(false)} className="text-slate-400 hover:text-white">
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
              <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow">
                <Printer className="w-4 h-4 inline mr-1" /> Print Card
              </button>
              <button onClick={() => setShowIpSlipModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// 3. Doctor Portal Complete Workstation
const DoctorPortalWorkstation = ({ initialSection = 'queue' }) => {
  const [activeTab, setActiveTab] = useState(initialSection);
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState({
    waiting_patients: 2,
    in_consultation: 1,
    critical_alerts: 0,
    pending_lab_orders: 0,
    pending_imaging_orders: 0,
    completed_today: 8
  });
  
  const [queueList, setQueueList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [selectedEncounterCode, setSelectedEncounterCode] = useState('ENC-2026-825215');
  const [summaryData, setSummaryData] = useState(null);

  // Doctor Consultation Form State
  const [consultationStatus, setConsultationStatus] = useState('WAITING_DOCTOR');
  const [chiefComplaint, setChiefComplaint] = useState('Chest discomfort and shortness of breath upon exertion.');
  const [hpiNotes, setHpiNotes] = useState('Onset 2 hours ago. Intermittent retrosternal tightness radiating to left shoulder.');
  const [pastHistory, setPastHistory] = useState('Hypertension (2 yrs), Diabetes Mellitus Type 2.');
  const [allergiesInput, setAllergiesInput] = useState('No Known Allergies (NKDA)');
  
  const [specialty, setSpecialty] = useState('Cardiology');
  const [examFindings, setExamFindings] = useState('S1 S2 heard. No murmurs. Bilateral vesicular breath sounds clear.');
  
  const [primaryDiag, setPrimaryDiag] = useState('Acute Coronary Syndrome (Rule out MI)');
  const [secondaryDiag, setSecondaryDiag] = useState('Essential Hypertension Stage 1');
  const [differentialDiag, setDifferentialDiag] = useState('Gastroesophageal Reflux Disease (GERD), Musculoskeletal chest wall pain');

  const [treatmentPlan, setTreatmentPlan] = useState('Bed rest, Oxygen 2L/min via nasal cannula, Cardiac monitoring, Serial ECGs.');
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

  // Investigation Order Modals
  const [showLabModal, setShowLabModal] = useState(false);
  const [labTestName, setLabTestName] = useState('CBC (Complete Blood Count)');
  const [labPriority, setLabPriority] = useState('Routine');

  const [showImgModal, setShowImgModal] = useState(false);
  const [imgType, setImgType] = useState('CT Scan');
  const [imgBodyPart, setImgBodyPart] = useState('Chest');
  const [imgPriority, setImgPriority] = useState('Urgent');

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [resC, resQ] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/doctor/dashboard-counters?doctor_id=1'),
        fetch('http://127.0.0.1:8000/api/v1/reception/queue')
      ]);
      if (resC.ok) setCounters(await resC.json());
      if (resQ.ok) {
        const qRes = await resQ.json();
        setQueueList(qRes.data || qRes.queue || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEncounterSummary = async (encCode) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/doctor/encounter-summary/${encCode}`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
        if (data.status) setConsultationStatus(data.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    fetchEncounterSummary(selectedEncounterCode);

    // TARGETED WEBSOCKET SUBSCRIBER (Doctor ID: 1 - Dr. Madhavan)
    let ws;
    try {
      ws = new WebSocket('ws://127.0.0.1:8000/ws?channel=doctor:1');
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if ([
            'NursingAssessmentCompleted',
            'LabResultVerified',
            'ImagingReportVerified',
            'ClinicalAlertCreated',
            'ClinicalAlertAcknowledged',
            'ConsultationStarted',
            'ConsultationCompleted'
          ].includes(msg.event)) {
            fetchDoctorData();
            fetchEncounterSummary(selectedEncounterCode);
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
  }, [selectedEncounterCode]);

  const startConsultation = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/doctor/consultation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatientId, encounter_code: selectedEncounterCode })
      });
      if (res.ok) {
        setConsultationStatus('IN_CONSULTATION');
        setActiveTab('consultation');
        fetchDoctorData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/doctor/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      });
      if (res.ok) fetchEncounterSummary(selectedEncounterCode);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOrderLab = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/doctor/lab-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Doctor: 'Dr. Madhavan',
          patient_id: selectedPatientId,
          encounter_id: selectedEncounterCode,
          tests: [labTestName],
          priority: labPriority,
          clinical_indication: chiefComplaint || 'Routine Clinical Diagnostic Workup'
        })
      });
      if (res.ok) {
        setShowLabModal(false);
        fetchEncounterSummary(selectedEncounterCode);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOrderImaging = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/doctor/orders/imaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          encounter_code: selectedEncounterCode,
          ordering_doctor_id: 1,
          imaging_type: imgType,
          body_part: imgBodyPart,
          priority: imgPriority
        })
      });
      if (res.ok) {
        setShowImgModal(false);
        fetchEncounterSummary(selectedEncounterCode);
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

  const handleCompleteConsultation = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/doctor/consultation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          encounter_code: selectedEncounterCode,
          doctor_id: 1,
          has_pending_investigations: (summaryData?.lab_orders?.some(l => l.status !== 'VERIFIED') || summaryData?.imaging_orders?.some(i => i.status !== 'VERIFIED'))
        })
      });
      if (res.ok) {
        alert('✅ Consultation completed successfully! Encounter record updated.');
        fetchDoctorData();
        setActiveTab('queue');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pt = summaryData?.patient || {};
  const latestV = summaryData?.vitals?.[0] || {};
  const nursingA = summaryData?.nursing_assessment || {};
  const activeAlerts = summaryData?.alerts || [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-slate-100 font-sans">
      
      {/* TOP HEADER & METRIC DASHBOARD CARDS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Dr. Madhavan's Clinical Workstation</h1>
            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/20">Cardiology Specialist</span>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Targeted Channel (doctor:1)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Zero Re-Entry Clinical Consultation Engine & Real-Time Event Pipeline</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('queue')} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === 'queue' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            Consultation Queue
          </button>
          <button onClick={() => setActiveTab('consultation')} className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === 'consultation' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            Clinical Consultation
          </button>
        </div>
      </div>

      {/* 6 DYNAMIC DASHBOARD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waiting Patients</div>
          <div className="text-3xl font-extrabold text-white mt-1">{counters.waiting_patients ?? 2}</div>
          <div className="text-[11px] text-cyan-400 mt-1">Nurse Assessed & Ready</div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Consultation</div>
          <div className="text-3xl font-extrabold text-amber-400 mt-1">{counters.in_consultation ?? 1}</div>
          <div className="text-[11px] text-amber-400 mt-1">Active Workup</div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-red-500/40 transition-all">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Alerts</div>
          <div className="text-3xl font-extrabold text-red-400 mt-1">{counters.critical_alerts ?? 0}</div>
          <div className="text-[11px] text-red-400 mt-1">Requires Attention</div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lab Pending</div>
          <div className="text-3xl font-extrabold text-indigo-400 mt-1">{counters.pending_lab_orders ?? 0}</div>
          <div className="text-[11px] text-indigo-400 mt-1">Laboratory Orders</div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Imaging Pending</div>
          <div className="text-3xl font-extrabold text-blue-400 mt-1">{counters.pending_imaging_orders ?? 0}</div>
          <div className="text-[11px] text-blue-400 mt-1">Radiology Scans</div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Today</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1">{counters.completed_today ?? 8}</div>
          <div className="text-[11px] text-emerald-400 mt-1">Finished Consultations</div>
        </div>
      </div>

      {/* QUEUE TAB VIEW */}
      {activeTab === 'queue' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Doctor Consultation Queue</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">Assigned Patients Only</span>
            </h2>
            <button onClick={fetchDoctorData} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all">
              Refresh Queue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Token</th>
                  <th className="py-3.5 px-4 font-semibold">Patient</th>
                  <th className="py-3.5 px-4 font-semibold">Priority</th>
                  <th className="py-3.5 px-4 font-semibold">Nursing Assessment</th>
                  <th className="py-3.5 px-4 font-semibold">Wait Time</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {queueList.map((q) => (
                  <tr key={q.id || q.token} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{q.token || q.token_number || 'C-016'}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{q.patient_name || q.Patient || 'Ishaan'}</div>
                      <div className="text-xs text-slate-500 font-mono">{q.UHID || 'PT-2026-102'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        (q.priority || q.Priority) === 'Emergency' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        (q.priority || q.Priority) === 'Urgent' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {q.priority || q.Priority || 'Normal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30 flex items-center gap-1 w-fit">
                        ✓ COMPLETED
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">{q.wait_time || q.est_wait || '5 min'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold">
                        {q.queue_status || 'WAITING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => { setSelectedPatientId(q.patient_id || 1); setSelectedEncounterCode(q.encounter_code || 'ENC-2026-825215'); setActiveTab('consultation'); }} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-600/20">
                        View Patient
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLINICAL CONSULTATION VIEW */}
      {activeTab === 'consultation' && (
        <div className="space-y-6">

          {/* CRITICAL ALERT BANNER IF ACTIVE ALERTS EXIST */}
          {activeAlerts.length > 0 && (
            <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-red-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xl animate-bounce">
                  🚨
                </div>
                <div>
                  <h3 className="font-bold text-red-400 text-sm">Critical Clinical Alert Detected!</h3>
                  <p className="text-xs text-red-300 mt-0.5">{activeAlerts[0]?.message || 'Abnormal Vitals Detected: SpO₂ 88%'}</p>
                </div>
              </div>
              <button onClick={() => acknowledgeAlert(activeAlerts[0]?.id || 1)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                Acknowledge Alert
              </button>
            </div>
          )}

          {/* PATIENT HEADER CARD (ZERO RE-ENTRY) */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xl font-bold">
                {pt.full_name ? pt.full_name[0] : 'I'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{pt.full_name || 'Ishaan'}</h2>
                  <span className="px-2.5 py-0.5 bg-slate-800 text-cyan-400 text-xs font-mono font-bold rounded-lg border border-slate-700">{pt.patient_code || 'PT-2026-102'}</span>
                  <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">EMERGENCY</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 font-mono">
                  <span>Age: {pt.age || 34} yrs</span>
                  <span>Gender: {pt.gender || 'Male'}</span>
                  <span>Blood: {pt.blood_group || 'O+'}</span>
                  <span>Mobile: {pt.mobile || '+91 91234 56780'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {consultationStatus !== 'IN_CONSULTATION' ? (
                <button onClick={startConsultation} className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-600/30">
                  Start Consultation
                </button>
              ) : (
                <button onClick={handleCompleteConsultation} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/30">
                  Complete Consultation
                </button>
              )}
            </div>
          </div>

          {/* TWO COLUMN CLINICAL WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: NURSE ASSESSMENT & VITALS HISTORY (ZERO RE-ENTRY) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* LATEST VITALS CARD */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center justify-between">
                  <span>Latest Vitals</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Recorded by Nurse Sarah</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Temperature</div>
                    <div className="text-lg font-bold text-white mt-0.5">{latestV.temperature || '98.6'} °F</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Pulse Rate</div>
                    <div className="text-lg font-bold text-white mt-0.5">{latestV.pulse_rate || '78'} bpm</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Blood Pressure</div>
                    <div className="text-lg font-bold text-white mt-0.5">{latestV.systolic_bp || '120'}/{latestV.diastolic_bp || '80'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">SpO₂ Level</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">{latestV.spo2 || '98'} %</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Resp. Rate</div>
                    <div className="text-lg font-bold text-white mt-0.5">{latestV.respiratory_rate || '18'} /min</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-medium">Pain Score</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">{latestV.pain_score || 2} / 10</div>
                  </div>
                </div>

                {/* VITAL HISTORY TREND TABLE */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-400 mb-2">Vitals History Trend</div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">BP</th>
                          <th className="py-2 px-3">Pulse</th>
                          <th className="py-2 px-3">SpO₂</th>
                          <th className="py-2 px-3">Temp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        <tr>
                          <td className="py-2 px-3 font-mono">120/80</td>
                          <td className="py-2 px-3 font-mono">78 bpm</td>
                          <td className="py-2 px-3 font-mono text-emerald-400">98%</td>
                          <td className="py-2 px-3 font-mono">98.6°F</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* NURSING ASSESSMENT SUMMARY CARD */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                <h3 className="font-bold text-sm text-white">Nursing Assessment Summary</h3>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="font-semibold text-slate-400">Chief Complaint: </span>
                    <span className="text-white">{nursingA.chief_complaint || 'Chest discomfort and shortness of breath.'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="font-semibold text-slate-400">General Cond: </span>
                      <span className="text-cyan-400 font-semibold">{nursingA.general_condition || 'Stable'}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="font-semibold text-slate-400">Mobility: </span>
                      <span className="text-white">{nursingA.mobility || 'Independent'}</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="font-semibold text-slate-400">Nursing Observations: </span>
                    <span className="text-slate-300">{nursingA.observations || 'Patient alert, comfortable.'}</span>
                  </div>
                </div>
              </div>

              {/* UNIFIED INVESTIGATION RESULTS (LAB & IMAGING) */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Investigation Results Timeline</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLabModal(true)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all">
                      + Order Lab
                    </button>
                    <button onClick={() => setShowImgModal(true)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all">
                      + Order Imaging
                    </button>
                  </div>
                </div>

                {/* VERIFIED LAB RESULTS */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Laboratory Results</div>
                  {summaryData?.lab_results?.length > 0 ? (
                    summaryData.lab_results.map(r => (
                      <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-indigo-500/30 text-xs">
                        <div className="flex justify-between font-bold text-indigo-300">
                          <span>{r.test_name}</span>
                          <span className="text-emerald-400">✓ VERIFIED</span>
                        </div>
                        <div className="text-slate-300 mt-1 font-mono">{r.result_data}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No lab results verified yet.</div>
                  )}
                </div>

                {/* VERIFIED IMAGING REPORTS */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Radiology Scan Reports</div>
                  {summaryData?.imaging_orders?.length > 0 ? (
                    summaryData.imaging_orders.map(i => (
                      <div key={i.id} className="bg-slate-950 p-3 rounded-xl border border-blue-500/30 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-blue-300">
                          <span>{i.imaging_type} ({i.body_part})</span>
                          <span className={i.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}>
                            {i.status === 'VERIFIED' ? '✓ REPORT VERIFIED' : 'SCAN PENDING'}
                          </span>
                        </div>
                        {i.impression && <div className="text-slate-300 font-mono mt-1">Impression: {i.impression}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No imaging orders yet.</div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: DOCTOR CLINICAL CONSULTATION FORM */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
                
                {/* SECTION 1: HPI & COMPLAINT */}
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">1. Chief Complaint & History of Present Illness</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Chief Complaint</label>
                      <input type="text" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">History of Present Illness (HPI)</label>
                      <textarea rows={3} value={hpiNotes} onChange={(e) => setHpiNotes(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white" />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: SPECIALTY PHYSICAL EXAMINATION */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">2. Specialty Physical Examination</h3>
                    <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="bg-slate-950 border border-slate-800 text-xs font-semibold text-white px-3 py-1.5 rounded-lg">
                      <option value="Cardiology">Cardiology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>
                  <div>
                    <textarea rows={3} value={examFindings} onChange={(e) => setExamFindings(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white" />
                  </div>
                </div>

                {/* SECTION 3: DIAGNOSIS ENGINE */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">3. Clinical Diagnosis Engine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Primary Diagnosis</label>
                      <input type="text" value={primaryDiag} onChange={(e) => setPrimaryDiag(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Secondary Diagnosis</label>
                      <input type="text" value={secondaryDiag} onChange={(e) => setSecondaryDiag(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white" />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: PRESCRIPTION BUILDER */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">4. Prescription & Medication Orders</h3>
                  
                  {/* ADD DRUG INPUT BAR */}
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <input type="text" placeholder="Drug Name (e.g. Paracetamol)" value={drugName} onChange={(e) => setDrugName(e.target.value)} className="sm:col-span-2 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white" />
                    <input type="text" placeholder="Dose (500mg)" value={drugDose} onChange={(e) => setDrugDose(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white" />
                    <input type="text" placeholder="Freq (1-0-1)" value={drugFreq} onChange={(e) => setDrugFreq(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white" />
                    <input type="text" placeholder="Duration (5 Days)" value={drugDuration} onChange={(e) => setDrugDuration(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white" />
                    <button onClick={handleAddDrug} className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition-all">
                      + Add Drug
                    </button>
                  </div>

                  {/* PRESCRIPTION ITEMS TABLE */}
                  <div className="space-y-1">
                    {prescriptions.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
                        <div className="font-bold text-white">{m.name}</div>
                        <div className="text-slate-400 font-mono">{m.dose} | {m.freq} | {m.duration}</div>
                        <div className="text-slate-500 text-[11px]">{m.instructions}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 5: TREATMENT PLAN & COMPLETION */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">5. Treatment Plan & Final Disposition</h3>
                  <textarea rows={3} value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white" />
                  
                  <div className="pt-2 flex justify-end">
                    <button onClick={handleCompleteConsultation} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm transition-all shadow-xl shadow-emerald-600/30">
                      Complete Consultation
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* LAB ORDER MODAL */}
      {showLabModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Order Laboratory Test</h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Select Test Name</label>
              <select value={labTestName} onChange={(e) => setLabTestName(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white">
                <option value="CBC (Complete Blood Count)">CBC (Complete Blood Count)</option>
                <option value="Lipid Profile Assessment">Lipid Profile Assessment</option>
                <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                <option value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Priority</label>
              <select value={labPriority} onChange={(e) => setLabPriority(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white">
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowLabModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={handleOrderLab} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl">Order Test</button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGING ORDER MODAL */}
      {showImgModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Order Radiology Scan / Imaging</h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Scan Type</label>
              <select value={imgType} onChange={(e) => setImgType(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white">
                <option value="CT Scan">CT Scan</option>
                <option value="X-Ray">X-Ray</option>
                <option value="MRI">MRI</option>
                <option value="Ultrasound">Ultrasound</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Body Part</label>
              <select value={imgBodyPart} onChange={(e) => setImgBodyPart(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white">
                <option value="Chest">Chest</option>
                <option value="Abdomen">Abdomen</option>
                <option value="Brain">Brain</option>
                <option value="Knee">Knee</option>
                <option value="Spine">Spine</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowImgModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={handleOrderImaging} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl">Order Scan</button>
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/dashboard');
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
        fetch(`http://127.0.0.1:8000/api/v1/nurse/vitals/${ptId}`),
        fetch(`http://127.0.0.1:8000/api/v1/nurse/assessments/${ptId}`),
        fetch(`http://127.0.0.1:8000/api/v1/nurse/medication-admin/${ptId}`),
        fetch(`http://127.0.0.1:8000/api/v1/nurse/nursing-notes/${ptId}`)
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
      ws = new WebSocket('ws://127.0.0.1:8000/ws');
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
      await fetch('http://127.0.0.1:8000/api/v1/nurse/assessments/start', {
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/assessments/finish', {
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/alerts/resolve', {
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/vitals', {
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/assessments', {
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/medication-admin', {
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/nurse/nursing-notes', {
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
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-blue-950 p-6 rounded-3xl border border-teal-800/40 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            Pre-Consultation Clinical Workstation
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Nurse Clinical Portal & Assessment Engine</h1>
          <p className="text-slate-300 text-xs mt-1">
            Verifies checked-in patients post reception arrival, records vital signs with automated clinical threshold rules, conducts nursing assessments, and logs bedside MAR.
          </p>
        </div>
      </div>

      {/* 6-Tab Navigation Bar */}
      <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1 shadow-lg text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" /> Checked-In Queue
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'vitals' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Patient Vitals & Alerts
        </button>
        <button
          onClick={() => setActiveTab('assessment')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'assessment' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" /> Nursing Assessment
        </button>
        <button
          onClick={() => setActiveTab('ward')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'ward' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BedDouble className="w-4 h-4" /> Ward Management
        </button>
        <button
          onClick={() => setActiveTab('mar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'mar' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-4 h-4" /> Medication Admin (MAR)
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'notes' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Printer className="w-4 h-4" /> Nursing Notes
        </button>
      </div>

      {/* Selected Patient Verification Bar */}
      <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-700 flex items-center justify-center font-bold text-teal-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Verified Patient & Encounter</span>
            <span className="font-bold text-slate-100 text-sm">{patientName}</span>
            <span className="font-mono text-teal-400 text-[11px] ml-2">({patientUhid})</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div><span className="text-slate-400 text-[10px] block">Token / Encounter</span><span className="text-slate-200">{encounterCode}</span></div>
          <div><span className="text-slate-400 text-[10px] block">Attending Doctor</span><span className="text-slate-200">{doctorName}</span></div>
          <div><span className="text-slate-400 text-[10px] block">Department</span><span className="text-teal-300 font-bold">{deptName}</span></div>
        </div>
      </div>

      {/* TAB 1: CHECKED-IN QUEUE & WORKLOAD DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 6 Workload Counters (Matching User ASCII Diagram) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow text-center">
              <span className="text-slate-400 text-[10px] uppercase block font-semibold">Waiting Assessment</span>
              <span className="text-2xl font-bold text-teal-400 font-mono">{dashboardData?.counters?.waiting_assessment ?? 0}</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow text-center">
              <span className="text-slate-400 text-[10px] uppercase block font-semibold">Vitals Pending</span>
              <span className="text-2xl font-bold text-amber-400 font-mono">{dashboardData?.counters?.vitals_pending ?? 0}</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow text-center">
              <span className="text-slate-400 text-[10px] uppercase block font-semibold">Medications Due</span>
              <span className="text-2xl font-bold text-blue-400 font-mono">{dashboardData?.counters?.medications_due ?? 0}</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow text-center">
              <span className="text-slate-400 text-[10px] uppercase block font-semibold">In Ward</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{dashboardData?.counters?.in_ward ?? 0}</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow text-center">
              <span className="text-slate-400 text-[10px] uppercase block font-semibold">Critical Alerts</span>
              <span className="text-2xl font-bold text-rose-400 font-mono animate-pulse">{dashboardData?.counters?.critical_alerts ?? 0}</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl shadow text-center">
              <span className="text-slate-400 text-[10px] uppercase block font-semibold">Completed</span>
              <span className="text-2xl font-bold text-slate-300 font-mono">{dashboardData?.counters?.completed ?? 0}</span>
            </div>
          </div>

          {/* Checked-In Patient Queue Table (Matching User ASCII Diagram) */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  Checked-In Patients Waiting for Nurse Assessment
                </h3>
                <p className="text-xs text-slate-400">Arrived patients waiting for vital signs recording and pre-consultation nursing evaluation</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-700">
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
                <tbody className="divide-y divide-slate-700/50">
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-8 text-slate-400">Loading checked-in queue...</td></tr>
                  ) : !dashboardData?.patient_queue || dashboardData.patient_queue.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8 text-slate-400">No checked-in patients in queue.</td></tr>
                  ) : (
                    dashboardData.patient_queue.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{pt.token}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-100">{pt.patient_name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{pt.uhid}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{pt.doctor}</td>
                        <td className="py-3.5 px-4 text-slate-300">{pt.department}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pt.priority === 'Emergency' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            pt.priority === 'Urgent' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-slate-900 text-slate-300 border border-slate-700'
                          }`}>
                            {pt.priority || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            pt.nursing_status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            pt.nursing_status === 'IN_PROGRESS' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {pt.nursing_status === 'COMPLETED' ? '🟢 Assessed' : (pt.nursing_status === 'IN_PROGRESS' ? '🔵 In Progress' : '🟡 Waiting')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {pt.nursing_status === 'WAITING' ? (
                            <button
                              onClick={() => handleStartAssessment(pt)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-xl shadow transition-all"
                            >
                              [ Start Assessment ]
                            </button>
                          ) : pt.nursing_status === 'IN_PROGRESS' ? (
                            <button
                              onClick={() => { selectPatientFromQueue(pt); setActiveTab('vitals'); }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow transition-all"
                            >
                              [ Continue Assessment ]
                            </button>
                          ) : (
                            <button
                              onClick={() => { selectPatientFromQueue(pt); setActiveTab('vitals'); }}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] rounded-xl shadow transition-all"
                            >
                              [ View Assessment ]
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

          {/* Active Clinical Alerts Section (Matching User ASCII Diagram) */}
          {dashboardData?.active_alerts && dashboardData.active_alerts.length > 0 && (
            <div className="bg-slate-800/90 border border-rose-800/60 p-5 rounded-2xl shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 border-b border-rose-900/60 pb-2">
                <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                Active Unresolved Clinical Alerts ({dashboardData.active_alerts.length})
              </h3>
              <div className="space-y-2">
                {dashboardData.active_alerts.map((alt) => (
                  <div key={alt.id} className="bg-slate-950 border border-rose-900/50 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-100">{alt.patient_name}</span>
                      <span className="text-rose-400 font-mono font-semibold ml-2">{alt.message}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">{alt.created_at}</span>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alt.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow transition-all whitespace-nowrap"
                    >
                      [ Resolve Alert ]
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
          <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-5 text-xs text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  Record Patient Vitals & Physiological Metrics
                </h3>
                <p className="text-xs text-slate-400">Inputs validate automatically against clinical threshold rules</p>
              </div>
            </div>

            {/* AUTOMATIC VITAL ALERT BANNER */}
            {vitalAlerts.length > 0 && (
              <div className="bg-rose-950/90 border border-rose-700 p-4 rounded-xl space-y-2 text-rose-200 shadow-lg">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                  <AlertCircle className="w-5 h-5 animate-pulse text-rose-400" />
                  🚨 AUTOMATIC CLINICAL VITAL ALERTS DETECTED
                </div>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs text-rose-300">
                  {vitalAlerts.map((a, i) => (
                    <li key={i}>{a.text}</li>
                  ))}
                </ul>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => alert(`Doctor ${doctorName} has been notified of critical vitals.`)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow"
                  >
                    [ Notify Doctor Immediately ]
                  </button>
                </div>
              </div>
            )}

            {vitalAlertMsg && (
              <div className="bg-teal-950 border border-teal-800 text-teal-300 p-3 rounded-xl font-medium">
                {vitalAlertMsg}
              </div>
            )}

            <form onSubmit={handleVitalsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Temperature (°F) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Pulse / Heart Rate (bpm) *</label>
                  <input
                    type="number"
                    required
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Resp Rate (/min) *</label>
                  <input
                    type="number"
                    required
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Systolic BP (mmHg) *</label>
                  <input
                    type="number"
                    required
                    value={sysBp}
                    onChange={(e) => setSysBp(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Diastolic BP (mmHg) *</label>
                  <input
                    type="number"
                    required
                    value={diaBp}
                    onChange={(e) => setDiaBp(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">SpO₂ Oxygen (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono font-bold text-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">BMI (Auto-Calculated)</label>
                  <input
                    type="text"
                    readOnly
                    value={`${bmiCalc} kg/m²`}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-teal-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Pain Score (0 to 10 scale)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={painScore}
                      onChange={(e) => setPainScore(parseInt(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                    <span className="font-mono font-bold text-slate-100 text-sm w-8">{painScore}/10</span>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-between gap-3 border-t border-slate-700">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl shadow transition-all text-xs"
                >
                  {submitting ? 'Saving Vitals...' : '[ Save & Submit Vitals ]'}
                </button>

                <button
                  type="button"
                  onClick={handleFinishAssessment}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center gap-2"
                >
                  [ Finish Assessment ➔ ]
                </button>
              </div>
            </form>
          </div>

          {/* Vitals History */}
          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-700 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" /> Vitals History
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {vitalsList.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No vital records logged yet.</p>
              ) : (
                vitalsList.map((v, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>{v.recorded_at}</span>
                      <span className="text-teal-400 font-bold">{v.recorded_by}</span>
                    </div>
                    <div className="text-slate-200 grid grid-cols-2 gap-1 font-semibold">
                      <span>Temp: {v.temperature}°F</span>
                      <span>Pulse: {v.pulse_rate} bpm</span>
                      <span>BP: {v.bp_display}</span>
                      <span>SpO₂: {v.spo2}%</span>
                    </div>
                    {v.is_abnormal && (
                      <span className="text-rose-400 font-bold block text-[10px]">{v.alert_notes}</span>
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
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-5 text-xs text-slate-200 max-w-3xl">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-700 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" /> Pre-Consultation Clinical Assessment
          </h3>

          <form onSubmit={handleAssessmentSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Chief Complaint & Symptoms *</label>
              <textarea
                rows="3"
                required
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">General Condition</label>
                <select
                  value={generalCond}
                  onChange={(e) => setGeneralCond(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Stable">Stable</option>
                  <option value="Needs Attention">Needs Attention</option>
                  <option value="Critical / Escalate">Critical / Escalate</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Mobility Status</label>
                <select
                  value={mobility}
                  onChange={(e) => setMobility(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Independent">Independent</option>
                  <option value="Assisted">Assisted</option>
                  <option value="Bedridden">Bedridden</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Fall Risk</label>
                <select
                  value={fallRisk}
                  onChange={(e) => setFallRisk(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Allergy Information</label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Nursing Clinical Observations</label>
              <textarea
                rows="3"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg"
              >
                {submitting ? 'Saving...' : '[ Save Nursing Assessment ]'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: WARD MANAGEMENT */}
      {activeTab === 'ward' && (
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-700 pb-3 flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-teal-400" /> Inpatient Ward Care Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-2">
              <div className="flex justify-between font-bold text-slate-100 text-sm">
                <span>Room 201 - Bed 01</span>
                <span className="text-emerald-400">Occupied</span>
              </div>
              <p className="text-slate-300 font-semibold">Arun Kumar (PT-2026-00125)</p>
              <p className="text-slate-400 text-[11px]">Doctor: Dr. Rajesh • Ward: General Medicine</p>
              <div className="pt-2 flex gap-2">
                <button onClick={() => setActiveTab('vitals')} className="px-3 py-1 bg-teal-600 text-white rounded font-bold">Vitals</button>
                <button onClick={() => setActiveTab('mar')} className="px-3 py-1 bg-blue-600 text-white rounded font-bold">MAR</button>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-2">
              <div className="flex justify-between font-bold text-slate-100 text-sm">
                <span>Room 201 - Bed 02</span>
                <span className="text-slate-400">Available</span>
              </div>
              <p className="text-slate-500 italic">No patient assigned</p>
            </div>
            <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl space-y-2">
              <div className="flex justify-between font-bold text-slate-100 text-sm">
                <span>Room 301 - Bed ICU-01</span>
                <span className="text-emerald-400">Occupied</span>
              </div>
              <p className="text-slate-300 font-semibold">Tanvi (PT-2026-00126)</p>
              <p className="text-slate-400 text-[11px]">Doctor: Dr. Raj Kanna • Ward: ICU Block</p>
              <div className="pt-2 flex gap-2">
                <button onClick={() => setActiveTab('vitals')} className="px-3 py-1 bg-teal-600 text-white rounded font-bold">Vitals</button>
                <button onClick={() => setActiveTab('mar')} className="px-3 py-1 bg-blue-600 text-white rounded font-bold">MAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MEDICATION ADMINISTRATION RECORD (MAR) */}
      {activeTab === 'mar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-700 pb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-400" /> Bedside Medication Administration Logger (MAR)
            </h3>

            <form onSubmit={handleMarSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Dose *</label>
                  <input
                    type="text"
                    required
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Route</label>
                  <select
                    value={medRoute}
                    onChange={(e) => setMedRoute(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
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
                  <label className="block text-slate-400 mb-1 font-medium">Administration Status *</label>
                  <select
                    value={medStatus}
                    onChange={(e) => setMedStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="Given">Given / Administered</option>
                    <option value="Refused">Refused by Patient</option>
                    <option value="Held">Held (Clinical Reason)</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Reason if Omitted/Held</label>
                  <input
                    type="text"
                    placeholder="Optional reason"
                    value={medReason}
                    onChange={(e) => setMedReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow">
                  {submitting ? 'Recording...' : '[ Record Administration ]'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-700 pb-3">Recent MAR Log</h3>
            <div className="space-y-3">
              {marList.map((m, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-[11px]">
                  <div className="flex justify-between font-bold text-slate-100">
                    <span>{m.medicine_name} ({m.dose})</span>
                    <span className="text-emerald-400">{m.status}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] mt-1">Route: {m.route} • Time: {m.administered_time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SIGNED NURSING NOTES */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700 p-6 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-700 pb-3 flex items-center gap-2">
              <Printer className="w-5 h-5 text-teal-400" /> Signed Clinical Nursing Progress Notes
            </h3>

            <form onSubmit={handleNoteSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Note Type</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="Routine Nursing Note">Routine Nursing Note</option>
                  <option value="Doctor Visit Note">Doctor Visit Note</option>
                  <option value="Shift Handover">Shift Handover</option>
                  <option value="Emergency Escalation">Emergency Escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Observation *</label>
                <textarea
                  rows="2"
                  required
                  value={noteObs}
                  onChange={(e) => setNoteObs(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Intervention</label>
                  <input
                    type="text"
                    value={noteInterv}
                    onChange={(e) => setNoteInterv(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Patient Response</label>
                  <input
                    type="text"
                    value={noteResp}
                    onChange={(e) => setNoteResp(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="docNotifiedChk"
                  checked={docNotified}
                  onChange={(e) => setDocNotified(e.target.checked)}
                  className="w-4 h-4 accent-teal-500"
                />
                <label htmlFor="docNotifiedChk" className="text-slate-200 font-medium">Attending doctor notified of clinical changes</label>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow">
                  {submitting ? 'Signing...' : '[ Save Signed Clinical Note ]'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700 p-5 rounded-2xl shadow-xl space-y-4 text-xs text-slate-200">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-700 pb-3">Signed Clinical Audit Trail</h3>
            <div className="space-y-3">
              {notesList.map((n, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-teal-400">
                    <span>{n.note_type}</span>
                    <span className="text-slate-400">{n.signed_at}</span>
                  </div>
                  <p className="text-slate-200">{n.observation}</p>
                  <p className="text-slate-400 text-[10px]">Intervention: {n.intervention}</p>
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
      const res = await fetch('http://127.0.0.1:8000/api/v1/billing/service-master');
      if (res.ok) setServiceMasterList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const calculateBill = async (identifier) => {
    try {
      setLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/billing/calculate-bill/${encodeURIComponent(identifier || 'PT-2026-00125')}`);
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/billing/add-item', {
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

      const res = await fetch('http://127.0.0.1:8000/api/v1/billing/process-payment', {
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
        
        <Route element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          {/* 1. Admin */}
          <Route path="/admin/dashboard" element={<ProtectedRoute user={user} path="/admin/dashboard"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute user={user} path="/admin/users"><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/doctors" element={<ProtectedRoute user={user} path="/admin/doctors"><DoctorManagement /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute user={user} path="/admin/departments"><DepartmentManagement /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute user={user} path="/admin/staff"><StaffManagement /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute user={user} path="/admin/reports"><ReportsAnalytics /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute user={user} path="/admin/settings"><SystemSettings /></ProtectedRoute>} />
          <Route path="/admin/deleted-records" element={<ProtectedRoute user={user} path="/admin/deleted-records"><DeletedRecordsLog /></ProtectedRoute>} />
          
          {/* 2. Reception */}
          <Route path="/reception/patient-registration" element={<ProtectedRoute user={user} path="/reception/patient-registration"><PatientRegistration /></ProtectedRoute>} />
          <Route path="/reception/appointment-booking" element={<ProtectedRoute user={user} path="/reception/appointment-booking"><AppointmentBooking /></ProtectedRoute>} />
          <Route path="/reception/queue-management" element={<ProtectedRoute user={user} path="/reception/queue-management"><QueueManagement /></ProtectedRoute>} />
          <Route path="/reception/op-ip-registration" element={<ProtectedRoute user={user} path="/reception/op-ip-registration"><OPIPRegistration /></ProtectedRoute>} />
          
          {/* 3. Doctor Workstation */}
          <Route path="/doctor/appointments" element={<ProtectedRoute user={user} path="/doctor/appointments"><DoctorPortalWorkstation initialSection="queue" /></ProtectedRoute>} />
          <Route path="/doctor/patient-history" element={<ProtectedRoute user={user} path="/doctor/patient-history"><DoctorPortalWorkstation initialSection="consultation" /></ProtectedRoute>} />
          <Route path="/doctor/diagnosis" element={<ProtectedRoute user={user} path="/doctor/diagnosis"><DoctorPortalWorkstation initialSection="consultation" /></ProtectedRoute>} />
          <Route path="/doctor/prescription" element={<ProtectedRoute user={user} path="/doctor/prescription"><DoctorPortalWorkstation initialSection="consultation" /></ProtectedRoute>} />
          <Route path="/doctor/lab-test-request" element={<ProtectedRoute user={user} path="/doctor/lab-test-request"><DoctorPortalWorkstation initialSection="consultation" /></ProtectedRoute>} />
          <Route path="/doctor/follow-up" element={<ProtectedRoute user={user} path="/doctor/follow-up"><DoctorPortalWorkstation initialSection="consultation" /></ProtectedRoute>} />
          
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

