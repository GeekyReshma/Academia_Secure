import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, BookOpen, Brain, LogOut, 
  Bell, TrendingUp, AlertTriangle, CheckCircle, ArrowRight 
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

// Global Registration of Chart.js components for institutional data visualization
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Identity Recovery: Fetching authenticated user metadata from persistence layer
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Administrator', role: 'admin' };
  
  // State Initialization for Telemetry and Analytics
  const [stats, setStats] = useState({ totalStudents: 0, totalFaculty: 0, totalCourses: 0, avgAttendance: 0 });
  const [recentCourses, setRecentCourses] = useState([]);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Graphical State: Time-series trend data
  const [trend, setTrend] = useState({ labels: ['Loading...'], data: [0] });

  // Security Helper: Attaches JWT Bearer token for authorized API handshake
  const getAuthConfig = () => {
      const token = localStorage.getItem('token');
      return { headers: { Authorization: `Bearer ${token}` } };
  };

  /**
   * Data Orchestration Hook:
   * Synchronizes institutional statistics, curriculum snapshots, and AI risk telemetry.
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const config = getAuthConfig();

      try {
        // Parallel Request: Institutional KPIs and Trends
        const statsRes = await axios.get('http://localhost:5000/api/admin/stats', config);
        setStats(prev => ({ ...prev, ...statsRes.data }));
        if (statsRes.data.trend) setTrend(statsRes.data.trend);

        // Registry Sync: Active Curricular Modules
        const coursesRes = await axios.get('http://localhost:5000/api/admin/courses-all', config); 
        if (Array.isArray(coursesRes.data)) setRecentCourses(coursesRes.data.slice(0, 3));

        // Intelligence Sync: Global Attendance Aggregation
        const insightsRes = await axios.get('http://localhost:5000/api/insights/dashboard', config); 
        if (insightsRes.data?.insights) {
            setStats(prev => ({ ...prev, avgAttendance: parseInt(insightsRes.data.insights.overallAttendancePercentage) || 0 }));
        }

        // Predictive Analytics: Real-time Risk Matrix Radar
        const riskRes = await axios.get('http://localhost:5000/api/insights/risk-radar', config);
        if (Array.isArray(riskRes.data)) {
            // Filtering logic: Isolate high-risk student nodes with active session history
            const highRiskProfiles = riskRes.data.filter(s => s.riskLevel === 'High Risk' && s.attendance !== '0%');
            setAiAlerts(highRiskProfiles); 
        }

      } catch (err) {
        console.error("Critical: Dashboard telemetry sync failed.");
        if (err.response?.status === 401) {
            localStorage.clear();
            navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [navigate]);

  // Visualization Configuration for Institutional Attendance Trajectory
  const chartData = {
    labels: trend.labels,
    datasets: [{
      fill: true,
      label: 'Engagement Velocity %',
      data: trend.data,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    }]
  };

  return (
    <div className="flex min-h-screen bg-[#0f111a] text-white font-sans text-left selection:bg-blue-500/30">
      
      {/* ENTERPRISE NAVIGATION SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 p-6 flex flex-col justify-between bg-[#0f111a] sticky top-0 h-screen shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20"><Brain size={24}/></div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
          </div>
          
          <div className="bg-[#161925] p-4 rounded-2xl border border-gray-800 mb-8 flex items-center gap-3 shadow-inner group transition-all hover:bg-[#1c2030]">
             <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center font-bold border border-blue-500/10">
                 {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
             </div>
             <div className="overflow-hidden">
                 <h4 className="text-sm font-bold text-gray-100 truncate">{user.name}</h4>
                 <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest leading-none mt-1">{user.role}</p>
             </div>
          </div>

          <nav className="space-y-1.5 text-left">
            <NavItem icon={<LayoutDashboard size={20}/>} label="Operational Hub" active onClick={() => navigate('/admin')} />
            <NavItem icon={<Users size={20}/>} label="Identity Hub" onClick={() => navigate('/admin/manage-users')} />
            <NavItem icon={<CheckCircle size={20}/>} label="Attendance Terminal" onClick={() => navigate('/admin/take-attendance')} />
            <NavItem icon={<BookOpen size={20}/>} label="Curriculum" onClick={() => navigate('/admin/courses')} />
            <NavItem icon={<Brain size={20}/>} label="AI Insights" onClick={() => navigate('/admin/ai-insights')} />
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full font-bold text-xs uppercase tracking-widest">
            <LogOut size={18}/> <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#0b0e14]">
        <header className="flex justify-between items-center mb-10">
          <div>
              <h2 className="text-2xl font-black tracking-tight uppercase text-gray-100">Institutional Dashboard</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Live Operational Monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                <span className="text-[9px] text-emerald-500 font-black tracking-[0.2em]">TELEMETRY ACTIVE</span>
            </div>
            <button className="p-2.5 bg-[#161925] rounded-xl border border-gray-800 text-gray-400 hover:text-white transition-all shadow-lg">
              <Bell size={20}/>
            </button>
          </div>
        </header>

        {/* HERO SECTION: USER CONTEXT */}
        <div className="bg-gradient-to-br from-[#161925] to-[#0f111a] p-10 rounded-[48px] border border-gray-800/50 mb-10 flex items-center gap-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
             <Brain size={280} />
          </div>
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] shrink-0 transition-transform group-hover:rotate-6">
              <LayoutDashboard size={40}/>
          </div>
          <div className="text-left relative z-10">
            <h1 className="text-5xl font-black text-gray-100 tracking-tighter uppercase">Hello, {user.name.split(' ')[0]}</h1>
            <p className="text-gray-400 font-medium text-lg mt-2 italic">Aggregating real-time performance clusters for <span className="text-blue-500 font-bold tracking-normal not-italic">Sharda University</span></p>
          </div>
        </div>

        {/* ANALYTICAL KPI GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard label="Registry Nodes" value={stats.totalStudents} icon={<Users size={20}/>} color="bg-emerald-500/10 text-emerald-500" />
          <StatCard label="Faculty Core" value={stats.totalFaculty} icon={<BookOpen size={20}/>} color="bg-blue-500/10 text-blue-500" />
          <StatCard label="Active Units" value={stats.totalCourses} icon={<TrendingUp size={20}/>} color="bg-indigo-500/10 text-indigo-500" />
          <StatCard label="Institutional Avg" value={`${stats.avgAttendance || 0}%`} icon={<CheckCircle size={20}/>} color="bg-purple-500/10 text-purple-500" />
        </div>

        {/* CENTRAL INTELLIGENCE SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Card: Curriculum Snapshot */}
          <div className="bg-[#161925] p-10 rounded-[56px] border border-gray-800/50 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-gray-100 uppercase tracking-tight">Registry Updates</h3>
              <button onClick={() => navigate('/admin/courses')} className="text-blue-500 hover:text-blue-400 text-[10px] flex items-center gap-2 font-black uppercase tracking-[0.2em] transition-all">Hub Access <ArrowRight size={14}/></button>
            </div>
            <div className="space-y-4">
              {recentCourses.length > 0 ? recentCourses.map((course, idx) => (
                <CourseRow key={idx} title={course.courseName} subtitle={`${course.courseCode} • Enrolled Identities: ${course.students?.length || 0}`} tag={course.section || "Active"} />
              )) : (
                <p className="text-gray-600 text-sm font-bold uppercase tracking-widest py-10 text-center">Null Data Stream</p>
              )}
            </div>
          </div>

          {/* Card: Predictive AI Risk Matrix */}
          <div className="bg-[#161925] p-10 rounded-[56px] border border-gray-800/50 shadow-2xl text-left">
            <h3 className="text-xl font-black flex items-center gap-3 mb-10 text-gray-100 uppercase tracking-tight">
              <Brain size={24} className="text-purple-500"/> Risk Matrix Radar
            </h3>
            <div className="space-y-4">
              {aiAlerts.length > 0 ? aiAlerts.slice(0, 3).map((alert, i) => (
                <InsightRow key={i} title={`${alert.student}: Critical Engagement Gap`} subtitle={`${alert.attendance} Logged • At-Risk Node`} status="critical" />
              )) : (
                <InsightRow title="Matrix Nominal" subtitle="Engagement levels currently within healthy thresholds." status="safe" />
              )}
            </div>
          </div>
        </div>

        {/* DATA VISUALIZATION BLOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 text-left">
          <div className="bg-[#161925] p-10 rounded-[56px] border border-gray-800/50">
            <div className="flex items-center gap-3 mb-10 text-yellow-500">
              <AlertTriangle size={22}/> <h3 className="font-black text-white uppercase text-[11px] tracking-[0.3em]">Health Summary</h3>
            </div>
            <div className="space-y-5">
              <AlertRow label="Critical Overrides" count={aiAlerts.length} color="text-red-500" bg="bg-red-500" />
              <AlertRow label="Optimal Nodes" count={Math.max(0, stats.totalStudents - aiAlerts.length)} color="text-emerald-500" bg="bg-emerald-500" />
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#161925] p-10 rounded-[56px] border border-gray-800/50 shadow-2xl relative overflow-hidden">
            <h3 className="font-black mb-8 text-gray-100 uppercase text-sm tracking-widest">Attendance Velocity Trajectory</h3>
            <div className="h-72 relative z-10">
              <Line 
                data={chartData} 
                options={{ 
                  maintainAspectRatio: false, 
                  plugins: { legend: { display: false } }, 
                  scales: { 
                    y: { display: true, min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4b5563', font: { weight: 'bold', size: 10 } } }, 
                    x: { grid: { display: false }, ticks: { color: '#4b5563', font: { weight: 'bold', size: 10 } } } 
                  } 
                }} 
              />
            </div>
          </div>
        </div>

        {/* ADMINISTRATIVE QUICK COMMANDS */}
        <h3 className="text-gray-500 font-black text-[10px] tracking-[0.4em] uppercase mb-8 ml-4 text-left">Administrative Protocols</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-20">
          <QuickActionCard onClick={() => navigate('/admin/manage-users')} icon={<Users className="text-emerald-500"/>} title="Identity Hub" sub="Access & Roster Mgmt" />
          <QuickActionCard onClick={() => navigate('/admin/take-attendance')} icon={<CheckCircle className="text-blue-500"/>} title="Attendance" sub="Log Overrides" />
          <QuickActionCard onClick={() => navigate('/admin/courses')} icon={<BookOpen className="text-indigo-500"/>} title="Curriculum" sub="Structure & Leads" />
          <QuickActionCard onClick={() => navigate('/admin/ai-insights')} icon={<Brain className="text-purple-500"/>} title="Neural Reports" sub="Predictive Modeling" />
        </div>
      </main>
    </div>
  );
};

