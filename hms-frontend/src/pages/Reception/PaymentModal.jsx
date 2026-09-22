import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const PaymentModal = ({ bill, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(bill.balance_amount || bill.net_amount || 0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async (e) => {
    e.preventDefault();
    if (amount <= 0 || amount > (bill.balance_amount || bill.net_amount)) {
      setError('Invalid payment amount');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/reception/billing/${bill.bill_id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          transaction_reference: transactionRef
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Payment failed");
      }
      
      const data = await response.json();
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-[#052E24] p-6 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold">Collect Payment</h2>
          <p className="text-[#12B886] mt-1 font-medium">{bill.bill_number}</p>
        </div>
        
        <form onSubmit={handlePayment} className="p-6">
          <div className="flex justify-between items-center mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-amber-800 font-medium">Balance Due</span>
            <span className="text-2xl font-bold text-amber-600">₹{(bill.balance_amount || bill.net_amount).toFixed(2)}</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                <input 
                  type="number"
                  step="0.01"
                  min="1"
                  max={bill.balance_amount || bill.net_amount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#087F5B] focus:border-[#087F5B] font-bold text-gray-900 text-lg"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3 flex flex-col items-center justify-center gap-2 border rounded-xl transition-all ${paymentMethod === 'CASH' ? 'bg-[#052E24] text-white border-[#052E24]' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                >
                  <Banknote size={20} />
                  <span className="text-xs font-bold">CASH</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-3 flex flex-col items-center justify-center gap-2 border rounded-xl transition-all ${paymentMethod === 'CARD' ? 'bg-[#052E24] text-white border-[#052E24]' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                >
                  <CreditCard size={20} />
                  <span className="text-xs font-bold">CARD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-3 flex flex-col items-center justify-center gap-2 border rounded-xl transition-all ${paymentMethod === 'UPI' ? 'bg-[#052E24] text-white border-[#052E24]' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                >
                  <Smartphone size={20} />
                  <span className="text-xs font-bold">UPI</span>
                </button>
              </div>
            </div>
            
            {paymentMethod !== 'CASH' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Ref / UTR</label>
                <input 
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TXN123456789"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#087F5B] focus:border-[#087F5B]"
                  required
                />
              </div>
            )}
          </div>
          
          {error && <p className="text-red-500 text-sm mt-4 text-center bg-red-50 py-2 rounded-lg">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-4 bg-[#087F5B] hover:bg-[#052E24] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#087F5B]/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (
              <>
                <CheckCircle size={20} />
                Confirm Payment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
