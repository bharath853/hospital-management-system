import React from 'react';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';

const ReceiptView = ({ data, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6 no-print">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-[#052E24] transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Back to Billing
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#052E24] hover:bg-[#087F5B] text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-md"
        >
          <Printer size={18} /> Print Receipt
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Receipt Header */}
        <div className="bg-[#052E24] p-8 text-white text-center print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4 print:hidden">
            <CheckCircle size={32} className="text-[#12B886]" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider mb-1"><span className="text-[#12B886] print:text-black">+</span> MEDICARE</h1>
          <p className="text-white/80 print:text-black">123 Health Avenue, Medical District, Chennai 600001</p>
          <p className="text-white/80 print:text-black">Phone: +91 98765 43210 | Email: contact@medicare.com</p>
          
          <h2 className="text-xl font-bold mt-6 pt-6 border-t border-white/20 print:border-black uppercase tracking-widest">
            Payment Receipt
          </h2>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm text-gray-500 font-medium">Patient Details</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{data.patient?.full_name || "Patient"}</p>
              <p className="text-gray-600">{data.patient?.patient_code || "UHID-XXXX"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-medium">Receipt Details</p>
              <p className="font-bold text-gray-900 mt-1">Ref: {data.payment?.payment_id || "REC-XXXX"}</p>
              <p className="text-gray-600">{new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 print:bg-transparent border border-gray-100 print:border-none p-4 rounded-xl">
            <div>
              <p className="text-sm text-gray-500">Bill Number</p>
              <p className="font-bold text-gray-900">{data.bill_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Encounter ID</p>
              <p className="font-bold text-gray-900">{data.encounter?.encounter_code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Doctor</p>
              <p className="font-bold text-gray-900">{data.encounter?.doctor_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <p className={`font-bold uppercase ${data.payment?.bill_status === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                {data.payment?.bill_status || 'SUCCESS'}
              </p>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-gray-200 my-8"></div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-lg text-gray-600">Total Bill Amount</span>
            <span className="text-xl font-bold text-gray-900">₹{data.net_amount?.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center mb-8 bg-green-50 print:bg-transparent print:border p-4 rounded-xl text-green-800 print:text-black">
            <div>
              <span className="text-lg font-bold block">Amount Paid</span>
              <span className="text-sm font-medium opacity-80">via {data.payment?.payment_method || "CASH"}</span>
            </div>
            <span className="text-3xl font-bold">₹{data.payment?.amount ? data.payment.amount.toFixed(2) : data.net_amount?.toFixed(2)}</span>
          </div>
          
          {(data.payment?.balance_amount > 0) && (
            <div className="flex justify-between items-center text-amber-700 font-medium">
              <span>Balance Remaining</span>
              <span>₹{data.payment.balance_amount.toFixed(2)}</span>
            </div>
          )}

          <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end text-sm text-gray-500">
            <div>
              <p>Generated by: Receptionist</p>
              <p className="mt-1">System Generated Receipt</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 border-t border-gray-300 pt-2 w-48 mx-auto inline-block">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none; }
          .animate-in { animation: none; }
          .max-w-3xl { max-w: 100%; margin: 0; padding: 0; }
          .bg-white { box-shadow: none; }
          .print\\:bg-transparent { background-color: transparent !important; }
          .print\\:border-none { border: none !important; }
          .print\\:text-black { color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:border { border-width: 1px !important; border-style: solid !important; border-color: black !important; }
          .bg-\\[\\#052E24\\] { background-color: transparent !important; }
          
          /* Extract the receipt div itself to be printed */
          .bg-white > * { visibility: visible; }
          .bg-white { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptView;