// UI ATOMS: Functional Components
const NavItem = ({ icon, label, active = false, onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-4 px-6 py-4.5 rounded-2xl cursor-pointer transition-all duration-300 font-bold ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </div>
);

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-[#161925] p-10 rounded-[48px] border border-gray-800/50 flex flex-col justify-between text-left hover:border-blue-500/20 transition-all hover:-translate-y-1 shadow-xl group">
    <div className={`p-4 rounded-2xl ${color} w-fit mb-8 shadow-inner group-hover:scale-110 transition-transform`}>{icon}</div>
    <div>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.25em] mb-3">{label}</p>
      <h4 className="text-5xl font-black text-gray-100 tracking-tighter">{value}</h4>
    </div>
  </div>
);

const CourseRow = ({ title, subtitle, tag }) => (
  <div className="flex items-center justify-between p-6 bg-[#0f111a] hover:bg-[#1c2030] rounded-3xl transition-all cursor-pointer border border-gray-800/30 group shadow-lg">
    <div className="flex items-center gap-5">
      <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><BookOpen size={20}/></div>
      <div className="text-left overflow-hidden">
        <h4 className="text-sm font-bold text-gray-200 tracking-tight leading-none uppercase truncate">{title}</h4>
        <p className="text-[10px] text-gray-500 mt-2 font-medium truncate">{subtitle}</p>
      </div>
    </div>
    <span className="text-[9px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-blue-500/10 shrink-0">Sec {tag}</span>
  </div>
);

