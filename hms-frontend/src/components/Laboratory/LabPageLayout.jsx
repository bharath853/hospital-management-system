import React from 'react';
import { FlaskConical } from 'lucide-react';
import LabSectionBar from './LabSectionBar';

export default function LabPageLayout({ title, description, children }) {
  return (
    <div className="min-h-full bg-[#021d17]/85 backdrop-blur-2xl text-slate-100 p-4 sm:p-6 lg:p-8 rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white space-y-6">
      
      {/* Background Clinical Grid & Glows matching Image 2 */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>
      <div className="absolute -top-10 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-300/40">
            <FlaskConical className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {title || 'Laboratory Information Management System'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-inner">
                LIMS Portal
              </span>
            </div>
            {description && (
              <p className="text-xs text-emerald-300/80 font-medium mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lab Section / Shift Selector Bar */}
      <div className="relative z-10">
        <LabSectionBar showDetails={true} />
      </div>

      {/* Main Page Children Content */}
      <div className="relative z-10">
        {children}
      </div>

    </div>
  );
}
