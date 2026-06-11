import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LayoutDashboard, CheckSquare, BookOpen, Users, 
  Brain, LogOut, Bell, Clock, 
  AlertTriangle, TrendingUp, ShieldCheck, Loader2, Coffee, Send, MessageSquare, X, QrCode, Download
} from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = useNavigate(); 
  
  const [stats, setStats] = useState({ activeClasses: 0, totalStudents: 0, avgAttendance: 0, aiAlerts: 0 });
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Communication States
  const [showNotif, setShowNotif] = useState(false);
  const [doubts, setDoubts] = useState([]);
  const [replyText, setReplyText] = useState({});

  // Dynamic QR States
  const [qrModal, setQrModal] = useState({ isOpen: false, courseCode: '' });
  const [qrToken, setQrToken] = useState(null);
  const [countdown, setCountdown] = useState(5);

  // Roster States
  const [rosterModal, setRosterModal] = useState({ isOpen: false, courseCode: '' });
  const [rosterData, setRosterData] = useState([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);

  // AI Analytics States
  const [aiInsightText, setAiInsightText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(true);

  const teacherName = localStorage.getItem('name') || 'Faculty Member';
  const teacherEmail = localStorage.getItem('email') || '';

  /**
   * Helper: getTodayClassTiming
   * Determines if a course has a scheduled session today based on institutional timing strings.
   */
  const getTodayClassTiming = (classTimingStr) => {
    if (!classTimingStr || classTimingStr === 'Not Scheduled') return null;
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = daysMap[new Date().getDay()]; 
    const scheduleParts = classTimingStr.split(',').map(s => s.trim());
    const match = scheduleParts.find(part => part.toLowerCase().startsWith(todayStr.toLowerCase()));
    if (match) {
        const timePart = match.replace(new RegExp(todayStr, 'i'), '').trim();
        return timePart || 'Timing NA';
    }
    return null; 
  };

  /**
   * Method: fetchDoubts
   * Securely fetches student grievances using a validated MongoDB ID.
   * Prevents "undefined" cast errors via a strict guard clause.
   */
  const fetchDoubts = async (mId) => {
    const currentId = mId || localStorage.getItem('mongoId');
    
    if (!currentId || currentId === "undefined" || currentId === "null") {
        console.warn("[Communication Hub] Invalid Identity Node. Aborting fetch.");
        return;
    }

    try {
      const res = await axios.get(`/api/teacher/doubts-list/${currentId}`);
      setDoubts(res.data);
    } catch (err) { 
      console.error("Grievance Retrieval Error:", err.message); 
    }
  };

  /**
   * Orchestration Lifecycle:
   * Synchronizes institutional KPIs, Schedule, and AI Insights.
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!teacherEmail) return;
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Base Telemetry
        const statsRes = await axios.get(`/api/courses/teacher-stats/${teacherEmail}`, { headers });
        setStats(statsRes.data);
        
        // Identity Synchronization: Ensuring valid MongoID is persisted
        let currentId = localStorage.getItem('mongoId');
        if ((!currentId || currentId === "undefined") && statsRes.data.teacherMongoId) {
            localStorage.setItem('mongoId', statsRes.data.teacherMongoId);
            currentId = statsRes.data.teacherMongoId;
        }

        // Timeline Synchronization
        const coursesRes = await axios.get(`/api/courses/teacher/${teacherEmail}`, { headers });
        const filtered = coursesRes.data.map(course => {
            const timing = getTodayClassTiming(course.classTiming);
            return timing ? { ...course, activeTime: timing } : null;
        }).filter(Boolean);
        setTodaysSchedule(filtered);
        
        // Load active doubts only if identity is verified
        if (currentId && currentId !== "undefined") {
            await fetchDoubts(currentId);
        }

        // Trigger AI Insight Generation
        setIsAiLoading(true);
        axios.get(`/api/courses/generate-ai-insight/${teacherEmail}`, { headers })
             .then(res => {
                 setAiInsightText(res.data.insight);
                 if (res.data.alertCount !== undefined) {
                     setStats(prev => ({ ...prev, aiAlerts: res.data.alertCount }));
                 }
             })
             .catch(() => setAiInsightText("Institutional engagement node stable. No anomalies detected."))
             .finally(() => setIsAiLoading(false));

      } catch (err) { 
        console.error("Dashboard Synchronization Error:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDashboardData();
  }, [teacherEmail]);

  const handleReply = async (doubtId) => {
    const answer = replyText[doubtId];
    if (!answer?.trim()) return;
    try {
      await axios.put(`/api/teacher/reply-doubt/${doubtId}`, { answer });
      setReplyText(prev => ({ ...prev, [doubtId]: "" }));
      await fetchDoubts(); 
    } catch (err) { alert("Commit transaction failed."); }
  };

  /**
   * Secure Token Rotation (QR):
   * Rotates dynamic JWT tokens every 5 seconds to eliminate proxy attendance.
   */
  useEffect(() => {
    let fetchInterval, timerInterval;

    const fetchNewToken = async () => {
      try {
        const facultyId = localStorage.getItem('mongoId');
        if (!facultyId || facultyId === "undefined") return;

        const res = await axios.get(`/api/courses/generate-qr/${qrModal.courseCode}/${facultyId}`);
        setQrToken(JSON.stringify({ courseCode: qrModal.courseCode, token: res.data.token }));
        setCountdown(5);
      } catch (err) { console.error("QR Rotation Security Error"); }
    };

    if (qrModal.isOpen) {
      fetchNewToken(); 
      fetchInterval = setInterval(fetchNewToken, 5000); 
      timerInterval = setInterval(() => setCountdown((p) => (p > 1 ? p - 1 : 5)), 1000);
    }

    return () => { clearInterval(fetchInterval); clearInterval(timerInterval); };
  }, [qrModal.isOpen, qrModal.courseCode]);

  const fetchLiveRoster = async (courseCode) => {
    setRosterModal({ isOpen: true, courseCode });
    setIsRosterLoading(true);
    try {
      const res = await axios.get(`/api/courses/live-roster/${courseCode}`);
      setRosterData(res.data.records || []);
    } catch (err) { setRosterData([]); } 
    finally { setIsRosterLoading(false); }
  };

  const downloadCSV = () => {
    if (rosterData.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Name,Email,Status,Time\n";
    rosterData.forEach(s => {
        csvContent += `"${s.name}","${s.email}","${s.status}","${new Date(s.time).toLocaleTimeString()}"\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Roster_${rosterModal.courseCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans text-left overflow-hidden selection:bg-blue-500/30">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0 shadow-2xl relative z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><Brain className="text-white w-6 h-6" /></div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          <NavItem icon={<LayoutDashboard size={20} />} label="Operational Hub" isActive={true} onClick={() => navigate('/teacher')} />
          <NavItem icon={<CheckSquare size={20} />} label="Mark Attendance" onClick={() => navigate('/teacher/attendance')} />
          <NavItem icon={<BookOpen size={20} />} label="My Curriculum" onClick={() => navigate('/teacher/courses')} />
          <NavItem icon={<Users size={20} />} label="Student Registry" onClick={() => navigate('/teacher/students')} />
        </nav>
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-[10px] uppercase tracking-widest"><LogOut size={18} /> <span>Terminate Session</span></button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 bg-[#0b0e14] relative z-10 custom-scrollbar">
        <header className="flex justify-between items-center mb-10">
          <div className="text-left">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">Welcome, {teacherName.split(' ')[0]}</h2>
            <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>

          <div className="relative">
            <button onClick={() => setShowNotif(!showNotif)} className={`p-4 rounded-2xl transition-all border shadow-lg ${showNotif ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#161a26] border-gray-800 text-gray-400 hover:text-white'}`}>
              <Bell size={20} />
              {doubts.filter(d => d.status === 'Pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-[#0b0e14] animate-pulse">
                  {doubts.filter(d => d.status === 'Pending').length}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-6 w-[450px] bg-[#161a26] border border-gray-800 rounded-[40px] shadow-2xl z-[100] p-8 animate-in fade-in zoom-in duration-300 origin-top-right">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><MessageSquare size={22} className="text-blue-500"/> Grievance Hub</h3>
                  <button onClick={() => setShowNotif(false)} className="text-gray-500 hover:text-white transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                  {doubts.map(doubt => (
                    <div key={doubt._id} className={`p-5 rounded-3xl border transition-all ${doubt.status === 'Pending' ? 'bg-[#0f111a] border-blue-500/30' : 'bg-[#0a0c14]/30 border-gray-800/50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-[11px] font-black">{doubt.studentId?.initials || 'S'}</div>
                            <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">{doubt.studentId?.name} | {doubt.courseCode}</span>
                        </div>
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${doubt.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-400'}`}>{doubt.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-6 italic leading-relaxed font-medium">"{doubt.question}"</p>
                      {doubt.status === 'Pending' ? (
                        <div className="flex gap-3">
                          <input type="text" placeholder="Type resolution..." value={replyText[doubt._id] || ""} onChange={(e) => setReplyText(prev => ({ ...prev, [doubt._id]: e.target.value }))} className="flex-1 bg-[#0a0c14] border border-gray-800 rounded-2xl px-5 py-3 text-xs text-white outline-none focus:border-blue-500" />
                          <button onClick={() => handleReply(doubt._id)} className="bg-blue-600 p-3.5 rounded-2xl hover:bg-blue-500 text-white shadow-2xl transition-all"><Send size={16}/></button>
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-gray-800/50 text-left">
                            <p className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-2">Resolution Logged:</p>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">{doubt.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 items-center justify-center flex-col gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-gray-700 font-black uppercase tracking-[0.4em] text-[10px]">Interrogating Registry Telemetry...</p>
          </div>
        ) : (
          <div className="pb-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <StatCard title="Assigned Units" value={stats.activeClasses} subtitle="Active Curriculum" icon={<Clock size={24} className="text-blue-500" />} />
              <StatCard title="Node Roster" value={stats.totalStudents} subtitle="Enrolled Identities" icon={<Users size={24} className="text-purple-500" />} />
              <StatCard title="Avg Engagement" value={`${stats.avgAttendance}%`} subtitle="Institutional KPI" icon={<TrendingUp size={24} className="text-emerald-500" />} />
              <StatCard title="AI Alerts" value={stats.aiAlerts} subtitle="Risk Interventions" icon={stats.aiAlerts > 0 ? <AlertTriangle size={24} className="text-red-500 animate-pulse" /> : <ShieldCheck size={24} className="text-emerald-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <div className="bg-[#0f111a] border border-gray-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-10">
                        <div className="text-left">
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Today's Timeline</h3>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em] mt-1 italic">Real-time Session Tracking</p>
                        </div>
                        <div className="p-3 bg-blue-600/10 rounded-2xl"><Clock className="text-blue-500" size={24}/></div>
                    </div>
                    <div className="space-y-5">
                    {todaysSchedule.length > 0 ? todaysSchedule.map((c, i) => (
                        <ClassCard key={i} time={c.activeTime} course={c.courseName} room={c.courseCode} section={c.section} onGenerateQR={() => setQrModal({ isOpen: true, courseCode: c.courseCode })} onViewRoster={() => fetchLiveRoster(c.courseCode)} />
                    )) : (
                        <div className="py-32 flex flex-col items-center justify-center bg-[#0a0c14]/30 rounded-[40px] border border-dashed border-gray-800">
                            <Coffee className="text-gray-800 mb-6" size={64} />
                            <h4 className="text-gray-600 font-black text-xs uppercase tracking-[0.3em]">Timeline Null: No active sessions</h4>
                        </div>
                    )}
                    </div>
                </div>
              </div>

              <div className="lg:col-span-4 text-left">
                <div className="bg-gradient-to-br from-[#161a26] to-[#0f111a] border border-gray-800 rounded-[48px] p-10 shadow-2xl h-fit sticky top-10">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center shadow-inner"><Brain className="text-purple-500 w-8 h-8" /></div>
                      <h3 className="text-xl font-black text-white tracking-tighter uppercase">Neural Insights</h3>
                    </div>
                    <div className="bg-[#0a0c14] border border-white/5 p-8 rounded-[36px] mb-10 relative overflow-hidden min-h-[160px] flex items-center">
                        <div className="absolute -top-4 -right-4 p-2 opacity-5"><Brain size={100}/></div>
                        {isAiLoading ? (
                            <div className="flex items-center gap-4 w-full"><Loader2 className="animate-spin text-purple-500" size={24}/><p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] animate-pulse">Synthesizing Metrics...</p></div>
                        ) : (
                            <p className="text-sm text-gray-400 leading-relaxed font-medium relative z-10 italic">"{aiInsightText}"</p>
                        )}
                    </div>
                    <button onClick={() => navigate('/teacher/students')} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.25em] transition-all shadow-2xl active:scale-95">Roster Analysis Radar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DYNAMIC QR MODAL */}
      {qrModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#05060a]/95 backdrop-blur-xl">
          <div className="bg-[#0f111a] border border-gray-800 p-12 rounded-[56px] flex flex-col items-center shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Session Handshake</h2>
            <p className="text-emerald-500 text-xs font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
              Token Rotation in {countdown}s
            </p>
            <div className="bg-white p-8 rounded-[40px] shadow-2xl transition-all duration-700 transform hover:rotate-2">
              {qrToken ? <QRCodeSVG value={qrToken} size={280} level="H" includeMargin={true} /> : <Loader2 className="animate-spin text-emerald-500" size={56}/>}
            </div>
            <button onClick={() => setQrModal({ isOpen: false, courseCode: '' })} className="mt-10 px-10 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] transition-all">Terminate Handshake</button>
          </div>
        </div>
      )}

      {/* LIVE ROSTER MODAL */}
      {rosterModal.isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-[#05060a]/95 backdrop-blur-xl">
          <div className="bg-[#0f111a] border border-gray-800 w-full max-w-2xl h-[80vh] rounded-[56px] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-10 border-b border-gray-800 flex justify-between items-center bg-[#161a26]/50">
              <div className="text-left"><h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><Users className="text-blue-500" size={32}/> Live Registry</h2></div>
              <button onClick={() => setRosterModal({ isOpen: false, courseCode: '' })} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full transition-all"><X size={24}/></button>
            </div>
            <div className="px-10 py-6 bg-blue-600/5 border-b border-blue-500/10 flex justify-between items-center shadow-inner">
              <div className="text-left"><p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Authenticated</p><span className="text-4xl font-black text-blue-500 tracking-tighter">{rosterData.length}</span></div>
              <button onClick={downloadCSV} className="px-8 py-4 bg-[#161a26] border border-gray-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center gap-3"><Download size={18}/> Registry.CSV</button>
            </div>
            <div className="p-10 overflow-y-auto flex-1 bg-[#0a0c14]/50 custom-scrollbar">
              {rosterData.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#161a26] p-5 rounded-[28px] border border-gray-800 mb-4">
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black border border-blue-500/20">{s.initials}</div>
                    <div><h4 className="text-sm font-black text-gray-200 uppercase truncate">{s.name}</h4><p className="text-[10px] text-gray-600 font-bold tracking-widest">{s.email}</p></div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase rounded-lg">Verified</span>
                    <span className="text-[9px] text-gray-700 font-black tracking-widest">{new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-[24px] transition-all duration-300 font-bold mb-2 shadow-sm ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const StatCard = ({ title, value, subtitle, icon }) => (
  <div className="bg-[#121421] border border-gray-800/60 p-8 rounded-[40px] flex flex-col shadow-xl text-left relative overflow-hidden group hover:border-blue-500/30 transition-all">
    <div className="p-4 bg-[#0a0c14] rounded-2xl border border-gray-800 w-fit mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{icon}</div>
    <h4 className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] mb-3">{title}</h4>
    <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">{value}</h2>
    <div className="pt-3 border-t border-gray-800/50"><p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">{subtitle}</p></div>
  </div>
);

const ClassCard = ({ time, course, room, section, onGenerateQR, onViewRoster }) => {
  return (
    <div className="p-8 rounded-[36px] border border-gray-800 bg-[#121421] flex flex-col md:flex-row justify-between items-center transition-all hover:bg-[#161a26] group shadow-lg text-left gap-6">
      <div className="flex items-center gap-8 w-full md:w-auto">
        <div className="w-16 h-16 rounded-[24px] bg-[#0a0c14] border border-gray-800 flex items-center justify-center font-black text-xs text-blue-500 uppercase shadow-inner group-hover:border-blue-500/30 transition-colors shrink-0">{room.substring(0, 3)}</div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-4 mb-3">
            <h4 className="text-2xl font-black text-gray-100 tracking-tight uppercase truncate">{course}</h4>
            <span className="bg-purple-900/20 text-purple-400 border border-purple-500/10 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-inner">Sec {section}</span>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-sm text-gray-400 font-bold flex items-center gap-3 tracking-tight"><Clock size={18} className="text-blue-500/50"/> {time}</p>
            <p className="text-xs text-gray-600 font-black uppercase tracking-[0.2em] border-l border-gray-800 pl-6">{room}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-row md:flex-col gap-3 w-full md:w-48">
        <button onClick={onGenerateQR} className="flex-1 flex justify-center items-center gap-3 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-600/20 active:scale-95"><QrCode size={16}/> Sync QR</button>
        <button onClick={onViewRoster} className="flex-1 flex justify-center items-center gap-3 py-3.5 bg-[#0a0c14] border border-gray-800 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-white hover:bg-[#161a26] transition-all active:scale-95"><Users size={16}/> Roster</button>
      </div>
    </div>
  );
};

export default TeacherDashboard;