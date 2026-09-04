import React from 'react';
import { FlaskConical } from 'lucide-react';
import LabSectionBar from './LabSectionBar';

export default function LabPageLayout({ title, description, children }) {
  return (
    <div className="min-h-full bg-[#F6F8F6] text-[#10201B] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* Header Info Banner - Changed to Black as explicitly marked by user */}
      <div className="bg-black border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#087F5B]/30 border border-[#087F5B]/50 flex items-center justify-center text-[#12B886] shadow-sm">
            <FlaskConical className="w-6 h-6 text-[#12B886]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {title || 'Laboratory Information Management System'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#12B886]/20 text-[#12B886] border border-[#12B886]/40 px-2.5 py-0.5 rounded-full">
                LIMS Portal
              </span>
            </div>
            {description && (
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lab Section / Shift Selector Bar */}
      <div>
        <LabSectionBar showDetails={true} />
      </div>

      {/* Main Page Children Content */}
      <div>
        {children}
      </div>

    </div>
  );
}
