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

      {/* Resource Layout */}
      <div className="flex-1 overflow-y-auto pb-6">
        {isLoading ? (
          <div className="p-5 flex flex-col gap-6">
            <div className="h-40 bg-white dark:bg-slate-800 rounded-3xl animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : pageError ? (
          <div className="text-center py-16 px-4">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
            <h3 className="text-on-surface font-bold text-error text-lg">Error Loading Library</h3>
            <p className="text-error/80 text-[14px] mt-1">{pageError}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2.5 bg-error/10 text-error rounded-full font-bold text-sm">Try Again</button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-20 px-4">
            <FileText className="w-16 h-16 text-outline-variant mx-auto mb-4" />
            <h3 className="text-on-surface font-extrabold text-xl mb-2">No resources found</h3>
            <p className="text-outline text-[15px]">{searchQuery ? "Try adjusting your search or filters." : "No study materials available yet. Check back soon!"}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            
            {/* Continue Studying Carousel (Only show if no search/filter active and we have some items) */}
            {!searchQuery && activeFilter === 'All' && filteredResources.length > 0 && (
              <div className="mb-8 pt-4">
                <div className="px-5 mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-on-surface">Continue Studying</h2>
                  <ChevronRight className="w-5 h-5 text-outline" />
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide px-5 pb-4 snap-x snap-mandatory">
                  {filteredResources.slice(0, 4).map(resource => (
                    <div 
                      key={`carousel-${resource.id}`} 
                      className="snap-start flex-shrink-0 w-72 bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-outline-variant/30 flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleMaterialClick(resource)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        {(!resource.price_in_coins || resource.price_in_coins === 0) ? (
                          <span className="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full">Free</span>
                        ) : unlockedMaterials.has(resource.id) ? (
                          <span className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-full">Purchased</span>
                        ) : (
                          <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            <Lock className="w-3 h-3" /> {resource.price_in_coins} C
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-on-surface text-[15px] leading-snug mb-1 truncate">{resource?.title || 'Untitled Document'}</h3>
                      <p className="text-[12px] text-outline truncate">{resource?.course_code || 'General'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Library Grid */}
            <div className="px-5">
              <h2 className="text-lg font-bold text-on-surface mb-4">
                {searchQuery ? 'Search Results' : activeFilter !== 'All' ? activeFilter : 'All Materials'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
                {filteredResources.map(resource => (
                  <div key={resource?.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-outline-variant/30 flex flex-col group hover:shadow-md transition-all active:scale-[0.98]">
                    
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-14 rounded-2xl bg-error/10 border border-error/20 flex flex-col items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-error mb-0.5" />
                        <span className="text-[9px] font-bold text-error uppercase">DOC</span>
                      </div>
                      
                      <div className="flex-grow min-w-0 pt-1">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="bg-surface-container-high text-on-surface text-[10px] font-bold px-2.5 py-0.5 rounded-full truncate max-w-[50%]">
                            {resource?.course_code || 'UNK'}
                          </span>
                          {(!resource.price_in_coins || resource.price_in_coins === 0) ? (
                            <span className="text-green-600 dark:text-green-400 text-[11px] font-bold">Free</span>
                          ) : unlockedMaterials.has(resource.id) ? (
                            <span className="text-blue-600 dark:text-blue-400 text-[11px] font-bold">Unlocked</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px] font-bold">
                              <Lock className="w-3 h-3" /> {resource.price_in_coins}
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-on-surface text-[15px] leading-tight line-clamp-2">{resource?.title || 'Untitled Document'}</h3>
                      </div>
                    </div>

                    <p className="text-[13px] text-outline mb-4 line-clamp-2 flex-grow">{resource?.description || 'No description available.'}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                      <button
                        onClick={() => navigate('/samuel', { state: { studyContext: resource } })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-[12px] font-bold"
                      >
                        <Bot className="w-4 h-4" /> Ask AI
                      </button>
                      
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(resource.id); }}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleSave(resource?.id); }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${savedMaterials?.has(resource?.id) ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-surface-container text-outline hover:bg-surface-container-high hover:text-on-surface'}`}
                        >
                          <Bookmark className={`w-4.5 h-4.5 ${savedMaterials?.has(resource?.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMaterialClick(resource); }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                            (!resource.price_in_coins || resource.price_in_coins === 0 || unlockedMaterials.has(resource.id) || isAdmin)
                              ? 'bg-primary text-on-primary shadow-sm hover:opacity-90'
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:opacity-80'
                          }`}
                        >
                          {(!resource.price_in_coins || resource.price_in_coins === 0 || unlockedMaterials.has(resource.id) || isAdmin) ? (
                            <FileText className="w-4.5 h-4.5" />
                          ) : (
                            <Lock className="w-4.5 h-4.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
