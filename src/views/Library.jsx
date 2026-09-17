import React, { useState, useEffect } from 'react';
import { Search, Download, FileText, ArrowLeft, Loader2, BookOpen, Bookmark, Bot, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { BottomNav } from '../components/BottomNav';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function Library() {
  const { currentUser } = useOutletContext();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [savedMaterials, setSavedMaterials] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [pageError, setPageError] = useState(null);

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
    const fetchSaved = async () => {
      if (!currentUser?.id) return;
      const { data } = await supabase
        .from('saved_materials')
        .select('material_id')
        .eq('user_id', currentUser.id);
      
      if (data && isMounted) {
        setSavedMaterials(new Set(data.map(item => item.material_id)));
      }
    };
    fetchSaved();
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleToggleSave = async (materialId) => {
    if (!currentUser) return;
    const isSaved = savedMaterials.has(materialId);
    
    // Optimistic UI
    const newSaved = new Set(savedMaterials);
    if (isSaved) newSaved.delete(materialId);
    else newSaved.add(materialId);
    setSavedMaterials(newSaved);

    try {
      if (isSaved) {
        await supabase.from('saved_materials').delete().eq('user_id', currentUser.id).eq('material_id', materialId);
      } else {
        await supabase.from('saved_materials').insert({ user_id: currentUser.id, material_id: materialId });
      }
    } catch (err) {
      console.error("Error toggling save", err);
    }
  };

  const filteredResources = Array.isArray(resources) ? resources.filter(res => {
    const searchVal = searchQuery?.toLowerCase() || '';
    const matchesSearch = res?.title?.toLowerCase()?.includes(searchVal) || 
                          res?.course_code?.toLowerCase()?.includes(searchVal);
    return matchesSearch;
  }) : [];

  return (
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xl px-5 pt-4 pb-2 border-b border-outline-variant/30 shadow-sm">
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
      <div className="flex-1 overflow-y-auto p-5 bg-background pb-[80px]">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-surface-1 border border-outline-variant/30 flex items-start gap-4 animate-pulse">
                <div className="w-12 h-14 rounded-xl bg-gray-200 flex-shrink-0"></div>
                <div className="flex-grow min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="flex gap-2">
                      <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
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
              <div key={resource?.id} className="bg-white rounded-2xl p-4 shadow-surface-1 border border-outline-variant/30 flex items-start gap-4 transition-transform active:scale-[0.98]">
                <div className="w-12 h-14 rounded-xl bg-error/10 border border-error/20 flex flex-col items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-error mb-0.5" />
                  <span className="text-[9px] font-bold text-error uppercase">DOC</span>
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="bg-primary-container/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {resource?.course_code || 'UNK'}
                    </span>
                  </div>
                  <h3 className="font-bold text-on-surface text-[15px] leading-tight mb-2 truncate">{resource?.title || 'Untitled Document'}</h3>
                  <p className="text-[12px] text-outline mb-2 line-clamp-2">{resource?.description || 'No description available.'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[12px] text-outline font-medium truncate pr-2">
                        Studial Admin
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => navigate('/samuel', { state: { studyContext: resource } })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm active:scale-95 text-[11px] font-bold"
                        >
                          <Bot className="w-3.5 h-3.5" /> Ask Samuel
                        </button>
                        <button
                        onClick={() => handleToggleSave(resource?.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${savedMaterials?.has(resource?.id) ? 'bg-indigo-500/10 text-indigo-600' : 'bg-surface-container-low text-outline hover:bg-surface-container hover:text-on-surface'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${savedMaterials?.has(resource?.id) ? 'fill-current' : ''}`} />
                      </button>
                      <a 
                        href={resource?.file_url || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-surface-container-low rounded-full flex items-center justify-center text-primary hover:bg-surface-container hover:text-primary-container transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 bg-surface z-40">
        <BottomNav />
      </div>
    </div>
  );
}
