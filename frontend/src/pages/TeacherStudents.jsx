import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, BookOpen, Users, 
  Brain, LogOut, Search, Mail, AlertTriangle, ShieldCheck, Loader2, Download 
} from 'lucide-react';

const TeacherStudents = () => {
  const navigate = useNavigate();
  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const teacherEmail = localStorage.getItem('email');

  /**
   * Data Fetching Hook:
   * Synchronizes the student performance matrix mapped to the authenticated faculty.
   */
  useEffect(() => {
    const fetchStudents = async () => {
      if (!teacherEmail) return;
      setLoading(true);
      try {
        // REST API: Aggregated student statistics endpoint
        const res = await axios.get(`http://localhost:5000/api/courses/teacher-students-stats/${teacherEmail}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStudentsData(res.data);
      } catch (err) {
        console.error("Telemetry Retrieval Failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [teacherEmail]);

  /**
   * Utility: downloadReport
   * Purpose: Generates an RFC 4180 compliant CSV export for institutional auditing.
   */
  const downloadReport = () => {
    if (studentsData.length === 0) return;
    const headers = ["Student Name", "System ID", "Course", "Attendance %", "Total Classes", "Present Classes", "Risk Status"];
    const rows = filteredStudents.map(s => [s.name, s.id, s.course, `${s.attendance}%`, s.totalClasses, s.presentClasses, s.risk]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Institutional_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Filtration Engine:
   * Handles multi-criteria search and threshold-based risk categorization.
   */
  const filteredStudents = studentsData.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Applying institutional threshold logic (75% Baseline)
    if (filterType === 'high') return matchesSearch && s.attendance < 75 && s.totalClasses > 0;
    if (filterType === 'low') return matchesSearch && (s.attendance >= 75 || s.totalClasses === 0);
    return matchesSearch;
  });

  const lowAttendanceCount = studentsData.filter(s => s.attendance < 75 && s.totalClasses > 0).length;
  const goodAttendanceCount = studentsData.length - lowAttendanceCount;

  if (loading) return (
    <div className="flex h-screen bg-[#0a0c14] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px]">Interrogating Registry Telemetry...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans text-left overflow-hidden selection:bg-blue-500/30">
      
      {/* ENTERPRISE SIDEBAR */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg font-black text-white">AI</div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-8">
          <NavItem icon={<LayoutDashboard size={20} />} label="Operational Hub" onClick={() => navigate('/teacher')} />
          <NavItem icon={<CheckSquare size={20} />} label="Mark Attendance" onClick={() => navigate('/teacher/attendance')} />
          <NavItem icon={<BookOpen size={20} />} label="My Curriculum" onClick={() => navigate('/teacher/courses')} />
          <NavItem icon={<Users size={20} />} label="Student Registry" isActive={true} />
        </nav>
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-xs uppercase tracking-widest"><LogOut size={18} /> <span>Terminate</span></button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#0b0e14] custom-scrollbar">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
          <div className="text-left">
            <h1 className="text-5xl font-black mb-3 text-white tracking-tighter uppercase leading-none">Risk Radar</h1>
            <p className="text-gray-500 font-medium italic">Predictive engagement monitoring and node health assessment.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <button onClick={downloadReport} className="flex items-center gap-3 bg-white text-black hover:bg-gray-200 px-6 py-3.5 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-[10px] uppercase tracking-widest">
              <Download size={16} /> Registry Export
            </button>

            <div className="flex bg-[#161a26] p-1.5 rounded-2xl border border-gray-800 shadow-inner">
                <button onClick={() => setFilterType('all')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Scope: All</button>
                <button onClick={() => setFilterType('high')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'high' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>At Risk</button>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input type="text" placeholder="Filter by Node or Subject..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64 bg-[#161a26] border border-gray-800 rounded-2xl py-3.5 pl-12 pr-6 focus:outline-none focus:border-blue-600 text-xs font-bold text-white transition-all placeholder-gray-800 shadow-xl" />
            </div>
          </div>
        </div>

        {/* ANALYTICAL KPI BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="bg-[#121421] border border-gray-800/60 p-10 rounded-[48px] flex justify-between items-center shadow-2xl group hover:border-emerald-500/20 transition-all">
                <div className="text-left"><p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.25em] mb-2">Registry Nodes: Healthy</p><h3 className="text-5xl font-black text-white tracking-tighter">{goodAttendanceCount}</h3></div>
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform"><ShieldCheck className="text-emerald-500" size={32}/></div>
            </div>
            <div className="bg-[#121421] border border-gray-800/60 p-10 rounded-[48px] flex justify-between items-center shadow-2xl group hover:border-red-500/20 transition-all">
                <div className="text-left"><p className="text-red-500 text-[10px] font-black uppercase tracking-[0.25em] mb-2">Registry Nodes: Critical</p><h3 className="text-5xl font-black text-white tracking-tighter">{lowAttendanceCount}</h3></div>
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-inner group-hover:scale-110 transition-transform"><AlertTriangle className="text-red-500 animate-pulse" size={32}/></div>
            </div>
        </div>

        {/* TELEMETRY REGISTRY TABLE */}
        <div className="bg-[#121421] border border-gray-800/60 rounded-[48px] overflow-hidden shadow-2xl flex flex-col group/table mb-20">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#161a26] border-b border-gray-800 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] sticky top-0 z-10">
              <tr>
                <th className="px-10 py-7">Node Profile</th>
                <th className="px-10 py-7">Curriculum Node</th>
                <th className="px-10 py-7 text-center">Engagement Velocity</th>
                <th className="px-10 py-7 text-center">Status Matrix</th>
                <th className="px-10 py-7 text-right pr-12">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => (
                <tr key={idx} className="hover:bg-[#1c2030] transition-all group/row">
                  <td className="px-10 py-8">
                    <div className="font-black text-gray-100 uppercase tracking-tight text-sm group-row-hover:text-blue-400 transition-colors">{student.name}</div>
                    <div className="text-[10px] text-gray-600 font-bold mt-1.5 uppercase tracking-widest">{student.id} <span className="mx-2 opacity-30">|</span> Cluster {student.section || 'NA'}</div>
                  </td>
                  <td className="px-10 py-8">
                      <span className="bg-blue-600/5 text-blue-500/80 px-3 py-1.5 rounded-lg border border-blue-600/10 text-[10px] font-black uppercase tracking-widest shadow-inner">{student.course}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6 justify-center">
                      <div className="w-32 h-2 bg-gray-900 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <div className={`h-full rounded-full transition-all duration-1000 ${student.attendance < 75 ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'}`} style={{ width: `${student.attendance}%` }}></div>
                      </div>
                      <span className={`text-sm font-black tracking-tighter w-10 ${student.attendance < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{student.attendance}%</span>
                    </div>
                    <p className="text-[9px] text-gray-700 font-black text-center mt-2 uppercase tracking-widest">{student.presentClasses} / {student.totalClasses} Synchronized Sessions</p>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="flex justify-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${student.attendance < 75 && student.totalClasses > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                        {student.attendance < 75 && student.totalClasses > 0 ? 'High Risk' : 'Healthy Node'}
                        </span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right pr-12">
                    <button className={`p-4 rounded-2xl transition-all shadow-xl active:scale-90 ${student.attendance < 75 && student.totalClasses > 0 ? 'bg-red-600 text-white shadow-red-600/20 hover:bg-red-500' : 'bg-[#0a0c14] text-gray-700 border border-gray-800 hover:text-white hover:border-gray-600'}`}><Mail size={18} /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="px-8 py-32 text-center text-gray-700 font-black uppercase tracking-[0.3em] text-xs italic">Registry Null: No student nodes matched filtration criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

// UI Atoms: Modular Nav Node
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl transition-all duration-300 font-bold mb-2 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);

export default TeacherStudents;