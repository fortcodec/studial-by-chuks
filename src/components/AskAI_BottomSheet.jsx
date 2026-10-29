import React, { useState, useEffect, Component } from 'react';
import { 
  Bot, 
  X, 
  Loader2, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  GraduationCap, 
  BookOpen 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { askSamuel } from '../utils/gemini';

/**
 * Error Boundary specifically for AI Bottom Sheet
 * Prevents any rendering or markdown runtime crash from bubbling up
 */
class AIErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AI Bottom Sheet Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <Bot className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
            Samuel is resting his circuits
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
            Samuel is currently resting his circuits. Please try again in a moment.
          </p>
          {this.props.onRetry && (
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * AskAI_BottomSheet Component
 * 
 * Injects post context (post.content, post.topic, user department)
 * and displays Samuel's academic breakdown with graceful error boundary fallback.
 */
export default function AskAI_BottomSheet({
  isOpen,
  onClose,
  post = {},
  currentUser = {},
  initialPrompt
}) {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const postContent = post?.content || '';
  const postTopic = post?.topic || post?.course || post?.course_code || 'General Academia';
  const userDepartment = currentUser?.department || currentUser?.profile?.department || 'University Student';

  const fetchAIAnalysis = async () => {
    if (!postContent && !initialPrompt) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setResponse('');

    try {
      // Timeout wrapper (45 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timed out')), 45000)
      );

      // Context Injection: Pass post.content, post.topic, and profile.department in payload
      const queryPayload = {
        prompt: initialPrompt || `Explain and break down the concepts in this post helpfully for a university student.`,
        postContent: postContent,
        postTopic: postTopic,
        userDepartment: userDepartment,
        userId: currentUser?.id,
      };

      const aiPromise = askSamuel(queryPayload, currentUser?.id);
      const result = await Promise.race([aiPromise, timeoutPromise]);

      if (result) {
        setResponse(result);
      } else {
        throw new Error('Empty response received');
      }
    } catch (err) {
      console.error('Samuel AI Error:', err);
      setHasError(true);
      setErrorMessage(
        'Samuel is currently resting his circuits. Please try again in a moment.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAIAnalysis();
    }
  }, [isOpen, post?.id, postContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose} 
      />

      {/* Slide-Up Bottom Sheet */}
      <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl w-full max-w-2xl mx-auto flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 border-t border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Drag handle / pill indicator */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Samuel AI Tutor</h3>
                <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  gemini-3.5-flash
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                Context: {postTopic} · {userDepartment}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Context Preview Pill */}
        {postContent && (
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-gray-100 dark:border-slate-800 text-xs flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Analyzing post:</span>
            <span className="truncate italic">"{postContent.slice(0, 100)}..."</span>
          </div>
        )}

        {/* Content Area with Error Boundary */}
        <div className="flex-1 overflow-y-auto p-5 pb-safe scrollbar-thin">
          <AIErrorBoundary onRetry={fetchAIAnalysis}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 animate-pulse">
                    <Bot className="w-7 h-7" />
                  </div>
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin absolute -bottom-1 -right-1" />
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                  Samuel is preparing your academic breakdown...
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tailoring concepts for {userDepartment}
                </p>
              </div>
            ) : hasError ? (
              /* Fallback UI when API fails or times out */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-3.5">
                  <Bot className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Samuel is currently resting his circuits
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
                  {errorMessage || 'Samuel is currently resting his circuits. Please try again in a moment.'}
                </p>
                <button
                  type="button"
                  onClick={fetchAIAnalysis}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-slate-900 dark:text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            ) : (
              /* Success Markdown Response */
              <div className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-[14px] text-slate-800 dark:text-slate-200">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {response}
                  </ReactMarkdown>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Academic response curated by Samuel
                  </span>
                  <button
                    onClick={fetchAIAnalysis}
                    className="hover:text-indigo-500 transition-colors flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              </div>
            )}
          </AIErrorBoundary>
        </div>
      </div>
    </div>
  );
}
export { AskAI_BottomSheet };
