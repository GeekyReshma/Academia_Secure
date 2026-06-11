import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, LogOut, Brain, 
  CheckCircle2, AlertTriangle, TrendingUp, Sparkles, Loader2, Clock 
} from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Data Orchestration Hook:
   * Synchronizes student profile, session telemetry, and AI-generated insights.
   */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const email = localStorage.getItem('email');
        if (!email) { navigate('/'); return; }
        // Synchronizing telemetry stream from the analytical endpoint
        const res = await axios.get(`http://localhost:5000/api/student/dashboard/${email}`);
        setData(res.data);
      } catch (err) {
        setError("Failed to synchronize dashboard telemetry.");
      } finally { setLoading(false); }
    };
    fetchDashboard();
  }, [navigate]);

  if (loading) return (
    <div className="flex h-screen bg-[#0a0c14] items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48}/>
        <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Interfacing with AI Core...</p>
    </div>
  );

  if (error || !data) return (
    <div className="flex h-screen bg-[#0a0c14] items-center justify-center">
        <div className="bg-[#161a26] p-10 rounded-[40px] border border-red-500/20 text-center shadow-2xl">
            <AlertTriangle className="text-red-500 mx-auto mb-6" size={56}/>
            <h2 className="text-white text-2xl font-black uppercase tracking-tight mb-2">Registry Error</h2>
            <p className="text-gray-500 text-sm font-medium mb-8">Unauthorized identity or session timeout.</p>
            <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Return to Gateway</button>
        </div>
    </div>
  );

  const { student, stats, aiInsights } = data;
  
  /**
   * Status Logic: 
   * Dynamic behavioral mapping based on engagement thresholds (Safe/Borderline/Risk).
   */
  let statusColor = "text-emerald-500";
  let statusBg = "bg-emerald-500/10 border-emerald-500/20";
  let statusText = "SAFE ZONE";
  let ringColor = "#10b981";

  if (stats.totalSessions === 0) {
    statusColor = "text-blue-500";
    statusBg = "bg-blue-500/10 border-blue-500/20";
    statusText = "PROVISIONING PENDING";
    ringColor = "#3b82f6"; 
  } else if (stats.overallPercentage < 65) {
    statusColor = "text-red-500";
    statusBg = "bg-red-500/10 border-red-500/20";
    statusText = "CRITICAL RISK";
    ringColor = "#ef4444"; 
  } else if (stats.overallPercentage < 75) {
    statusColor = "text-yellow-500";
    statusBg = "bg-yellow-500/10 border-yellow-500/20";
    statusText = "BORDERLINE THRESHOLD";
    ringColor = "#eab308"; 
  }

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans text-left overflow-hidden selection:bg-blue-500/30">
      
      {/* ENTERPRISE NAVIGATION SIDEBAR */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><Brain className="text-white w-6 h-6"/></div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>
        <div className="px-4 mb-8">
          <div className="bg-[#161a26] p-4 rounded-3xl flex items-center gap-4 border border-gray-800 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-black text-lg border border-blue-500/10">{student.initials}</div>
            <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-white truncate uppercase tracking-tight">{student.name}</h3>
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Student Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1.5">
          <NavItem icon={<LayoutDashboard size={20} />} label="Operational Hub" isActive={true} onClick={() => navigate('/student')} />
          <NavItem icon={<BookOpen size={20} />} label="Curriculum Nodes" onClick={() => navigate('/student/courses')} />
        </nav>
        <div className="p-4 border-t border-gray-800/50">
            <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-[10px] uppercase tracking-widest"><LogOut size={18} /> <span>Terminate Session</span></button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-10 relative bg-[#0b0e14] custom-scrollbar">
        <header className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="text-left">
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-3 leading-none">Hello, <span className="text-blue-500">{student.name.split(' ')[0]}</span></h1>
                <div className="flex flex-wrap gap-3 items-center">
                    <span className="bg-[#161a26] text-gray-400 border border-gray-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">{student.department}</span>
                    <span className="bg-blue-900/10 text-blue-400 border border-blue-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">Cluster Term: {student.batch || '2026'}</span>
                </div>
            </div>
            {/* Real-time Risk Assessment Indicator */}
            <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-3 font-black text-[9px] uppercase tracking-[0.2em] shadow-xl ${statusBg} ${statusColor}`}>
                <div className={`w-2 h-2 rounded-full animate-ping ${statusColor === 'text-emerald-500' ? 'bg-emerald-500' : (statusColor === 'text-red-500' ? 'bg-red-500' : 'bg-blue-500')}`}></div>
                Neural Health: {statusText}
            </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 mb-12">
            {/* Visual Telemetry: Attendance Matrix */}
            <div className="bg-[#121421] rounded-[48px] p-10 border border-gray-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="w-full flex justify-between items-center mb-10 absolute top-10 px-10 text-left">
                    <h3 className="font-black text-[11px] uppercase tracking-[0.25em] text-gray-500">Participation Matrix</h3>
                </div>
                <div className="relative w-48 h-48 mt-12 mb-10 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" className="stroke-[#0a0c14]" strokeWidth="10" fill="none" />
                        <circle cx="50" cy="50" r="42" stroke={ringColor} strokeWidth="10" fill="none" strokeLinecap="round" style={{ strokeDasharray: 263.9, strokeDashoffset: 263.9 - (263.9 * stats.overallPercentage) / 100, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-white tracking-tighter">{stats.overallPercentage}%</span>
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Aggregated</span>
                    </div>
                </div>
                {/* Engagement Breakdown Cluster */}
                <div className="flex w-full gap-5 mt-auto">
                    <StatBox label="Sessions Present" count={stats.presentCount} color="text-emerald-500" />
                    <StatBox label="Sessions Absent" count={stats.absentCount} color="text-red-500" />
                </div>
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mt-8 italic">{stats.totalSessions} Total Registry Logs Synchronized</p>
            </div>

            {/* Neural Insights Node: AI Analysis */}
            <div className="xl:col-span-2 bg-gradient-to-br from-[#1c152e] to-[#121421] rounded-[48px] p-10 border border-purple-500/10 shadow-2xl flex flex-col relative overflow-hidden text-left group">
                <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Brain size={350}/></div>
                <div className="flex items-center gap-5 mb-10 relative z-10">
                    <div className="p-4 bg-purple-600 rounded-[20px] shadow-[0_15px_40px_rgba(147,51,234,0.3)] text-white group-hover:rotate-6 transition-transform"><Sparkles size={28}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Neural Study Companion</h2>
                        <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Personalized Performance Analysis</p>
                    </div>
                </div>
                
                <p className="text-gray-300 mb-10 relative z-10 text-xl font-medium leading-relaxed italic">
                    {stats.totalSessions === 0 
                        ? "Curriculum telemetry inactive. Synthesizing academic roadmap based on initial enrollment." 
                        : <>Engagement node detected at <span className="font-black text-white not-italic">{stats.overallPercentage}% velocity</span>. Analyzing trajectory data...</>
                    }
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10 mb-10">
                    <div className="bg-[#0a0c14]/30 p-6 rounded-[32px] border border-emerald-500/5">
                        <h4 className="flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em]"><TrendingUp size={16}/> Dominant Strengths</h4>
                        <ul className="space-y-4">
                            {aiInsights.strengths.map((str, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-400 font-medium">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></div> {str}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-[#0a0c14]/30 p-6 rounded-[32px] border border-blue-500/5">
                        <h4 className="flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em]"><CheckCircle2 size={16}/> Optimization Areas</h4>
                        <ul className="space-y-4">
                            {aiInsights.focusAreas.map((area, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-400 font-medium">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0"></div> {area}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                
                <div className="mt-auto p-6 bg-[#0a0c14]/60 border border-purple-500/20 rounded-[28px] relative z-10 shadow-inner group-hover:border-purple-500/40 transition-colors">
                    <p className="text-purple-300 text-xs italic text-center font-bold tracking-tight">"{aiInsights.quote}"</p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

// UI ATOMS: Modular Navigation and Data Nodes
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl transition-all duration-300 font-bold mb-1.5 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const StatBox = ({ label, count, color }) => (
  <div className="flex-1 bg-[#0a0c14] border border-gray-800/40 rounded-3xl p-6 flex flex-col items-center justify-center transition-all hover:border-gray-600 shadow-inner">
    <span className={`text-4xl font-black mb-1 tracking-tighter ${color}`}>{count}</span>
    <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.25em]">{label}</span>
  </div>
);

export default StudentDashboard;