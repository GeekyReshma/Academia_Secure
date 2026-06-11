import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, AlertCircle, Loader2, Fingerprint, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(''); 
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Session Guard: 
   * Checks for existing valid tokens and redirects to the respective role dashboard.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      const routes = { faculty: '/teacher', admin: '/admin', student: '/student' };
      if (routes[role]) navigate(routes[role]);
    }
  }, [navigate]);

  /**
   * Phase 1: Identity Challenge
   * Requests a secure One-Time Password via institutional identifiers (Email/ID).
   */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/auth/request-otp', {
        identifier: identifier.trim()
      });
      setStep(2); 
    } catch (err) {
      setError(err.response?.data?.message || 'Identity verification failed.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Phase 2: Token Verification & Session Initialization
   * Validates the OTP and persists user metadata for institutional RBAC (Role-Based Access Control).
   */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        identifier: identifier.trim(),
        otp: otp.trim()
      });

      const { token, role, name, email, id, _id } = res.data;

      // Persistence Layer: Storing session metadata
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      localStorage.setItem('email', email);
      localStorage.setItem('sysId', id); 
      localStorage.setItem('mongoId', _id); 

      const routes = { faculty: '/teacher', admin: '/admin', student: '/student' };
      if (routes[role]) {
        navigate(routes[role]);
      } else {
        setError('Unauthorized access role.');
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoData = (id) => {
    setIdentifier(id);
    setStep(1);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#05060A] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden text-left selection:bg-blue-500/30">
      
      {/* Background Decor Nodes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Brand Identity Header */}
      <div className="mb-10 flex flex-col items-center relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[24px] flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] mb-6 transform hover:rotate-12 transition-all duration-500">
            <Fingerprint className="text-white w-10 h-10" strokeWidth={1.5} />
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter text-center">
          Academia<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Secure</span>
        </h1>
        <p className="text-gray-400 mt-3 font-medium flex items-center gap-2 text-sm uppercase tracking-widest">
          <LockKeyhole size={14} className="text-blue-500" /> Secure Gateway
        </p>
      </div>

      {/* Authentication Interface */}
      <div className="w-full max-w-md bg-[#0f111a]/80 backdrop-blur-3xl rounded-[40px] p-10 border border-white/5 shadow-2xl relative z-10">
        
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold mb-8">
            <AlertCircle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-500 transition-colors">Access Identity</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5 z-10 group-focus-within:text-blue-500" />
                <input 
                  type="text" required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or System ID"
                  className="w-full bg-[#161a26]/50 border border-white/5 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder-gray-700 shadow-inner"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Generate Secure OTP <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                 <ShieldCheck className="text-emerald-500 w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Verification code sent to</p>
                <div className="inline-block bg-[#161a26] border border-white/10 rounded-xl px-4 py-1.5">
                    <span className="text-blue-400 text-sm font-mono tracking-wide">{identifier.toLowerCase()}</span>
                </div>
              </div>
            </div>

            <input 
              type="text" required maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="••••••"
              className="w-full bg-[#161a26]/50 border border-white/5 text-white rounded-2xl py-5 text-center focus:outline-none focus:border-emerald-500/50 transition-all font-black text-3xl tracking-[0.4em] placeholder-gray-800 shadow-inner"
            />

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Verify & Access Portal</>}
            </button>

            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="w-full text-center text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors py-2"
            >
              ← Back to Identification
            </button>
          </form>
        )}

        {/* Rapid Deployment: Demo Simulation */}
        <div className="mt-10 border-t border-gray-800 pt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[1px] bg-gray-800 flex-1"></div>
            <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">Institutional Roles</span>
            <div className="h-[1px] bg-gray-800 flex-1"></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['Admin', 'Teacher', 'Student'].map((role) => (
              <button key={role} type="button" onClick={() => fillDemoData(role === 'Student' ? 'S10021' : `${role.toLowerCase()}@academia.ai`)} className="py-2.5 bg-[#161a26] border border-white/5 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-blue-400 transition-all">
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-10 text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 relative z-10">
        <ShieldCheck size={14} className="text-blue-500"/> Secured by AcademiaAI Zero-Trust
      </p>
    </div>
  );
};

export default Login;