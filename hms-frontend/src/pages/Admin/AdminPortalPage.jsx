import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './Dashboard';
import {
  Shield, Users, Activity, Building2, Stethoscope, BookOpen, TestTube, Pill,
  BedDouble, Tag, Calendar, Zap, ClipboardList, Server, BarChart3, CheckCircle2,
  AlertTriangle, RefreshCw, Plus, Search, Filter, Lock, Check, X, ArrowUpRight, Eye, Edit
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin';

export default function AdminPortalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [counters, setCounters] = useState({ todays_patients: 248, checked_in: 183, waiting: 42, in_consultation: 18, admitted: 67, critical_alerts: 4 });
  const [deptStatus, setDeptStatus] = useState([]);
  const [systemEvents, setSystemEvents] = useState([]);
  const [healthStatus, setHealthStatus] = useState({ status: 'Healthy', api: 'Operational (v1.0.0)', database: 'Healthy', websocket: 'Connected', failed_outbox_events: 0 });
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [deptsList, setDeptsList] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [labMasters, setLabMasters] = useState([]);
  const [pharmacyMasters, setPharmacyMasters] = useState([]);
  const [wardsBeds, setWardsBeds] = useState([]);
  const [pricingCatalog, setPricingCatalog] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [failedOutbox, setFailedOutbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Drawer States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ full_name: '', email: '', role: 'doctor', employee_id: '', password: 'user123' });
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState(null);
  const [selectedRolePerms, setSelectedRolePerms] = useState([]);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDocData, setNewDocData] = useState({ full_name: '', specialization: 'Cardiology', employee_id: '', phone: '+91 98765 00000', availability: 'Available' });
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [newPricingData, setNewPricingData] = useState({ service_code: '', service_name: '', category: 'Consultation', op_rate: '500' });
  const [showAddLabMasterModal, setShowAddLabMasterModal] = useState(false);
  const [newLabMasterData, setNewLabMasterData] = useState({ test_code: '', test_name: '', laboratory_section: 'Clinical Chemistry', specimen_type: 'Blood', container_type: 'Serum Tube', tat_minutes: 60 });

  useEffect(() => {
    fetchCoreDashboardData();
  }, []);

  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/admin/users')) setActiveTab('users');
    else if (p.includes('/admin/rbac')) setActiveTab('rbac');
    else if (p.includes('/admin/doctors')) setActiveTab('doctors');
    else if (p.includes('/admin/departments')) setActiveTab('departments');
    else if (p.includes('/admin/staff')) setActiveTab('users');
    else if (p.includes('/admin/masters')) setActiveTab('masters');
    else if (p.includes('/admin/lab-masters')) setActiveTab('lab_masters');
    else if (p.includes('/admin/pharmacy-masters')) setActiveTab('pharmacy_masters');
    else if (p.includes('/admin/wards-beds')) setActiveTab('wards_beds');
    else if (p.includes('/admin/pricing')) setActiveTab('pricing');
    else if (p.includes('/admin/audit') || p.includes('/admin/deleted-records')) setActiveTab('audit');
    else if (p.includes('/admin/health') || p.includes('/admin/settings')) setActiveTab('system_health');
    else if (p.includes('/admin/reports')) setActiveTab('reports');
    else setActiveTab('dashboard');
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const routeMap = {
      dashboard: '/admin/dashboard',
      users: '/admin/users',
      rbac: '/admin/rbac',
      doctors: '/admin/doctors',
      departments: '/admin/departments',
      masters: '/admin/masters',
      lab_masters: '/admin/lab-masters',
      pharmacy_masters: '/admin/pharmacy-masters',
      wards_beds: '/admin/wards-beds',
      pricing: '/admin/pricing',
      audit: '/admin/audit',
      system_health: '/admin/health',
      reports: '/admin/reports'
    };
    if (routeMap[tabId]) {
      navigate(routeMap[tabId]);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'rbac') fetchRbacData();
    if (activeTab === 'doctors') fetchDoctors();
    if (activeTab === 'departments') fetchDepartments();
    if (activeTab === 'masters') fetchMasterData();
    if (activeTab === 'lab_masters') fetchLabMasters();
    if (activeTab === 'pharmacy_masters') fetchPharmacyMasters();
    if (activeTab === 'wards_beds') fetchWardsBeds();
    if (activeTab === 'pricing') fetchPricingCatalog();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'outbox') fetchFailedOutbox();
    if (activeTab === 'system_health') fetchHealth();
  }, [activeTab]);

  const fetchCoreDashboardData = async () => {
    setLoading(true);
    try {
      const [cntRes, deptRes, evtRes, healthRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard-counters`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/department-status`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/system-events`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/health`).then(r => r.json()).catch(() => ({}))
      ]);
      if (cntRes.todays_patients) setCounters(cntRes);
      if (Array.isArray(deptRes)) setDeptStatus(deptRes);
      if (Array.isArray(evtRes)) setSystemEvents(evtRes);
      if (healthRes.status) setHealthStatus(healthRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/users`).then(r => r.json()).catch(() => []);
    setUsersList(Array.isArray(res) ? res : []);
  };

  const fetchRbacData = async () => {
    const [roles, perms] = await Promise.all([
      fetch(`${API_BASE}/rbac/roles`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/rbac/permissions`).then(r => r.json()).catch(() => [])
    ]);
    setRolesList(Array.isArray(roles) ? roles : []);
    setPermissionsList(Array.isArray(perms) ? perms : []);
  };

  const fetchDoctors = async () => {
    const res = await fetch(`${API_BASE}/doctors/directory`).then(r => r.json()).catch(() => []);
    setDoctorsList(Array.isArray(res) ? res : []);
  };

  const fetchDepartments = async () => {
    const res = await fetch(`${API_BASE}/departments`).then(r => r.json()).catch(() => []);
    setDeptsList(Array.isArray(res) ? res : []);
  };

  const fetchMasterData = async () => {
    const res = await fetch(`${API_BASE}/clinical-masters`).then(r => r.json()).catch(() => []);
    setMasterData(Array.isArray(res) ? res : []);
  };

  const fetchLabMasters = async () => {
    const res = await fetch(`${API_BASE}/lab-masters`).then(r => r.json()).catch(() => []);
    setLabMasters(Array.isArray(res) ? res : []);
  };

  const fetchPharmacyMasters = async () => {
    const res = await fetch(`${API_BASE}/pharmacy-masters`).then(r => r.json()).catch(() => []);
    setPharmacyMasters(Array.isArray(res) ? res : []);
  };

  const fetchWardsBeds = async () => {
    const res = await fetch(`${API_BASE}/wards-beds`).then(r => r.json()).catch(() => []);
    setWardsBeds(Array.isArray(res) ? res : []);
  };

  const fetchPricingCatalog = async () => {
    const res = await fetch(`${API_BASE}/pricing-catalog`).then(r => r.json()).catch(() => []);
    setPricingCatalog(Array.isArray(res) ? res : []);
  };

  const fetchAuditLogs = async () => {
    const res = await fetch(`${API_BASE}/audit-logs`).then(r => r.json()).catch(() => []);
    setAuditLogs(Array.isArray(res) ? res : []);
  };

  const fetchFailedOutbox = async () => {
    const res = await fetch(`${API_BASE}/outbox/failed`).then(r => r.json()).catch(() => []);
    setFailedOutbox(Array.isArray(res) ? res : []);
  };

  const fetchHealth = async () => {
    const res = await fetch(`${API_BASE}/health`).then(r => r.json()).catch(() => ({}));
    setHealthStatus(res);
  };

  // Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || "User created!");
        setShowAddUserModal(false);
        setNewUserData({ full_name: '', email: '', role: 'doctor', employee_id: '', password: 'user123' });
        fetchUsers();
      } else {
        alert(d.detail || "Failed to create user");
      }
    } catch (err) {
      alert("Connection error");
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentStatus !== 'Active' })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocData)
      });
      if (res.ok) {
        alert("Doctor registered successfully.");
        setShowAddDoctorModal(false);
        fetchDoctors();
      } else {
        alert("Error creating doctor");
      }
    } catch (err) {
      alert("Error creating doctor");
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/pricing-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPricingData)
      });
      if (res.ok) {
        alert("Service rate configured.");
        setShowAddPricingModal(false);
        fetchPricingCatalog();
      }
    } catch (err) {
      alert("Error adding pricing item");
    }
  };

  const handleCreateLabMaster = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/lab-masters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLabMasterData)
      });
      if (res.ok) {
        alert("Lab test master created successfully.");
        setShowAddLabMasterModal(false);
        fetchLabMasters();
      }
    } catch (err) {
      alert("Error creating lab master");
    }
  };

  const handleToggleBedStatus = async (bedId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
    try {
      await fetch(`${API_BASE}/beds/${bedId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchWardsBeds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryOutboxEvent = async (eventId) => {
    try {
      const res = await fetch(`${API_BASE}/outbox/retry/${eventId}`, { method: 'POST' });
      const d = await res.json();
      alert(d.message || "Event reprocessed");
      fetchFailedOutbox();
      fetchCoreDashboardData();
    } catch (err) {
      alert("Error retrying event");
    }
  };

  const navTabs = [
    { id: 'dashboard', label: 'Control Tower', icon: Shield },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'rbac', label: 'RBAC Matrix', icon: Lock },
    { id: 'doctors', label: 'Doctor Personnel', icon: Stethoscope },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'masters', label: 'Clinical Masters', icon: BookOpen },
    { id: 'lab_masters', label: 'Lab Test Master', icon: TestTube },
    { id: 'pharmacy_masters', label: 'Pharmacy Master', icon: Pill },
    { id: 'wards_beds', label: 'Wards & Bed Map', icon: BedDouble },
    { id: 'pricing', label: 'Pricing Master', icon: Tag },
    { id: 'appointment_queue', label: 'Slot & Queue Config', icon: Calendar },
    { id: 'outbox', label: 'Event Engine Monitor', icon: Zap },
    { id: 'audit', label: 'Audit Trail Logs', icon: ClipboardList },
    { id: 'system_health', label: 'System Health', icon: Server },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-[#F6F8F6] text-[#10201B] font-sans pb-16">
      {/* 1. Header Control Banner (Governance navigation tabs) */}
      {activeTab !== 'dashboard' && (
        <div className="bg-[#063C2F] border-b border-[#07543F] sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#087F5B]/30 text-[#12B886] rounded-2xl border border-[#087F5B]/50">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-lg tracking-tight text-white">HMS ADMIN PORTAL</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#12B886]/20 text-[#12B886] border border-[#12B886]/30">
                    GOVERNANCE & CONTROL TOWER
                  </span>
                </div>
                <p className="text-xs text-[#DDEFE5]/80">Hospital Master Configuration, User RBAC, Event Engine & System Auditing</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-[#052E24] rounded-xl border border-[#07543F] text-xs flex items-center gap-2 shadow-sm text-white">
                <span className="w-2 h-2 rounded-full bg-[#12B886] animate-pulse"></span>
                <span className="text-[#DDEFE5] font-medium">{healthStatus.status} • API + DB + WS + Outbox</span>
              </div>
              <button
                onClick={fetchCoreDashboardData}
                className="p-2 bg-[#052E24] hover:bg-[#07543F] text-white rounded-xl transition border border-[#07543F]"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 text-[#12B886] ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2 border-t border-[#07543F]">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-[#052E24] shadow-md font-extrabold'
                      : 'text-[#DDEFE5] hover:text-white hover:bg-[#07543F]/60 font-semibold'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#087F5B]' : 'text-[#12B886]'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* TAB 1: CONTROL TOWER DASHBOARD (Medicare Operational Command Center) */}
        {activeTab === 'dashboard' && (
          <AdminDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {/* TAB 2: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <div>
                <h3 className="font-bold text-base text-[#10201B]">System User & Personnel Directory</h3>
                <p className="text-xs text-[#65756E]">Manage login credentials, roles, department assignments, and account activation</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add New System User
              </button>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <div className="p-3 border-b border-[#DDE5E0] flex items-center gap-2 bg-[#F6F8F6]">
                <Search className="w-4 h-4 text-[#65756E] ml-2" />
                <input
                  type="text"
                  placeholder="Filter users by name, role, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-xs text-[#10201B] placeholder-[#65756E] focus:outline-none w-full py-1.5 font-medium"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                    {usersList
                      .filter(u => !searchTerm || u.Name.toLowerCase().includes(searchTerm.toLowerCase()) || u.Role.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[#087F5B] font-bold">{u['Employee ID']}</td>
                          <td className="py-3 px-4 font-bold text-[#10201B]">{u.Name}</td>
                          <td className="py-3 px-4 text-[#65756E]">{u.Email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF7F1] text-[#087F5B] border border-[#087F5B]/30">
                              {u.Role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#65756E]">{u.Department || 'General'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              u.Status === 'Active'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {u.Status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.Status)}
                              className="px-3 py-1 bg-white hover:bg-[#F6F8F6] text-[#10201B] border border-[#DDE5E0] font-bold text-[11px] rounded-lg transition shadow-sm"
                            >
                              {u.Status === 'Active' ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RBAC PERMISSION MATRIX */}
        {activeTab === 'rbac' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Role-Based Access Control (RBAC) & Fine-Grained Permission Matrix</h3>
              <p className="text-xs text-[#65756E] mt-0.5">Configure system roles and granular module capabilities for Doctors, Nurses, Lab Staff, and Receptionists</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Roles List */}
              <div className="bg-white border border-[#DDE5E0] rounded-2xl p-5 shadow-card space-y-3">
                <h4 className="font-bold text-sm text-[#10201B]">System Roles ({rolesList.length})</h4>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {rolesList.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoleForMatrix(r)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        selectedRoleForMatrix?.id === r.id
                          ? 'bg-[#EEF7F1] border-[#087F5B] text-[#052E24] shadow-sm'
                          : 'bg-[#F6F8F6] border-[#DDE5E0] text-[#10201B] hover:bg-white'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{r.role_name}</span>
                        <span className="font-mono text-[10px] text-[#087F5B] font-bold">{r.role_code}</span>
                      </div>
                      <div className="text-[11px] text-[#65756E] mt-1 line-clamp-1">{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions Matrix Detail */}
              <div className="md:col-span-2 bg-white border border-[#DDE5E0] rounded-2xl p-6 shadow-card">
                <h4 className="font-bold text-sm text-[#10201B] mb-2">
                  {selectedRoleForMatrix ? `Permission Matrix for: ${selectedRoleForMatrix.role_name}` : 'Select a role to configure permissions'}
                </h4>
                <p className="text-xs text-[#65756E] mb-4">Toggle rights for clinical workstations, laboratory ordering, and administrative governance</p>

                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {permissionsList.map((p) => (
                    <div key={p.id} className="p-3 bg-[#F6F8F6] rounded-xl border border-[#DDE5E0] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#10201B] flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-white text-[#087F5B] border border-[#DDE5E0] rounded font-mono text-[10px] font-bold">{p.module}</span>
                          <span>{p.perm_code}</span>
                        </div>
                        <div className="text-[11px] text-[#65756E] mt-0.5">{p.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="w-4 h-4 rounded border-[#DDE5E0] text-[#087F5B] accent-[#087F5B] focus:ring-[#087F5B]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DOCTOR PERSONNEL DIRECTORY */}
        {activeTab === 'doctors' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <div>
                <h3 className="font-bold text-base text-[#10201B]">Doctor Directory & Schedule Governance</h3>
                <p className="text-xs text-[#65756E]">Maintain medical specialist credentials, consultation fees, and appointment availability</p>
              </div>
              <button
                onClick={() => setShowAddDoctorModal(true)}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Register New Doctor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctorsList.map((d) => (
                <div key={d.id} className="bg-white border border-[#DDE5E0] rounded-2xl p-5 shadow-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#10201B]">{d['Doctor Name']}</h4>
                      <p className="text-xs text-[#087F5B] font-bold">{d.Specialization}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {d.Availability}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 text-[#65756E] pt-2 border-t border-[#DDE5E0]">
                    <div className="flex justify-between">
                      <span>Employee Code:</span>
                      <span className="font-mono text-[#10201B] font-bold">{d['Employee ID']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Department:</span>
                      <span className="text-[#10201B]">{d.Department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consultation Fee:</span>
                      <span className="font-bold text-[#087F5B]">{d['Consultation Fee']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="text-[#10201B]">{d.Phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Hospital Wing & Department Setup</h3>
              <p className="text-xs text-[#65756E]">Configure medical departments, head of department assignments, and staff mapping</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {deptsList.map((dept) => (
                <div key={dept.id} className="bg-white border border-[#DDE5E0] rounded-2xl p-5 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-[#10201B]">{dept['Dept Name']}</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {dept.Status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5 text-[#65756E] pt-2 border-t border-[#DDE5E0]">
                    <div className="flex justify-between">
                      <span>Head of Department:</span>
                      <span className="font-bold text-[#10201B]">{dept['Head of Dept']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Personnel Strength:</span>
                      <span className="text-[#087F5B] font-bold">{dept['Total Staff']}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CLINICAL & REFERENCE MASTERS */}
        {activeTab === 'masters' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Clinical Reference Catalogs</h3>
              <p className="text-xs text-[#65756E]">Configurable reference datasets for Specialties, Priority Triage, Diagnoses, and Procedures</p>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Name / Title</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                  {masterData.map((m) => (
                    <tr key={m.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#087F5B]">{m.Category}</td>
                      <td className="py-3 px-4 font-mono text-[#65756E]">{m.Code}</td>
                      <td className="py-3 px-4 font-bold text-[#10201B]">{m.Name}</td>
                      <td className="py-3 px-4 text-[#65756E]">{m.Description}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {m.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: LABORATORY MASTER CONFIG */}
        {activeTab === 'lab_masters' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <div>
                <h3 className="font-bold text-base text-[#10201B]">Laboratory Test Master Configuration</h3>
                <p className="text-xs text-[#65756E]">Configure diagnostic test definitions across all 7 core sections, specimen containers, and turnaround times</p>
              </div>
              <button
                onClick={() => setShowAddLabMasterModal(true)}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add Lab Test Master
              </button>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Test Name</th>
                    <th className="py-3 px-4">Laboratory Section</th>
                    <th className="py-3 px-4">Specimen Type</th>
                    <th className="py-3 px-4">Tube Container</th>
                    <th className="py-3 px-4">TAT</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                  {labMasters.map((lm) => (
                    <tr key={lm.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#087F5B] font-bold">{lm['Test Code']}</td>
                      <td className="py-3 px-4 font-bold text-[#10201B]">{lm['Test Name']}</td>
                      <td className="py-3 px-4 text-[#063C2F] font-bold">{lm.Section}</td>
                      <td className="py-3 px-4 text-[#65756E]">{lm.Specimen}</td>
                      <td className="py-3 px-4 text-amber-700 font-mono text-[11px] font-bold">{lm.Container}</td>
                      <td className="py-3 px-4 text-[#65756E]">{lm['TAT Minutes']} mins</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {lm.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: PHARMACY MASTER */}
        {activeTab === 'pharmacy_masters' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Pharmacy Medicine Master Catalog</h3>
              <p className="text-xs text-[#65756E]">Configure drug definitions, generic names, dosage forms, and stock rates</p>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Generic Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Form</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                  {pharmacyMasters.map((pm) => (
                    <tr key={pm.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#10201B]">{pm['Medicine Name']}</td>
                      <td className="py-3 px-4 text-[#65756E]">{pm['Generic Name']}</td>
                      <td className="py-3 px-4 text-[#10201B]">{pm.Category}</td>
                      <td className="py-3 px-4 text-[#65756E]">{pm.Form}</td>
                      <td className="py-3 px-4 font-bold text-[#087F5B]">{pm.Price}</td>
                      <td className="py-3 px-4 text-[#10201B] font-mono">{pm.Stock} units</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {pm.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: WARDS & BEDS MAP */}
        {activeTab === 'wards_beds' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Inpatient Ward & Bed Map Governance</h3>
              <p className="text-xs text-[#65756E]">Real-time status monitoring for General Wards, Deluxe Rooms, and ICU Beds</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {wardsBeds.map((b) => (
                <div key={b.id} className="bg-white border border-[#DDE5E0] rounded-2xl p-4 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#087F5B]">{b['Bed Code']}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.Status === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {b.Status}
                    </span>
                  </div>
                  <div className="text-xs text-[#65756E]">
                    <div className="font-bold text-[#10201B]">{b.Ward}</div>
                    <div className="text-[11px] text-[#65756E]">Room: {b.Room}</div>
                    <div className="text-xs font-bold text-[#087F5B] mt-1">{b.Price}</div>
                  </div>
                  <button
                    onClick={() => handleToggleBedStatus(b.id, b.Status)}
                    className="w-full py-1.5 bg-[#F6F8F6] hover:bg-[#EEF7F1] text-[#10201B] text-xs font-bold rounded-xl border border-[#DDE5E0] transition"
                  >
                    Toggle Status
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: PRICING MASTER */}
        {activeTab === 'pricing' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <div>
                <h3 className="font-bold text-base text-[#10201B]">Master Billing & Service Pricing Catalog</h3>
                <p className="text-xs text-[#65756E]">Configure hospital rates for Consultation, Laboratory, Imaging, Beds, and Procedures</p>
              </div>
              <button
                onClick={() => setShowAddPricingModal(true)}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add Service Rate
              </button>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Service Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">OP Rate</th>
                    <th className="py-3 px-4">IP Rate</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                  {pricingCatalog.map((pr) => (
                    <tr key={pr.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#087F5B] font-bold">{pr.Code}</td>
                      <td className="py-3 px-4 text-[#063C2F] font-bold">{pr.Category}</td>
                      <td className="py-3 px-4 font-bold text-[#10201B]">{pr.Name}</td>
                      <td className="py-3 px-4 font-bold text-[#087F5B]">{pr['OP Rate']}</td>
                      <td className="py-3 px-4 font-bold text-[#087F5B]">{pr['IP Rate']}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {pr.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 11: APPOINTMENT & QUEUE CONFIG */}
        {activeTab === 'appointment_queue' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Appointment Slots & Event Queue Priority Rules</h3>
              <p className="text-xs text-[#65756E]">Set default appointment durations, patient limits per slot, and priority queue routing rules</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#DDE5E0] rounded-2xl p-6 shadow-card space-y-4">
                <h4 className="font-bold text-sm text-[#10201B] border-b border-[#DDE5E0] pb-2">Appointment Schedule Parameters</h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#65756E] block mb-1 font-semibold">Default Consultation Slot Duration</label>
                    <input type="text" defaultValue="15 minutes" className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 text-xs focus:border-[#087F5B]" />
                  </div>
                  <div>
                    <label className="text-[#65756E] block mb-1 font-semibold">Maximum Patients Per Slot</label>
                    <input type="text" defaultValue="12 patients" className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 text-xs focus:border-[#087F5B]" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#DDE5E0] rounded-2xl p-6 shadow-card space-y-4">
                <h4 className="font-bold text-sm text-[#10201B] border-b border-[#DDE5E0] pb-2">Queue Priority Routing Hierarchy</h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">
                    1. EMERGENCY (Immediate Triage Interruption)
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold">
                    2. URGENT (Priority Queue Slot Escalation)
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold">
                    3. ROUTINE / NORMAL (First-Come First-Served Sequence)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: EVENT MONITOR & OUTBOX QUEUE */}
        {activeTab === 'outbox' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Event Engine & Failed Outbox Monitor</h3>
              <p className="text-xs text-[#65756E]">Inspect outbox notifications, verify delivery states, and trigger manual event retries</p>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Payload Snapshot</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                  {failedOutbox.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#65756E] font-bold">
                        No failed outbox events detected. Event Engine is operating cleanly.
                      </td>
                    </tr>
                  ) : (
                    failedOutbox.map((f) => (
                      <tr key={f.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#087F5B] font-bold">EVT-{f.id}</td>
                        <td className="py-3 px-4 font-bold text-[#10201B]">{f.event_type}</td>
                        <td className="py-3 px-4 text-[#65756E]">{f.created_at}</td>
                        <td className="py-3 px-4 text-[#10201B] font-mono text-[11px] truncate max-w-xs">{f.payload}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRetryOutboxEvent(f.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 ml-auto shadow-sm"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry Event
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 13: AUDIT TRAIL INSPECTOR */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Immutable System Audit Logs</h3>
              <p className="text-xs text-[#65756E]">Complete governance traceability for user management, pricing changes, and emergency overrides</p>
            </div>

            <div className="bg-white border border-[#DDE5E0] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#052E24] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE8] bg-white font-medium">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#EEF7F1]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#10201B]">{log.User}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-[#EEF7F1] text-[#087F5B] rounded border border-[#087F5B]/30 font-mono text-[10px] font-bold">
                          {log.Action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#063C2F] font-mono font-bold">{log.Entity}</td>
                      <td className="py-3 px-4 text-[#65756E]">{log.Reason}</td>
                      <td className="py-3 px-4 text-[#65756E]">{log.Timestamp}</td>
                      <td className="py-3 px-4 text-[#65756E] font-mono">{log.IP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 14: SYSTEM HEALTH */}
        {activeTab === 'system_health' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">System Technical Health & Infrastructure Status</h3>
              <p className="text-xs text-[#65756E]">Live operational diagnostics for FastAPI REST Engine, SQLite DB, WebSockets, and Outbox Workers</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'REST API Engine', status: healthStatus.api, icon: Server, color: 'text-[#087F5B]' },
                { title: 'Database Engine', status: healthStatus.database, icon: CheckCircle2, color: 'text-[#087F5B]' },
                { title: 'WebSocket Router', status: healthStatus.websocket, icon: Zap, color: 'text-[#F59E0B]' },
                { title: 'Event Outbox Engine', status: healthStatus.event_engine || 'Running', icon: Activity, color: 'text-[#063C2F]' }
              ].map((h, idx) => {
                const Icon = h.icon;
                return (
                  <div key={idx} className="bg-white border border-[#DDE5E0] rounded-2xl p-5 shadow-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#65756E]">{h.title}</span>
                      <Icon className={`w-5 h-5 ${h.color}`} />
                    </div>
                    <div className="text-sm font-extrabold text-[#10201B] mt-1">{h.status}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 15: EXECUTIVE ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-[#DDE5E0] shadow-card">
              <h3 className="font-bold text-base text-[#10201B]">Executive Reports & Revenue Analytics</h3>
              <p className="text-xs text-[#65756E]">Hospital operational trends, clinical throughput, and financial revenue summaries</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#DDE5E0] rounded-2xl p-6 shadow-card space-y-3">
                <h4 className="font-bold text-sm text-[#10201B]">Weekly Patient Flow Trend</h4>
                <div className="h-48 bg-[#F6F8F6] rounded-xl border border-[#DDE5E0] flex items-center justify-center text-[#65756E] text-xs font-bold">
                  [Patient Registration & Visit Trend Chart]
                </div>
              </div>

              <div className="bg-white border border-[#DDE5E0] rounded-2xl p-6 shadow-card space-y-3">
                <h4 className="font-bold text-sm text-[#10201B]">Financial Revenue Breakdown (OP vs IP)</h4>
                <div className="h-48 bg-[#F6F8F6] rounded-xl border border-[#DDE5E0] flex items-center justify-center text-[#65756E] text-xs font-bold">
                  [Consultation, Laboratory, Pharmacy & Bed Revenue]
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: ADD USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="font-bold text-base text-[#10201B]">Create New System User Account</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Madhavan"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="madhavan@hospital.org"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP-1001"
                  value={newUserData.employee_id}
                  onChange={(e) => setNewUserData({ ...newUserData, employee_id: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Assigned Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="reception">Receptionist</option>
                  <option value="laboratory">Laboratory Technician</option>
                  <option value="pharmacy">Pharmacist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Password</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE5E0]">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#65756E] font-bold rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-sm">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DOCTOR */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="font-bold text-base text-[#10201B]">Register Doctor Profile</h3>
              <button onClick={() => setShowAddDoctorModal(false)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. S. Karthikeyan"
                  value={newDocData.full_name}
                  onChange={(e) => setNewDocData({ ...newDocData, full_name: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Specialization</label>
                <input
                  type="text"
                  required
                  placeholder="Neurology"
                  value={newDocData.specialization}
                  onChange={(e) => setNewDocData({ ...newDocData, specialization: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Employee Code</label>
                <input
                  type="text"
                  placeholder="DR-1002"
                  value={newDocData.employee_id}
                  onChange={(e) => setNewDocData({ ...newDocData, employee_id: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE5E0]">
                <button type="button" onClick={() => setShowAddDoctorModal(false)} className="px-4 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#65756E] font-bold rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-sm">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD PRICING */}
      {showAddPricingModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="font-bold text-base text-[#10201B]">Add Hospital Service Rate</h3>
              <button onClick={() => setShowAddPricingModal(false)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreatePricing} className="space-y-3 text-xs">
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Service Code</label>
                <input
                  type="text"
                  required
                  placeholder="CONS-004"
                  value={newPricingData.service_code}
                  onChange={(e) => setNewPricingData({ ...newPricingData, service_code: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="ICU Special Consultation"
                  value={newPricingData.service_name}
                  onChange={(e) => setNewPricingData({ ...newPricingData, service_name: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Rate (₹)</label>
                <input
                  type="text"
                  required
                  placeholder="800"
                  value={newPricingData.op_rate}
                  onChange={(e) => setNewPricingData({ ...newPricingData, op_rate: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE5E0]">
                <button type="button" onClick={() => setShowAddPricingModal(false)} className="px-4 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#65756E] font-bold rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-sm">Save Pricing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD LAB MASTER */}
      {showAddLabMasterModal && (
        <div className="fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-[#10201B]">
          <div className="bg-white border border-[#DDE5E0] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
              <h3 className="font-bold text-base text-[#10201B]">Create Laboratory Test Master</h3>
              <button onClick={() => setShowAddLabMasterModal(false)} className="text-[#65756E] hover:text-[#10201B]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateLabMaster} className="space-y-3 text-xs">
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Test Code</label>
                <input
                  type="text"
                  required
                  placeholder="LIPID"
                  value={newLabMasterData.test_code}
                  onChange={(e) => setNewLabMasterData({ ...newLabMasterData, test_code: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="Lipid Profile"
                  value={newLabMasterData.test_name}
                  onChange={(e) => setNewLabMasterData({ ...newLabMasterData, test_name: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                />
              </div>
              <div>
                <label className="text-[#65756E] block mb-1 font-semibold">Laboratory Section</label>
                <select
                  value={newLabMasterData.laboratory_section}
                  onChange={(e) => setNewLabMasterData({ ...newLabMasterData, laboratory_section: e.target.value })}
                  className="w-full bg-[#F6F8F6] border border-[#DDE5E0] text-[#10201B] rounded-xl px-3 py-2 focus:border-[#087F5B]"
                >
                  <option value="Clinical Chemistry">Clinical Chemistry</option>
                  <option value="Hematology">Hematology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Immunology / Serology">Immunology / Serology</option>
                  <option value="Immunohematology / Blood Bank">Immunohematology / Blood Bank</option>
                  <option value="Urinalysis / Clinical Microscopy">Urinalysis / Clinical Microscopy</option>
                  <option value="Molecular Diagnostics / Pathology">Molecular Diagnostics / Pathology</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE5E0]">
                <button type="button" onClick={() => setShowAddLabMasterModal(false)} className="px-4 py-2 bg-white hover:bg-[#F6F8F6] border border-[#DDE5E0] text-[#65756E] font-bold rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#087F5B] hover:bg-[#07543F] text-white font-bold rounded-xl shadow-sm">Save Test Master</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
