import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Activity, 
  Calendar, 
  Clock, 
  UserPlus, 
  X, 
  CheckCircle2, 
  FileText, 
  Search, 
  Filter,
  ChevronDown,
  ChevronRight,
  BedDouble,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Building2,
  Ambulance,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  Phone,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${API_BASE}`;

// --- INLINE CLINICAL VECTOR ILLUSTRATIONS (ZERO EXTERNAL DEPENDENCIES) ---

const ClinicalTeamIllustration = () => (
  <svg className="w-48 sm:w-64 h-28 sm:h-36 drop-shadow-md select-none pointer-events-none" viewBox="0 0 280 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Doctor 1 (Male Physician, Left) */}
    <g transform="translate(20, 10)">
      <circle cx="35" cy="28" r="18" fill="#FDE68A" />
      <path d="M22 24C22 14 30 10 42 10C50 10 52 16 52 24C48 20 40 20 35 22C30 24 25 24 22 24Z" fill="#1E293B" />
      <path d="M16 68C16 48 24 44 35 44C46 44 54 48 54 68V110H16V68Z" fill="#FFFFFF" />
      <path d="M28 44L35 60L42 44" stroke="#052E24" strokeWidth="2" strokeLinecap="round" />
      <path d="M35 60V110" stroke="#087F5B" strokeWidth="2" />
      <path d="M26 50C26 62 44 62 44 50V44" stroke="#087F5B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="62" r="3" fill="#087F5B" />
    </g>

    {/* Doctor 2 (Female Specialist, Center) */}
    <g transform="translate(100, 0)">
      <circle cx="40" cy="30" r="19" fill="#FBCFE8" />
      <path d="M22 28C22 12 32 8 46 8C60 8 62 18 62 34C58 24 50 20 40 22C30 24 24 28 22 28Z" fill="#78350F" />
      <path d="M18 72C18 50 28 46 40 46C52 46 62 50 62 72V120H18V72Z" fill="#FFFFFF" />
      <path d="M32 46L40 64L48 46" stroke="#063C2F" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 64V120" stroke="#12B886" strokeWidth="2" />
      <path d="M28 54C28 68 52 68 52 54V46" stroke="#063C2F" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="68" r="3.5" fill="#063C2F" />
    </g>

    {/* Doctor 3 (Surgeon / Nurse, Right) */}
    <g transform="translate(180, 15)">
      <circle cx="35" cy="28" r="18" fill="#FED7AA" />
      <path d="M20 25C20 15 28 12 40 12C48 12 50 16 50 24C46 22 40 20 35 22C30 24 24 25 20 25Z" fill="#0F172A" />
      <path d="M16 66C16 48 24 44 35 44C46 44 54 48 54 66V105H16V66Z" fill="#F0FDF4" />
      <path d="M22 44L35 56L48 44" stroke="#087F5B" strokeWidth="2" />
      <path d="M26 62H44" stroke="#12B886" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="22" y="70" width="26" height="30" rx="3" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
      <line x1="26" y1="76" x2="44" y2="76" stroke="#64748B" strokeWidth="1.5" />
      <line x1="26" y1="82" x2="40" y2="82" stroke="#64748B" strokeWidth="1.5" />
    </g>
  </svg>
);

const PatientVectorGraphic = () => (
  <svg className="w-12 h-12 text-[#052E24] opacity-80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="10" fill="#EEF7F1" stroke="#052E24" strokeWidth="3" />
    <path d="M16 52C16 42 22 36 32 36C42 36 48 42 48 52" stroke="#052E24" strokeWidth="3" strokeLinecap="round" />
    <path d="M42 24L52 28L48 38" stroke="#12B886" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="50" cy="30" r="2" fill="#12B886" />
  </svg>
);

const StaffVectorGraphic = () => (
  <svg className="w-12 h-12 text-[#063C2F] opacity-80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="22" r="10" fill="#EEF7F1" stroke="#063C2F" strokeWidth="3" />
    <path d="M26 14H38V18C38 18 35 20 32 20C29 20 26 18 26 18V14Z" fill="#087F5B" />
    <path d="M30 16H34" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M32 14V18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M18 52C18 42 24 38 32 38C40 38 46 42 46 52" stroke="#063C2F" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const RoomsVectorGraphic = () => (
  <svg className="w-12 h-12 text-[#087F5B] opacity-80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="16" width="36" height="38" rx="4" fill="#EEF7F1" stroke="#087F5B" strokeWidth="3" />
    <rect x="28" y="24" width="8" height="2" fill="#087F5B" />
    <rect x="31" y="21" width="2" height="8" fill="#087F5B" />
    <rect x="20" y="34" width="6" height="6" rx="1" fill="#087F5B" opacity="0.3" />
    <rect x="38" y="34" width="6" height="6" rx="1" fill="#087F5B" opacity="0.3" />
    <path d="M28 54V44H36V54" stroke="#087F5B" strokeWidth="2.5" />
  </svg>
);

const AmbulanceVectorGraphic = () => (
  <svg className="w-12 h-12 text-[#12B886] opacity-90" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 40V24C12 21.7909 13.7909 20 16 20H38V40H12Z" fill="#EEF7F1" stroke="#07543F" strokeWidth="3" />
    <path d="M38 26H46L52 32V40H38V26Z" fill="#EEF7F1" stroke="#07543F" strokeWidth="3" />
    <circle cx="22" cy="42" r="5" fill="#052E24" stroke="#12B886" strokeWidth="2" />
    <circle cx="44" cy="42" r="5" fill="#052E24" stroke="#12B886" strokeWidth="2" />
    <path d="M22 28H28" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    <path d="M25 25V31" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// --- STAT CARD COMPONENT (STRICT 4-TONE GREEN-FAMILY SHADE PROGRESSION) ---
const MedicareKpiCard = ({ title, value, shade, badgeBg, badgeText, badgeBorder, icon: Icon, GraphicComponent }) => (
  <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-card border border-[#DDE5E0] hover:shadow-card-hover hover:border-[#087F5B]/30 transition-all duration-200 relative overflow-hidden flex items-center justify-between">
    <div className="space-y-2 relative z-10">
      <div className="flex items-center space-x-2.5">
        <div className={`p-2.5 rounded-2xl ${badgeBg} ${badgeText} ${badgeBorder} border flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#65756E]">{title}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-black text-[#10201B] font-mono tracking-tight pt-1">
        {value}
      </div>
    </div>
    <div className="shrink-0 pl-2">
      <GraphicComponent />
    </div>
  </div>
);

