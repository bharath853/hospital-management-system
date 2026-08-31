import React, { useState } from 'react';
import { Bell, UserCircle, X, CheckCircle2, Shield, LogOut, Menu } from 'lucide-react';

export default function Header({ onToggleMobileMenu, user: userProp, onLogout }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const user = userProp || (() => {
    try {
      const savedUserStr = localStorage.getItem('hms_user');
      if (!savedUserStr) return null;
      const parsed = JSON.parse(savedUserStr);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      localStorage.removeItem('hms_user');
      return null;
    }
  })() || { name: 'Dr. Sarah Johnson', role: 'admin', email: 'admin@hospital.com' };

  const roleTitleMap = {
    admin: 'Chief Administrator',
    doctor: 'Medical Specialist',
    receptionist: 'Hospital Receptionist',
    reception: 'Hospital Receptionist',
    laboratory: 'Lab Technician',
    lab: 'Lab Technician',
    nurse: 'Staff Nurse',
    pharmacy: 'Pharmacist',
    inpatient: 'IPD Ward Manager'
  };

  const currentRoleTitle = roleTitleMap[String(user?.role).toLowerCase()] || user?.role || 'Staff User';

  const [liveNotifs, setLiveNotifs] = useState([]);

  React.useEffect(() => {
    if (user?.role === 'doctor' && user?.name) {
      fetch(`/api/v1/doctor/notifications?doctor_name=${encodeURIComponent(user.name)}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLiveNotifs(data.map((n, idx) => ({
              id: n.id || idx + 1,
              title: 'New Patient Assignment',
              time: 'Just now',
              type: 'urgent',
              text: n.Message || `🔔 New Patient Assigned: ${n.Patient} registered by Receptionist.`
            })));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const defaultNotifications = [
    { id: 101, title: 'Emergency Room Alert', time: '5m ago', type: 'urgent', text: 'Bed allocation needed for Patient #402 in ICU.' },
    { id: 102, title: 'Lab Results Ready', time: '18m ago', type: 'info', text: 'CBC Blood test report generated for Aarav Kumar.' }
  ];

  const notifications = liveNotifs.length > 0 ? liveNotifs : defaultNotifications;

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('hms_user');
      window.location.href = '/login';
    }
  };  return (
    <>
      <header className="h-16 bg-[#021f19]/85 backdrop-blur-2xl border-b border-emerald-500/20 flex items-center justify-between px-6 relative z-30 text-white shadow-md shadow-black/20">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onToggleMobileMenu} 
            className="md:hidden text-emerald-300 hover:text-white p-1.5 rounded-xl hover:bg-emerald-500/20 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full shadow-inner">
            Hospital System v1.0
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notification Button */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30 transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#021f19]"></span>
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#021f19]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 p-4 animate-in fade-in zoom-in-95 duration-200 z-50 text-white">
                <div className="flex justify-between items-center pb-3 border-b border-emerald-500/20 mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2 py-0.5 rounded-full font-bold">3 New</span>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="text-emerald-300/70 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-3 bg-emerald-950/60 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/60 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${item.type === 'urgent' ? 'text-rose-400' : 'text-emerald-300'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-emerald-400/60">{item.time}</span>
                      </div>
                      <p className="text-xs text-emerald-100/80">{item.text}</p>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  className="mt-3 w-full py-2 text-center text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 rounded-xl transition-colors border border-emerald-500/20"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
          
          {/* User Profile Trigger */}
          <div 
            onClick={() => setShowProfileModal(!showProfileModal)}
            className="flex items-center space-x-3 border-l pl-4 border-emerald-500/20 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <UserCircle className="w-7 h-7" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#021f19] rounded-full shadow-[0_0_8px_#10b981]"></span>
            </div>
            <div className="text-sm hidden sm:block text-left">
              <p className="font-bold text-white leading-tight">{user?.name || 'Dr. Sarah Johnson'}</p>
              <p className="text-emerald-300/75 text-xs font-medium">
                {user?.role === 'laboratory' && user?.lab_section
                  ? `${user.lab_section} • ${user.station_id || 'Bench-01'}`
                  : currentRoleTitle}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="ml-2 px-3 py-1.5 text-xs sm:text-sm font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl transition-all border border-rose-500/40 flex items-center shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-1.5 text-rose-400" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#021f19] border border-emerald-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200 text-white">
            <div className="w-12 h-12 bg-rose-950/80 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Confirm Logout</h3>
            <p className="text-sm text-emerald-200/70 mb-6">Are you sure you want to end your current session?</p>
            <div className="flex space-x-3 justify-center">
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="px-4 py-2.5 text-sm font-bold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 rounded-xl flex-1 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLogout}
                className="px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-900/40 flex-1 transition-all"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#021f19] border border-emerald-500/30 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 text-white">
            <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl flex items-center justify-center font-bold">
                  SJ
                </div>
                <div>
                  <h3 className="font-bold text-white">{user?.name || 'Dr. Sarah Johnson'}</h3>
                  <p className="text-xs text-emerald-300/70">{user?.email || 'sarah.johnson@hospital.org'}</p>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-emerald-300/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-emerald-500/10">
                <span className="text-emerald-300/70">Full Name</span>
                <span className="font-semibold text-white">{user?.name || 'Dr. Sarah Johnson'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-emerald-500/10">
                <span className="text-emerald-300/70">Role / Designation</span>
                <span className="font-semibold text-emerald-300">{currentRoleTitle}</span>
              </div>
              {user?.lab_section && (
                <div className="flex justify-between py-2 border-b border-emerald-500/10">
                  <span className="text-emerald-300/70">Assigned Lab Section</span>
                  <span className="font-semibold text-teal-300">{user.lab_section}</span>
                </div>
              )}
              {user?.station_id && (
                <div className="flex justify-between py-2 border-b border-emerald-500/10">
                  <span className="text-emerald-300/70">Active Workstation / Bench</span>
                  <span className="font-semibold text-purple-300 font-mono text-xs">{user.station_id}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-emerald-500/10">
                <span className="text-emerald-300/70">Access Privileges</span>
                <span className="font-semibold text-emerald-400 flex items-center">
                  <Shield className="w-4 h-4 mr-1" /> Verified Clinical Staff
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-emerald-300/70">Session Status</span>
                <span className="font-semibold text-emerald-400 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Active & Audit-Logged
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowProfileModal(false)} 
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-900/50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
