import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Search, Download, FileText, ArrowLeft, Loader2, BookOpen, Bookmark, Bot, AlertCircle, X, Filter, CheckCircle2, ChevronRight, Lock, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useOutletContext, useNavigate } from 'react-router-dom';

const UnlockMaterialModal = lazy(() => import('../components/UnlockMaterialModal'));

export default function Library() {
  const { currentUser, setCurrentUser } = useOutletContext();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [savedMaterials, setSavedMaterials] = useState(new Set());
  const [unlockedMaterials, setUnlockedMaterials] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [pageError, setPageError] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedMaterialForUnlock, setSelectedMaterialForUnlock] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  // In-flight lock: tracks which materialIds currently have a save/unsave in progress
  // Using a ref (not state) so it doesn't trigger re-renders
  const savingInFlight = React.useRef(new Set());

  // Check if admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const filters = ['All', 'Past Questions', 'Lecture Notes', 'Syllabus'];

  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('study_materials')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching study materials:", error);
          setPageError(error.message || "Failed to load study materials");
          setResources([]);
        } else if (data) {
          setResources(data);
          setPageError(null);
        } else {
          setResources([]);
          setPageError(null);
        }
      } catch (err) {
        console.error("Unexpected error fetching study materials:", err);
        setPageError(err.message || "An unexpected error occurred");
        setResources([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchSavedAndUnlocked = async () => {
      if (!currentUser?.id) return;
      const [{ data: savedData }, { data: unlockedData }] = await Promise.all([
        supabase.from('saved_materials').select('material_id').eq('user_id', currentUser.id),
        supabase.from('unlocked_materials').select('material_id').eq('user_id', currentUser.id)
      ]);
      
      if (isMounted) {
        if (savedData) setSavedMaterials(new Set(savedData.map(item => item.material_id)));
        if (unlockedData) setUnlockedMaterials(new Set(unlockedData.map(item => item.material_id)));
      }
    };
    fetchSavedAndUnlocked();
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleToggleSave = async (materialId) => {
    if (!currentUser?.id) return;

    // ── Race-condition guard ──────────────────────────────────────────────────
    // If a save/unsave for this exact material is already in flight, bail out.
    // This prevents double-click from firing two INSERT calls that both see
    // existingSave = null and then both try to INSERT → duplicate key error.
    if (savingInFlight.current.has(materialId)) return;
    savingInFlight.current.add(materialId);

    // ── Dismiss any stale toast first ─────────────────────────────────────────
    setToastMessage(null);

    // ── Determine intended action from current local state ───────────────────
    const alreadySaved = savedMaterials.has(materialId);

    // ── Optimistic UI update (instant feedback) ───────────────────────────────
    setSavedMaterials(prev => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(materialId);
      else next.add(materialId);
      return next;
    });

    try {
      if (alreadySaved) {
        // ── UNSAVE: delete by composite key ─────────────────────────────────
        const { error: deleteError } = await supabase
          .from('saved_materials')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('material_id', materialId);

        if (deleteError) throw deleteError;
        setToastMessage({ type: 'success', text: 'Removed from your saved materials.' });
      } else {
        // ── SAVE: upsert so a race still only produces one row ───────────────
        const { error: insertError } = await supabase
          .from('saved_materials')
          .upsert(
            { user_id: currentUser.id, material_id: materialId },
            { onConflict: 'user_id,material_id', ignoreDuplicates: true }
          );

        if (insertError) throw insertError;
        setToastMessage({ type: 'success', text: 'Material saved to your profile!' });
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling save:', err);
      // ── Roll back the optimistic update on failure ────────────────────────
      setSavedMaterials(prev => {
        const rollback = new Set(prev);
        if (alreadySaved) rollback.add(materialId);    // restore saved state
        else rollback.delete(materialId);               // restore unsaved state
        return rollback;
      });
      setToastMessage({ type: 'error', text: `Failed: ${err.message}` });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      // Always release the lock when done
      savingInFlight.current.delete(materialId);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to permanently delete this material?")) return;
    try {
      const { error } = await supabase.from('study_materials').delete().eq('id', materialId);
      if (error) throw error;
      setResources(prev => prev.filter(r => r.id !== materialId));
      setToastMessage({ type: 'success', text: 'Material deleted successfully!' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage({ type: 'error', text: `Failed to delete material: ${err.message}` });
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleMaterialClick = (resource) => {
    const isFree = !resource.price_in_coins || resource.price_in_coins === 0;
    const isUnlocked = unlockedMaterials.has(resource.id);
    
    if (isFree || isUnlocked || isAdmin) {
      setActiveDocument(resource);
    } else {
      setSelectedMaterialForUnlock(resource);
      setUnlockModalOpen(true);
    }
  };

  const handleUnlockSuccess = (materialId) => {
    setUnlockedMaterials(prev => new Set(prev).add(materialId));
    // The modal itself will now show a 'Read Now' button instead of auto-opening
  };

  const filteredResources = Array.isArray(resources) ? resources.filter(res => {
    const searchVal = searchQuery?.toLowerCase() || '';
    const matchesSearch = res?.title?.toLowerCase()?.includes(searchVal) || 
                          res?.course_code?.toLowerCase()?.includes(searchVal);
    return matchesSearch;
  }) : [];

  return (
    <div className="flex flex-col h-full relative bg-[#f8fafc] dark:bg-slate-900 overflow-hidden pt-4 pb-[90px]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#f8fafc]/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 pt-4 pb-3 border-b border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-outline hover:text-on-surface transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex justify-center">
            <h1 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> The Library
            </h1>
          </div>
          <div className="w-5" /> {/* Spacer for alignment */}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by course code or title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-full py-2.5 pl-10 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === filter
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Resource List */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-tactile border border-outline-variant/20 flex items-start gap-4 animate-pulse">
                <div className="w-12 h-14 rounded-2xl bg-gray-200 dark:bg-slate-700 flex-shrink-0"></div>
                <div className="flex-grow min-w-0">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-3"></div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
                    <div className="flex gap-2">
                      <div className="w-20 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pageError ? (
          <div className="text-center py-12 px-4">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
            <h3 className="text-on-surface font-bold text-error">Error Loading Library</h3>
            <p className="text-error/80 text-[14px] mt-1">{pageError}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-error/10 text-error rounded-full font-bold text-sm">Try Again</button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-outline-variant mx-auto mb-3" />
            <h3 className="text-on-surface font-bold">No resources found</h3>
            <p className="text-outline text-[14px] mt-1">{searchQuery ? "Try adjusting your search or filters." : "No study materials uploaded by the admin yet. Check back soon!"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredResources.map(resource => (
              <div key={resource?.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-tactile border border-outline-variant/20 flex items-start gap-4 transition-transform active:scale-[0.98]">
                <div className="w-12 h-14 rounded-2xl bg-error/10 border border-error/20 flex flex-col items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-error mb-0.5" />
                  <span className="text-[9px] font-bold text-error uppercase">DOC</span>
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="bg-primary-container/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {resource?.course_code || 'UNK'}
                    </span>
                    {(!resource.price_in_coins || resource.price_in_coins === 0) ? (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Free</span>
                    ) : unlockedMaterials.has(resource.id) ? (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Purchased</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" /> {resource.price_in_coins} C
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-on-surface text-[15px] leading-tight mb-2 truncate">{resource?.title || 'Untitled Document'}</h3>
                  <p className="text-[12px] text-outline mb-2 line-clamp-2">{resource?.description || 'No description available.'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[12px] text-outline font-medium truncate pr-2">
                        Studial Admin
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(resource.id); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm bg-red-50 text-red-500 hover:bg-red-100"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/samuel', { state: { studyContext: resource } })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm active:scale-95 text-[11px] font-bold"
                        >
                          <Bot className="w-3.5 h-3.5" /> Ask Samuel
                        </button>
                        <button
                        onClick={(e) => { e.stopPropagation(); handleToggleSave(resource?.id); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${savedMaterials?.has(resource?.id) ? 'bg-indigo-500/10 text-indigo-600' : 'bg-surface-container-low text-outline hover:bg-surface-container hover:text-on-surface'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${savedMaterials?.has(resource?.id) ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMaterialClick(resource); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                          (!resource.price_in_coins || resource.price_in_coins === 0 || unlockedMaterials.has(resource.id) || isAdmin)
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                        }`}
                      >
                        {(!resource.price_in_coins || resource.price_in_coins === 0 || unlockedMaterials.has(resource.id) || isAdmin) ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {activeDocument && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 bg-surface-container-lowest border-b border-outline-variant/30">
            <h3 className="font-bold text-on-surface truncate pr-4 text-sm md:text-base">
              {activeDocument.title || 'Document Viewer'}
            </h3>
            <div className="flex items-center gap-2">
              <a 
                href={activeDocument.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-[13px] font-bold"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button 
                onClick={() => setActiveDocument(null)} 
                className="text-outline hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors bg-surface-container-low"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(activeDocument.file_url)}&embedded=true`}
              className="w-full h-full border-none"
              title="Document Viewer"
            ></iframe>
          </div>
        </div>
      )}

      {/* Unlock Material Modal */}
      {unlockModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}>
          <UnlockMaterialModal 
            isOpen={unlockModalOpen}
            onClose={() => setUnlockModalOpen(false)}
            material={selectedMaterialForUnlock}
            userCoins={currentUser?.c_coins || 0}
            userId={currentUser?.id}
            onSuccess={handleUnlockSuccess}
            navigateTo={navigate}
            setCurrentUser={setCurrentUser}
            onOpenMaterial={() => {
              setUnlockModalOpen(false);
              setActiveDocument(selectedMaterialForUnlock);
            }}
          />
        </Suspense>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-xl shadow-lg border ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="font-semibold text-sm">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
