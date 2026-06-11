import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, Search, Mail, 
  Brain, LogOut, Trash2, Loader2,  
  PlusCircle, FileUp, AlertCircle, CheckCircle2,
  LayoutDashboard, Building, Layers, Edit
} from 'lucide-react';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  
  // Interface Control: Modal Visibility States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  
  // CRUD Persistence States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // Buffer States for Metadata and Payloads
  const [selectedFile, setSelectedFile] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({ 
    name: '', email: '', department: '', section: '', batch: '', role: 'student', password: 'password123' 
  });

  // Security Helper: Injects JWT Bearer token for authorized REST handshakes
  const getAuthConfig = () => {
      const token = localStorage.getItem('token');
      return { headers: { Authorization: `Bearer ${token}` } };
  };

  /**
   * Data Orchestration Lifecycle:
   * Synchronizes users, departments, and sections on component mount.
   */
  useEffect(() => {
    const bootstrapData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchDepartments(), fetchSections()]);
        setLoading(false);
    };
    bootstrapData();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', getAuthConfig());
      setUsers(res.data);
    } catch (err) { console.error("Identity Fetch Error:", err); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/departments', getAuthConfig());
      setDepartments(res.data);
    } catch (err) { console.error("Metadata Sync Error (Dept):", err); }
  };

  const fetchSections = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/sections', getAuthConfig());
      setSections(res.data);
    } catch (err) { console.error("Metadata Sync Error (Section):", err); }
  };

  // Metadata Transaction: Provisioning New Department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/add-department', { name: newDeptName }, getAuthConfig());
      setNewDeptName('');
      setShowDeptModal(false);
      fetchDepartments(); 
    } catch (err) { alert("Institutional metadata update failed."); }
  };

  // Metadata Transaction: Provisioning New Section Cluster
  const handleAddSection = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/add-section', { name: newSectionName }, getAuthConfig());
      setNewSectionName('');
      setShowSectionModal(false);
      fetchSections(); 
    } catch (err) { alert("Section provisioning protocol failed."); }
  };

  /**
   * Bulk Ingestion Protocol:
   * Processes CSV telemetry for batch identity creation.
   */
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('role', formData.role); 

    try {
      const res = await axios.post('http://localhost:5000/api/admin/bulk-upload', data, {
          headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`
          }
      });
      setShowBulkModal(false);
      setSelectedFile(null);
      fetchUsers();
    } catch (err) { alert("Bulk ingestion failure: Check CSV schema integrity."); } 
    finally { setUploading(false); }
  };

  // Local state reset for manual entry forms
  const closeUserModal = () => {
      setShowAddModal(false);
      setIsEditMode(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', department: '', section: '', batch: '', role: 'student', password: 'password123' });
  };

  // Pre-fills modal for specific identity modification
  const openEditModal = (user) => {
      setIsEditMode(true);
      setEditingUserId(user._id);
      setFormData({
          name: user.name,
          email: user.email,
          department: user.department || '',
          section: user.section || '',
          batch: user.batch || '',
          role: user.role,
          password: '' 
      });
      setShowAddModal(true);
  };

  /**
   * Transaction Handler: Manual Provisioning/Update
   * Executes Role-Based API routing for faculty vs student nodes.
   */
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.role === 'faculty') delete payload.batch;

      if (isEditMode) {
          await axios.put(`http://localhost:5000/api/admin/edit-user/${editingUserId}`, payload, getAuthConfig());
      } else {
          const endpoint = payload.role === 'faculty' ? '/api/admin/add-faculty' : '/api/admin/add-student';
          await axios.post(`http://localhost:5000${endpoint}`, payload, getAuthConfig());
      }
      closeUserModal();
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || "Commit Transaction Failed."); }
  };

  // Identity Purge Handler
  const handleDelete = async (id) => {
    if (window.confirm("Purge identity from institutional registry permanently?")) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/delete-user/${id}`, getAuthConfig());
        fetchUsers();
      } catch (err) { console.error("Purge Protocol Failure."); }
    }
  };

  // Client-side filtration for rapid registry searching
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.section && u.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="flex h-screen bg-[#0a0c14] items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48}/></div>;

  return (
    <div className="flex h-screen bg-[#0a0c14] text-gray-200 font-sans overflow-hidden text-left selection:bg-blue-500/30">
      
      {/* ENTERPRISE SIDEBAR */}
      <aside className="w-64 bg-[#0f111a] border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"><Brain className="text-white w-6 h-6"/></div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Academia<span className="text-blue-500">AI</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Operational Hub" onClick={() => navigate('/admin')} />
          <NavItem icon={<Users size={20}/>} label="User Directory" active={true} />
          <NavItem icon={<CheckCircle2 size={20}/>} label="Attendance Hub" onClick={() => navigate('/admin/take-attendance')} />
          <NavItem icon={<BookOpen size={20}/>} label="Curriculum" onClick={() => navigate('/admin/courses')} />
          <NavItem icon={<Brain size={20}/>} label="AI Insights" onClick={() => navigate('/admin/ai-insights')} />
        </nav>
        <div className="p-4 border-t border-gray-800/50">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 transition-colors w-full p-3 font-bold text-xs uppercase tracking-widest"><LogOut size={20} /> <span>Terminate Session</span></button>
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0e14]">
        <div className="p-8 pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-end shrink-0 gap-6">
            <div className="text-left">
                <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase">Institutional Registry</h1>
                <p className="text-gray-400 font-medium italic">Manage identity nodes, academic clusters, and batch ingestions.</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowSectionModal(true)} className="px-5 py-3 bg-[#161a26] border border-gray-800 hover:border-gray-600 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"><Layers size={16} className="inline mr-2"/> New Cluster</button>
                <button onClick={() => setShowDeptModal(true)} className="px-5 py-3 bg-[#161a26] border border-gray-800 hover:border-gray-600 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"><Building size={16} className="inline mr-2"/> New Dept</button>
                <button onClick={() => setShowBulkModal(true)} className="px-5 py-3 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/5"><FileUp size={16} className="inline mr-2"/> Bulk Ingest</button>
                <button onClick={() => { closeUserModal(); setShowAddModal(true); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"><PlusCircle size={16} className="inline mr-2"/> Manual Node</button>
            </div>
        </div>

        {/* SEARCH PROTOCOL */}
        <div className="px-8 mt-6 shrink-0 group">
            <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20}/>
                <input type="text" placeholder="Filter identities by name, email, or sectional cluster..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#121421] border border-gray-800 text-white rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-blue-600 transition-all font-bold placeholder-gray-800 shadow-xl"/>
            </div>
        </div>

        {/* REGISTRY NODES LIST */}
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
            <div className="grid grid-cols-1 gap-4 pb-20">
                {filteredUsers.map(user => (
                    <div key={user._id} className="bg-[#121421] border border-gray-800/60 rounded-[28px] p-6 flex items-center justify-between hover:border-blue-500/30 transition-all group shadow-lg">
                        <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${user.role === 'faculty' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-blue-500/10 text-blue-500 border border-blue-500/10'}`}>
                                {user.initials || user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-black text-gray-100 uppercase tracking-tight mb-1">
                                    {user.name} 
                                    <span className={`text-[9px] px-2.5 py-1 rounded-lg ml-3 uppercase tracking-[0.2em] font-black border ${user.role === 'faculty' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-blue-500/5 text-blue-500 border-blue-500/10'}`}>
                                        {user.role}
                                    </span>
                                </h3>
                                <div className="flex flex-wrap gap-5 text-xs font-bold text-gray-500">
                                    <span className="flex items-center gap-2 tracking-tight"><Mail size={14} className="text-blue-500/50"/> {user.email}</span>
                                    <span className="flex items-center gap-2 tracking-tight"><BookOpen size={14} className="text-purple-500/50"/> {user.department || 'N/A'}</span>
                                    {user.section && <span className="bg-white/5 text-gray-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5">Cluster: {user.section}</span>}
                                    {user.batch && <span className="bg-white/5 text-gray-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5">Term: {user.batch}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right hidden xl:block">
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Node Identity</p>
                                <p className="text-sm font-black text-gray-400 tracking-widest">{user.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(user)} className="p-3 text-gray-600 hover:text-blue-400 hover:bg-blue-400/5 rounded-2xl transition-all shadow-sm" title="Modify Node"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(user._id)} className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all shadow-sm" title="Purge Node"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* METADATA MODALS (Dept/Section) */}
      {[ {show: showDeptModal, set: setShowDeptModal, handler: handleAddDepartment, label: "DEPARTMENT", val: newDeptName, setVal: setNewDeptName},
         {show: showSectionModal, set: setShowSectionModal, handler: handleAddSection, label: "CLUSTER/SECTION", val: newSectionName, setVal: setNewSectionName}
      ].map((m, i) => m.show && (
        <div key={i} className="fixed inset-0 bg-[#05060a]/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 text-left">
          <form onSubmit={m.handler} className="bg-[#161925] p-10 rounded-[40px] border border-gray-800 w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-8 italic">New {m.label} Node</h2>
            <InputField label={`${m.label} NAME`} placeholder="Institutional Identifier" value={m.val} onChange={(e) => m.setVal(e.target.value)} />
            <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => m.set(false)} className="flex-1 py-4 bg-[#0a0c14] text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-gray-800 hover:text-white transition-all shadow-inner">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:bg-gray-200 active:scale-95">Commit</button>
            </div>
          </form>
        </div>
      ))}

      {/* BULK INGESTION MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-[#05060a]/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-4 text-left">
          <div className="bg-[#161925] p-12 rounded-[56px] border border-gray-800 w-full max-w-xl shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-blue-600"></div>
            
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Bulk Telemetry</h2>
                    <p className="text-sm font-bold text-gray-500 italic uppercase tracking-widest">Execute batch identity provisioning protocol.</p>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={24}/></button>
            </div>

            <div className="mb-8">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-1 mb-4 block">Select Node Architecture</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setFormData({...formData, role: 'student'})} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border shadow-lg ${formData.role === 'student' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#0a0c14] border-gray-800 text-gray-500'}`}>Students</button>
                    <button type="button" onClick={() => setFormData({...formData, role: 'faculty'})} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border shadow-lg ${formData.role === 'faculty' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#0a0c14] border-gray-800 text-gray-500'}`}>Faculty</button>
                </div>
            </div>

            {/* CSV Specification Notice */}
            <div className="bg-blue-600/5 border border-blue-500/20 rounded-[32px] p-6 mb-10 flex items-start gap-6 shadow-inner">
                <AlertCircle className="text-blue-500 shrink-0 mt-1" size={24}/>
                <div>
                    <h4 className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-2">CSV Schema Specification</h4>
                    <p className="text-gray-500 text-xs font-medium leading-relaxed mb-4">Registry headers must be standardized exactly as follows:</p>
                    <div className="flex flex-wrap gap-2.5">
                        {['name', 'email', 'department', 'section', 'batch'].map(h => <span key={h} className="bg-[#0a0c14] text-gray-300 px-3 py-1.5 rounded-lg border border-gray-800 font-mono text-[9px] font-black shadow-lg">{h}</span>)}
                    </div>
                </div>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-8">
                <div className="relative group">
                    <input type="file" accept=".csv" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="border-2 border-dashed border-gray-800 group-hover:border-emerald-500/40 rounded-[40px] p-12 flex flex-col items-center justify-center transition-all bg-[#0a0c14]/50 group-hover:bg-emerald-500/5 shadow-inner">
                        <div className="w-16 h-16 bg-gray-800/50 group-hover:bg-emerald-500/20 text-gray-600 group-hover:text-emerald-500 rounded-2xl flex items-center justify-center mb-6 transition-all shadow-lg"><FileUp size={36}/></div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-white">{selectedFile ? selectedFile.name : 'Initialize CSV Stream Selection'}</p>
                    </div>
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-[22px] font-black uppercase tracking-[0.2em] text-[11px] text-white transition-all shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30">
                    {uploading ? <Loader2 className="animate-spin" size={20}/> : <><CheckCircle2 size={18}/> Execute Telemetry Sync</>}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL NODE PROVISIONING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#05060a]/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-4 text-left">
          <form onSubmit={handleManualSubmit} className="bg-[#161925] p-12 rounded-[56px] border border-gray-800 w-full max-w-lg shadow-2xl relative animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-1">{isEditMode ? 'Modify Profile' : 'Node Initialization'}</h2>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] italic">{isEditMode ? 'Update existing registry parameters' : 'Provision individual identity node'}</p>
                </div>
                <button type="button" onClick={closeUserModal} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-1 mb-3 block">Role Hierarchy</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setFormData({...formData, role: 'student'})} disabled={isEditMode} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${formData.role === 'student' ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-[#0a0c14] border-gray-800 text-gray-500 hover:bg-gray-800'}`}>Student</button>
                    <button type="button" onClick={() => setFormData({...formData, role: 'faculty'})} disabled={isEditMode} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${formData.role === 'faculty' ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-600/20' : 'bg-[#0a0c14] border-gray-800 text-gray-500 hover:bg-gray-800'}`}>Faculty</button>
                </div>
              </div>

              <InputField label="FULL IDENTITY NAME" placeholder="Ex: Anirudh Kumar" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <InputField label="INSTITUTIONAL EMAIL" type="email" placeholder="identity@university.ai" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-1 mb-2 block">Department Node</label>
                    <div className="relative group">
                        <select required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full bg-[#0a0c14] border border-gray-800 text-white rounded-xl py-4 pl-5 pr-10 focus:outline-none focus:border-blue-600 transition-all font-bold appearance-none cursor-pointer text-xs [color-scheme:dark] shadow-inner">
                          <option value="" disabled>Select...</option>
                          {departments.map(dept => <option key={dept._id} value={dept.name}>{dept.name}</option>)}
                        </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-1 mb-2 block">Cluster/Sec</label>
                    <div className="relative group">
                        <select required value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})} className="w-full bg-[#0a0c14] border border-gray-800 text-white rounded-xl py-4 pl-5 pr-10 focus:outline-none focus:border-blue-600 transition-all font-bold appearance-none cursor-pointer text-xs [color-scheme:dark] shadow-inner">
                          <option value="" disabled>Select...</option>
                          {sections.map(sec => <option key={sec._id} value={sec.name}>{sec.name}</option>)}
                        </select>
                    </div>
                  </div>
              </div>

              {formData.role === 'student' && (
                <InputField label="ENROLLMENT BATCH" placeholder="2026" value={formData.batch} onChange={(e) => setFormData({...formData, batch: e.target.value})} />
              )}
              
              <button type="submit" className={`w-full py-5 rounded-[22px] font-black uppercase tracking-[0.2em] text-[11px] transition-all mt-6 text-white shadow-2xl active:scale-95 ${formData.role === 'faculty' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'}`}>
                {isEditMode ? '✔ Commit Identity Update' : `Save ${formData.role} Profile`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// UI Atoms: Stateless Navigation & Inputs
const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl transition-all duration-300 font-bold mb-1.5 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{icon} <span className="text-sm tracking-tight">{label}</span></button>
);

const InputField = ({ label, type = "text", placeholder, value, onChange }) => (
  <div className="w-full text-left">
      <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-1 mb-2 block">{label}</label>
      <input type={type} required placeholder={placeholder} value={value} onChange={onChange} className="w-full bg-[#0a0c14] border border-gray-800 text-white rounded-xl py-4 px-6 focus:outline-none focus:border-blue-600 transition-all font-bold placeholder-gray-800 text-sm shadow-inner" />
  </div>
);

export default ManageUsers;