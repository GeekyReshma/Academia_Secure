import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, CheckSquare, BookOpen, Users, 
  GraduationCap, Brain, LogOut, UserPlus, Loader2
} from 'lucide-react';

const TeacherCourses = () => {
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Identity Recovery:
   * Retrieves authenticated faculty metadata from local persistence.
   */
  const teacherName = localStorage.getItem('name') || 'Faculty';
  const teacherEmail = localStorage.getItem('email');
  const teacherInitials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase();

  /**
   * Security Helper:
   * Attaches the JWT Bearer token to request headers for authorized data access.
   */
  const getAuthConfig = () => {
      const token = localStorage.getItem('token');
      return { headers: { Authorization: `Bearer ${token}` } };
  };

  /**
   * Data Orchestration:
   * Synchronizes curriculum nodes assigned to the specific faculty ObjectID.
   */
  useEffect(() => {
    const fetchCourses = async () => {
      if (!teacherEmail) return navigate('/');
      setLoading(true);
      try {
        // Fetching course registry filtered by teacher identity stream
        const res = await axios.get(`http://localhost:5000/api/courses/teacher/${teacherEmail}`, getAuthConfig());
        setMyCourses(res.data);
      } catch (err) {
        console.error("Registry Sync Failed:", err.message);
        setMyCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [teacherEmail, navigate]);

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans selection:bg-blue-500/30">
      
      {/* ENTERPRISE NAVIGATION SIDEBAR */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 font-black tracking-tighter">AI</div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>

        <div className="px-4 mb-8">
          <div className="bg-[#161a26] p-4 rounded-3xl flex items-center gap-4 border border-gray-800 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-black text-lg border border-blue-500/10">{teacherInitials}</div>
            <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-white truncate uppercase tracking-tight">{teacherName}</h3>
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Faculty Node</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20} />} label="Institutional Hub" onClick={() => navigate('/teacher')} />
          <NavItem icon={<CheckSquare size={20} />} label="Mark Attendance" onClick={() => navigate('/teacher/attendance')} />
          <NavItem icon={<BookOpen size={20} />} label="My Curriculum" isActive={true} onClick={() => navigate('/teacher/courses')} />
          <NavItem icon={<Users size={20} />} label="Student Registry" onClick={() => navigate('/teacher/students')} />
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-xs uppercase tracking-widest"><LogOut size={18} /> <span>Terminate Session</span></button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto bg-[#0b0e14] text-left custom-scrollbar">
        <div className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-3">Academic Curriculum</h1>
          <p className="text-gray-500 font-medium italic">Managing assigned course clusters for: <span className="text-blue-500 font-bold not-italic">{teacherEmail}</span></p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 gap-6">
            <Loader2 className="animate-spin text-blue-500" size={56} />
            <p className="font-black uppercase tracking-[0.4em] text-[10px] text-gray-600">Interrogating Institutional Database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {myCourses.length > 0 ? myCourses.map((course, idx) => (
              <div key={idx} className="bg-[#121421] border border-gray-800/60 rounded-[48px] p-8 hover:border-blue-500/30 transition-all group shadow-2xl flex flex-col relative overflow-hidden">
                
                <div className="flex justify-between items-start mb-8">
                    <span className="bg-[#0a0c14] border border-gray-800 text-gray-400 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner">
                      {course.courseCode}
                    </span>
                    {course.section && (
                      <span className="bg-purple-900/20 text-purple-400 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-500/10 shadow-sm">
                        Sec {course.section}
                      </span>
                    )}
                </div>

                <h3 className="text-2xl font-black text-white mb-10 group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-tight min-h-[60px]">
                  {course.courseName}
                </h3>
                
                <div className="space-y-4 mb-10 mt-auto">
                  <div className="flex justify-between items-center bg-[#0a0c14] p-5 rounded-3xl border border-gray-800/40 shadow-inner">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.25em] flex items-center gap-3"><Users size={16} className="text-blue-500/50"/> Registered Nodes</span>
                    <span className="text-xl font-black text-gray-200 tracking-tighter">{course.students?.length || 0}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <button onClick={() => navigate('/teacher/attendance')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_15px_40px_rgba(37,99,235,0.2)] active:scale-95">
                    Terminal Access
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-32 bg-[#121421] rounded-[56px] border border-dashed border-gray-800 text-center shadow-inner">
                 <BookOpen className="mx-auto mb-6 text-gray-800 opacity-30" size={64}/>
                 <h3 className="text-xl font-black text-gray-600 uppercase tracking-widest">Registry Synchronized: Null Results</h3>
                 <p className="text-gray-700 text-xs mt-3 font-bold uppercase tracking-[0.2em]">Contact institutional administration for curriculum mapping.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// UI ATOMS: Modular Navigation Element
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl transition-all duration-300 font-bold mb-1.5 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);

export default TeacherCourses;