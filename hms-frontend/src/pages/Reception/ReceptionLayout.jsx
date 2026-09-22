import React from 'react';
import { Outlet } from 'react-router-dom';
import ReceptionSidebar from './ReceptionSidebar';

const ReceptionLayout = ({ onLogout }) => {
  return (
    <div className="flex h-screen bg-[#F6F8F6] font-sans overflow-hidden">
      <ReceptionSidebar onLogout={onLogout} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ReceptionLayout;
