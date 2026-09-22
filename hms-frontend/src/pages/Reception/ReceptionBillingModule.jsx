import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, CreditCard, Receipt, Plus } from 'lucide-react';
import PaymentModal from './PaymentModal';
import ReceiptView from './ReceiptView';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ReceptionBillingModule = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [billingData, setBillingData] = useState(null);
  
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  
  // Receipt State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const fetchEncounter = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setBillingData(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/reception/billing/encounter/${searchQuery.trim()}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Encounter not found.");
        throw new Error("Failed to fetch billing data.");
      }
      const data = await response.json();
      setBillingData(data);
      setDiscountAmount(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!billingData || !billingData.unbilled_services.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        encounter_code: billingData.encounter.encounter_code,
        discount_amount: parseFloat(discountAmount) || 0,
        services: billingData.unbilled_services
      };
      
      const response = await fetch(`${API_BASE}/api/v1/reception/billing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to generate bill.");
      }
      
      const data = await response.json();
      setGeneratedBill(data);
      setShowPaymentModal(true);
      
      // Refresh encounter to show the new bill in existing bills
      fetchEncounter({ preventDefault: () => {} });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentResponse) => {
    setShowPaymentModal(false);
    // Show receipt
    setReceiptData({
      ...generatedBill,
      payment: paymentResponse,
      encounter: billingData.encounter,
      patient: billingData.patient
    });
    setShowReceipt(true);
    fetchEncounter({ preventDefault: () => {} });
  };

  if (showReceipt && receiptData) {
    return <ReceiptView data={receiptData} onBack={() => setShowReceipt(false)} />;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-[#052E24] mb-6">Billing & Payments</h2>
      
      {/* Search Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <form onSubmit={fetchEncounter} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Encounter</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Enter Encounter Code (e.g. ENC-2026-12345)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#087F5B] focus:border-[#087F5B] transition-all"
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-[#087F5B] hover:bg-[#052E24] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3 flex items-center gap-2"><AlertCircle size={16} /> {error}</p>}
      </div>

      {billingData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Billing Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Unbilled Services */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#052E24] mb-4 flex items-center gap-2">
                <FileText size={20} className="text-[#087F5B]" /> Billable Services
              </h3>
              
              {billingData.unbilled_services.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                  <p>No pending services to bill for this encounter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm border-y border-gray-200">
                        <th className="p-3 font-medium">Service Code</th>
                        <th className="p-3 font-medium">Service Name</th>
                        <th className="p-3 font-medium text-right">Qty</th>
                        <th className="p-3 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.unbilled_services.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="p-3 text-sm font-medium text-gray-900">{item.service_code}</td>
                          <td className="p-3 text-sm text-gray-700">{item.service_name}</td>
                          <td className="p-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                          <td className="p-3 text-sm font-medium text-gray-900 text-right">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Existing Bills */}
            {billingData.existing_bills.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#052E24] mb-4">Existing Bills</h3>
                <div className="space-y-3">
                  {billingData.existing_bills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <p className="font-bold text-gray-900">{bill.bill_number}</p>
                        <p className="text-sm text-gray-500">Net: ₹{bill.net_amount} • Balance: <span className={bill.balance_amount > 0 ? "text-red-500" : "text-green-600"}>₹{bill.balance_amount}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${bill.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {bill.status}
                        </span>
                        {bill.balance_amount > 0 && (
                          <button 
                            onClick={() => {
                              setGeneratedBill({ bill_id: bill.id, bill_number: bill.bill_number, net_amount: bill.net_amount, balance_amount: bill.balance_amount });
                              setShowPaymentModal(true);
                            }}
                            className="text-[#087F5B] hover:text-[#052E24] text-sm font-medium"
                          >
                            Pay Balance
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
          
          {/* Right Sidebar: Patient Info & Totals */}
          <div className="space-y-6">
            <div className="bg-[#052E24] p-6 rounded-2xl text-white shadow-lg">
              <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4">Patient Info</h3>
              <p className="text-2xl font-bold">{billingData.patient.full_name}</p>
              <p className="text-[#12B886] font-medium mt-1">{billingData.patient.patient_code}</p>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-white/80">Encounter: <span className="font-medium text-white">{billingData.encounter.encounter_code}</span></p>
                <p className="text-sm text-white/80">Doctor: <span className="font-medium text-white">{billingData.encounter.doctor_name}</span></p>
              </div>
            </div>
            
            {billingData.unbilled_services.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#052E24] mb-4">Bill Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Gross Amount</span>
                    <span className="font-medium text-gray-900">₹{billingData.totals.gross_amount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Discount</span>
                    <div className="flex items-center gap-1 w-24">
                      <span className="text-gray-400">₹</span>
                      <input 
                        type="number" 
                        min="0"
                        max={billingData.totals.gross_amount}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded p-1 text-right text-gray-900"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Net Payable</span>
                    <span className="text-2xl font-bold text-[#087F5B]">
                      ₹{Math.max(0, billingData.totals.gross_amount - (parseFloat(discountAmount) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleGenerateBill}
                  disabled={loading}
                  className="w-full py-4 bg-[#087F5B] hover:bg-[#052E24] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#087F5B]/30 flex items-center justify-center gap-2"
                >
                  <Receipt size={20} />
                  {loading ? 'Processing...' : 'Generate Bill & Pay'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {showPaymentModal && generatedBill && (
        <PaymentModal 
          bill={generatedBill} 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default ReceptionBillingModule;
