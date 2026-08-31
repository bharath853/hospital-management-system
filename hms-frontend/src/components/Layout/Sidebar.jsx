import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  UserPlus, 
  Stethoscope, 
  HeartPulse, 
  FlaskConical, 
  Pill, 
  BedDouble, 
  Receipt, 
  MonitorSmartphone,
  ChevronDown,
  ChevronRight,
  Circle,
  LogOut
} from 'lucide-react';

const MODULES = [
  {
    id: 'admin',
    title: 'Admin',
    icon: ShieldCheck,
    color: 'text-sky-400',
    submodules: [
      { title: 'Dashboard', path: '/admin/dashboard' },
      { title: 'User Management', path: '/admin/users' },
      { title: 'Doctor Management', path: '/admin/doctors' },
      { title: 'Department Management', path: '/admin/departments' },
      { title: 'Staff Management', path: '/admin/staff' },
      { title: 'Reports & Analytics', path: '/admin/reports' },
      { title: 'System Settings', path: '/admin/settings' },
      { title: 'Deleted Records Log', path: '/admin/deleted-records' },
    ]
  },
  {
    id: 'reception',
    title: 'Reception',
    icon: UserPlus,
    color: 'text-teal-300',
    submodules: [
      { title: 'Patient Registration', path: '/reception/patient-registration' },
      { title: 'Appointment Booking', path: '/reception/appointment-booking' },
      { title: 'Queue Management', path: '/reception/queue-management' },
      { title: 'OP/IP Registration', path: '/reception/op-ip-registration' },
    ]
  },
  {
    id: 'doctor',
    title: 'Doctor',
    icon: Stethoscope,
    color: 'text-emerald-400',
    submodules: [
      { title: 'View Appointments', path: '/doctor/appointments' },
      { title: 'Patient History', path: '/doctor/patient-history' },
      { title: 'Diagnosis', path: '/doctor/diagnosis' },
      { title: 'Prescription', path: '/doctor/prescription' },
      { title: 'Lab Test Request', path: '/doctor/lab-test-request' },
      { title: 'Follow-up Schedule', path: '/doctor/follow-up' },
    ]
  },
  {
    id: 'nurse',
    title: 'Nurse',
    icon: HeartPulse,
    color: 'text-amber-400',
    submodules: [
      { title: 'Patient Vitals', path: '/nurse/patient-vitals' },
      { title: 'Ward Management', path: '/nurse/ward-management' },
      { title: 'Medication Admin', path: '/nurse/medication-admin' },
      { title: 'Nursing Notes', path: '/nurse/nursing-notes' },
    ]
  },
  {
    id: 'laboratory',
    title: 'Laboratory',
    icon: FlaskConical,
    color: 'text-teal-300',
    submodules: [
      { title: 'Lab Sections & Shifts', path: '/laboratory/sections' },
      { title: 'Test Request', path: '/laboratory/test-request' },
      { title: 'Sample Collection', path: '/laboratory/sample-collection' },
      { title: 'Report Entry', path: '/laboratory/report-entry' },
      { title: 'Report Upload', path: '/laboratory/report-upload' },
      { title: 'LIMS Station Login', path: '/laboratory/login' },
    ]
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    icon: Pill,
    color: 'text-emerald-300',
    submodules: [
      { title: 'Medicine Inventory', path: '/pharmacy/medicine-inventory' },
      { title: 'Prescription Processing', path: '/pharmacy/prescription-processing' },
      { title: 'Medicine Billing', path: '/pharmacy/medicine-billing' },
      { title: 'Stock Alerts', path: '/pharmacy/stock-alerts' },
    ]
  },
  {
    id: 'inpatient',
    title: 'Inpatient (IP)',
    icon: BedDouble,
    color: 'text-rose-400',
    submodules: [
      { title: 'Room Allocation', path: '/inpatient/room-allocation' },
      { title: 'Admission', path: '/inpatient/admission' },
      { title: 'Treatment Records', path: '/inpatient/treatment-records' },
      { title: 'Daily Progress', path: '/inpatient/daily-progress' },
      { title: 'Discharge Summary', path: '/inpatient/discharge-summary' },
    ]
  },
  {
    id: 'billing',
    title: 'Billing',
    icon: Receipt,
    color: 'text-cyan-400',
    submodules: [
      { title: 'Consultation Charges', path: '/billing/consultation-charges' },
      { title: 'Lab Charges', path: '/billing/lab-charges' },
      { title: 'Pharmacy Charges', path: '/billing/pharmacy-charges' },
      { title: 'Room Charges', path: '/billing/room-charges' },
      { title: 'Payment Gateway', path: '/billing/payment-gateway' },
      { title: 'Invoice Generation', path: '/billing/invoice-generation' },
    ]
  },
  {
    id: 'portal',
    title: 'Patient Portal',
    icon: MonitorSmartphone,
    color: 'text-indigo-300',
    submodules: [
      { title: 'Login', path: '/portal/login' },
      { title: 'Book Appointment', path: '/portal/book-appointment' },
      { title: 'View Prescriptions', path: '/portal/view-prescriptions' },
      { title: 'Download Lab Reports', path: '/portal/download-reports' },
      { title: 'Online Payment', path: '/portal/online-payment' },
      { title: 'Medical History', path: '/portal/medical-history' },
    ]
  }
];

