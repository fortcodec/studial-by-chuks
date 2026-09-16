import React, { useState, useEffect } from 'react';
import { Search, Download, FileText, ArrowLeft, Loader2, ThumbsUp, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';

export default function Vault() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Past Questions', 'Lecture Notes', 'Syllabus'];

  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vault_resources')
        .select('*, profiles(full_name, username)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setResources(data);
      }
      setIsLoading(false);
    };

    fetchResources();
  }, []);

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.course_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || res.resource_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

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
              <BookOpen className="w-5 h-5 text-primary" /> The Vault
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
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-outline-variant mx-auto mb-3" />
            <h3 className="text-on-surface font-bold">No resources found</h3>
            <p className="text-outline text-[14px] mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredResources.map(resource => (
              <div key={resource.id} className="bg-white rounded-2xl p-4 shadow-surface-1 border border-outline-variant/30 flex items-start gap-4 transition-transform active:scale-[0.98]">
                <div className="w-12 h-14 rounded-xl bg-error/10 border border-error/20 flex flex-col items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-error mb-0.5" />
                  <span className="text-[9px] font-bold text-error uppercase">DOC</span>
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="bg-primary-container/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {resource.course_code}
                    </span>
                    <span className="text-[9px] font-bold text-outline uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-md">{resource.resource_type}</span>
                  </div>
                  <h3 className="font-bold text-on-surface text-[15px] leading-tight mb-2 truncate">{resource.title}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[12px] text-outline font-medium truncate pr-2">
                      By {resource.profiles?.full_name || resource.profiles?.username || 'Anonymous'}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1 text-outline">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">{resource.upvotes}</span>
                      </div>
                      <a 
                        href={resource.file_url} 
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
