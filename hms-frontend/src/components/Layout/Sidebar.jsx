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
    color: 'text-emerald-400',
    submodules: [
      { title: 'Dashboard', path: '/admin/dashboard' },
      { title: 'User Management', path: '/admin/users' },
      { title: 'RBAC Matrix', path: '/admin/rbac' },
      { title: 'Doctor Management', path: '/admin/doctors' },
      { title: 'Department Management', path: '/admin/departments' },
      { title: 'Staff Management', path: '/admin/staff' },
      { title: 'Clinical Masters', path: '/admin/masters' },
      { title: 'Lab Test Master', path: '/admin/lab-masters' },
      { title: 'Pharmacy Master', path: '/admin/pharmacy-masters' },
      { title: 'Wards & Bed Map', path: '/admin/wards-beds' },
      { title: 'Pricing Catalog', path: '/admin/pricing' },
      { title: 'System Health', path: '/admin/health' },
      { title: 'Audit Logs', path: '/admin/audit' },
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
      { title: 'Billing & Payments', path: '/reception/billing-payments' },
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
      { title: 'Received Lab Reports', path: '/doctor/lab-reports' },
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
    // When in admin panel or when role is admin, show strictly and ONLY the Admin module
    if (r === 'admin' || r.includes('admin') || location.pathname.startsWith('/admin')) {
      return MODULES.filter(m => m.id === 'admin');
    }
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
  }, [activeRole, location.pathname]);

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
    <aside className="w-72 bg-[#052E24] border-r border-[#07543F] h-full flex flex-col shadow-xl text-white relative z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-[#07543F] shrink-0 justify-between bg-[#04241c]">
        <h1 className="text-lg font-black text-white flex items-center tracking-tight">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#087F5B] to-[#12B886] rounded-xl flex items-center justify-center mr-3 text-white shadow-md shadow-[#052E24]/50">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-white">
            HMS Portal
          </span>
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DDEFE5] text-[#052E24] shadow-sm">
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
                    ? 'bg-[#07543F] text-white shadow-sm' 
                    : 'text-[#A3BFB5] hover:bg-[#07543F]/50 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <div className={`p-1.5 rounded-xl mr-2.5 ${isActive ? 'bg-[#087F5B] text-white' : 'bg-transparent text-[#12B886]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="tracking-tight">{module.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-[#12B886] transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#A3BFB5] transition-transform" />
                )}
              </button>
              
              {isOpen && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-[#07543F] py-1.5 space-y-1">
                  {module.submodules.map((sub) => (
                    <NavLink 
                      key={sub.path}
                      to={sub.path} 
                      className={({ isActive: isSubActive }) => 
                        `flex items-center px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                          isSubActive 
                            ? 'bg-white text-[#052E24] shadow-md translate-x-1' 
                            : 'text-[#DDEFE5]/80 hover:bg-[#07543F]/40 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive: isSubActive }) => (
                        <>
                          <Circle className={`w-1.5 h-1.5 mr-2.5 transition-all ${
                            isSubActive 
                              ? 'fill-[#087F5B] text-[#087F5B] scale-125' 
                              : 'fill-[#12B886]/50 text-[#12B886]/50'
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
      <div className="p-3.5 border-t border-[#07543F] shrink-0 bg-[#04241c]">
        <NavLink
          to="/login"
          className="flex items-center justify-center w-full px-4 py-2.5 bg-[#07543F]/60 hover:bg-[#07543F] text-white font-bold text-xs rounded-xl border border-[#087F5B]/30 shadow-sm transition-all"
        >
          <LogOut className="w-4 h-4 mr-2 text-rose-300" />
          Switch Account / Login
        </NavLink>
      </div>
    </aside>
  );
}
