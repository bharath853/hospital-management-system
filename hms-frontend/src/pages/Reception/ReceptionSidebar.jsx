import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, List, Activity, CreditCard, LogOut, FileText } from 'lucide-react';

const ReceptionSidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      navigate("/");
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/reception/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Patient Registration', path: '/reception/patient-registration', icon: <Users size={20} /> },
    { name: 'Appointment Booking', path: '/reception/appointment-booking', icon: <Calendar size={20} /> },
    { name: 'Queue Management', path: '/reception/queue-management', icon: <List size={20} /> },
    { name: 'OP/IP Registration', path: '/reception/op-ip-registration', icon: <Activity size={20} /> },
    { name: 'Billing & Payments', path: '/reception/billing', icon: <CreditCard size={20} /> },
    { name: 'Daily Collection', path: '/reception/daily-collection', icon: <FileText size={20} /> },
  ];

  return (
    <aside className="w-64 h-screen bg-[#052E24] text-white flex flex-col fixed left-0 top-0 shadow-xl overflow-y-auto z-10 font-sans">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold tracking-wider flex items-center gap-2">
          <span className="text-[#12B886] text-3xl">+</span> MEDICARE
        </h1>
        <p className="text-sm text-gray-300 mt-1 opacity-80">Front Desk Portal</p>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-gradient-to-r from-[#087F5B] to-[#12B886] shadow-lg shadow-[#087F5B]/30' 
                  : 'hover:bg-white/5 hover:translate-x-1 text-gray-300 hover:text-white'
              }`
            }
          >
            <span className="opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default ReceptionSidebar;
