// components/Auth.jsx
'use client';

import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Sparkles, Shield } from 'lucide-react';

export default function Auth({ onAuthComplete }) {
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [resetStep, setResetStep] = useState('email');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    resetEmail: '',
    resetCode: '',
    newPassword: '',
    confirmNewPassword: '',
    twoFACode: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [sentCode, setSentCode] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  // === PASSWORD HASHING ===
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // === AUTO-FOCUS ===
  useEffect(() => {
    const firstField = document.getElementById(isLogin ? 'email' : 'name');
    firstField?.focus();
  }, [isLogin]);

  // === KEYBOARD: ENTER TO SUBMIT ===
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' && !showForgotPassword && !show2FA) {
        const btn = document.getElementById('auth-submit-btn');
        btn?.click();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showForgotPassword, show2FA]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!isLogin && !formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
    if (!isLogin && formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords don’t match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const hashedPassword = await hashPassword(formData.password);

    setTimeout(async () => {
      setIsLoading(false);

      if (isLogin) {
        const savedUser = localStorage.getItem(`kommit-user-${formData.email}`);
        if (!savedUser) {
          setErrors({ email: 'No account found' });
          return;
        }
        const user = JSON.parse(savedUser);
        const inputHash = await hashPassword(formData.password);
        if (user.password !== inputHash) {
          setErrors({ password: 'Incorrect password' });
          return;
        }

        // === 2FA CHECK ===
        if (user.twoFA) {
          setPendingUser(user);
          setShow2FA(true);
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          setSentCode(code);
          alert(`2FA Code: ${code}`);
          return;
        }

        // === SESSION (30 DAYS) ===
        const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('kommit-session', JSON.stringify({ user: { name: user.name, email: user.email }, expiry }));
        localStorage.setItem('kommit-auth', 'true');
        localStorage.setItem('kommit-current-user', JSON.stringify({ name: user.name, email: user.email }));
        onAuthComplete({ name: user.name, email: user.email });
      } else {
        // === CHECK EMAIL EXISTS ===
        const exists = localStorage.getItem(`kommit-user-${formData.email}`);
        if (exists) {
          setErrors({ email: 'Email already registered' });
          return;
        }

        const userData = {
          name: formData.name,
          email: formData.email,
          password: hashedPassword,
          twoFA: false
        };
        localStorage.setItem(`kommit-user-${formData.email}`, JSON.stringify(userData));
        localStorage.setItem('kommit-auth', 'true');
        localStorage.setItem('kommit-current-user', JSON.stringify({ name: formData.name, email: formData.email }));
        onAuthComplete({ name: formData.name, email: formData.email });
      }
    }, 1500);
  };

  const verify2FA = () => {
    if (formData.twoFACode !== sentCode) {
      setErrors({ twoFACode: 'Invalid code' });
      return;
    }
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem('kommit-session', JSON.stringify({ user: { name: pendingUser.name, email: pendingUser.email }, expiry }));
    localStorage.setItem('kommit-auth', 'true');
    localStorage.setItem('kommit-current-user', JSON.stringify({ name: pendingUser.name, email: pendingUser.email }));
    onAuthComplete({ name: pendingUser.name, email: pendingUser.email });
  };

  const sendResetCode = async () => {
    if (!formData.resetEmail.trim() || !/\S+@\S+\.\S+/.test(formData.resetEmail)) {
      setErrors({ resetEmail: 'Valid email required' });
      return;
    }
    const savedUser = localStorage.getItem(`kommit-user-${formData.resetEmail}`);
    if (!savedUser) {
      setErrors({ resetEmail: 'No account found' });
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    alert(`Reset code: ${code}`);
    setResetStep('code');
    setErrors({});
  };

  const verifyResetCode = () => {
    if (formData.resetCode !== sentCode) {
      setErrors({ resetCode: 'Invalid code' });
      return;
    }
    setResetStep('newPassword');
  };

  const resetPassword = async () => {
    if (formData.newPassword.length < 6) {
      setErrors({ newPassword: 'Too short' });
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setErrors({ confirmNewPassword: 'Don’t match' });
      return;
    }
    const user = JSON.parse(localStorage.getItem(`kommit-user-${formData.resetEmail}`));
    user.password = await hashPassword(formData.newPassword);
    localStorage.setItem(`kommit-user-${formData.resetEmail}`, JSON.stringify(user));
    alert('Password reset! Log in.');
    setShowForgotPassword(false);
    setResetStep('email');
    setFormData(prev => ({ ...prev, resetEmail: '', resetCode: '', newPassword: '', confirmNewPassword: '' }));
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      name: '', email: '', password: '', confirmPassword: '',
      resetEmail: '', resetCode: '', newPassword: '', confirmNewPassword: '', twoFACode: ''
    });
    setShow2FA(false);
    setPendingUser(null);
  };

  return (
    <>
      {/* MAIN AUTH UI */}
      {!show2FA && !showForgotPassword && (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="w-full max-w-md relative z-10">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
              <div className="bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-lg px-8 pt-8 pb-6 border-b border-slate-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-teal-600" />
                  <div className="text-2xl font-black bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
                    Kommit Pro
                  </div>
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">
                  {isLogin ? 'Welcome Back' : 'Start Your Journey'}
                </h1>
                <p className="text-slate-600 font-medium">
                  {isLogin ? '2FA + Biometric protected' : 'Secure account creation'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4" /> Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full px-4 py-3.5 rounded-xl border-2 text-black ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:border-teal-500 focus:outline-none font-medium bg-white`}
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3.5 rounded-xl border-2 text-black ${errors.email ? 'border-red-500' : 'border-slate-200'} focus:border-teal-500 focus:outline-none font-medium bg-white`}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3.5 rounded-xl border-2 pr-12 text-black ${errors.password ? 'border-red-500' : 'border-slate-200'} focus:border-teal-500 focus:outline-none font-medium bg-white`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Confirm
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3.5 rounded-xl border-2 pr-12 text-black ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200'} focus:border-teal-500 focus:outline-none font-medium bg-white`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
                  </div>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="group w-full py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 relative overflow-hidden disabled:opacity-50 mt-6"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    {isLoading ? (
                      <>Loading...</>
                    ) : (
                      <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </div>
                </button>

                {isLogin && (
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="w-full text-teal-600 font-bold text-sm hover:text-teal-700 mt-2">
                    Forgot Password?
                  </button>
                )}

                <div className="text-center pt-4">
                  <button type="button" onClick={toggleMode} className="text-slate-600 font-medium hover:text-teal-600">
                    {isLogin ? <>No account? <span className="font-bold text-teal-600">Sign Up</span></> : <>Have account? <span className="font-bold text-teal-600">Sign In</span></>}
                  </button>
                </div>
              </form>
            </div>
            <div className="text-center mt-6 text-slate-400 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Secure & Private
            </div>
          </div>
        </div>
      )}

      {/* 2FA MODAL */}
      {show2FA && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
            <Shield className="w-12 h-12 text-teal-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-4">2-Factor Authentication</h3>
            <p className="text-slate-600 mb-6">Enter the 6-digit code sent to your email</p>
            <input
              type="text"
              name="twoFACode"
              value={formData.twoFACode}
              onChange={handleChange}
              placeholder="000000"
              maxLength={6}
              className={`w-full px-4 py-3.5 rounded-xl border-2 text-center text-2xl font-mono tracking-widest mb-4 ${errors.twoFACode ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.twoFACode && <p className="text-red-500 text-sm">{errors.twoFACode}</p>}
            <button onClick={verify2FA} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold">
              Verify
            </button>
            <button onClick={() => { setShow2FA(false); setPendingUser(null); }} className="mt-4 text-slate-500 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-black text-slate-900 mb-6 text-center">Reset Password</h3>
            {resetStep === 'email' && (
              <div className="space-y-4">
                <input type="email" name="resetEmail" value={formData.resetEmail} onChange={handleChange} placeholder="Your email" className={`w-full px-4 py-3.5 rounded-xl border-2 ${errors.resetEmail ? 'border-red-500' : 'border-slate-200'}`} />
                {errors.resetEmail && <p className="text-red-500 text-sm">{errors.resetEmail}</p>}
                <button onClick={sendResetCode} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold">Send Code</button>
              </div>
            )}
            {resetStep === 'code' && (
              <div className="space-y-4">
                <input type="text" name="resetCode" value={formData.resetCode} onChange={handleChange} placeholder="6-digit code" maxLength={6} className={`w-full px-4 py-3.5 rounded-xl border-2 text-center text-2xl font-mono ${errors.resetCode ? 'border-red-500' : 'border-slate-200'}`} />
                {errors.resetCode && <p className="text-red-500 text-sm">{errors.resetCode}</p>}
                <button onClick={verifyResetCode} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold">Verify</button>
              </div>
            )}
            {resetStep === 'newPassword' && (
              <div className="space-y-4">
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="New password" className={`w-full px-4 py-3.5 rounded-xl border-2 ${errors.newPassword ? 'border-red-500' : 'border-slate-200'}`} />
                <input type="password" name="confirmNewPassword" value={formData.confirmNewPassword} onChange={handleChange} placeholder="Confirm" className={`w-full px-4 py-3.5 rounded-xl border-2 ${errors.confirmNewPassword ? 'border-red-500' : 'border-slate-200'}`} />
                <button onClick={resetPassword} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold">Reset</button>
              </div>
            )}
            <button onClick={() => { setShowForgotPassword(false); setResetStep('email'); }} className="mt-4 text-slate-500 text-sm w-full">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}