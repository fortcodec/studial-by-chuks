import React, { useState } from 'react';
import { X, Upload, CheckCircle, Coins, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function BuyCoinsModal({ currentUser, onClose }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const tiers = [
    { coins: 100, ngn: 1000 },
    { coins: 500, ngn: 4500 },
    { coins: 1000, ngn: 8000 },
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedTier) {
      setError("Please select a coin tier.");
      return;
    }
    if (!receiptFile) {
      setError("Please upload your payment receipt.");
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // 1. Upload receipt to storage bucket 'deposits'
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('deposits')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('deposits')
        .getPublicUrl(fileName);
      
      const proofUrl = publicUrlData.publicUrl;

      // 2. Insert into c_coin_deposits
      const { error: insertError } = await supabase
        .from('c_coin_deposits')
        .insert({
          user_id: currentUser.id,
          requested_coins: selectedTier.coins,
          amount_ngn: selectedTier.ngn,
          proof_url: proofUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setIsSuccess(true);
    } catch (err) {
      console.error("Deposit error:", err);
      setError(err.message || "Failed to submit deposit.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-surface rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-secondary-green/20 text-secondary-green flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Deposit Pending!</h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Your receipt has been submitted for verification. Admin will review and credit your {selectedTier?.coins} C-Coins shortly.
          </p>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-container transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Buy C-Coins
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          <div>
            <h3 className="font-semibold text-on-surface mb-3">1. Select Package</h3>
            <div className="grid gap-3">
              {tiers.map((tier, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    selectedTier?.coins === tier.coins 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'border-outline-variant/40 hover:border-outline bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/20 text-warning">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-on-surface">{tier.coins} C-Coins</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">₦{tier.ngn.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30">
            <h3 className="font-semibold text-on-surface mb-2 text-sm">2. Make Transfer</h3>
            <div className="space-y-1 text-sm text-on-surface-variant font-medium">
              <p>Bank: <span className="font-bold text-on-surface">Opay</span></p>
              <p>Account Number: <span className="font-bold text-primary text-base tracking-wider">8161690752</span></p>
              <p>Account Name: <span className="font-bold text-on-surface">Fortune Onyeagwaziam</span></p>
              {selectedTier && (
                <p className="mt-2 text-error text-xs font-bold">Please transfer exactly ₦{selectedTier.ngn.toLocaleString()}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-on-surface mb-2 text-sm">3. Upload Receipt</h3>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-outline-variant/50 rounded-2xl cursor-pointer bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-6 h-6 text-outline mb-2" />
                <p className="text-xs text-outline font-medium">
                  {receiptFile ? receiptFile.name : 'Click to upload proof of payment (PNG, JPG)'}
                </p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            {error && <p className="text-error text-xs mt-2 font-semibold text-center">{error}</p>}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low">
          <button 
            onClick={handleSubmit}
            disabled={isUploading || !selectedTier || !receiptFile}
            className="w-full py-3.5 bg-primary text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
            ) : (
              'Submit Deposit for Verification'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
