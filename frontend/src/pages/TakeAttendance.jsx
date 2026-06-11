import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, LayoutDashboard, Users, CheckCircle, BookOpen, LogOut,
  Calendar, Save, CheckCircle2, XCircle, Loader2, Search, AlertCircle, Lock
} from 'lucide-react';

/**
 * Utility: getLocalDateString
 * Purpose: Generates ISO-compliant date strings with daily offsets.
 * Usage: offset 0 for Today, -1 for Yesterday.
 */
const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TakeAttendance = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState([]);
  
  const todayStr = getLocalDateString(0);
  const yesterdayStr = getLocalDateString(-1); 

  const [date, setDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Identity Recovery: Fetching role from institutional persistence layer
  const userRole = localStorage.getItem('role') || 'admin';

  /**
   * Access Control Logic:
   * Enforces institutional temporal policy. 
   * - Faculty: Restricted to a 48-hour operational window.
   * - Admin: Full archival access for manual overrides.
   */
  const isActionAllowed = () => {
    if (userRole === 'admin') return true;
    return date === todayStr || date === yesterdayStr; 
  };

  // Lifecycle: Synchronizing curriculum nodes for selection
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/courses-all');
        setCourses(res.data);
        if (res.data.length > 0) setSelectedCourse(res.data[0].courseCode);
      } catch (err) { console.error("Course Registry Sync Failed"); }
    };
    fetchCourses();
  }, []);

  // Syncing student roster based on selected curriculum node
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedCourse) return;
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/attendance/students/${selectedCourse}`);
        setStudents(res.data);
      } catch (err) {
        console.error("Roster Retrieval Error");
        setStudents([]); 
      } finally { setLoading(false); }
    };
    fetchStudents();
  }, [selectedCourse]);

  // UI Handlers: Status toggling with temporal validation
  const toggleStatus = (id, newStatus) => {
    if (!isActionAllowed()) return; 
    setStudents(prev => prev.map(s => s._id === id ? { ...s, status: newStatus } : s));
  };

  const markAll = (status) => {
    if (!isActionAllowed()) return;
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  /**
   * Transaction Handler: submitAttendance
   * Purpose: Commits attendance telemetry to the database.
   * Logic: Validates temporal access before executing POST request.
   */
  const submitAttendance = async () => {
    if (!isActionAllowed()) return;

    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s._id,
        name: s.name,
        status: s.status
      }));

      await axios.post('http://localhost:5000/api/attendance/mark', {
        courseId: selectedCourse,
        date: date,
        records: records,
        userRole: userRole 
      });

      navigate(userRole === 'faculty' ? '/teacher' : '/admin');
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Transmission Failure";
      alert(`System Alert: ${errorMsg}`);
    } finally { setSaving(false); }
  };

  // Client-side registry filter
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans text-left overflow-hidden selection:bg-blue-500/30">
      
      {/* ENTERPRISE NAVIGATION */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><Brain className="text-white w-6 h-6"/></div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {userRole === 'admin' ? (
              <>
                  <NavItem icon={<LayoutDashboard size={20} />} label="Operational Hub" onClick={() => navigate('/admin')} />
                  <NavItem icon={<Users size={20} />} label="User Registry" onClick={() => navigate('/admin/manage-users')} />
                  <NavItem icon={<CheckCircle size={20} />} label="Attendance Terminal" isActive={true} onClick={() => navigate('/admin/take-attendance')} />
                  <NavItem icon={<BookOpen size={20} />} label="Curriculum" onClick={() => navigate('/admin/courses')} />
                  <NavItem icon={<Brain size={20}/>} label="AI Insights" onClick={() => navigate('/admin/ai-insights')} />
              </>
          ) : (
              <>
                  <NavItem icon={<LayoutDashboard size={20} />} label="Faculty Hub" onClick={() => navigate('/teacher')} />
                  <NavItem icon={<CheckCircle size={20} />} label="Mark Attendance" isActive={true} onClick={() => {}} />
              </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-xs uppercase tracking-widest"><LogOut size={20} /> <span>Terminate</span></button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0e14]">
        <div className="p-8 pb-6 shrink-0">
          <div className="flex items-center gap-4 mb-2 text-left">
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl shadow-inner"><CheckCircle className="text-blue-500" size={28}/></div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Attendance Terminal</h1>
              <p className="text-gray-500 font-medium italic">Status: {userRole === 'admin' ? 'Administrative Override' : 'Standard 48h Window'}</p>
            </div>
          </div>

          {/* CONTROL INTERFACE */}
          <div className="mt-8 flex flex-wrap gap-5 items-end bg-[#161a26] p-8 rounded-[32px] border border-gray-800 shadow-2xl relative overflow-hidden group">
            {!isActionAllowed() && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}

            <div className="flex-1 min-w-[300px] relative z-10 text-left">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-3 block ml-1">Curriculum Node</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full bg-[#0a0c14] border border-gray-800 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-blue-600 font-bold cursor-pointer transition-all shadow-inner appearance-none [color-scheme:dark]">
                {courses.map(c => <option key={c.courseCode} value={c.courseCode}>{c.courseCode} - {c.courseName}</option>)}
              </select>
            </div>
            
            <div className="w-56 relative z-10 text-left">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-3 block ml-1">Session Timeline</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                min={userRole === 'faculty' ? yesterdayStr : undefined} 
                max={userRole === 'faculty' ? todayStr : undefined} 
                className={`w-full bg-[#0a0c14] border ${!isActionAllowed() ? 'border-red-500/50 text-red-400' : 'border-gray-800 text-white'} rounded-xl py-4 px-5 focus:outline-none focus:border-blue-600 font-bold [color-scheme:dark] transition-all shadow-inner`} 
              />
            </div>
            
            <div className="relative z-10">
               <button 
                  onClick={submitAttendance} 
                  disabled={saving || students.length === 0 || !isActionAllowed()} 
                  className={`px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${saving || students.length === 0 ? 'opacity-30 cursor-not-allowed bg-blue-600' : (!isActionAllowed() ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 active:scale-95')}`}
                >
                  {saving ? <Loader2 className="animate-spin" size={18}/> : (!isActionAllowed() ? <Lock size={18}/> : <Save size={18}/>)} 
                  {!isActionAllowed() ? 'Temporal Lock' : 'Synchronize Logs'}
                </button>
            </div>
          </div>
        </div>

        {/* ROSTER REGISTRY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
            <h2 className="text-xl font-black text-gray-100 uppercase tracking-tight flex items-center gap-3"><Users size={22} className="text-blue-500"/> Node Registry <span className="text-xs bg-white/5 px-3 py-1 rounded-lg text-gray-500 border border-white/5">{students.length} Total</span></h2>
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={16}/>
                <input type="text" placeholder="Filter nodes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#161a26] border border-gray-800 rounded-xl py-2.5 pl-10 pr-6 text-xs font-bold focus:outline-none focus:border-blue-500 transition-all shadow-inner"/>
              </div>
              <div className="flex gap-4">
                <button onClick={() => markAll('Present')} disabled={!isActionAllowed()} className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-emerald-500 disabled:opacity-30 transition-colors">Global Present</button>
                <button onClick={() => markAll('Absent')} disabled={!isActionAllowed()} className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-red-500 disabled:opacity-30 transition-colors">Global Absent</button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32"><Loader2 className="animate-spin text-blue-500 mb-4" size={48} /><p className="text-gray-700 font-black text-[10px] uppercase tracking-[0.4em]">Interrogating Roster Registry...</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStudents.map((student) => {
                const isPresent = student.status === 'Present';
                return (
                  <div key={student._id} className={`bg-[#161a26] border p-5 rounded-[24px] flex items-center justify-between transition-all shadow-lg ${!isActionAllowed() ? 'border-gray-800/30 opacity-60' : 'border-gray-800/60 hover:border-blue-500/20'}`}>
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-sm border border-blue-500/10 shadow-inner">{student.name.charAt(0)}{student.name.split(' ')[1]?.charAt(0)}</div>
                      <div className="overflow-hidden">
                        <h4 className="font-black text-gray-100 text-sm uppercase truncate tracking-tight">{student.name}</h4>
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">ID: {student.studentID || 'NULL'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatus(student._id, 'Present')} disabled={!isActionAllowed()} className={`w-12 h-12 rounded-xl text-xs font-black transition-all flex items-center justify-center border ${isPresent ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-[#0f111a] text-gray-700 border-gray-800 hover:text-emerald-500'} disabled:cursor-not-allowed active:scale-90`}>P</button>
                      <button onClick={() => toggleStatus(student._id, 'Absent')} disabled={!isActionAllowed()} className={`w-12 h-12 rounded-xl text-xs font-black transition-all flex items-center justify-center border ${!isPresent ? 'bg-red-500/20 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#0f111a] text-gray-700 border-gray-800 hover:text-red-500'} disabled:cursor-not-allowed active:scale-90`}>A</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// UI Atoms: Modular Nav Element
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl transition-all duration-300 font-bold mb-1.5 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);

export default TakeAttendance;