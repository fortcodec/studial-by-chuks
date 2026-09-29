import React from 'react';
import { BookOpen, LogIn, ArrowRight, Menu, X, Coins, Bot, Star, Play, Pause, Library, Shield, Users, Search, Activity, ChevronRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#0b0d14] text-white selection:bg-[#6366F1] selection:text-white font-sans overflow-x-hidden relative">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] bg-gradient-to-b from-[#6366F1]/10 via-[#F59E0B]/5 to-transparent blur-[100px] pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="border-b border-[#2b3145]/50 bg-[#0b0d14]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={24} className="text-[#6366F1]" />
            <span className="font-bold text-lg tracking-tight">Studial</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] ml-1 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-[#94a3b8]">
            <a href="#" className="hover:text-white transition-colors">Classroom</a>
            <a href="#" className="hover:text-white transition-colors">Study Rooms</a>
            <a href="#" className="hover:text-white transition-colors">C-Coin Economy</a>
            <a href="#" className="hover:text-white transition-colors">The Library</a>
            <a href="#" className="hover:text-white transition-colors">Samuel AI</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] text-[13px] font-bold">
              <Coins size={14} />
              <span>1,450 C-Coins</span>
            </div>
            <button onClick={() => navigate('/login')} className="text-[13px] font-bold text-white hover:text-[#94a3b8] transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate('/onboarding')} className="bg-[#6366F1] hover:bg-[#4f46e5] text-white px-5 py-2 rounded-xl text-[13px] font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              Get Started <ArrowRight size={14} className="inline ml-1" />
            </button>
          </div>
          
          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-[1000px] mx-auto px-6 pt-24 pb-16 text-center flex flex-col items-center relative z-10">
        
        <div className="flex items-center gap-2 border border-[#2b3145] bg-[#131620] px-3 py-1 rounded-full mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">1,452 Students Active • Across 148+ Universities</span>
        </div>

        <h1 className="text-5xl md:text-[72px] leading-[1.1] font-extrabold tracking-tight text-white mb-6">
          Level Up Your Study Sessions. <br/>
          <span className="bg-gradient-to-r from-[#6366F1] via-[#F59E0B] to-[#10B981] bg-clip-text text-transparent">Literally.</span>
        </h1>
        
        <p className="text-base md:text-lg text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          The multiplayer focus environment where every 50-minute Pomodoro session earns you real C-Coins, unlocks verified lecture breakdowns, and teams you up with peer scholars worldwide.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button onClick={() => navigate('/onboarding')} className="bg-[#6366F1] hover:bg-[#4f46e5] text-white px-8 py-4 rounded-xl text-[15px] font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2">
            Join the Campus <ArrowRight size={16} className="text-[#F59E0B]" />
          </button>
          <button onClick={() => navigate('/login')} className="bg-[#131620] hover:bg-[#1c202d] border border-[#2b3145] text-white px-8 py-4 rounded-xl text-[15px] font-bold transition-all flex items-center justify-center gap-2">
            <Search size={16} /> Explore Ecosystem
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {["Multiplayer Focus Chambers", "Sociable C-Coin Economy", "Academic AI Copilot", "Zero Full-Screen Bullshit"].map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2b3145] bg-[#131620]/50 backdrop-blur-sm text-[11px] font-bold text-[#94a3b8]">
              {idx === 0 && <Users size={12} className="text-[#10B981]" />}
              {idx === 1 && <Coins size={12} className="text-[#F59E0B]" />}
              {idx === 2 && <Bot size={12} className="text-[#6366F1]" />}
              {idx === 3 && <Shield size={12} className="text-[#10B981]" />}
              {feat}
            </div>
          ))}
        </div>
      </main>

      {/* Hero Interactive Mockup */}
      <section className="max-w-[800px] mx-auto px-6 mb-32">
        <div className="bg-[#131620]/80 backdrop-blur-xl border border-[#2b3145] p-6 md:p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/5 rounded-full blur-[80px]" />
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2b3145] flex items-center justify-center border border-[#475569]/50">
                <Activity size={20} className="text-[#94a3b8]" />
              </div>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">Chamber 04: MIT Cognitive Lab <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Multiplexer</span></h3>
                <p className="text-xs text-[#94a3b8]">Distributed Systems & Quantum Information • Session 3 of 4</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#6366F1] border-2 border-[#131620]" />
                <div className="w-6 h-6 rounded-full bg-[#10B981] border-2 border-[#131620]" />
                <div className="w-6 h-6 rounded-full bg-[#F59E0B] border-2 border-[#131620]" />
              </div>
              <div className="text-[10px] font-bold border border-[#2b3145] bg-[#0b0d14] px-2 py-1 rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                17 Scholars Online
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            <div className="bg-[#0b0d14] border border-[#2b3145] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Focus Block Remaining</p>
              <div className="text-[64px] leading-none font-extralight font-mono text-white tracking-tighter mb-4">43:06</div>
              <div className="w-full h-1 bg-[#2b3145] rounded-full mb-6 overflow-hidden flex">
                <div className="h-full bg-[#6366F1] w-[12%]" />
                <div className="h-full bg-transparent w-2" />
                <div className="h-full bg-[#475569] w-[18%]" />
              </div>
              <div className="flex gap-3">
                <button className="bg-[#6366F1] text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Pause size={14} className="fill-current" /> Pause
                </button>
                <button className="bg-[#131620] border border-[#2b3145] text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#1c202d]">
                  <Play size={14} className="fill-current text-[#94a3b8]" /> Break
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b0d14] border border-[#2b3145] rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981] uppercase tracking-wider">
                    <Activity size={12} /> Atmospheric Status
                  </div>
                  <span className="text-[10px] font-bold text-[#10B981]">Binaural 432Hz</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2b3145] flex items-center justify-center">
                    <Activity size={14} className="text-[#94a3b8]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Neuro-Acoustic Deep Work #4</p>
                    <p className="text-[10px] text-[#94a3b8]">Low-frequency focus stream</p>
                  </div>
                </div>
                {/* Mock wave */}
                <div className="mt-3 flex items-end gap-0.5 h-6 overflow-hidden opacity-50">
                   {[...Array(30)].map((_, i) => (
                     <div key={i} className="w-1 bg-[#94a3b8] rounded-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                   ))}
                </div>
              </div>

              <div className="bg-[#1c1611] border border-[#F59E0B]/30 rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#F59E0B]/10 blur-xl rounded-full" />
                <div className="flex justify-between items-center mb-2 relative z-10">
                  <span className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-widest">Active Bounty</span>
                  <span className="text-[9px] font-bold bg-[#F59E0B] text-black px-1.5 py-0.5 rounded-sm">Yield 250C</span>
                </div>
                <h4 className="font-bold text-white text-sm mb-1 relative z-10">Block Yield</h4>
                <p className="text-[10px] text-[#94a3b8] mb-3 relative z-10">Complete this Pomodoro cleanly to double stake yield for 2 hours.</p>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-xs font-bold text-[#F59E0B] flex items-center gap-1"><Coins size={12}/> +12.5 C</span>
                  <span className="text-[9px] font-bold text-[#10B981] flex items-center gap-1"><Star size={10} className="fill-current"/> 2.5x Multiplier</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetrical Study Engine */}
      <section className="max-w-[1000px] mx-auto px-6 py-20 text-center relative z-10">
        <div className="inline-block px-3 py-1 rounded-full border border-[#2b3145] bg-[#131620] text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-6">
          Designed for Focus & Flow
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
          An Asymmetrical Study Engine
        </h2>
        <p className="text-base text-[#94a3b8] max-w-2xl mx-auto mb-16 leading-relaxed">
          Traditional streams invite distraction. Studial fuses collaborative social presence, tokenized study stakes, and hyper-contextualized syllabus AI to sustain unbroken focus.
        </p>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 gap-6 text-left">
          
          <div className="bg-[#131620] border border-[#2b3145] rounded-3xl p-8 relative overflow-hidden group hover:border-[#475569] transition-colors">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#6366F1]/10 rounded-full blur-3xl" />
            <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center border border-[#6366F1]/20 mb-6">
              <Users className="text-[#6366F1]" size={24} />
            </div>
            <div className="text-[10px] font-bold text-[#6366F1] uppercase tracking-widest mb-2">MULTIPLAYER FOCUS CHAMBERS</div>
            <h3 className="text-2xl font-bold text-white mb-3">Global Campus Rooms</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Hop into synced synchronous Pomodoros alongside peers at Cambridge, Oxford, MIT, and WSU Nigeria. Zero intrusive micro-chat and shared progress walls eliminate isolated fatigue.
            </p>
            <div className="bg-[#0b0d14] border border-[#2b3145] rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-[#94a3b8]">Oxford Library • Quad 3</span>
                <span className="text-[10px] font-bold text-[#10B981]">● 84 Scholars</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/50" />
                 <div>
                   <p className="text-xs font-bold text-white">Antigravity Mechanics</p>
                   <p className="text-[10px] text-[#94a3b8]">Focus Epoch 12.0</p>
                 </div>
              </div>
              <div className="mt-3 w-full h-1 bg-[#2b3145] rounded-full overflow-hidden"><div className="h-full bg-[#10B981] w-[70%]" /></div>
            </div>
          </div>

          <div className="bg-[#131620] border border-[#2b3145] rounded-3xl p-8 relative overflow-hidden group hover:border-[#475569] transition-colors">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#F59E0B]/10 rounded-full blur-3xl" />
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/20 mb-6">
              <Coins className="text-[#F59E0B]" size={24} />
            </div>
            <div className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest mb-2">PROOF OF ATTENTION</div>
            <h3 className="text-2xl font-bold text-white mb-3">The C-Coin Economy</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Value is minted only by verified focused minutes. Earn micro-bounties, tip peer notes, stake on study goals, or cash out to fiat.
            </p>
            <div className="bg-[#0b0d14] border border-[#2b3145] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Verified Ledger Balance</span>
               <div className="text-4xl font-extrabold text-[#F59E0B] mb-1 tracking-tight">2,890 <span className="text-base text-[#94a3b8] font-medium">C-COINS</span></div>
               <div className="text-[10px] text-[#10B981] font-bold flex items-center justify-center gap-1"><CheckCircle size={10} className="fill-current"/> Instant query settlement</div>
            </div>
          </div>

          <div className="bg-[#131620] border border-[#2b3145] rounded-3xl p-8 relative overflow-hidden group hover:border-[#475569] transition-colors">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl" />
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20 mb-6">
              <Bot className="text-[#10B981]" size={24} />
            </div>
            <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest mb-2">SUB-TERMINAL AUTONOMIE AI</div>
            <h3 className="text-2xl font-bold text-white mb-3">Samuel AI Copilot</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Samuel breaks down 4h hour transcripts into blueprints, resolves complex homework blocks, and clarifies cryptic proofs in real-time.
            </p>
            <div className="bg-[#0b0d14] border border-[#2b3145] rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-[#10B981]/20 flex items-center justify-center mt-1"><Bot size={12} className="text-[#10B981]"/></div>
                <div>
                  <p className="text-xs font-bold text-white mb-1">"Walk me through the 'Low-Rank Adaption' matrix in LLMs?"</p>
                  <p className="text-[10px] text-[#94a3b8]">Auto-generated 14 flow charts • 0 C-Coins</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#131620] border border-[#2b3145] rounded-3xl p-8 relative overflow-hidden group hover:border-[#475569] transition-colors">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            <div className="w-12 h-12 rounded-2xl bg-[#2b3145] flex items-center justify-center border border-[#475569]/50 mb-6">
              <Library className="text-[#94a3b8]" size={24} />
            </div>
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">DECENTRALIZED LEDGER • 1</div>
            <h3 className="text-2xl font-bold text-white mb-3">The Library: Peer Material Exchange</h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed">
              Unlock comprehensive syllabus summaries, past exams, and conceptual blueprints written by top 1% graduates. Earn C-Coins whenever another student references your study guide.
            </p>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-[800px] mx-auto px-6 py-24 mb-10 relative z-10">
        <div className="bg-[#131620] border border-[#2b3145] rounded-[40px] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#6366F1]/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest mb-6 relative z-10">
            <Coins size={12} className="inline mr-1" /> 500 C-COINS SIGNUP BONUS
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight relative z-10">
            Ready to Upgrade Your Study Velocity?
          </h2>
          <p className="text-[#94a3b8] text-sm md:text-base max-w-lg mx-auto mb-10 relative z-10">
            Sign up with your university email to claim 500 starter C-Coins, join institutional chambers, and unlock high-yield academic materials instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 relative z-10">
            <div className="relative w-full max-w-xs">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
              <input type="email" placeholder="scholar@university.edu" className="w-full bg-[#0b0d14] border border-[#2b3145] text-white text-sm px-10 py-4 rounded-xl focus:outline-none focus:border-[#6366F1] transition-colors" />
            </div>
            <button className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#4f46e5] text-white px-8 py-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              Get Updates
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 relative z-10">
            <button onClick={() => navigate('/onboarding')} className="bg-white text-black px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors shadow-lg">
              Start Earning C-Coins <ArrowRight size={14} className="inline ml-1" />
            </button>
            <button className="text-[#94a3b8] text-xs font-bold hover:text-white transition-colors">
              Explore Study Guides
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2b3145] bg-[#0b0d14] pt-16 pb-8 relative z-10">
        <div className="max-w-[1000px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={20} className="text-[#6366F1]" />
              <span className="font-bold text-white tracking-tight">Studial</span>
            </div>
            <p className="text-xs text-[#94a3b8] max-w-[200px]">The atmospheric, gamified study multi-tool for hyper-focused advocates and collaborative learners worldwide.</p>
          </div>
          <div>
            <h4 className="font-bold text-white text-xs mb-4 uppercase tracking-widest">Ecosystem</h4>
            <ul className="space-y-3 text-[11px] text-[#94a3b8]">
              <li><a href="#" className="hover:text-white transition-colors">Multiplayer Rooms</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Samuel AI Copilot</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Decentralized Focus Vaults</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Curated Lectures</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-xs mb-4 uppercase tracking-widest">University Governance</h4>
            <ul className="space-y-3 text-[11px] text-[#94a3b8]">
              <li><a href="#" className="hover:text-white transition-colors">Campus Guidelines</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Academic Integrity Code</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Institutional Verification</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Research Grants</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-xs mb-4 uppercase tracking-widest">Legal & Privacy</h4>
            <ul className="space-y-3 text-[11px] text-[#94a3b8]">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Architecture</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Zero-Knowledge Security</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1000px] mx-auto px-6 border-t border-[#2b3145]/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-[#475569] font-medium">© {new Date().getFullYear()} Studial Protocol. Architected for disciplined university scholars.</p>
          <div className="flex items-center gap-4">
             {/* Social mock icons */}
             <div className="w-8 h-8 rounded-full border border-[#2b3145] flex items-center justify-center text-[#475569] hover:text-[#94a3b8] hover:border-[#475569] cursor-pointer transition-colors"><Search size={14}/></div>
             <div className="w-8 h-8 rounded-full border border-[#2b3145] flex items-center justify-center text-[#475569] hover:text-[#94a3b8] hover:border-[#475569] cursor-pointer transition-colors"><MessageCircle size={14}/></div>
          </div>
        </div>
      </footer>

    </div>
  );
}
