import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Delete, ArrowLeft, CheckCircle, XCircle, PlayCircle, Upload, PlusCircle } from 'lucide-react';

export default function AdminGateway({ navigateTo }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Verification Queue State
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Material Upload State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    course_code: '',
    department: '',
    description: '',
    cost_coins: 5,
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingTasks();
    }
  }, [isAuthenticated]);

  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select(`
          id,
          proof_url,
          notes,
          created_at,
          profiles ( id, university, department ),
          tasks ( title, description, reward )
        `)
        .eq('status', 'pending');
        
      if (error) throw error;
      setPendingTasks(data || []);
    } catch (err) {
      console.error('Error fetching pending tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    console.log("Submit fired. Raw PIN:", pin, "| Trimmed:", pin.trim());
    
    if (pin.trim() === '7071') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect PIN');
      setPin('');
    }
  };

  const handleApprove = async (submissionId) => {
    try {
      // Call Supabase RPC to securely handle approval and coin crediting
      const { error } = await supabase.rpc('approve_task_submission', {
        submission_id: submissionId
      });
      
      if (error) throw error;
      
      alert('Submission approved and coins credited!');
      fetchPendingTasks(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to approve submission.');
    }
  };

  const handleReject = async (submissionId) => {
    try {
      const { error } = await supabase
        .from('task_submissions')
        .update({ status: 'rejected' })
        .eq('id', submissionId);
        
      if (error) throw error;
      
      alert('Submission rejected.');
      fetchPendingTasks(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to reject submission.');
    }
  };

  const handleUploadChange = (e) => {
    setUploadForm({ ...uploadForm, [e.target.name]: e.target.value });
  };

  const handleMaterialUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);

    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${uploadForm.course_code}-${Date.now()}.${fileExt}`;
      
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      const fileUrl = supabase.storage.from('study-materials').getPublicUrl(fileName).data.publicUrl;

      // Insert into DB
      const { error: dbError } = await supabase
        .from('study_materials')
        .insert([{
          title: uploadForm.title,
          course_code: uploadForm.course_code,
          department: uploadForm.department,
          description: uploadForm.description,
          cost_coins: uploadForm.cost_coins,
          file_url: fileUrl
        }]);

      if (dbError) throw dbError;

      alert('Material uploaded successfully!');
      setUploadForm({ title: '', course_code: '', department: '', description: '', cost_coins: 5 });
      setUploadFile(null);
    } catch (error) {
      console.error(error);
      alert('Failed to upload material: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
        <header className="bg-primary-navy text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={24} className="text-secondary-green" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="text-sm font-medium hover:text-red-400 transition"
          >
            Lock Session
          </button>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-12">
          
          {/* Proof Verification Queue */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Proof Verification Queue</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                {pendingTasks.length} Pending
              </span>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading queue...</p>
            ) : pendingTasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">No pending task proofs to verify.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {pendingTasks.map((task) => {
                  const isAudio = task.proof_url?.toLowerCase().match(/\.(mp3|wav|ogg|m4a)$/);
                  
                  return (
                    <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      <div className="h-48 bg-gray-100 relative flex items-center justify-center border-b border-gray-200">
                        {isAudio ? (
                          <div className="text-center flex flex-col items-center p-4 w-full">
                            <PlayCircle size={48} className="text-gray-400 mb-4" />
                            <audio controls className="w-full max-w-[250px]">
                              <source src={task.proof_url} />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        ) : (
                          <img 
                            src={task.proof_url || 'https://via.placeholder.com/400x200?text=No+Image'} 
                            alt="Proof" 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {isAudio ? 'Audio Proof' : 'Image Proof'}
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-4">
                          <h3 className="font-bold text-lg text-gray-900">{task.tasks?.title}</h3>
                          <p className="text-sm text-gray-500 mb-2">Reward: {task.tasks?.reward} C Coins</p>
                          
                          <div className="bg-gray-50 p-3 rounded-lg text-sm mb-3">
                            <span className="font-semibold text-gray-700 block mb-1">Student Details:</span>
                            <span className="text-gray-600 block">ID: {task.profiles?.id.substring(0, 8)}...</span>
                            <span className="text-gray-600 block">Dept: {task.profiles?.department}</span>
                          </div>

                          {task.notes && (
                            <div className="mb-2">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Student Note</span>
                              <p className="text-sm text-gray-800 bg-yellow-50 p-2 rounded border border-yellow-100 italic">
                                "{task.notes}"
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-4 flex gap-3 border-t border-gray-100">
                          <button 
                            onClick={() => handleReject(task.id)}
                            className="flex-1 py-2 flex justify-center items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition"
                          >
                            <XCircle size={18} /> Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(task.id)}
                            className="flex-1 py-2 flex justify-center items-center gap-2 bg-green-500 text-white hover:bg-green-600 rounded-lg font-semibold transition shadow-md shadow-green-500/20"
                          >
                            <CheckCircle size={18} /> Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upload Study Material Section */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upload Study Material</h2>
            </div>
            
            <form onSubmit={handleMaterialUpload} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input type="text" name="title" value={uploadForm.title} onChange={handleUploadChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-navy outline-none" placeholder="e.g. MTH 201 Past Questions 2023" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Course Code</label>
                  <input type="text" name="course_code" value={uploadForm.course_code} onChange={handleUploadChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-navy outline-none" placeholder="e.g. MTH 201" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input type="text" name="department" value={uploadForm.department} onChange={handleUploadChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-navy outline-none" placeholder="e.g. Mathematics" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Cost (C Coins)</label>
                  <input type="number" name="cost_coins" value={uploadForm.cost_coins} onChange={handleUploadChange} required min="0" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-navy outline-none" />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" value={uploadForm.description} onChange={handleUploadChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-navy outline-none resize-none" rows="2" placeholder="Brief description of the material..." />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">File Upload</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex flex-col items-center">
                    <Upload size={24} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {uploadFile ? uploadFile.name : 'Click or drag file to upload'}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploading || !uploadFile}
                className={`w-full py-3 bg-primary-navy text-white rounded-lg font-semibold shadow-md flex justify-center items-center gap-2 hover:bg-[#112440] transition ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <PlusCircle size={20} />
                {uploading ? 'Uploading Material...' : 'Publish Material'}
              </button>
            </form>
          </section>

        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center py-10 px-4 font-inter text-gray-100 relative">
      
      <button 
        onClick={() => navigateTo('onboarding')}
        className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 transition"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="w-full max-w-sm flex flex-col items-center space-y-8">
        
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="bg-primary-navy/30 p-4 rounded-full text-secondary-green border border-secondary-green/30">
            <Shield size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-wider">RESTRICTED ACCESS</h1>
          <p className="text-gray-400 text-sm">Enter admin PIN to continue</p>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handlePinSubmit} className="w-full space-y-6">
          <div className="flex flex-col items-center">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              maxLength={4}
              className="w-full max-w-[200px] text-center bg-gray-900 border border-gray-800 text-2xl font-bold py-4 rounded-xl focus:ring-2 focus:ring-secondary-green outline-none transition tracking-[1em]"
              required
            />
          </div>

          <button 
            type="submit"
            className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all duration-300 ${
              pin.trim().length === 4 
              ? 'bg-secondary-green text-white hover:bg-emerald-500 shadow-[0_0_20px_rgba(5,150,105,0.4)]' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            disabled={pin.trim().length !== 4}
          >
            VERIFY ACCESS
          </button>
        </form>

      </div>
    </div>
  );
}
