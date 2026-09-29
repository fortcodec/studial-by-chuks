import React, { useState } from 'react';
import { X, CheckCircle, Coins, CreditCard, Smartphone, Lock, Download, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function BuyCoinsModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedTier, setSelectedTier] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const tiers = [
    { id: 1, name: 'Starter Pack', coins: 100, bonus: 0, ngn: 1000 },
    { id: 2, name: 'Scholar Pack', coins: 500, bonus: 100, ngn: 4500, recommended: true },
    { id: 3, name: 'Genius Pack', coins: 1000, bonus: 250, ngn: 8000 },
  ];

  const handleNext = () => {
    if (step === 1 && !selectedTier) {
      setError("Please select a package.");
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handlePayment = async () => {
    if (!cardName || !cardNumber || !expiry || !cvc) {
      setError("Please fill in all card details (this is a simulation).");
      return;
    }

    setIsProcessing(true);
    setError('');

    // Simulate network request
    setTimeout(async () => {
      try {
        // Mocking a successful deposit that auto-approves for this demo
        const { error: insertError } = await supabase
          .from('c_coin_deposits')
          .insert({
            user_id: currentUser.id,
            requested_coins: selectedTier.coins + selectedTier.bonus,
            amount_ngn: selectedTier.ngn,
            proof_url: 'mock_credit_card_payment',
            status: 'approved'
          });

        if (insertError) throw insertError;
        
        // Also optimistically update user balance in DB since there's no real backend webhook
        const { error: updateError } = await supabase.rpc('increment_c_coins', {
          user_id_param: currentUser.id,
          amount: selectedTier.coins + selectedTier.bonus
        });
        
        setStep(3); // Success step
      } catch (err) {
        console.error("Deposit error:", err);
        setError(err.message || "Failed to process payment.");
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131620] border border-[#2b3145] rounded-[24px] w-full max-w-[480px] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" />
              <span>Fiat On-Ramp • Secure Checkout</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Buy Studial C-Coins</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#2b3145] text-[#94a3b8] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#10B981]' : 'text-[#475569]'}`}>
            {step > 1 ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[9px]">1</span>
            )}
            <span>1. Select Pack</span>
          </div>
          <div className={`h-px flex-1 ${step >= 2 ? 'bg-[#10B981]' : 'bg-[#2b3145]'}`} />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-[#F59E0B]' : step > 2 ? 'text-[#10B981]' : 'text-[#475569]'}`}>
            {step > 2 ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 2 ? 'bg-[#F59E0B] text-black' : 'border-2 border-current'}`}>2</span>
            )}
            <span>2. Payment</span>
          </div>
          <div className={`h-px flex-1 ${step >= 3 ? 'bg-[#10B981]' : 'bg-[#2b3145]'}`} />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-[#10B981]' : 'text-[#475569]'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 3 ? 'bg-[#10B981] text-black' : 'border-2 border-current'}`}>3</span>
            <span>Confirmation</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-[#0b0d14] flex-1">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">{error}</div>}

          {step === 1 && (
            <div className="space-y-3">
              {tiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    selectedTier?.id === tier.id 
                      ? 'border-[#6366F1] bg-[#6366F1]/10' 
                      : 'border-[#2b3145] hover:border-[#475569] bg-[#131620]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                          {tier.name}
                          {tier.bonus > 0 && <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.5 rounded-sm">+{tier.bonus} Bonus</span>}
                        </h3>
                        <p className="text-xs text-[#94a3b8]">{tier.coins} C-Coins • Instant credit</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">₦{tier.ngn.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
              <div className="pt-4">
                <button 
                  onClick={handleNext}
                  className="w-full py-3.5 bg-[#6366F1] text-white rounded-xl font-bold hover:bg-[#4f46e5] transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 2 && selectedTier && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-[#131620] border border-[#2b3145] rounded-2xl p-4">
                <div className="flex justify-between items-center pb-4 border-b border-[#2b3145] mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{selectedTier.name}</h3>
                      <p className="text-xs text-[#94a3b8]">{selectedTier.coins + selectedTier.bonus} C-Coins</p>
                    </div>
                  </div>
                  <p className="font-bold text-white text-lg">₦{selectedTier.ngn.toLocaleString()}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Subtotal:</span>
                    <span>₦{selectedTier.ngn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Platform Fee & Tax:</span>
                    <span>₦0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-2 border-t border-[#2b3145]">
                    <span>Total Due:</span>
                    <span className="text-[#F59E0B]">₦{selectedTier.ngn.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-3">Payment Method:</h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="border border-[#6366F1] bg-[#6366F1]/10 rounded-xl p-3 flex items-center gap-3 cursor-pointer">
                    <CreditCard className="w-5 h-5 text-[#6366F1]" />
                    <div>
                      <p className="text-sm font-bold text-white">Card</p>
                      <p className="text-[10px] text-[#94a3b8]">Debit / Credit</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-[#6366F1] ml-auto" />
                  </div>
                  <div className="border border-[#2b3145] bg-[#131620] rounded-xl p-3 flex items-center gap-3 cursor-pointer opacity-50">
                    <Smartphone className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-sm font-bold text-white">Apple Pay</p>
                      <p className="text-[10px] text-[#10B981]">Instant 1-Click</p>
                    </div>
                  </div>
                </div>

                {/* Card Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1 block">Cardholder Name</label>
                    <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Alex Rivera" className="w-full bg-[#131620] border border-[#2b3145] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1 block">Card Number</label>
                      <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="•••• 4242" className="w-full bg-[#131620] border border-[#2b3145] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1 block">Expiry</label>
                        <input type="text" value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="08 / 28" className="w-full bg-[#131620] border border-[#2b3145] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1 block">CVC</label>
                        <input type="password" value={cvc} onChange={e => setCvc(e.target.value)} placeholder="•••" className="w-full bg-[#131620] border border-[#2b3145] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="px-6 py-3.5 bg-[#131620] border border-[#2b3145] text-white rounded-xl font-bold hover:bg-[#1c202d] transition-colors">
                  Back
                </button>
                <button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="flex-1 py-3.5 bg-[#F59E0B] text-[#0B0F19] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#d97706] transition-colors disabled:opacity-70"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-[#0B0F19] border-t-transparent rounded-full animate-spin"/> Processing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Lock className="w-4 h-4"/> Authorize & Pay ₦{selectedTier.ngn.toLocaleString()}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center mb-4 border border-[#10B981]/30">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Purchase Confirmed!</h2>
              <p className="text-[#94a3b8] text-sm mb-8 max-w-xs">
                {selectedTier?.coins + selectedTier?.bonus} C-Coins have been instantly credited to your wallet balance.
              </p>

              <div className="w-full bg-[#131620] border border-[#2b3145] rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Balance Update</span>
                  <span className="text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded-full">+{selectedTier?.coins + selectedTier?.bonus} C-Coins Added</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] text-[#94a3b8]">Previous Balance</p>
                    <p className="font-bold text-[#475569] line-through">{currentUser?.c_coins?.toLocaleString() || 0} C</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6366F1]" />
                  <div className="text-right">
                    <p className="text-[10px] text-[#10B981]">New Balance</p>
                    <p className="font-bold text-[#10B981] text-lg">{((currentUser?.c_coins || 0) + selectedTier?.coins + selectedTier?.bonus).toLocaleString()} C</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button className="flex-1 py-3.5 bg-[#131620] border border-[#2b3145] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1c202d] transition-colors">
                  <Download className="w-4 h-4"/> Receipt
                </button>
                <button 
                  onClick={() => {
                    onClose();
                    window.location.reload(); // Refresh to ensure global state grabs the newly incremented balance
                  }} 
                  className="flex-[2] py-3.5 bg-[#6366F1] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4f46e5] transition-colors"
                >
                  <CheckCircle className="w-4 h-4"/> Done & Return
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
