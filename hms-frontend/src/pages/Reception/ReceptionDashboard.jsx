import React from 'react';

const ReceptionDashboard = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-[#052E24] mb-6">Reception Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Pending Bills</h3>
          <p className="text-3xl font-bold text-[#12B886] mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Today's Collection</h3>
          <p className="text-3xl font-bold text-[#087F5B] mt-2">₹14,500</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Checked-in Patients</h3>
          <p className="text-3xl font-bold text-[#052E24] mt-2">45</p>
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;
