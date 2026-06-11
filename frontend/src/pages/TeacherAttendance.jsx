import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, LayoutDashboard, CheckSquare, BookOpen, Users, 
  LogOut, Save, Loader2, Layers, ChevronDown 
} from 'lucide-react';

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Section Management States
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]); 
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  const email = localStorage.getItem('email');
  const token = localStorage.getItem('token');

  // Security Helper: Injects JWT Bearer token into headers
  const getAuthConfig = () => {
      return { headers: { Authorization: `Bearer ${token}` } };
  };

  /**
   * Lifecycle Hook: 
   * Synchronizes curriculum nodes assigned to the authenticated faculty.
   */
  useEffect(() => {
    const fetchCourses = async () => {
      if (!email) return;
      try {
        const res = await axios.get(`http://localhost:5000/api/courses/teacher/${email}`, getAuthConfig());
        setCourses(res.data);
        if (res.data.length > 0) setSelectedCourse(res.data[0].courseCode);
      } catch (e) { console.error("Course Registry Fetch Failed"); }
    };
    fetchCourses();
  }, [email]);

  /**
   * Logic: Unique Section Extraction
   * Aggregates distinct student clusters from the selected curriculum node.
   */
  useEffect(() => {
      if (!selectedCourse) return;
      const currentCourseData = courses.find(c => c.courseCode === selectedCourse);
      
      if (currentCourseData && currentCourseData.students) {
          const sections = new Set();
          currentCourseData.students.forEach(student => {
              if (student.section) sections.add(student.section);
          });
          const sortedSections = Array.from(sections).sort();
          setAvailableSections(sortedSections);
          setSelectedSections(sortedSections); // Baseline: Select all clusters
      } else {
          setAvailableSections([]);
          setSelectedSections([]);
      }
  }, [selectedCourse, courses]);

  /**
   * Roster Sync Hook:
   * Fetches student identities based on comma-separated section queries.
   */
  useEffect(() => {
    const fetchRoster = async () => {
      if (!selectedCourse) return;
      if (selectedSections.length === 0 && availableSections.length > 0) {
          setStudents([]);
          return;
      }

      setLoadingRoster(true);
      try {
        let sectionQuery = 'ALL';
        // Serialization: Converting array to CSV for backend parsing
        if (selectedSections.length !== availableSections.length) {
            sectionQuery = selectedSections.join(',');
        }

        const res = await axios.get(`http://localhost:5000/api/attendance/students/${selectedCourse}?section=${sectionQuery}`, getAuthConfig());
        setStudents(res.data);
      } catch (e) { setStudents([]); } 
      finally { setLoadingRoster(false); }
    };
    fetchRoster();
  }, [selectedCourse, selectedSections, availableSections.length]);

  // UI State Handlers
  const toggleStatus = (id, status) => setStudents(prev => prev.map(s => s._id === id ? { ...s, status } : s));
  const markAll = (status) => setStudents(prev => prev.map(s => ({ ...s, status })));

  /**
   * Transaction Handler: submitAttendance
   * Commits telemetry to the database with sectional metadata.
   */
  const submitAttendance = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({ studentId: s._id, name: s.name, status: s.status }));
      const sectionString = selectedSections.length === availableSections.length ? 'ALL' : selectedSections.join(',');

      await axios.post('http://localhost:5000/api/admin/mark-attendance-secure', {
        courseId: selectedCourse, 
        section: sectionString === 'ALL' ? '' : sectionString, 
        date, 
        records, 
        userRole: 'faculty'
      }, getAuthConfig());
      
      alert(`Telemetry committed: ${students.filter(s=>s.status==='Present').length} Present nodes.`);
      navigate('/teacher');
    } catch (e) { alert(e.response?.data?.message || "Commit Transaction Failed"); } 
    finally { setSaving(false); }
  };

  const presentCount = students.filter(s => s.status === 'Present').length;
  const absentCount = students.length - presentCount;

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans overflow-hidden text-left selection:bg-blue-500/30">
      
      {/* ENTERPRISE SIDEBAR */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain className="text-white w-6 h-6"/>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto font-medium">
          <NavItem icon={<LayoutDashboard size={18}/>} label="Institutional Hub" onClick={() => navigate('/teacher')} />
          <NavItem icon={<CheckSquare size={18}/>} label="Mark Attendance" isActive={true} />
          <NavItem icon={<BookOpen size={18}/>} label="My Curriculum" onClick={() => navigate('/teacher/courses')} />
          <NavItem icon={<Users size={18}/>} label="Student Nodes" onClick={() => navigate('/teacher/students')} />

          <div className="pt-8 pb-2 px-3">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Quick Access Hub</p>
          </div>
          {courses.map((course, index) => (
            <button 
                key={`${course.courseCode}-${index}`} 
                onClick={() => setSelectedCourse(course.courseCode)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold mb-1 shadow-sm ${selectedCourse === course.courseCode ? 'bg-blue-600 text-white shadow-blue-600/20' : 'text-gray-500 hover:bg-[#161a26] hover:text-white'}`}
            >
                <div className={`w-1.5 h-1.5 rounded-full ${selectedCourse === course.courseCode ? 'bg-white' : 'bg-gray-700'}`}></div>
                <span className="truncate uppercase tracking-tight">{course.courseCode}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-xs uppercase tracking-widest">
            <LogOut size={20} /> <span>Terminate</span>
          </button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0b0e14]">
        <div className="p-8 shrink-0 text-left">
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-2">Attendance Terminal</h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">Curriculum Node: <span className="text-blue-500">{selectedCourse}</span></p>

          <div className="mt-10 flex flex-wrap gap-5 items-end bg-[#161a26] p-8 rounded-[40px] border border-gray-800 shadow-2xl relative">
            <div className="flex-1 min-w-[300px]">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-3 ml-1">Subject Registry</label>
              <select value={selectedCourse} onChange={(e)=>setSelectedCourse(e.target.value)} className="w-full bg-[#0a0c14] border border-gray-800 rounded-2xl py-4 px-5 text-white font-bold outline-none focus:border-blue-500 cursor-pointer shadow-inner appearance-none [color-scheme:dark]">
                {courses.map(c => <option key={c.courseCode} value={c.courseCode}>{c.courseCode} - {c.courseName}</option>)}
              </select>
            </div>
            
            {/* MULTI-SELECT CLUSTER DROPDOWN */}
            <div className="w-64 relative">
              <label className="text-[10px] font-black text-purple-500 uppercase block mb-3 ml-1 flex items-center gap-2"><Layers size={14}/> Student Clusters</label>
              <div 
                  onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                  className="w-full bg-[#0a0c14] border border-purple-500/20 rounded-2xl py-4 px-5 text-purple-400 font-black text-[11px] uppercase tracking-widest cursor-pointer flex justify-between items-center shadow-inner hover:border-purple-500/40 transition-all"
              >
                  <span className="truncate">
                      {selectedSections.length === availableSections.length 
                          ? 'All Clusters' 
                          : selectedSections.length === 0 
                              ? 'Initialize Cluster' 
                              : selectedSections.map(s => `Sec ${s}`).join(', ')}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${showSectionDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showSectionDropdown && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSectionDropdown(false)}></div>
                      <div className="absolute top-full mt-3 left-0 w-full bg-[#161a26] border border-purple-500/30 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 flex flex-col max-h-72 overflow-hidden animate-in fade-in zoom-in duration-200">
                          <label className="px-6 py-4 hover:bg-white/5 cursor-pointer border-b border-gray-800 flex items-center gap-4 transition-colors">
                              <input 
                                  type="checkbox" 
                                  className="w-5 h-5 rounded-lg border-gray-700 bg-gray-900 text-purple-500 cursor-pointer"
                                  checked={selectedSections.length === availableSections.length && availableSections.length > 0}
                                  onChange={(e) => {
                                      if (e.target.checked) setSelectedSections([...availableSections]);
                                      else setSelectedSections([]);
                                  }}
                              />
                              <span className="text-xs font-black uppercase tracking-widest text-gray-200">Sync All Clusters</span>
                          </label>
                          <div className="overflow-y-auto custom-scrollbar p-2">
                              {availableSections.map(sec => (
                                  <label key={sec} className="px-5 py-3.5 hover:bg-[#1c2030] rounded-2xl cursor-pointer flex items-center gap-4 transition-all">
                                      <input 
                                          type="checkbox" 
                                          className="w-5 h-5 rounded-lg border-gray-700 bg-gray-900 text-purple-500 cursor-pointer"
                                          checked={selectedSections.includes(sec)}
                                          onChange={(e) => {
                                              if (e.target.checked) setSelectedSections([...selectedSections, sec]);
                                              else setSelectedSections(selectedSections.filter(s => s !== sec));
                                          }}
                                      />
                                      <span className="text-xs font-bold text-gray-300">Section {sec}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </>
              )}
            </div>

            <div className="w-56">
              <label className="text-[10px] font-black text-gray-600 uppercase block mb-3 ml-1">Session Timeline</label>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full bg-[#0a0c14] border border-gray-800 rounded-2xl py-4 px-5 outline-none [color-scheme:dark] font-black text-xs uppercase tracking-widest shadow-inner focus:border-blue-500 transition-all" />
            </div>
            
            <div className="flex gap-2">
                <button onClick={()=>markAll('Present')} className="px-5 py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95">Global P</button>
                <button onClick={()=>markAll('Absent')} className="px-5 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95">Global A</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-40 custom-scrollbar">
          {loadingRoster ? (
              <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-blue-500 mb-4" size={48}/>
                  <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px]">Interrogating Registry...</p>
              </div>
          ) : (
            <div className="bg-[#161a26] border border-gray-800 rounded-[48px] overflow-hidden shadow-2xl flex flex-col group/table">
              <table className="w-full text-left">
                <thead className="bg-[#0f111a] border-b border-gray-800 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
                  <tr>
                      <th className="px-10 py-6">Node Identity</th>
                      <th className="px-10 py-6 text-center">Session Status</th>
                      <th className="px-10 py-6 text-right pr-14">Action Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {students.length > 0 ? students.map(s => (
                    <tr key={s._id} className="hover:bg-[#1c2030] transition-all group/row">
                      <td className="px-10 py-6">
                          <div className="font-black text-gray-100 uppercase tracking-tight text-sm flex items-center gap-3">
                              {s.name} 
                              {selectedSections.length > 1 && s.section !== 'NA' && (
                                  <span className="bg-purple-900/20 text-purple-400 text-[9px] px-2.5 py-1 rounded-lg border border-purple-500/20 font-black tracking-widest uppercase">Sec {s.section}</span>
                              )}
                          </div>
                          <div className="text-[10px] text-gray-600 font-bold uppercase mt-1 tracking-widest">ID: {s.studentID}</div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest transition-all ${s.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>{s.status}</span>
                      </td>
                      <td className="px-10 py-6 text-right pr-14">
                        <div className="flex justify-end gap-3">
                          <button onClick={()=>toggleStatus(s._id, 'Present')} className={`w-12 h-12 rounded-2xl font-black text-xs transition-all flex items-center justify-center ${s.status==='Present'?'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20':'bg-[#0a0c14] text-gray-600 border border-gray-800 hover:border-emerald-500'}`}>P</button>
                          <button onClick={()=>toggleStatus(s._id, 'Absent')} className={`w-12 h-12 rounded-2xl font-black text-xs transition-all flex items-center justify-center ${s.status==='Absent'?'bg-red-600 text-white shadow-xl shadow-red-600/20':'bg-[#0a0c14] text-gray-600 border border-gray-800 hover:border-red-500'}`}>A</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                      <tr><td colSpan="3" className="px-8 py-32 text-center text-gray-600 font-bold uppercase tracking-widest text-xs italic">Registry Null: No student nodes detected for selected clusters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PERSISTENCE CONTROL BAR */}
        <div className="fixed bottom-0 right-0 w-[calc(100%-256px)] p-8 bg-[#0f111a]/80 backdrop-blur-xl border-t border-gray-800 flex justify-between items-center z-30 shadow-2xl">
          <div className="flex gap-12 font-black text-[10px] uppercase tracking-[0.3em]">
            <p className="text-gray-500">Registry Nodes: <span className="text-white ml-2 text-xl tracking-tighter">{students.length}</span></p>
            <p className="text-emerald-500">Present Count: <span className="ml-2 text-xl tracking-tighter">{presentCount}</span></p>
            <p className="text-red-500">Absent Count: <span className="ml-2 text-xl tracking-tighter">{absentCount}</span></p>
          </div>
          <button onClick={submitAttendance} disabled={saving || students.length === 0} className="bg-blue-600 hover:bg-blue-500 text-white px-16 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-4 shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Commit Telemetry
          </button>
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

export default TeacherAttendance;