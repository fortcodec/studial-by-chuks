import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Users, HelpCircle, FileText, Link as LinkIcon, BarChart2, Send, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { askSamuel } from '../utils/gemini';
import { Avatar } from './Avatar';

export default function CreatePost({ onPostCreated, currentUser: propCurrentUser }) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [pollOptions, setPollOptions] = useState([]);
  const [showPollInput, setShowPollInput] = useState(false);
  
  const [bountyAmount, setBountyAmount] = useState('');
  const [showBountyInput, setShowBountyInput] = useState(false);

  // Image Upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  
  const textareaRef = useRef(null);

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
      return;
    }
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser(profile || { id: user.id, email: user.email });
      }
    };
    fetchUser();
  }, [propCurrentUser]);

  // Auto-expand textarea
  const handleInput = (e) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleRemovePollOption = (index) => {
    const newOptions = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newOptions);
    if (newOptions.length === 0) setShowPollInput(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      // Close other inputs
      setShowMediaInput(false);
      setMediaUrl('');
      setShowPollInput(false);
      setPollOptions([]);
      setShowBountyInput(false);
      setBountyAmount('');
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl.trim() && !selectedImage && pollOptions.length === 0) return;
    if (!currentUser) {
      alert("You must be logged in to post.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalMediaUrl = mediaUrl.trim() || null;

      // Handle Image Upload
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        finalMediaUrl = publicUrlData.publicUrl;
      }

      let pollData = null;
      const validPollOptions = pollOptions.filter(opt => opt.trim() !== '');
      if (validPollOptions.length > 0) {
        pollData = {
          options: validPollOptions.map(opt => ({ [opt]: 0 }))
        };
      }

      const parsedBounty = parseInt(bountyAmount, 10);
      const isBounty = !isNaN(parsedBounty) && parsedBounty > 0;

      if (isBounty) {
        if ((currentUser.c_coins || 0) < parsedBounty) {
          alert("You don't have enough C-Coins for this bounty.");
          setIsSubmitting(false);
          return;
        }
        
        // Deduct from profile
        const { error: deductError } = await supabase
          .from('profiles')
          .update({ c_coins: currentUser.c_coins - parsedBounty })
          .eq('id', currentUser.id);
          
        if (deductError) {
          console.error("Failed to deduct bounty coins", deductError);
          alert("Failed to process bounty transaction.");
          setIsSubmitting(false);
          return;
        }

        // Log Transaction
        await supabase.from('c_coin_transactions').insert({
          user_id: currentUser.id,
          amount: `-${parsedBounty} C`,
          description: 'Post Bounty'
        });
      }

      const { data: newPost, error } = await supabase.from('posts').insert([
        {
          user_id: currentUser.id,
          content: content.trim(),
          ...(pollData && {
            type: 'poll',
            options: validPollOptions
          }),
          ...(finalMediaUrl && {
            media_url: finalMediaUrl
          }),
          ...(isBounty && {
            bounty_amount: parsedBounty,
            type: 'bounty'
          })
        }
      ]).select().single();

      if (error) throw error;

      // Handle @Samuel AI Tagging
      if (content.toLowerCase().includes('@samuel')) {
        // Trigger AI in background
        askSamuel(content).then(async (aiResponse) => {
          if (!aiResponse) return;
          // Get the AI User ID or mock it
          const aiComment = {
            post_id: newPost.id,
            user_id: currentUser.id, // Use current user to avoid FK error
            content: `[AI_SAMUEL_RESPONSE] ${aiResponse}`
          };
          await supabase.from('post_comments').insert([aiComment]);
        }).catch(err => console.error("Samuel failed to respond:", err));
      }

      // Clear form
      setContent('');
      setMediaUrl('');
      setShowMediaInput(false);
      setPollOptions([]);
      setShowPollInput(false);
      setBountyAmount('');
      setShowBountyInput(false);
      clearImage();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("Post error details:", error.message, error.details, error.hint, error);
      alert(`Failed to post: ${error.message || 'Check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-[24px] shadow-surface-1 p-3 mb-4 border border-outline-variant/30">
      <div className="flex gap-3">
        {/* Avatar Placeholder */}
        <div className="flex-shrink-0 relative">
          <Avatar 
            url={currentUser?.avatar_url || currentUser?.avatar} 
            name={currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email || 'Student'} 
            size="md" 
            className="border border-outline-variant/30"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-container border-2 border-white rounded-full"></div>
        </div>

        {/* Form Area */}
        <div className="flex-grow flex flex-col gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 flex items-center transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              placeholder="Share notes, ask doubts, or tag @Samuel for an explanation..."
              className="w-full resize-none border-none focus:ring-0 p-1 text-on-surface placeholder-outline bg-transparent min-h-[24px] text-sm leading-relaxed overflow-hidden outline-none font-medium"
              rows={1}
              disabled={isSubmitting}
            />
            <Edit3 className="w-5 h-5 text-primary ml-2 flex-shrink-0 opacity-50" />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-max animate-slide-up">
              <img 
                src={imagePreview} 
                alt="Upload preview" 
                className="max-h-32 rounded-xl object-cover border border-outline-variant/30"
              />
              <button 
                onClick={clearImage}
                disabled={isSubmitting}
                className="absolute -top-2 -right-2 bg-surface-container-lowest text-error rounded-full p-1 shadow-md border border-outline-variant/30 hover:bg-error/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Media Input */}
          {showMediaInput && !selectedImage && (
            <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2 animate-slide-up">
              <LinkIcon size={16} className="text-outline" />
              <input 
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Paste video or image URL here..."
                className="bg-transparent border-none outline-none flex-grow text-[13px] text-on-surface font-medium placeholder:text-outline"
                disabled={isSubmitting}
              />
              <button onClick={() => { setMediaUrl(''); setShowMediaInput(false); }} className="text-error hover:text-red-700 active:scale-95 transition-transform p-1">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Bounty Input */}
          {showBountyInput && !selectedImage && (
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-2 animate-slide-up">
              <span className="text-warning text-lg drop-shadow-sm">🪙</span>
              <input 
                type="number"
                value={bountyAmount}
                onChange={(e) => setBountyAmount(e.target.value)}
                placeholder="Attach C-Coin Bounty amount..."
                className="bg-transparent border-none outline-none flex-grow text-[13px] text-warning font-bold placeholder:text-warning/60 placeholder:font-medium"
                disabled={isSubmitting}
                min="1"
              />
              <button onClick={() => { setBountyAmount(''); setShowBountyInput(false); }} className="text-warning hover:text-orange-700 active:scale-95 transition-transform p-1">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Poll Input */}
          {showPollInput && !selectedImage && (
            <div className="flex flex-col gap-2 bg-surface-container-low rounded-xl p-3 animate-slide-up">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Poll Options</span>
                <button onClick={() => { setPollOptions([]); setShowPollInput(false); }} className="text-error hover:text-red-700 active:scale-95 transition-transform p-1">
                  <X size={16} />
                </button>
              </div>
              {pollOptions.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-[13px] font-medium flex-grow outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-on-surface"
                    disabled={isSubmitting}
                  />
                  <button onClick={() => handleRemovePollOption(index)} className="text-outline hover:text-error transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button 
                  type="button" 
                  onClick={handleAddPollOption}
                  className="text-[12px] font-bold text-primary mt-1 self-start hover:underline opacity-90 hover:opacity-100 transition-opacity"
                  disabled={isSubmitting}
                >
                  + Add Option
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleImageChange} 
      />

      {/* Bottom Bar: Action Chips */}
      <div className="flex items-center justify-between mt-4 border-t border-outline-variant/20 pt-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-full whitespace-nowrap hover:bg-surface-container transition-colors active:scale-95 disabled:opacity-50"
            disabled={isSubmitting || !!selectedImage}
          >
            <ImageIcon className="w-4 h-4 text-secondary-green" />
            <span className="text-[13px] font-semibold text-on-surface">Image</span>
          </button>

          <button
            type="button"
            onClick={() => { setShowMediaInput(true); setShowPollInput(false); clearImage(); }}
            className="flex items-center justify-center p-2 bg-surface-container-low border border-outline-variant/30 rounded-full hover:bg-surface-container transition-colors active:scale-95 disabled:opacity-50"
            disabled={isSubmitting || !!selectedImage}
          >
            <LinkIcon className="w-4 h-4 text-primary" />
          </button>

          <button
            type="button"
            onClick={() => { 
              setShowPollInput(true); 
              setShowMediaInput(false);
              setShowBountyInput(false);
              clearImage();
              if (pollOptions.length === 0) setPollOptions(['', '']); 
            }}
            className="flex items-center justify-center p-2 bg-surface-container-low border border-outline-variant/30 rounded-full hover:bg-surface-container transition-colors active:scale-95 disabled:opacity-50"
            disabled={isSubmitting || !!selectedImage}
          >
            <BarChart2 className="w-4 h-4 text-primary" />
          </button>

          <button
            type="button"
            onClick={() => { 
              setShowBountyInput(true); 
              setShowPollInput(false); 
              setShowMediaInput(false);
              clearImage();
            }}
            className="flex items-center gap-1 p-2 bg-warning/10 border border-warning/30 rounded-full hover:bg-warning/20 transition-colors active:scale-95 disabled:opacity-50"
            disabled={isSubmitting || !!selectedImage}
          >
            <span className="text-[12px] font-bold text-warning leading-none px-1">🪙 Bounty</span>
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (!content.trim() && !mediaUrl.trim() && !selectedImage && pollOptions.filter(o => o.trim()).length === 0)}
          className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-full font-bold text-[13px] shadow-md shadow-primary/20 hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none ml-2 flex-shrink-0"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-0.5" />}
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
