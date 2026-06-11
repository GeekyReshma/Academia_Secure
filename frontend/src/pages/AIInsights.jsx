import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Brain, LayoutDashboard, Users, CheckCircle, BookOpen, LogOut, 
  Search, BellRing, AlertTriangle, Lightbulb, ArrowUpRight, Loader2, Filter
} from 'lucide-react';

const AIInsights = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [insightsData, setInsightsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Administrative Control: Section-based filtration state
  const [selectedSection, setSelectedSection] = useState('ALL');

  // Session Recovery: Retrieving user identity from local persistence
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Administrator', role: 'admin' };

  // Authorization Helper: Provides JWT Bearer token for secure telemetry access
  const getAuthConfig = () => {
      const token = localStorage.getItem('token');
      return { headers: { Authorization: `Bearer ${token}` } };
  };

  /**
   * Predictive Analysis Hook:
   * Synchronizes the 'Risk Radar' matrix based on selected institutional clusters (Sections).
   */
  useEffect(() => {
      const fetchAIInsights = async () => {
          setLoading(true);
          try {
              // Constructing query string for backend filtration logic
              const query = selectedSection !== 'ALL' ? `?section=${selectedSection}` : '';
              const res = await axios.get(`http://localhost:5000/api/insights/risk-radar${query}`, getAuthConfig());
              setInsightsData(res.data);
          } catch (err) {
              console.error("Telemetry Sync Error: AI Insights unreachable.");
              if (err.response?.status === 401) {
                  navigate('/');
              }
          } finally {
              setLoading(false);
          }
      };
      fetchAIInsights();
  }, [selectedSection, navigate]);

  // Client-side filtration for rapid UI searching
  const filteredInsights = insightsData.filter(item => 
    item.student?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.course?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#0f111a] text-white font-sans text-left relative overflow-hidden selection:bg-purple-500/30">
      
      {/* ENTERPRISE SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 p-6 flex flex-col justify-between bg-[#0f111a] sticky top-0 h-screen shrink-0 shadow-2xl">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20"><Brain size={24}/></div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Academia<span className="text-blue-500">AI</span></h1>
          </div>
          
          <div className="bg-[#161925] p-4 rounded-2xl border border-gray-800 mb-8 flex items-center gap-3 shadow-inner">
             <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center font-black">
                 {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
             </div>
             <div className="overflow-hidden">
                 <h4 className="text-sm font-bold text-gray-100 truncate">{user.name}</h4>
                 <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest leading-none mt-1">{user.role}</p>
             </div>
          </div>

          <nav className="space-y-1.5">
            <NavItem icon={<LayoutDashboard size={20}/>} label="Operational Hub" onClick={() => navigate('/admin')} />
            <NavItem icon={<Users size={20}/>} label="User Directory" onClick={() => navigate('/admin/manage-users')} />
            <NavItem icon={<CheckCircle size={20}/>} label="Attendance Hub" onClick={() => navigate('/admin/take-attendance')} />
            <NavItem icon={<BookOpen size={20}/>} label="Curriculum" onClick={() => navigate('/admin/courses')} />
            <NavItem icon={<Brain size={20}/>} label="Neural Insights" active onClick={() => navigate('/admin/ai-insights')} />
          </nav>
        </div>
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full font-bold text-xs uppercase tracking-widest">
            <LogOut size={18}/> <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* VIEWPORT AREA */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#0b0e14]">
        <header className="flex justify-between items-center mb-10">
          <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Analytical Engine</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Institutional Performance Matrix</p>
          </div>
          <button className="p-2.5 bg-[#161925] rounded-xl border border-gray-800 text-gray-400 hover:text-white transition-all shadow-lg">
              <BellRing size={20}/>
          </button>
        </header>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
            <div className="text-left">
                <h1 className="text-5xl font-black flex items-center gap-4 mb-3 tracking-tighter uppercase">
                    <Brain className="text-purple-500" size={48} /> Risk Assessment Radar
                </h1>
                <p className="text-gray-400 text-lg font-medium italic">Predictive modeling identifying student nodes requiring academic intervention.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                {/* Cluster Filter: Section-based registry sorting */}
                <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-purple-500 transition-colors" size={18} />
                    <select 
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="appearance-none bg-[#161925] border border-gray-800 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-purple-500 transition-all text-xs font-black uppercase tracking-widest text-gray-200 cursor-pointer shadow-xl [color-scheme:dark]"
                    >
                        <option value="ALL">Institutional Scope</option>
                        <option value="6P">Cluster: 6P</option>
                        <option value="A">Cluster: A</option>
                        <option value="B">Cluster: B</option>
                    </select>
                </div>

                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Filter by Node or Subject..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#161925] border border-gray-800 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-purple-500 transition-all text-xs font-bold text-gray-200 placeholder-gray-700 shadow-xl"
                    />
                </div>
            </div>
        </div>

        {/* Dynamic Telemetry Loading */}
        {loading ? (
             <div className="flex flex-col items-center justify-center py-48">
                 <Loader2 className="animate-spin text-purple-500 mb-6" size={56} />
                 <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px]">Interrogating Neural Database...</p>
             </div>
        ) : (
            <div className="space-y-6 pb-20">
                {filteredInsights.length > 0 ? (
                    filteredInsights.map((insight, idx) => (
                        <RiskCard key={insight.id || idx} data={insight} navigate={navigate} />
                    ))
                ) : (
                    <div className="text-center py-32 bg-[#161925] border border-dashed border-gray-800 rounded-[48px] shadow-inner">
                        <Brain size={64} className="mx-auto text-gray-800 mb-6 opacity-20"/>
                        <h3 className="text-gray-500 font-black uppercase tracking-widest text-sm">Registry Synchronized</h3>
                        <p className="text-gray-700 text-xs mt-2 font-bold uppercase tracking-widest">No anomalies detected for the selected cluster.</p>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

// --- DATA REPRESENTATION NODES ---

const NavItem = ({ icon, label, active = false, onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-4 px-6 py-4.5 rounded-2xl cursor-pointer transition-all duration-300 font-bold ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </div>
);

const RiskCard = ({ data, navigate }) => {
    const isHighRisk = data.riskLevel === 'High Risk';
    const borderColor = isHighRisk ? 'border-red-500/50 shadow-red-500/5' : 'border-emerald-500/50 shadow-emerald-500/5';
    const badgeColor = isHighRisk ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20';

    return (
        <div className={`bg-[#121421] rounded-[40px] border ${borderColor} p-8 flex flex-col xl:flex-row gap-10 hover:bg-[#161925] transition-all duration-500 shadow-2xl relative overflow-hidden group`}>
            
            {/* Identity Profile Node */}
            <div className="xl:w-1/3 min-w-[300px] text-left">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg ${badgeColor}`}>
                        {data.riskLevel}
                    </span>
                    <span className="bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest border border-white/5 px-3 py-1.5 rounded-lg">Score: {data.score}</span>
                    {data.section && (
                        <span className="bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-500/10">
                            Sec {data.section}
                        </span>
                    )}
                </div>
                <h3 className="text-3xl font-black text-gray-100 mb-2 uppercase tracking-tight">{data.student}</h3>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-8 italic">{data.course}</p>
                
                <div className="flex gap-4">
                    <div className="bg-[#0a0c14] border border-white/5 rounded-3xl p-5 flex-1 flex flex-col items-center justify-center shadow-inner">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">Engagement</span>
                        <span className={`text-2xl font-black tracking-tighter ${isHighRisk ? 'text-red-400' : 'text-emerald-400'}`}>{data.attendance}</span>
                    </div>
                    <div className="bg-[#0a0c14] border border-white/5 rounded-3xl p-5 flex-1 flex flex-col items-center justify-center shadow-inner">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">Projection</span>
                        <span className="text-2xl font-black text-gray-200 tracking-tighter">{data.grade}</span>
                    </div>
                </div>
            </div>

            {/* Diagnostic Matrix */}
            <div className="xl:w-1/3 text-left">
                <h4 className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.25em] mb-6">
                    <AlertTriangle size={18} className={isHighRisk ? "text-red-500" : "text-gray-500"}/> 
                    Risk Decryption
                </h4>
                <ul className="space-y-4">
                    {data.factors?.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-400 font-medium leading-relaxed">
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isHighRisk ? 'bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-gray-700'}`}></div>
                            {factor}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Strategic Intervention Node */}
            <div className="xl:w-1/3 flex flex-col justify-between text-left">
                <div>
                    <h4 className="flex items-center gap-3 text-purple-400 text-[10px] font-black uppercase tracking-[0.25em] mb-6">
                        <Lightbulb size={18} /> Optimization Protocol
                    </h4>
                    <ul className="space-y-4 mb-8">
                        {data.interventions?.map((intervention, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-400 font-medium leading-relaxed">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.4)] shrink-0"></div>
                                {intervention}
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div className="flex justify-end mt-auto">
                    <button 
                        onClick={() => navigate(`/admin/manage-users`)}
                        className="group/btn flex items-center gap-3 px-8 py-3.5 bg-white/5 border border-white/10 rounded-[20px] text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all shadow-xl active:scale-95"
                    >
                        Access Profile <ArrowUpRight size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIInsights;