import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  LayoutDashboard, BookOpen, LogOut, Brain, 
  Clock, Search, AlertTriangle, CheckCircle2, 
  User, GraduationCap, ChevronRight, Loader2, X, Calendar, 
  Calculator, MessageSquareText, TrendingUp, Send, QrCode
} from 'lucide-react';

const StudentCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Insights & Grievance States
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [bunkCount, setBunkCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [doubtMsg, setDoubtMsg] = useState("");
  const [myGrievances, setMyGrievances] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optical Authentication (QR) States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProcessMsg, setScanProcessMsg] = useState('');

  /**
   * Data Lifecycle: 
   * Synchronizes student identity and enrolled curriculum clusters.
   */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const email = localStorage.getItem('email');
        if (!email) { navigate('/'); return; }
        const res = await axios.get(`/api/student/dashboard/${email}`);
        setCourses(res.data.enrolledCourses);
        setStudent(res.data.student);
      } catch (err) { console.error("Telemetry Retrieval Failed"); } 
      finally { setLoading(false); }
    };
    fetchCourses();
  }, [navigate]);

  // Syncs historical communication logs for the specific faculty-node
  const fetchMyGrievances = async (studentMongoId, cCode) => {
    try {
      const res = await axios.get(`/api/student/grievance/status/${studentMongoId}`);
      const courseDoubts = res.data.filter(d => d.courseCode === cCode);
      setMyGrievances(courseDoubts);
    } catch (err) { console.error("Grievance Registry Sync Failed"); }
  };

  /**
   * Modal Logic:
   * Hydrates course details, attendance chronology, and asynchronous doubt history.
   */
  const openDetails = async (course) => {
    setSelectedCourse(course);
    setShowModal(true);
    setLoadingHistory(true);
    setBunkCount(0);
    setDoubtMsg("");
    try {
      const attRes = await axios.get(`/api/student/attendance-history/${course.courseCode}/${student.mongoId}`);
      setHistory(attRes.data);
      await fetchMyGrievances(student.mongoId, course.courseCode);
    } catch (err) { console.error("Modal Hydration Error"); }
    finally { setLoadingHistory(false); }
  };

  // Transmits academic queries to the assigned faculty Lead
  const handleGrievanceSubmit = async () => {
    if (!doubtMsg.trim()) return;
    setIsSubmitting(true);
    try {
        await axios.post('/api/student/grievance/submit', {
            studentId: student.mongoId,
            facultyId: selectedCourse.facultyMongoId,
            courseCode: selectedCourse.courseCode,
            question: doubtMsg
        });
        setDoubtMsg("");
        await fetchMyGrievances(student.mongoId, selectedCourse.courseCode);
    } catch (err) { console.error("Submission Transaction Failed"); } 
    finally { setIsSubmitting(false); }
  };

  /**
   * Predictive Algorithms:
   * 1. Attendance Impact: Calculates projected percentage based on hypothetical absences.
   * 2. Grade Estimation: Maps engagement velocity to institutional GPA tiers.
   */
  const calculateBunkImpact = () => {
    if (!selectedCourse) return 0;
    const total = selectedCourse.totalClasses + parseInt(bunkCount || 0);
    const present = selectedCourse.presentClasses;
    return total === 0 ? 0 : Math.round((present / total) * 100);
  };

  const getProjectedGrade = (pct) => {
    if (pct >= 90) return { grade: 'A+', color: 'text-emerald-500' };
    if (pct >= 80) return { grade: 'A', color: 'text-blue-500' };
    if (pct >= 75) return { grade: 'B+', color: 'text-purple-500' };
    if (pct >= 65) return { grade: 'B', color: 'text-yellow-500' };
    return { grade: 'C / NP', color: 'text-red-500' };
  };

  /**
   * Optical Handshake Protocol:
   * Initializes HTML5 camera scanner to decode faculty-signed JWT tokens.
   */
  useEffect(() => {
    let scanner;
    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          setIsScanning(false);
          setScanProcessMsg('Authenticating Session...');
          
          try {
            const qrData = JSON.parse(decodedText);
            const res = await axios.post('/api/student/mark-attendance-qr', {
              token: qrData.token,
              studentId: student.mongoId,
              email: student.email
            });
            alert(`Verified: ${res.data.message}`);
            window.location.reload(); 
          } catch (err) {
            const errorMsg = err.response?.data?.message || "Validation Failure";
            alert(`Security Alert: ${errorMsg}`);
          } finally { setScanProcessMsg(''); }
        },
        (error) => { /* Filtering frame noise */ }
      );
    }
    return () => { if (scanner) scanner.clear().catch(() => {}); };
  }, [isScanning, student]);

  // Client-side filtration
  const filteredCourses = courses.filter(c => 
    c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex h-screen bg-[#0a0c14] items-center justify-center flex-col gap-4"><Loader2 className="animate-spin text-blue-500" size={48}/><p className="text-gray-500 font-bold tracking-widest uppercase text-[10px]">Registry Sync Active...</p></div>;

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans text-left overflow-hidden selection:bg-blue-500/30">
      
      {/* ENTERPRISE SIDEBAR */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><Brain className="text-white w-6 h-6"/></div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>
        {student && (
          <div className="px-4 mb-6">
            <div className="bg-[#161a26] p-3 rounded-2xl flex items-center gap-3 border border-gray-800 shadow-inner">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-black text-sm">{student.initials}</div>
              <div className="overflow-hidden"><h3 className="text-xs font-bold text-white truncate uppercase">{student.name}</h3><p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Registry: {student.id}</p></div>
            </div>
          </div>
        )}
        <nav className="flex-1 px-4 space-y-1.5">
          <NavItem icon={<LayoutDashboard size={20} />} label="Operational Hub" onClick={() => navigate('/student')} />
          <NavItem icon={<BookOpen size={20} />} label="My Curriculum" isActive={true} onClick={() => navigate('/student/courses')} />
        </nav>
        <div className="p-4 border-t border-gray-800/50"><button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-xs uppercase tracking-widest"><LogOut size={18} /> <span>Terminate</span></button></div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0e14]">
        <div className="p-8 pb-4 shrink-0">
            <div className="flex justify-between items-end mb-8">
                <div className="text-left">
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-2">My Curriculum</h1>
                    <p className="text-gray-500 font-medium italic">Performance matrices and predictive node analysis.</p>
                </div>
                <div className="bg-[#161a26] border border-gray-800 px-6 py-3 rounded-[20px] flex items-center gap-4 shadow-xl shadow-blue-500/5">
                    <div className="p-2 bg-blue-600/20 rounded-lg"><GraduationCap className="text-blue-500" size={20}/></div>
                    <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{courses.length} Active Nodes</span>
                </div>
            </div>
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20}/>
                <input type="text" placeholder="Filter Registry by Subject or Node ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#121421] border border-gray-800/60 text-white rounded-[24px] py-4.5 pl-14 pr-6 focus:outline-none focus:border-blue-600 transition-all font-bold placeholder-gray-800 shadow-xl"/>
            </div>
        </div>

        {/* CURRICULUM NODES GRID */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
            <div className="grid grid-cols-1 gap-6 pb-20">
                {filteredCourses.map((course) => {
                    const isPending = course.totalClasses === 0;
                    const isCritical = !isPending && course.attendancePercentage < 75;
                    return (
                    <div key={course.courseId} className="bg-[#161a26] border border-gray-800 rounded-[40px] p-8 hover:border-blue-500/30 transition-all group flex flex-col xl:flex-row gap-8 items-center relative overflow-hidden shadow-2xl">
                        <div className="flex-1 text-left w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-[#0f111a] border border-gray-800 text-gray-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-inner">{course.courseCode}</span>
                                <span className="bg-blue-600/10 border border-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">{course.semester}</span>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tight leading-tight group-hover:text-blue-400 transition-colors">{course.courseName}</h2>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-3 bg-[#0f111a] px-5 py-3 rounded-2xl border border-gray-800/50 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm"><User size={16} className="text-blue-500"/> Prof. {course.facultyName}</div>
                                <div className="flex items-center gap-3 bg-[#0f111a] px-5 py-3 rounded-2xl border border-gray-800/50 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm"><Clock size={16} className="text-purple-500"/> {course.classTiming}</div>
                            </div>
                        </div>

                        <div className="w-full xl:w-80 bg-[#0f111a] p-8 rounded-[32px] border border-gray-800/50 text-left flex flex-col justify-between shadow-inner">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-2">Node Health</p>
                                    <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${isPending ? 'text-gray-600' : (isCritical ? 'text-red-500' : 'text-emerald-500')}`}>
                                        {isPending ? 'IDLE' : (isCritical ? 'CRITICAL' : 'OPTIMAL')}
                                    </div>
                                </div>
                                <span className={`text-4xl font-black tracking-tighter ${isPending ? 'text-gray-700' : (isCritical ? 'text-red-500' : 'text-white')}`}>{course.attendancePercentage}%</span>
                            </div>
                            
                            <div className="flex gap-3">
                                <button onClick={() => setIsScanning(true)} className="flex-1 flex justify-center items-center gap-3 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_15px_30px_rgba(37,99,235,0.2)] active:scale-95"><QrCode size={16}/> Authenticate</button>
                                <button onClick={() => openDetails(course)} className="flex-1 flex justify-center items-center gap-3 py-4 rounded-2xl border border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-[#161a26] transition-all">Telemetry <ChevronRight size={14}/></button>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>

        {/* SECURE SCANNER HUB */}
        {isScanning && (
          <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-6 bg-[#05060a]/95 backdrop-blur-xl">
            <style>{`
              #qr-reader { border: none !important; border-radius: 24px; overflow: hidden; background: #0a0c14; }
              #qr-reader__scan_region { background: #0f111a; display: flex; justify-content: center; border-radius: 20px; }
              #qr-reader__dashboard_section_csr span { color: #4b5563 !important; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 800; }
              #qr-reader__dashboard_section_csr button { background-color: #2563eb !important; color: white !important; border: none !important; padding: 12px 28px !important; border-radius: 14px !important; font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 10px !important; cursor: pointer !important; margin-top: 15px !important; box-shadow: 0 20px 40px -10px rgba(37, 99, 235, 0.4) !important; transition: all 0.3s !important; }
              #qr-reader__dashboard_section_csr button:hover { background-color: #1d4ed8 !important; transform: translateY(-2px); }
              #qr-reader a { display: none !important; }
              #qr-reader__camera_selection { background: #161a26; color: white; border: 1px solid #374151; padding: 12px; border-radius: 12px; outline: none; margin-bottom: 15px; width: 100%; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            `}</style>

            <div className="bg-[#0f111a] border border-gray-800 p-10 rounded-[48px] w-full max-w-md shadow-2xl relative text-left">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3"><QrCode className="text-blue-500" size={24}/> Optical Sync</h2>
                <button onClick={() => setIsScanning(false)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
              </div>
              <div className="bg-[#0a0c14] rounded-[32px] overflow-hidden mb-8 p-6 border-2 border-gray-800 shadow-inner"><div id="qr-reader" className="w-full"></div></div>
              <div className="text-center"><p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Scan Teacher-Signed Payload</p></div>
            </div>
          </div>
        )}

        {/* OPERATION LOADING OVERLAY */}
        {scanProcessMsg && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-md">
              <div className="bg-[#0f111a] p-10 rounded-[40px] flex flex-col items-center border border-blue-500/20 shadow-[0_0_100px_rgba(37,99,235,0.1)]">
                  <Loader2 className="animate-spin text-blue-500 mb-6" size={56} />
                  <p className="text-white text-[11px] font-black tracking-[0.4em] uppercase">{scanProcessMsg}</p>
              </div>
          </div>
        )}

        {/* INSIGHTS DEEP-DIVE MODAL */}
        {showModal && selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#05060a]/95 backdrop-blur-xl">
            <div className="bg-[#0f111a] border border-gray-800 w-full max-w-7xl h-[85vh] rounded-[56px] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-10 border-b border-gray-800 flex justify-between items-start bg-[#161a26]/50 text-left">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                      <span className="bg-blue-600/10 text-blue-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedCourse.courseCode}</span>
                      <span className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Telemetry Active</span>
                  </div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{selectedCourse.courseName} <span className="text-blue-500 italic lowercase ml-2">insights</span></h2>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 text-gray-500 hover:text-white rounded-full transition-all shadow-inner"><X size={24}/></button>
              </div>

              <div className="flex-1 p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 overflow-hidden">
                {/* Section: Historical Logs */}
                <div className="lg:col-span-3 flex flex-col h-full overflow-hidden text-left">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3"><Calendar size={18} className="text-blue-500"/> Attendance Chronology</h4>
                  <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-3">
                    {loadingHistory ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div> : 
                    history.length > 0 ? history.map((entry, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-[#161a26] rounded-[24px] border border-gray-800 shadow-inner group hover:border-gray-700 transition-all">
                        <span className="text-xs font-black text-gray-400 group-hover:text-gray-200 transition-colors uppercase tracking-tight">{new Date(entry.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', weekday:'short'})}</span>
                        <span className={`text-[9px] font-black px-3.5 py-1.5 rounded-lg uppercase tracking-widest ${entry.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{entry.status}</span>
                      </div>
                    )) : <p className="text-gray-700 font-bold uppercase text-[10px] tracking-widest italic py-10">Roster Null</p>}
                  </div>
                </div>

                {/* Section: Async Communication */}
                <div className="lg:col-span-6 flex flex-col h-full lg:border-x border-gray-800/50 lg:px-10 overflow-hidden text-left">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3"><MessageSquareText size={18} className="text-purple-500"/> Doubt Hub Pipeline</h4>
                  <div className="flex-1 bg-[#0a0c14] p-8 rounded-[48px] border border-gray-800/50 overflow-y-auto space-y-6 custom-scrollbar mb-6 shadow-inner">
                    {myGrievances.length > 0 ? myGrievances.map((g, i) => (
                      <div key={i} className="space-y-4">
                        <div className="flex flex-col items-end">
                            <div className="bg-[#161a26] p-5 rounded-[28px] rounded-tr-none border border-gray-800 max-w-[85%] shadow-lg">
                              <p className="text-xs text-gray-300 font-medium leading-relaxed">{g.question}</p>
                              <p className="text-[8px] text-gray-600 mt-2 font-black uppercase tracking-widest">{new Date(g.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        {g.answer && (
                          <div className="flex flex-col items-start">
                            <div className="bg-blue-600/5 p-5 rounded-[28px] rounded-tl-none border border-blue-500/20 max-w-[85%] shadow-lg">
                              <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-2">Faculty Resolution</p>
                              <p className="text-xs text-gray-200 font-medium leading-relaxed">{g.answer}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )) : <div className="h-full flex items-center justify-center text-gray-800 font-black uppercase tracking-widest text-[10px]">Registry Empty: No active threads.</div>}
                  </div>
                  <div className="relative group">
                    <textarea value={doubtMsg} onChange={(e) => setDoubtMsg(e.target.value)} placeholder="Transmit academic query to faculty lead..." className="w-full bg-[#161a26] border border-gray-800 rounded-[32px] p-6 pr-16 text-xs font-medium text-white h-32 outline-none focus:border-blue-500/50 resize-none transition-all placeholder-gray-800 shadow-inner" />
                    <button onClick={handleGrievanceSubmit} disabled={isSubmitting || !doubtMsg.trim()} className="absolute right-5 bottom-5 p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 transition-all active:scale-90 shadow-2xl" >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                    </button>
                  </div>
                </div>

                {/* Section: Predictive Analysis */}
                <div className="lg:col-span-3 flex flex-col h-full space-y-8 text-left">
                  <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-2">Neural Projections</h4>
                  
                  <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[40px] shadow-inner hover:border-blue-500/30 transition-all group/card">
                     <h4 className="text-blue-500 text-[9px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Calculator size={18}/> Absence Impact Modeler</h4>
                     <div className="flex items-center gap-6">
                        <input type="number" value={bunkCount} onChange={(e) => setBunkCount(e.target.value)} className="w-20 bg-[#0a0c14] border border-gray-800 rounded-2xl py-3 text-center font-black text-white text-xl outline-none focus:border-blue-500 shadow-inner" min="0" />
                        <div className="text-right flex-1">
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Engagement Projection</p>
                          <h3 className={`text-4xl font-black tracking-tighter transition-all ${calculateBunkImpact() < 75 ? 'text-red-500' : 'text-emerald-500'}`}>{calculateBunkImpact()}%</h3>
                        </div>
                     </div>
                  </div>

                  <div className="bg-purple-600/5 border border-purple-500/10 p-8 rounded-[40px] shadow-inner hover:border-purple-500/30 transition-all group/card">
                     <h4 className="text-purple-500 text-[9px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><TrendingUp size={18}/> Neural Grade Projection</h4>
                     <div className="flex justify-between items-center">
                        <div>
                          <h2 className={`text-6xl font-black tracking-tighter transition-all ${getProjectedGrade(calculateBunkImpact()).color}`}>
                            {getProjectedGrade(calculateBunkImpact()).grade}
                          </h2>
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mt-2">Predicted Institutional GPA</p>
                        </div>
                        <TrendingUp size={48} className="text-purple-500/10 group-hover/card:scale-110 transition-transform" />
                     </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// UI Atoms: Stateless Navigation Node
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl transition-all duration-300 font-bold mb-1.5 ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);

export default StudentCourses;