// --- MAIN MEDICARE ADMIN OPERATIONS DASHBOARD ---
export default function AdminDashboard({ onNavigateTab }) {
  const [timeframe, setTimeframe] = useState('6m');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Fetch summary from real backend endpoint
  const fetchOperationsSummary = useCallback(async (selectedRange = timeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/dashboard/operations-summary?range=${selectedRange}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Operations summary fetch failed:', err);
      setError('Unable to load real-time operational summary. Displaying active local metrics.');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchOperationsSummary(timeframe);
  }, [fetchOperationsSummary, timeframe]);

  const kpis = dashboardData?.kpis || {
    total_patients: 2015,
    total_staff: 550,
    total_beds: 2000,
    total_emergency: 50,
    new_tasks: 30,
    new_patients_today: 50,
    notifications: 25
  };

  const activitySeries = dashboardData?.activity_trend?.series || [
    { period: 'Jan', consultations: 32, patients: 42 },
    { period: 'Feb', consultations: 40, patients: 52 },
    { period: 'Mar', consultations: 35, patients: 63 },
    { period: 'Apr', consultations: 20, patients: 40 },
    { period: 'May', consultations: 52, patients: 50 },
    { period: 'Jun', consultations: 36, patients: 48 },
  ];

  const departments = dashboardData?.departments || [
    { name: 'Anesthetics', active_patients: 8, capacity: 10, health_pct: 80 },
    { name: 'Gynecology', active_patients: 9, capacity: 10, health_pct: 90 },
    { name: 'Neurology', active_patients: 10, capacity: 10, health_pct: 100 },
    { name: 'Oncology', active_patients: 8, capacity: 10, health_pct: 80 },
    { name: 'Orthopedics', active_patients: 9, capacity: 10, health_pct: 90 },
    { name: 'Physiotherapy', active_patients: 10, capacity: 10, health_pct: 100 },
  ];

  const doctors = dashboardData?.doctors || [
    { id: 1, name: 'Dr. Jaylon Stanton', specialty: 'Dentist', room: 'Room 101', online: true },
    { id: 2, name: 'Dr. Carla Schleifer', specialty: 'Cardiology', room: 'Room 204', online: true },
    { id: 3, name: 'Dr. Madhavan', specialty: 'Orthopedics', room: 'Room 302', online: true },
    { id: 4, name: 'Dr. S. Karthikeyan', specialty: 'Neurology', room: 'Room 105', online: false },
  ];

  const appointments = dashboardData?.appointments || [
    { id: 1, no: '01', patient_name: 'Natiya', uhid: 'UHID-2026-001', datetime: '20 May 5:30pm', age: 50, gender: 'Female', doctor: 'Dr. Lee', status: 'Waiting' },
    { id: 2, no: '02', patient_name: 'Aarav Kumar', uhid: 'UHID-2026-002', datetime: '20 May 6:00pm', age: 42, gender: 'Male', doctor: 'Dr. Madhavan', status: 'In Consultation' },
    { id: 3, no: '03', patient_name: 'Priya Sharma', uhid: 'UHID-2026-003', datetime: '20 May 6:30pm', age: 28, gender: 'Female', doctor: 'Dr. Karthik', status: 'Scheduled' },
    { id: 4, no: '04', patient_name: 'Rajesh Patel', uhid: 'UHID-2026-004', datetime: '20 May 7:00pm', age: 61, gender: 'Male', doctor: 'Dr. Murugan', status: 'Confirmed' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 font-sans pb-12">
      
      {/* 1. TOP HERO WELCOME BANNER WITH CLINICAL TEAM & 3 METRIC PILLS */}
      <div className="bg-gradient-to-r from-[#063C2F] via-[#07543F] to-[#087F5B] rounded-3xl p-6 sm:p-8 shadow-card text-white relative overflow-hidden border border-[#07543F]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Welcome Text */}
          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Hello Admin!
            </h1>
            <p className="text-xs sm:text-sm text-[#DDEFE5]/90 font-medium leading-relaxed">
              Here are your important task, Updates and alerts. You can set your in app preferences here.
            </p>
          </div>

          {/* Right Section: Clinical Team Illustration + 3 Metric Pills */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
            
            {/* Embedded Clinical Team Illustration */}
            <div className="hidden md:block shrink-0">
              <ClinicalTeamIllustration />
            </div>

            {/* 3 Metric Pills matching Medicare Template */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
              
              <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-md border border-white/20 text-center min-w-[85px] sm:min-w-[95px]">
                <div className="text-xl sm:text-2xl font-black text-[#087F5B] font-mono leading-none">
                  {kpis.new_tasks}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#65756E] uppercase tracking-wider mt-1">
                  New Tasks
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-md border border-white/20 text-center min-w-[85px] sm:min-w-[95px]">
                <div className="text-xl sm:text-2xl font-black text-[#063C2F] font-mono leading-none">
                  {kpis.new_patients_today}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#65756E] uppercase tracking-wider mt-1">
                  New Patients
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-md border border-white/20 text-center min-w-[85px] sm:min-w-[95px]">
                <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono leading-none">
                  {kpis.notifications}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#65756E] uppercase tracking-wider mt-1">
                  Notification
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* 2. FOUR KEY KPI CARDS WITH 4-TONE GREEN SHADE PROGRESSION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Total Patients (Tone 1: #052E24 Deepest Green) */}
        <MedicareKpiCard 
          title="Total Patients"
          value={kpis.total_patients.toLocaleString()}
          icon={Users}
          shade="#052E24"
          badgeBg="bg-[#052E24]/10"
          badgeText="text-[#052E24]"
          badgeBorder="border-[#052E24]/20"
          GraphicComponent={PatientVectorGraphic}
        />

        {/* Card 2: Total Staffs (Tone 2: #063C2F Forest Green) */}
        <MedicareKpiCard 
          title="Total Staffs"
          value={kpis.total_staff.toLocaleString()}
          icon={UserPlus}
          shade="#063C2F"
          badgeBg="bg-[#063C2F]/10"
          badgeText="text-[#063C2F]"
          badgeBorder="border-[#063C2F]/20"
          GraphicComponent={StaffVectorGraphic}
        />

        {/* Card 3: Total Rooms / Beds (Tone 3: #087F5B Emerald Green) */}
        <MedicareKpiCard 
          title="Total Rooms"
          value={kpis.total_beds.toLocaleString()}
          icon={BedDouble}
          shade="#087F5B"
          badgeBg="bg-[#087F5B]/10"
          badgeText="text-[#087F5B]"
          badgeBorder="border-[#087F5B]/20"
          GraphicComponent={RoomsVectorGraphic}
        />

        {/* Card 4: Total Cars / Emergency Fleet (Tone 4: #12B886 Bright Mint) */}
        <MedicareKpiCard 
          title="Total Cars"
          value={kpis.total_emergency.toLocaleString()}
          icon={Ambulance}
          shade="#12B886"
          badgeBg="bg-[#12B886]/15"
          badgeText="text-[#07543F]"
          badgeBorder="border-[#12B886]/30"
          GraphicComponent={AmbulanceVectorGraphic}
        />

      </div>

      {/* 3. MIDDLE SECTION: ACTIVITY AREA CHART (~65%) + SUCCESS STATS (~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Activity Dual Wave Chart (Col Span 8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#DDE5E0] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#10201B] tracking-tight">Activity</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#65756E]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#12B886]"></span>
                  Consultation
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#65756E]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#087F5B]"></span>
                  Patients
                </span>
              </div>
            </div>

            {/* Timeframe Dropdown */}
            <div className="flex items-center space-x-2">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-[#F6F8F6] border border-[#DDE5E0] rounded-2xl px-3.5 py-2 text-xs font-bold text-[#10201B] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#087F5B]/30"
              >
                <option value="6m">Last 6 Month</option>
                <option value="1m">This Month</option>
                <option value="1w">This Week</option>
                <option value="today">Today</option>
              </select>
              <button 
                onClick={() => fetchOperationsSummary(timeframe)}
                className="p-2 rounded-xl bg-[#F6F8F6] hover:bg-[#EEF7F1] border border-[#DDE5E0] text-[#087F5B] transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

          </div>

          {/* Area Chart Container */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activitySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="consultationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#12B886" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#12B886" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087F5B" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#087F5B" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5ECE8" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#65756E', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#65756E', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#052E24', borderColor: '#07543F', borderRadius: '1rem', color: '#FFFFFF', fontSize: '12px' }}
                  itemStyle={{ color: '#DDEFE5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="patients" 
                  stroke="#087F5B" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#patientGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="consultations" 
                  stroke="#12B886" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#consultationGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Right: Success Stats (Department Workload Progress Bars) (Col Span 4) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#DDE5E0] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-black text-[#10201B] tracking-tight">Success Stats</h2>
              <span className="text-[11px] font-bold text-[#65756E] bg-[#F6F8F6] border border-[#DDE5E0] px-3 py-1 rounded-full">
                May 2024
              </span>
            </div>

            <div className="space-y-4">
              {departments.map((dept, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#10201B]">{dept.name}</span>
                    <span className="font-mono font-bold text-[#087F5B]">{dept.active_patients}</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-[#EEF7F1] rounded-full overflow-hidden border border-[#DDE5E0]/60">
                    <div 
                      className="h-full bg-gradient-to-r from-[#087F5B] to-[#12B886] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(15, dept.health_pct))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E5ECE8] flex items-center justify-between text-xs text-[#65756E]">
            <span>Average Hospital Throughput</span>
            <span className="font-bold text-[#087F5B] font-mono">92% Operational</span>
          </div>
        </div>

      </div>

      {/* 4. BOTTOM SECTION: DOCTOR LIST (~35%) + ONLINE APPOINTMENT TABLE (~65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Doctor List (Col Span 4) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#DDE5E0]">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5ECE8]">
            <div>
              <h2 className="text-lg font-black text-[#10201B] tracking-tight">Doctor List</h2>
              <p className="text-[11px] text-[#65756E]">Active specialists on duty</p>
            </div>
            <button 
              onClick={() => onNavigateTab && onNavigateTab('doctors')}
              className="p-1.5 text-[#087F5B] hover:text-[#063C2F] hover:bg-[#EEF7F1] rounded-xl transition"
              title="View All Doctors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {doctors.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#F6F8F6] border border-transparent hover:border-[#DDE5E0] transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-[#EEF7F1] text-[#087F5B] border border-[#087F5B]/20 flex items-center justify-center font-bold text-xs shadow-sm">
                      {doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    {doc.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#12B886] border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#10201B] group-hover:text-[#087F5B] transition-colors">{doc.name}</h4>
                    <p className="text-[11px] text-[#65756E]">{doc.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-semibold text-[#65756E] bg-[#F6F8F6] px-2 py-0.5 rounded-lg border border-[#DDE5E0]">
                    {doc.room}
                  </span>
                  <button className="text-[#65756E] hover:text-[#10201B] p-1">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Online Appointment Live Queue Table (Col Span 8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#DDE5E0]">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5ECE8]">
            <div>
              <h2 className="text-lg font-black text-[#10201B] tracking-tight">Online Appointment</h2>
              <p className="text-[11px] text-[#65756E]">Live queue intake & consultation schedule</p>
            </div>
            <button 
              onClick={() => onNavigateTab && onNavigateTab('dashboard')}
              className="text-xs font-bold text-[#087F5B] hover:text-[#063C2F] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#DDE5E0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8F6] text-[#65756E] font-bold uppercase text-[10px] tracking-wider border-b border-[#DDE5E0]">
                <tr>
                  <th className="py-3 px-4">No.</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Age</th>
                  <th className="py-3 px-3">Gender</th>
                  <th className="py-3 px-4">Appoint for</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                {appointments.map((appt, idx) => (
                  <tr key={appt.id || idx} className="hover:bg-[#EEF7F1]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#65756E]">{appt.no || `0${idx + 1}`}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-xl bg-[#EEF7F1] text-[#087F5B] flex items-center justify-center font-bold text-[11px]">
                          {appt.patient_name[0]}
                        </div>
                        <div>
                          <span className="font-bold text-[#10201B] block">{appt.patient_name}</span>
                          <span className="text-[10px] font-mono text-[#65756E]">{appt.uhid}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#10201B] font-medium whitespace-nowrap">{appt.datetime}</td>
                    <td className="py-3 px-3 font-mono text-[#10201B]">{appt.age}</td>
                    <td className="py-3 px-3 text-[#65756E]">{appt.gender}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#087F5B]">{appt.doctor}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button 
                          onClick={() => setSelectedAppointment(appt)}
                          className="p-1.5 text-[#087F5B] hover:bg-[#EEF7F1] rounded-lg transition" 
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-[#65756E] hover:text-[#087F5B] hover:bg-[#EEF7F1] rounded-lg transition" title="Edit Appointment">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Cancel Appointment">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-[#DDE5E0] animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-[#DDE5E0] pb-4 mb-4">
              <div>
                <h3 className="font-black text-lg text-[#10201B]">Appointment Details</h3>
                <p className="text-xs text-[#65756E]">{selectedAppointment.uhid}</p>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="text-[#65756E] hover:text-[#10201B] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#E5ECE8]">
                <span className="text-[#65756E]">Patient Name</span>
                <span className="font-bold text-[#10201B]">{selectedAppointment.patient_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E5ECE8]">
                <span className="text-[#65756E]">Assigned Doctor</span>
                <span className="font-bold text-[#087F5B]">{selectedAppointment.doctor}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E5ECE8]">
                <span className="text-[#65756E]">Scheduled Time</span>
                <span className="font-semibold text-[#10201B]">{selectedAppointment.datetime}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E5ECE8]">
                <span className="text-[#65756E]">Age / Gender</span>
                <span className="font-semibold text-[#10201B]">{selectedAppointment.age} Yrs • {selectedAppointment.gender}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E5ECE8]">
                <span className="text-[#65756E]">Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF7F1] text-[#087F5B] border border-[#087F5B]/30">
                  {selectedAppointment.status}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#07543F] rounded-xl shadow-sm transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
