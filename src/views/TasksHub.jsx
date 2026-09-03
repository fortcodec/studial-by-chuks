import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Upload, CheckCircle, Clock, XCircle, Award } from 'lucide-react';
import CCoinBadge from '../components/CCoinBadge';

export default function TasksHub({ navigateTo }) {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [cCoins, setCCoins] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Modal state
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 0. Fetch Authenticated User
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated.');
      }
      const currentUserId = user.id;
      setUserId(currentUserId);

      // 1. Fetch user C Coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('c_coins')
        .eq('id', currentUserId)
        .single();
      
      if (profile) setCCoins(profile.c_coins || 0);

      // 2. Fetch active tasks ordered by creation date
      const { data: activeTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      if (activeTasks) setTasks(activeTasks);

      // 3. Fetch user submissions
      const { data: userSubmissions } = await supabase
        .from('task_submissions')
        .select('*, tasks(title, reward_coins)')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (userSubmissions) setSubmissions(userSubmissions);

    } catch (err) {
      console.error('Error fetching TasksHub data:', err);
      setError('Failed to load tasks. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!file || !selectedTask || !userId) return;
    setSubmitting(true);

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${selectedTask.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL (or just save path)
      const proofUrl = supabase.storage.from('task-proofs').getPublicUrl(fileName).data.publicUrl;

      // 3. Insert record into task_submissions
      const { error: dbError } = await supabase
        .from('task_submissions')
        .insert([{
          user_id: userId,
          task_id: selectedTask.id,
          proof_url: proofUrl,
          notes: notes,
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      alert('Proof submitted successfully! It is now pending admin verification.');
      setSelectedTask(null);
      setFile(null);
      setNotes('');
      fetchData(); // Refresh submissions
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected': return <XCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-background flex flex-col font-inter">
      {/* Header */}
      <header className="bg-primary-navy text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('campusHub')} className="hover:text-tertiary-orange transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Weekly Tasks</h1>
        </div>
        <CCoinBadge balance={cCoins} />
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse h-40">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl mt-6 text-center font-medium shadow-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Active Tasks */}
            <section>
              <h2 className="text-lg font-bold text-primary-navy mb-4 flex items-center gap-2">
                <Award size={20} className="text-tertiary-orange" />
                Bounty Board
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {tasks?.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-tertiary-orange mb-4">
                      <Award size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No tasks available right now</h3>
                    <p className="text-gray-500 max-w-md">Check back later for new opportunities to earn C Coins!</p>
                  </div>
                ) : (
                  tasks?.map(task => (
                    <div key={task.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-900">{task.title}</h3>
                          <span className="bg-tertiary-orange text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            +{task.reward_coins} C Coins
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>
                        {task.deadline && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 mb-4">
                            <Clock size={14} />
                            Due: {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setSelectedTask(task)}
                        className="w-full bg-secondary-green hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition shadow-sm"
                      >
                        Submit Proof
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Submission History */}
            <section>
              <h2 className="text-lg font-bold text-primary-navy mb-4">My Submissions</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {submissions?.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {submissions?.map(sub => (
                      <li key={sub.id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{sub.tasks?.title || 'Unknown Task'}</p>
                          <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(sub.status)}
                          <span className="text-xs font-medium capitalize text-gray-700">{sub.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-6 text-center text-sm text-gray-500">You haven't submitted any proofs yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Submit Proof</h3>
            <p className="text-sm text-gray-500 mb-4">For: {selectedTask.title}</p>
            
            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photo/Audio</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*,audio/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex flex-col items-center">
                    <Upload size={24} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {file ? file.name : 'Tap to select a file'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add a note (optional)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., I'm the one on the far left..."
                  className="w-full bg-gray-50 rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary-navy text-sm resize-none border border-gray-200"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setSelectedTask(null); setFile(null); }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting || !file}
                  className="flex-1 py-2 bg-primary-navy text-white rounded-lg font-semibold hover:bg-[#112440] transition disabled:opacity-50"
                >
                  {submitting ? 'Uploading...' : 'Submit Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
