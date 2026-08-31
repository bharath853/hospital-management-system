import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#01140e] via-[#02241d] to-[#000d08] text-slate-100 overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Glows & Starlight Grid from Image 2 */}
      <div className="fixed -top-32 left-1/4 w-[750px] h-[500px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed -bottom-40 right-10 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07] pointer-events-none z-0"></div>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`} 
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Desktop Sidebar & Mobile Drawer */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar userRole={user?.role} onCloseMobile={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative z-10">
        <Header user={user} onLogout={onLogout} onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