const InsightRow = ({ title, subtitle, status }) => (
  <div className="p-6 bg-[#0f111a] hover:bg-[#1c2030] rounded-3xl transition-all border border-gray-800/30 cursor-pointer shadow-lg">
    <div className="flex gap-5 items-start">
      <div className={`mt-2 w-2 h-2 rounded-full shrink-0 animate-pulse ${status === 'critical' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}></div>
      <div className="text-left">
        <h4 className="text-[13px] font-bold text-gray-200 leading-snug uppercase">{title}</h4>
        <p className="text-[9px] text-gray-500 mt-2 font-black tracking-widest uppercase">{subtitle}</p>
      </div>
    </div>
  </div>
);

const AlertRow = ({ label, count, color, bg }) => (
  <div className="flex items-center justify-between p-6 rounded-[32px] bg-[#0b0e14] border border-gray-800/50 shadow-inner">
    <div className="flex items-center gap-4">
      <div className={`w-2 h-2 rounded-full ${bg} shadow-lg shadow-current`}></div>
      <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-4xl font-black tracking-tighter ${color}`}>{count}</span>
  </div>
);

const QuickActionCard = ({ icon, title, sub, onClick }) => (
  <div onClick={onClick} className="bg-[#161925] p-10 rounded-[56px] border border-gray-800/50 hover:border-blue-500/30 transition-all cursor-pointer group text-left shadow-2xl relative overflow-hidden active:scale-95">
    <div className="p-4 bg-[#0f111a] w-fit rounded-2xl mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 border border-gray-800 shadow-inner">{icon}</div>
    <h4 className="font-black text-lg mb-2 text-gray-100 tracking-tight uppercase leading-none">{title}</h4>
    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">{sub}</p>
  </div>
);

export default AdminDashboard;