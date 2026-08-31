import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Download, Printer, RefreshCw, ChevronLeft, ChevronRight, X, FileText, AlertCircle, Calendar, Clock, CheckCircle2, Eye, Minimize2, Maximize2 } from 'lucide-react';
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

// 2. Reception
const PatientRegistration = () => <GenericPage title="Patient Registration" description="Register new outpatient and inpatient records with assigned doctor, disease, and pain scale tracking." cols={['Patient ID', 'Name', 'Doctor', 'Disease', 'Pain Level', 'Phone', 'Registered Date', 'Status']} apiEndpoint="/api/v1/patients" defaultData={[
  { id: 1, 'Patient ID': 'PAT-2001', Name: 'Aarav Kumar', Doctor: 'Dr. Madhavan', Disease: 'Diabetes & Hypertension', 'Pain Level': '3/10', Phone: '+91 98765 43210', 'Registered Date': '2026-08-13 09:15 AM', Status: 'Active' },
  { id: 2, 'Patient ID': 'PAT-2002', Name: 'Ananya Sharma', Doctor: 'Dr. Madhavan', Disease: 'Angina Pectoris', 'Pain Level': '4/10', Phone: '+91 98765 43211', 'Registered Date': '2026-08-14 10:00 AM', Status: 'Active' },
  { id: 3, 'Patient ID': 'PAT-2003', Name: 'Kavya Ramesh', Doctor: 'Dr. Madhavan', Disease: 'Hyperlipidemia', 'Pain Level': '2/10', Phone: '+91 98765 43212', 'Registered Date': '2026-08-15 11:30 AM', Status: 'Active' }
]} />;
const AppointmentBooking = () => <GenericPage title="Appointment Booking" description="Schedule consultations with specialized doctors." cols={['Appointment ID', 'Patient', 'Doctor', 'Date & Time', 'Status']} apiEndpoint="/api/v1/appointments" defaultData={[{ id: 1, 'Appointment ID': 'APT-801', Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', 'Date & Time': '2026-08-20 09:30 AM', Status: 'Confirmed' }]} />;
const QueueManagement = () => <GenericPage title="Queue Management" description="Real-time outpatient token tracking." cols={['Token No', 'Patient', 'Doctor', 'Est. Time', 'Status']} apiEndpoint="/api/v1/reception/queue" defaultData={[{ id: 1, 'Token No': 'TK-01', Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', 'Est. Time': '09:30 AM', Status: 'In Consultation' }]} />;
const OPIPRegistration = () => <GenericPage title="OP/IP Registration" description="Manage status between Outpatient and Inpatient wings." cols={['Patient Name', 'Type', 'Department', 'Status']} apiEndpoint="/api/v1/reception/op-ip" defaultData={[{ id: 1, 'Patient Name': 'Aarav Kumar', Type: 'Outpatient (OP)', Department: 'Cardiology', Status: 'Checked In' }]} />;

// 3. Doctor
const ViewAppointments = () => <GenericPage title="View Appointments" description="Today's clinical consultation list divided equally across doctors (3 patients per doctor)." cols={['Time', 'Patient Name', 'Doctor', 'Status']} apiEndpoint="/api/v1/doctor/appointments" defaultData={[
  // Dr. Madhavan (Cardiology)
  { id: 1, Time: '2026-08-20 09:30 AM', 'Patient Name': 'Aarav Kumar', Doctor: 'Dr. Madhavan', Status: 'In Consultation' },
  { id: 2, Time: '2026-08-20 10:15 AM', 'Patient Name': 'Ananya Sharma', Doctor: 'Dr. Madhavan', Status: 'Scheduled' },
  { id: 3, Time: '2026-08-20 11:00 AM', 'Patient Name': 'Kavya Ramesh', Doctor: 'Dr. Madhavan', Status: 'Scheduled' },
  // Dr. S. Karthikeyan (Neurology)
  { id: 4, Time: '2026-08-20 11:45 AM', 'Patient Name': 'Rajesh Patel', Doctor: 'Dr. S. Karthikeyan', Status: 'In Consultation' },
  { id: 5, Time: '2026-08-20 12:30 PM', 'Patient Name': 'Meera Iyer', Doctor: 'Dr. S. Karthikeyan', Status: 'Scheduled' },
  { id: 6, Time: '2026-08-20 01:15 PM', 'Patient Name': 'Arjun Swaminathan', Doctor: 'Dr. S. Karthikeyan', Status: 'Scheduled' },
  // Dr. Murugan Jeyaraman (Pediatrics)
  { id: 7, Time: '2026-08-20 02:00 PM', 'Patient Name': 'Master Vihaan Singh', Doctor: 'Dr. Murugan Jeyaraman', Status: 'In Consultation' },
  { id: 8, Time: '2026-08-20 02:45 PM', 'Patient Name': 'Baby Diya Verma', Doctor: 'Dr. Murugan Jeyaraman', Status: 'Scheduled' },
  { id: 9, Time: '2026-08-20 03:30 PM', 'Patient Name': 'Master Kian Nair', Doctor: 'Dr. Murugan Jeyaraman', Status: 'Scheduled' },
  // Dr. Raj Kanna (Orthopedics)
  { id: 10, Time: '2026-08-20 04:15 PM', 'Patient Name': 'Vikramaditya Rao', Doctor: 'Dr. Raj Kanna', Status: 'In Consultation' },
  { id: 11, Time: '2026-08-20 05:00 PM', 'Patient Name': 'Ramesh Gupta', Doctor: 'Dr. Raj Kanna', Status: 'Scheduled' },
  { id: 12, Time: '2026-08-20 05:45 PM', 'Patient Name': 'Divya Krishnan', Doctor: 'Dr. Raj Kanna', Status: 'Scheduled' },
  // Dr. Priya Nair (General Medicine)
  { id: 13, Time: '2026-08-20 06:30 PM', 'Patient Name': 'Sunita Sundaram', Doctor: 'Dr. Priya Nair', Status: 'In Consultation' },
  { id: 14, Time: '2026-08-20 07:15 PM', 'Patient Name': 'Suresh Reddy', Doctor: 'Dr. Priya Nair', Status: 'Scheduled' },
  { id: 15, Time: '2026-08-20 08:00 PM', 'Patient Name': 'Pooja Deshmukh', Doctor: 'Dr. Priya Nair', Status: 'Scheduled' }
]} />;
const PatientHistory = () => <GenericPage title="Patient History" description="EMR history and past diagnoses." cols={['Date', 'Patient Name', 'Doctor', 'Diagnosis', 'Notes']} apiEndpoint="/api/v1/doctor/patient-history" defaultData={[
  { id: 1, Date: '2026-08-13 09:30 AM', 'Patient Name': 'Aarav Kumar', Doctor: 'Dr. Madhavan', Diagnosis: 'Hypertension Stage 1', Notes: 'Prescribed Telmisartan 40mg once daily.' },
  { id: 2, Date: '2026-08-14 10:00 AM', 'Patient Name': 'Rajesh Patel', Doctor: 'Dr. S. Karthikeyan', Diagnosis: 'Chronic Migraine', Notes: 'MRI Brain clear.' }
]} />;
const Diagnosis = () => <GenericPage title="Diagnosis" description="Record clinical findings and ICD codes." cols={['Patient', 'Doctor', 'ICD Code', 'Description', 'Severity', 'Status']} apiEndpoint="/api/v1/doctor/diagnosis" defaultData={[
  { id: 1, Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', 'ICD Code': 'I10', Description: 'Essential hypertension', Severity: 'Moderate', Status: 'In Consultation' },
  { id: 2, Patient: 'Rajesh Patel', Doctor: 'Dr. S. Karthikeyan', 'ICD Code': 'G43.9', Description: 'Migraine, unspecified', Severity: 'Moderate', Status: 'In Consultation' }
]} />;
const Prescription = () => <GenericPage title="Prescription" description="Write and manage patient prescriptions with tablet selection." cols={['Patient', 'Doctor', 'Medicines', 'Duration', 'Date']} apiEndpoint="/api/v1/doctor/prescriptions" defaultData={[
  { id: 1, Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', Medicines: 'Telmisartan 40mg, Paracetamol 650mg', Duration: '5 Days', Date: '2026-08-13 10:45 AM' },
  { id: 2, Patient: 'Rajesh Patel', Doctor: 'Dr. S. Karthikeyan', Medicines: 'Naproxen 250mg, Omeprazole 20mg', Duration: '7 Days', Date: '2026-08-14 11:30 AM' }
]} />;
const LabTestRequest = () => <GenericPage title="Lab Test Request" description="Request diagnostic blood tests and imaging." cols={['Patient', 'Doctor', 'Test Name', 'Priority', 'Status']} apiEndpoint="/api/v1/doctor/lab-test-request" defaultData={[
  { id: 1, Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', 'Test Name': 'CBC Blood Profile & Lipid', Priority: 'Normal', Status: 'Requested' },
  { id: 2, Patient: 'Rajesh Patel', Doctor: 'Dr. S. Karthikeyan', 'Test Name': 'EEG & Brain MRI Scan', Priority: 'High', Status: 'Requested' }
]} />;
const FollowupSchedule = () => <GenericPage title="Follow-up Schedule" description="Schedule chronic care review dates." cols={['Patient', 'Doctor', 'Next Visit Date', 'Reason', 'Status']} apiEndpoint="/api/v1/doctor/follow-up" defaultData={[
  { id: 1, Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', 'Next Visit Date': '2026-08-27 11:00 AM', Reason: 'BP Re-assessment', Status: 'Scheduled' },
  { id: 2, Patient: 'Rajesh Patel', Doctor: 'Dr. S. Karthikeyan', 'Next Visit Date': '2026-08-28 02:00 PM', Reason: 'Migraine Review', Status: 'Scheduled' }
]} />;

// 4. Nurse
const PatientVitals = () => <GenericPage title="Patient Vitals" description="Record BP, Heart Rate, Temperature, Pain Scale (0-10), RBS, and SpO2 with verified nurse attribution." cols={['Patient', 'BP', 'Heart Rate', 'Temp', 'Pain Scale', 'RBS', 'SpO2', 'Recorded By', 'Recorded At']} apiEndpoint="/api/v1/nurse/patient-vitals" defaultData={[{ id: 1, Patient: 'Aarav Kumar', BP: '120/80 mmHg', 'Heart Rate': '72 bpm', Temp: '98.6 °F', 'Pain Scale': '2/10 (Mild)', RBS: '110 mg/dL', SpO2: '98%', 'Recorded By': 'Selvi. V. Mary', 'Recorded At': '2026-08-20 09:00 AM' }]} />;
const WardManagement = () => <GenericPage title="Ward Management" description="Monitor bed occupancy across wards." cols={['Ward Name', 'Total Beds', 'Occupied', 'Nurse In-charge']} apiEndpoint="/api/v1/nurse/ward-management" defaultData={[{ id: 1, 'Ward Name': 'ICU Block A', 'Total Beds': '10 Beds', Occupied: '8 Occupied', 'Nurse In-charge': 'Selvi. V. Mary' }]} />;
const MedicationAdmin = () => <GenericPage title="Medication Administration" description="Schedule and verify bedside doses." cols={['Patient', 'Medicine', 'Dosage', 'Administered By', 'Time']} apiEndpoint="/api/v1/nurse/medication-admin" defaultData={[{ id: 1, Patient: 'Siddharth Roy', Medicine: 'IV Ceftriaxone 1g', Dosage: '1 Vial', 'Administered By': 'Selvi. V. Mary', Time: '2026-08-20 08:00 AM' }]} />;
const NursingNotes = () => <GenericPage title="Nursing Notes" description="Daily nursing observation logs." cols={['Patient', 'Notes', 'Added By', 'Date']} apiEndpoint="/api/v1/nurse/nursing-notes" defaultData={[{ id: 1, Patient: 'Siddharth Roy', Notes: 'Patient reports mild incision pain. Vitals stable.', 'Added By': 'Selvi. V. Mary', Date: '2026-08-20 08:30 AM' }]} />;

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
const ConsultationCharges = () => <GenericPage title="Consultation Charges" description="Manage OP consultation fees breakdown." cols={['Patient', 'Doctor', 'Amount', 'Date', 'Status']} apiEndpoint="/api/v1/billing/consultation-charges" defaultData={[{ id: 1, Patient: 'Aarav Kumar', Doctor: 'Dr. Madhavan', Amount: '$50.00', Date: '2026-08-20 10:30 AM', Status: 'Paid' }]} />;
const LabCharges = () => <GenericPage title="Lab Charges" description="Manage diagnostic charges breakdown." cols={['Patient', 'Test Name', 'Amount', 'Status']} apiEndpoint="/api/v1/billing/lab-charges" defaultData={[{ id: 1, Patient: 'Aarav Kumar', 'Test Name': 'CBC Blood Profile', Amount: '$35.00', Status: 'Paid' }]} />;
const PharmacyCharges = () => <GenericPage title="Pharmacy Charges" description="Medicine charges breakdown." cols={['Patient', 'Bill ID', 'Amount', 'Date', 'Status']} apiEndpoint="/api/v1/billing/pharmacy-charges" defaultData={[{ id: 1, Patient: 'Aarav Kumar', 'Bill ID': 'PH-901', Amount: '$24.50', Date: '2026-08-20 11:00 AM', Status: 'Paid' }]} />;
const RoomCharges = () => <GenericPage title="Room Charges" description="IPD room and bed charges breakdown." cols={['Patient', 'Days Stayed', 'Total Amount', 'Status']} apiEndpoint="/api/v1/billing/room-charges" defaultData={[{ id: 1, Patient: 'Siddharth Roy', 'Days Stayed': '2 Days', 'Total Amount': '$400.00', Status: 'Pending' }]} />;
const PaymentGateway = () => <GenericPage title="Payment Gateway" description="Online transaction logs." cols={['Transaction ID', 'Patient', 'Amount', 'Method', 'Status']} apiEndpoint="/api/v1/billing/payment-gateway" defaultData={[{ id: 1, 'Transaction ID': 'TXN-9901', Patient: 'Aarav Kumar', Amount: '$109.50', Method: 'Credit Card', Status: 'Completed' }]} />;
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
      'Consultation Charge': '$50.00', 
      'Lab Charge': '$35.00', 
      'Pharmacy Charge': '$24.50', 
      Total: '$109.50', 
      'Total Amount': '$109.50', 
      Date: '2026-08-20 11:30 AM', 
      Status: 'Paid',
      'Payment Mode': 'UPI / Online Desk'
    },
    { 
      id: 2, 
      'Invoice ID': 'INV-2026-02', 
      Name: 'Rajesh Patel', 
      Patient: 'Rajesh Patel', 
      'Consultation Charge': '$60.00', 
      'Lab Charge': '$85.00', 
      'Pharmacy Charge': '$35.00', 
      Total: '$180.00', 
      'Total Amount': '$180.00', 
      Date: '2026-08-20 12:45 PM', 
      Status: 'Paid',
      'Payment Mode': 'Credit Card'
    },
    { 
      id: 3, 
      'Invoice ID': 'INV-2026-03', 
      Name: 'Siddharth Roy', 
      Patient: 'Siddharth Roy', 
      'Consultation Charge': '$75.00', 
      'Lab Charge': '$120.00', 
      'Pharmacy Charge': '$65.00', 
      Total: '$260.00', 
      'Total Amount': '$260.00', 
      Date: '2026-08-20 02:15 PM', 
      Status: 'Pending',
      'Payment Mode': 'Cash Desk'
    }
  ]} 
/>;

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
          
          {/* 3. Doctor */}
          <Route path="/doctor/appointments" element={<ProtectedRoute user={user} path="/doctor/appointments"><ViewAppointments /></ProtectedRoute>} />
          <Route path="/doctor/patient-history" element={<ProtectedRoute user={user} path="/doctor/patient-history"><PatientHistory /></ProtectedRoute>} />
          <Route path="/doctor/diagnosis" element={<ProtectedRoute user={user} path="/doctor/diagnosis"><Diagnosis /></ProtectedRoute>} />
          <Route path="/doctor/prescription" element={<ProtectedRoute user={user} path="/doctor/prescription"><Prescription /></ProtectedRoute>} />
          <Route path="/doctor/lab-test-request" element={<ProtectedRoute user={user} path="/doctor/lab-test-request"><LabTestRequest /></ProtectedRoute>} />
          <Route path="/doctor/follow-up" element={<ProtectedRoute user={user} path="/doctor/follow-up"><FollowupSchedule /></ProtectedRoute>} />
          
          {/* 4. Nurse */}
          <Route path="/nurse/patient-vitals" element={<ProtectedRoute user={user} path="/nurse/patient-vitals"><PatientVitals /></ProtectedRoute>} />
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

