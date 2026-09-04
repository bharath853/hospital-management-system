import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F6F8F6] text-[#10201B] overflow-hidden relative selection:bg-[#087F5B] selection:text-white font-sans">
      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-[#052E24]/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 block' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Desktop Sidebar & Mobile Drawer */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none`}>
        <Sidebar userRole={user?.role} onCloseMobile={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative z-10 bg-[#F6F8F6]">
        <Header user={user} onLogout={onLogout} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