export default function Sidebar({ isOpenMobile, onCloseMobile, userRole: userRoleProp }) {
  const location = useLocation();
  const activeRole = useMemo(() => {
    if (userRoleProp) return userRoleProp;
    try {
      const savedUserStr = localStorage.getItem('hms_user');
      if (!savedUserStr) return 'admin';
      const parsed = JSON.parse(savedUserStr);
      return parsed?.role || 'admin';
    } catch (e) {
      localStorage.removeItem('hms_user');
      return 'admin';
    }
  }, [userRoleProp]);

  const visibleModules = React.useMemo(() => {
    const r = String(activeRole || '').toLowerCase();
    if (r === 'admin' || r.includes('admin')) return MODULES;
    if (r.includes('doctor')) return MODULES.filter(m => m.id === 'doctor');
    if (r.includes('reception')) {
      return MODULES.filter(m => m.id === 'reception' || m.id === 'billing');
    }
    if (r.includes('lab') || r.includes('laboratory')) {
      return MODULES.filter(m => m.id === 'laboratory');
    }
    if (r.includes('nurse')) return MODULES.filter(m => m.id === 'nurse');
    if (r.includes('pharmacy')) return MODULES.filter(m => m.id === 'pharmacy');
    if (r.includes('inpatient')) return MODULES.filter(m => m.id === 'inpatient');
    if (r.includes('portal')) return MODULES.filter(m => m.id === 'portal');
    return MODULES;
  }, [activeRole]);

  const [openModule, setOpenModule] = useState(() => {
    const currentModule = visibleModules.find(m => location.pathname.startsWith(`/${m.id}`));
    return currentModule ? currentModule.id : (visibleModules[0]?.id || 'admin');
  });

  useEffect(() => {
    const currentModule = visibleModules.find(m => location.pathname.startsWith(`/${m.id}`));
    if (currentModule) {
      setOpenModule(currentModule.id);
    } else if (visibleModules.length > 0 && !visibleModules.some(m => m.id === openModule)) {
      setOpenModule(visibleModules[0].id);
    }
  }, [location.pathname, visibleModules]);

  const toggleModule = (id) => {
    setOpenModule(openModule === id ? null : id);
  };

  return (
    <aside className="w-72 bg-[#021d17]/85 backdrop-blur-2xl border-r border-emerald-500/20 h-full flex flex-col shadow-2xl text-slate-100 relative z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-emerald-500/20 shrink-0 justify-between bg-[#011712]/50">
        <h1 className="text-lg font-black text-white flex items-center tracking-tight">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-xl flex items-center justify-center mr-3 text-slate-950 shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-300/40">
            <ShieldCheck className="w-5 h-5 text-slate-950" />
          </div>
          <span className="bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
            HMS Portal
          </span>
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shadow-inner">
          {activeRole}
        </span>
      </div>
      
      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3.5 space-y-1.5 scrollbar-thin">
        {visibleModules.map((module) => {
          const isOpen = openModule === module.id;
          const isActive = location.pathname.startsWith(`/${module.id}`);
          const Icon = module.icon;
          
          return (
            <div key={module.id} className="mb-1">
              <button 
                onClick={() => toggleModule(module.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-2xl transition-all duration-200 ${
                  isActive || isOpen
                    ? 'bg-emerald-500/15 text-white border border-emerald-500/30 shadow-md shadow-black/20' 
                    : 'text-emerald-100/70 hover:bg-emerald-500/10 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center">
                  <div className={`p-1.5 rounded-xl mr-2.5 ${isActive ? 'bg-emerald-500/20' : 'bg-transparent'}`}>
                    <Icon className={`w-4 h-4 ${module.color}`} />
                  </div>
                  <span className="tracking-tight">{module.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-emerald-400/80 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-emerald-400/50 transition-transform" />
                )}
              </button>
              
              {isOpen && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-emerald-500/20 py-1.5 space-y-1">
                  {module.submodules.map((sub) => (
                    <NavLink 
                      key={sub.path}
                      to={sub.path} 
                      className={({ isActive: isSubActive }) => 
                        `flex items-center px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                          isSubActive 
                            ? 'bg-white text-emerald-950 shadow-lg shadow-black/40 translate-x-1' 
                            : 'text-emerald-200/70 hover:bg-emerald-500/15 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive: isSubActive }) => (
                        <>
                          <Circle className={`w-1.5 h-1.5 mr-2.5 transition-all ${
                            isSubActive 
                              ? 'fill-emerald-800 text-emerald-800 scale-125' 
                              : 'fill-emerald-500/40 text-emerald-500/40'
                          }`} />
                          <span className="truncate">{sub.title}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Switch Account Link */}
      <div className="p-3.5 border-t border-emerald-500/20 shrink-0 bg-[#011712]/60">
        <NavLink
          to="/login"
          className="flex items-center justify-center w-full px-4 py-2.5 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-200 hover:text-white font-bold text-xs rounded-xl border border-emerald-500/30 shadow-md shadow-black/30 transition-all"
        >
          <LogOut className="w-4 h-4 mr-2 text-rose-400" />
          Switch Account / Login
        </NavLink>
      </div>
    </aside>
  );
}
