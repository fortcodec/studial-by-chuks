import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Upload, CheckCircle, Clock, XCircle, Award } from 'lucide-react';
import CCoinBadge from '../components/CCoinBadge';

export default function TasksHub({ navigateTo, userId }) {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [cCoins, setCCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Modal state
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user C Coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('c_coins')
        .eq('id', userId)
        .single();
      
      if (profile) setCCoins(profile.c_coins || 0);

      // 2. Fetch active tasks
      const { data: activeTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true);
      
      if (activeTasks) setTasks(activeTasks);

      // 3. Fetch user submissions
      const { data: userSubmissions } = await supabase
        .from('task_submissions')
        .select('*, tasks(title, reward)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userSubmissions) setSubmissions(userSubmissions);

    } catch (error) {
      console.error('Error fetching TasksHub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!file || !selectedTask) return;
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
        {loading ? (
          <p className="text-center mt-10 text-gray-500">Loading tasks...</p>
        ) : (
          <>
            {/* Active Tasks */}
            <section>
              <h2 className="text-lg font-bold text-primary-navy mb-4 flex items-center gap-2">
                <Award size={20} className="text-tertiary-orange" />
                Bounty Board
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {tasks.map(task => (
                  <div key={task.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900">{task.title}</h3>
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          +{task.reward} C Coins
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedTask(task)}
                      className="w-full bg-secondary-green hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Submit Proof
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-gray-500 text-sm">No active tasks right now. Check back later!</p>}
              </div>
            </section>

            {/* Submission History */}
            <section>
              <h2 className="text-lg font-bold text-primary-navy mb-4">My Submissions</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {submissions.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {submissions.map(sub => (
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
