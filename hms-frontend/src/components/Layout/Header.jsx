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
  };
  return (
    <>
      <header className="h-16 bg-[#063C2F] border-b border-[#07543F] flex items-center justify-between px-6 relative z-30 text-white shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onToggleMobileMenu} 
            className="md:hidden text-[#DDEFE5] hover:text-white p-1.5 rounded-xl hover:bg-[#07543F] transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-[#052E24] bg-[#DDEFE5] px-3 py-1 rounded-full shadow-sm">
            Hospital System v1.0
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notification Button */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-[#DDEFE5] hover:text-white p-2 rounded-xl hover:bg-[#07543F] border border-transparent hover:border-[#087F5B]/30 transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#063C2F]"></span>
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#DDE5E0] p-4 animate-in fade-in zoom-in-95 duration-200 z-50 text-[#10201B]">
                <div className="flex justify-between items-center pb-3 border-b border-[#DDE5E0] mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-[#10201B] text-sm">Clinical Notifications</h3>
                    <span className="bg-[#EEF7F1] text-[#087F5B] border border-[#087F5B]/30 text-xs px-2 py-0.5 rounded-full font-bold">New</span>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="text-[#65756E] hover:text-[#10201B]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-3 bg-[#F6F8F6] border border-[#DDE5E0] rounded-xl hover:bg-[#EEF7F1] transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${item.type === 'urgent' ? 'text-rose-600' : 'text-[#087F5B]'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#65756E]">{item.time}</span>
                      </div>
                      <p className="text-xs text-[#10201B]">{item.text}</p>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  className="mt-3 w-full py-2 text-center text-xs font-bold text-[#087F5B] hover:bg-[#EEF7F1] rounded-xl transition-colors border border-[#087F5B]/20"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
          
          {/* User Profile Trigger */}
          <div 
            onClick={() => setShowProfileModal(!showProfileModal)}
            className="flex items-center space-x-3 border-l pl-4 border-[#07543F] cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#07543F] border border-[#087F5B]/40 flex items-center justify-center text-[#DDEFE5]">
                <UserCircle className="w-7 h-7" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#12B886] border-2 border-[#063C2F] rounded-full"></span>
            </div>
            <div className="text-sm hidden sm:block text-left">
              <p className="font-bold text-white leading-tight">{user?.name || 'Dr. Sarah Johnson'}</p>
              <p className="text-[#DDEFE5]/80 text-xs font-medium">
                {user?.role === 'laboratory' && user?.lab_section
                  ? `${user.lab_section} • ${user.station_id || 'Bench-01'}`
                  : currentRoleTitle}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="ml-2 px-3 py-1.5 text-xs sm:text-sm font-bold text-white bg-rose-600/90 hover:bg-rose-600 rounded-xl transition-all border border-rose-500/30 flex items-center shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-1.5 text-white" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#052E24]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#DDE5E0] text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#10201B] mb-1">Confirm Session Logout</h3>
            <p className="text-xs text-[#65756E] mb-6">
              Are you sure you want to end your workstation session? Any unsaved form data may be cleared.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#DDE5E0] text-xs font-bold text-[#65756E] hover:bg-[#F6F8F6] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#052E24]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#DDE5E0] relative text-[#10201B]">
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="absolute top-5 right-5 text-[#65756E] hover:text-[#10201B] p-1 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#063C2F] text-white flex items-center justify-center font-bold text-xl shadow-md">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#10201B]">{user?.name || 'Dr. Sarah Johnson'}</h3>
                <p className="text-xs text-[#65756E]">{user?.email || 'sarah.johnson@hospital.org'}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#EEF7F1] text-[#087F5B] border border-[#087F5B]/30">
                  {currentRoleTitle}
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-[#F6F8F6] p-4 rounded-2xl border border-[#DDE5E0] text-xs mb-6">
              <div className="flex justify-between py-1 border-b border-[#DDE5E0]">
                <span className="text-[#65756E]">Full Name:</span>
                <span className="font-semibold text-[#10201B]">{user?.name || 'Dr. Sarah Johnson'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#DDE5E0]">
                <span className="text-[#65756E]">Designation:</span>
                <span className="font-semibold text-[#087F5B]">{currentRoleTitle}</span>
              </div>
              {user?.lab_section && (
                <div className="flex justify-between py-1 border-b border-[#DDE5E0]">
                  <span className="text-[#65756E]">Lab Section:</span>
                  <span className="font-semibold text-[#063C2F]">{user.lab_section}</span>
                </div>
              )}
              {user?.station_id && (
                <div className="flex justify-between py-1 border-b border-[#DDE5E0]">
                  <span className="text-[#65756E]">Workstation Bench:</span>
                  <span className="font-semibold text-[#087F5B] font-mono">{user.station_id}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-[#65756E]">Session Status:</span>
                <span className="font-semibold text-[#087F5B] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#087F5B]" /> Active & Audit-Logged
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2.5 bg-[#07543F] hover:bg-[#063C2F] text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </>
  );
}
