import React, { useState, useEffect } from 'react';
import { CheckCircle, ListTodo, Upload, FileText, Loader2, Award, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function Tasks() {
  const { currentUser: outletUser } = useOutletContext();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchUserAndTasks();
  }, []);

  const fetchUserAndTasks = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);

      // Fetch active tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch user's submissions to know what is already pending/completed
      const { data: subsData, error: subsError } = await supabase
        .from('task_submissions')
        .select('task_id, status')
        .eq('user_id', user.id);
        
      if (subsError && subsError.code !== 'PGRST116') throw subsError;

      const submissionsMap = (subsData || []).reduce((acc, sub) => {
        acc[sub.task_id] = sub.status;
        return acc;
      }, {});

      const mergedTasks = (tasksData || []).map(task => ({
        ...task,
        submissionStatus: submissionsMap[task.id] || null // 'pending', 'verified', 'rejected', or null
      }));

      setTasks(mergedTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProof = async (taskId) => {
    if (!proofUrl.trim()) {
      alert('Please enter a valid link/proof URL.');
      return;
    }
    const userId = currentUser?.id || outletUser?.id;
    if (!userId) {
      alert('You must be logged in to submit proof.');
      return;
    }
    setSubmittingTaskId(taskId);
    try {
      const { error } = await supabase
        .from('task_submissions')
        .insert({
          task_id: taskId,
          user_id: userId,
          proof_url: proofUrl,
          status: 'pending'
        });
        
      if (error) throw error;
      
      setToastMessage({ type: 'success', text: 'Proof submitted! Pending admin review.' });
      setProofUrl('');
      
      // Update local state instantly
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, submissionStatus: 'pending' } : t
      ));

      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage({ type: 'error', text: 'Failed to submit proof.' });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] dark:bg-slate-900 pt-4 pb-[90px] px-4">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors -mb-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-indigo-600 rounded-3xl p-8 text-white flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-3xl font-extrabold mb-2">Bounty Tasks</h1>
            <p className="text-indigo-100 font-medium">Complete campus tasks to earn C-Coins instantly.</p>
          </div>
          <Award className="w-16 h-16 text-indigo-300 opacity-50" />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">No Active Tasks</h3>
            <p className="text-gray-500 dark:text-slate-400">Check back later for new bounties!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map(task => (
              <div key={task.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-700 font-extrabold px-4 py-1.5 rounded-bl-xl text-sm flex items-center gap-1 shadow-sm">
                  +{task.reward_coins} C-Coins
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2 mt-4">{task.title}</h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-6 flex-1">{task.description}</p>
                
                {task.submissionStatus === 'pending' ? (
                  <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 border border-orange-100">
                    <Loader2 className="w-4 h-4 animate-spin" /> Pending Review
                  </div>
                ) : task.submissionStatus === 'verified' ? (
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 border border-green-100">
                    <CheckCircle className="w-4 h-4" /> Completed &amp; Paid
                  </div>
                ) : (
                  <div className="mt-auto space-y-3 pt-4 border-t border-gray-50 dark:border-slate-700">
                    {task.submissionStatus === 'rejected' && (
                      <p className="text-xs text-red-500 font-semibold mb-2">Your previous submission was rejected. Try again.</p>
                    )}
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Submit Proof (Google Drive URL, Image Link, etc.)</label>
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        value={submittingTaskId === task.id ? proofUrl : ''}
                        onChange={e => {
                          if (submittingTaskId !== task.id) setSubmittingTaskId(task.id);
                          setProofUrl(e.target.value);
                        }}
                        placeholder="https://..."
                        className="flex-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 text-on-surface"
                      />
                      <button 
                        onClick={() => handleSubmitProof(task.id)}
                        disabled={submittingTaskId === task.id && !proofUrl}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="font-semibold text-sm">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
