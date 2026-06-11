import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Brain, CheckCircle2, LayoutDashboard, Users, BookOpen, LogOut, Loader2, UserPlus, Trash2, X, Search } from 'lucide-react';

const CourseInsights = () => {
  const { courseId } = useParams(); 
  const navigate = useNavigate();
  
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persistence States: Enrollment & Roster Management
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  // Security Helper: Injects JWT Bearer token for authorized telemetry access
  const getAuthConfig = () => {
      const token = localStorage.getItem('token');
      return { headers: { Authorization: `Bearer ${token}` } };
  };

  /**
   * Data Orchestration Hook:
   * Synchronizes specific course analytics and student engagement metrics.
   */
  const fetchInsights = async () => {
      try {
          const res = await axios.get(`http://localhost:5000/api/insights/course/${courseId}`, getAuthConfig());
          
          setCourseData({
              courseCode: courseId,
              courseName: `${courseId} Analytics`, 
              totalStudents: res.data.students.length,
              avgAttendance: res.data.avgAttendance,
              students: res.data.students 
          });
      } catch (err) {
          console.error("Telemetry Error: Course insights unreachable.");
          if (err.response?.status === 401) navigate('/');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { fetchInsights(); }, [courseId]);

  /**
   * Roster Initialization: 
   * Fetches the global student registry and filters out already enrolled nodes.
   */
  const openEnrollModal = async () => {
      setShowEnrollModal(true);
      try {
          const res = await axios.get('http://localhost:5000/api/users/all', getAuthConfig());
          const enrolledIds = courseData.students.map(s => s._id);
          const available = res.data.filter(u => u.role === 'student' && !enrolledIds.includes(u._id));
          setAllStudents(available);
      } catch (err) { console.error("Registry Error: Failed to fetch available nodes."); }
  };

  // Logic: Multi-node selection for batch enrollment
  const toggleSelection = (id) => {
      setSelectedStudents(prev => 
          prev.includes(id) ? prev.filter(studentId => studentId !== id) : [...prev, id]
      );
  };

  /**
   * Transaction Handler: Batch Enrollment
   * Commits the selected student IDs to the course registry on the server.
   */
  const handleEnrollment = async () => {
      if (selectedStudents.length === 0) return;
      setEnrolling(true);
      try {
          await axios.post('http://localhost:5000/api/courses/enroll', {
              courseCode: courseId,
              studentIds: selectedStudents
          }, getAuthConfig());
          
          setShowEnrollModal(false);
          setSelectedStudents([]);
          fetchInsights(); 
      } catch (err) { console.error("Transaction Error: Enrollment failed."); } 
      finally { setEnrolling(false); }
  };

  // Transaction Handler: Student De-provisioning (Unenrollment)
  const handleRemoveStudent = async (studentId, studentName) => {
      if (window.confirm(`Action Irreversible: Remove ${studentName} from this curriculum node?`)) {
          try {
              await axios.post('http://localhost:5000/api/courses/unenroll', {
                  courseCode: courseId,
                  studentId: studentId
              }, getAuthConfig());
              fetchInsights(); 
          } catch (err) { console.error("Purge Error: Unenrollment failed."); }
      }
  };

  // Client-side filtration for modal searching
  const filteredAvailableStudents = allStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.section && s.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading || !courseData) return (
    <div className="flex flex-col h-screen bg-[#0f111a] items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px]">Synchronizing Analytical Data...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0f111a] text-white font-sans text-left relative overflow-hidden selection:bg-blue-500/30">
      
      {/* ENTERPRISE SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 p-6 flex flex-col justify-between bg-[#0f111a] sticky top-0 h-screen shrink-0 shadow-2xl">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20"><Brain size={24}/></div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Academia<span className="text-blue-500">AI</span></h1>
          </div>
          <nav className="space-y-1.5">
            <NavItem icon={<LayoutDashboard size={20}/>} label="Operational Hub" onClick={() => navigate('/admin')} />
            <NavItem icon={<Users size={20}/>} label="User Directory" onClick={() => navigate('/admin/manage-users')} />
            <NavItem icon={<CheckCircle size={20}/>} label="Attendance Terminal" onClick={() => navigate('/admin/take-attendance')} />
            <NavItem icon={<BookOpen size={20}/>} label="Curriculum" active onClick={() => navigate('/admin/courses')} />
            <NavItem icon={<Brain size={20}/>} label="Neural Insights" onClick={() => navigate('/admin/ai-insights')} />
          </nav>
        </div>
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full font-bold text-xs uppercase tracking-widest">
            <LogOut size={18}/> <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto relative bg-[#0b0e14]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-all mb-8 text-[10px] font-black uppercase tracking-widest group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Return to Registry
        </button>

        <div className="flex flex-col xl:flex-row justify-between items-start mb-12 gap-8">
            <div className="text-left">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-blue-600/10 text-blue-500 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/10 shadow-lg">{courseData.courseCode}</span>
                    <span className="text-gray-600 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Live Analytics Stream</span>
                </div>
                <h1 className="text-5xl font-black mb-3 tracking-tighter uppercase">{courseData.courseName}</h1>
                <p className="text-gray-500 text-lg font-medium italic">Predictive engagement analysis and sectional performance matrix.</p>
            </div>
            <div className="flex gap-4 w-full xl:w-auto">
                <button onClick={openEnrollModal} className="flex-1 xl:flex-none bg-[#161a26] border border-gray-800 hover:border-blue-500/50 text-blue-500 font-black text-xs uppercase tracking-widest px-8 py-5 rounded-[20px] transition-all flex items-center justify-center gap-3 shadow-xl">
                    <UserPlus size={18}/> Provision Nodes
                </button>
                <button onClick={() => navigate('/admin/take-attendance')} className="flex-1 xl:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest px-10 py-5 rounded-[20px] shadow-2xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center">
                    Terminal Access
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
          {/* Left: Intelligence Panel */}
          <div className="lg:col-span-4 space-y-8 text-left">
              <div className="bg-gradient-to-br from-[#1c152e] to-[#161925] p-10 rounded-[48px] border border-purple-500/10 shadow-2xl group hover:border-purple-500/30 transition-all duration-500">
                <div className="flex items-center gap-4 mb-8 text-purple-400">
                    <div className="p-3 bg-purple-500/10 rounded-2xl shadow-inner group-hover:rotate-12 transition-transform"><Brain size={28}/></div>
                    <h3 className="font-black text-[11px] uppercase tracking-[0.25em]">Neural Insight Node</h3>
                </div>
                <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium italic">
                    Analyzing metrics for <span className="text-white font-black not-italic">{courseData.totalStudents} nodes</span> with an aggregate engagement velocity of <span className="text-blue-400 font-black not-italic text-2xl tracking-tighter">{courseData.avgAttendance}%</span>.
                </p>
                <div className="grid grid-cols-2 gap-5">
                    <div className="bg-[#0f111a] p-5 rounded-3xl border border-gray-800/50 shadow-inner">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">Institutional Avg</p>
                        <p className={`text-3xl font-black tracking-tighter ${courseData.avgAttendance < 75 ? 'text-red-500' : 'text-emerald-500'}`}>{courseData.avgAttendance}%</p>
                    </div>
                    <div className="bg-[#0f111a] p-5 rounded-3xl border border-gray-800/50 shadow-inner text-left">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">Cluster Status</p>
                        <p className={`text-sm font-black uppercase tracking-widest mt-2 ${courseData.avgAttendance < 75 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                            {courseData.avgAttendance < 75 ? 'Critical Risk' : 'Operational'}
                        </p>
                    </div>
                </div>
                <div className="mt-10 pt-8 border-t border-gray-800/50">
                    <h4 className="flex items-center gap-3 text-purple-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em]"><CheckCircle2 size={16}/> Suggested Protocols</h4>
                    <div className="space-y-4">
                        {courseData.avgAttendance < 75 ? (
                            <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-[11px] text-red-400 font-bold leading-relaxed shadow-lg">
                                ⚠️ ATTENTION: Immediate intervention required. Trigger automated warning emails for nodes below threshold.
                            </div>
                        ) : (
                            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 font-bold leading-relaxed shadow-lg">
                                Operational benchmarks reached. Maintain current curriculum pacing and scheduled interactions.
                            </div>
                        )}
                    </div>
                </div>
              </div>
          </div>

          {/* Right: Telemetry Registry Table */}
          <div className="lg:col-span-8 bg-[#161925] border border-gray-800 rounded-[48px] overflow-hidden shadow-2xl flex flex-col group/table hover:border-blue-500/20 transition-all duration-500">
              <div className="p-10 border-b border-gray-800 flex justify-between items-center text-left">
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-100">Synchronized Node Roster ({courseData.students.length})</h3>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/5 border border-blue-500/10 rounded-xl text-[10px] font-black text-blue-500 uppercase tracking-widest">Registry Sync Complete</div>
              </div>
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-[#0f111a]/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                          <tr>
                              <th className="px-10 py-6">Node Identity</th>
                              <th className="px-10 py-6">Cluster</th>
                              <th className="px-10 py-6 text-center">Engagement %</th>
                              <th className="px-10 py-6 text-center">GPA Projection</th>
                              <th className="px-10 py-6 text-right pr-12">Operations</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                          {courseData.students.length > 0 ? courseData.students.map((student) => (
                              <tr key={student._id} className="hover:bg-[#1c2030] transition-all group/row">
                                  <td className="px-10 py-7">
                                      <div className="font-black text-gray-100 uppercase tracking-tight text-sm">{student.name}</div>
                                      <div className="text-[10px] text-gray-600 font-bold uppercase mt-1.5 tracking-widest">ID: {student.id}</div>
                                  </td>
                                  <td className="px-10 py-7">
                                      <span className="bg-purple-900/20 text-purple-400 border border-purple-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-inner">
                                          SEC {student.section || 'NA'}
                                      </span>
                                  </td>
                                  <td className="px-10 py-7">
                                      <div className="flex items-center gap-5 justify-center">
                                          <div className="w-28 h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                              <div className={`h-full rounded-full transition-all duration-1000 ${student.att < 75 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`} style={{ width: `${student.att}%` }}></div>
                                          </div>
                                          <span className="text-xs font-black text-gray-300 w-10">{student.att}%</span>
                                      </div>
                                  </td>
                                  <td className="px-10 py-7 text-center">
                                      <span className="text-sm font-black text-gray-100 tracking-tighter bg-white/5 px-4 py-2 rounded-xl border border-white/5">{student.grade}</span>
                                  </td>
                                  <td className="px-10 py-7 text-right pr-12">
                                      <button 
                                          onClick={() => handleRemoveStudent(student._id, student.name)}
                                          className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-row-hover:opacity-100 shadow-sm"
                                      >
                                          <Trash2 size={18}/>
                                      </button>
                                  </td>
                              </tr>
                          )) : (
                              <tr><td colSpan="5" className="text-center py-32 text-gray-600 font-bold uppercase tracking-widest text-xs italic">Registry Null: Initialize student nodes to begin tracking.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        </div>
      </main>

      {/* MODAL: PROVISIONING PROTOCOL (Enrollment) */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-[#05060a]/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-[#161a26] border border-gray-800 rounded-[56px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(37,99,235,0.1)] animate-in zoom-in duration-300">
            
            <div className="p-10 border-b border-gray-800 flex justify-between items-start shrink-0 text-left">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Identity Provisioning</h2>
                    <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-[0.3em]">Course: {courseData?.courseCode}</p>
                </div>
                <button onClick={() => {setShowEnrollModal(false); setSelectedStudents([]);}} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={24} /></button>
            </div>

            <div className="p-6 border-b border-gray-800 bg-[#0f111a] shrink-0 group">
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search Registry by Identity or Cluster..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#161a26] border border-gray-800 text-white rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-blue-600 text-sm font-bold shadow-inner"
                    />
                </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {allStudents.length === 0 ? (
                    <p className="text-center text-gray-600 py-16 font-bold uppercase tracking-widest text-xs">Registry Fully Synchronized</p>
                ) : filteredAvailableStudents.length === 0 ? (
                    <p className="text-center text-gray-600 py-16 font-bold uppercase tracking-widest text-xs">Identity resolution failed for "{searchQuery}"</p>
                ) : (
                    filteredAvailableStudents.map(student => (
                        <div 
                            key={student._id} 
                            onClick={() => toggleSelection(student._id)}
                            className={`flex items-center gap-5 p-5 rounded-3xl border cursor-pointer transition-all ${
                                selectedStudents.includes(student._id) ? 'bg-blue-600/10 border-blue-500/50 shadow-lg' : 'bg-[#0f111a] border-gray-800 hover:border-gray-600'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedStudents.includes(student._id) ? 'border-blue-500 bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'border-gray-700'}`}>
                                {selectedStudents.includes(student._id) && <CheckCircle2 size={16} className="text-white"/>}
                            </div>
                            <div className="flex-1 flex justify-between items-center text-left">
                                <div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-tight">{student.name}</h4>
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1.5">{student.department || 'GEN'} • ID: {student.id}</p>
                                </div>
                                <span className="bg-gray-800/50 text-gray-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-inner border border-white/5">Cluster: {student.section || 'N/A'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-10 border-t border-gray-800 shrink-0 bg-[#0f111a] flex justify-between items-center rounded-b-[56px]">
                <span className="text-xs font-black uppercase tracking-widest text-blue-500"><strong className="text-2xl tracking-tighter mr-2">{selectedStudents.length}</strong> Identities Selected</span>
                <button 
                    onClick={handleEnrollment}
                    disabled={selectedStudents.length === 0 || enrolling}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/20 transition-all disabled:opacity-30 flex items-center gap-3 active:scale-95"
                >
                    {enrolling ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>}
                    {enrolling ? 'Synchronizing...' : 'Finalize Roster'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// UI Atoms: Modular Nav
const NavItem = ({ icon, label, active = false, onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-4 px-6 py-4.5 rounded-2xl cursor-pointer transition-all duration-300 font-bold ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </div>
);

export default CourseInsights;