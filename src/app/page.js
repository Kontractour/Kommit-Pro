'use client';

import { useState, useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import Auth from '@/components/Auth';
import { 
  Lock, Fingerprint, Camera, AlertCircle, ArrowLeft, Shield, Trash2, 
  Plus, Calendar, TrendingUp, Award, BookOpen, Settings, LogOut,
  Bell, Zap, ChevronRight
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function Home() {
  const [currentStep, setCurrentStep] = useState('check');
  const [user, setUser] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPasscode, setShowForgotPasscode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  let faceTimeout = null;

  // === BIOMETRIC ===
  useEffect(() => {
    const checkBiometric = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (available) {
            const saved = localStorage.getItem('kommit-biometric');
            setBiometricEnabled(saved === 'true');
          }
        } catch (e) {}
      }
    };
    checkBiometric();
  }, []);

  // === MAIN FLOW + SESSION ===
  useEffect(() => {
    const session = localStorage.getItem('kommit-session');
    if (session) {
      const { user: savedUser, expiry } = JSON.parse(session);
      if (Date.now() < expiry) {
        setUser(savedUser);
        const passcode = localStorage.getItem('kommit-passcode');
        if (passcode) {
          if (biometricEnabled) setShowBiometricPrompt(true);
          else setCurrentStep('passcode-lock');
        } else {
          setCurrentStep('passcode-setup');
        }
        return;
      } else {
        localStorage.removeItem('kommit-session');
      }
    }

    const onboard = localStorage.getItem('kommit-onboard');
    const passcode = localStorage.getItem('kommit-passcode');
    const auth = localStorage.getItem('kommit-auth');
    const userData = localStorage.getItem('kommit-current-user');

    if (onboard && passcode && auth && userData) {
      setUser(JSON.parse(userData));
      if (biometricEnabled) setShowBiometricPrompt(true);
      else setCurrentStep('passcode-lock');
    } else if (onboard && auth && userData) {
      setUser(JSON.parse(userData));
      setCurrentStep('passcode-setup');
    } else if (onboard) {
      setCurrentStep('auth');
    } else {
      setCurrentStep('onboarding');
    }
  }, [biometricEnabled]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('kommit-onboard', 'true');
    setCurrentStep('auth');
  };

  const handleAuthComplete = (userData) => {
    localStorage.setItem('kommit-auth', 'true');
    localStorage.setItem('kommit-current-user', JSON.stringify(userData));
    setUser(userData);
    const hasPasscode = localStorage.getItem('kommit-passcode');
    if (hasPasscode) {
      if (biometricEnabled) setShowBiometricPrompt(true);
      else setCurrentStep('passcode-lock');
    } else {
      setCurrentStep('passcode-setup');
    }
  };

  // === BIOMETRIC AUTH ===
  const authenticateWithBiometric = async () => {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      await navigator.credentials.get({
        publicKey: { challenge, allowCredentials: [], userVerification: 'required', timeout: 60000 }
      });
      setCurrentStep('app');
    } catch {
      setError('Biometric failed. Use passcode.');
      setShowBiometricPrompt(false);
      setCurrentStep('passcode-lock');
    }
  };

  // === FACE RECOGNITION ===
  const startFaceRecognition = async () => {
    setShowFaceRecognition(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      clearTimeout(faceTimeout);
      faceTimeout = setTimeout(captureAndCompare, 2000);
    } catch {
      alert('Camera access denied');
      setShowFaceRecognition(false);
    }
  };

  const captureAndCompare = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 300, 200);
      const imageData = canvasRef.current.toDataURL('image/png');
      const savedFace = localStorage.getItem('kommit-face');
      if (savedFace && imageData === savedFace) {
        setCurrentStep('app');
      } else {
        localStorage.setItem('kommit-face', imageData);
        setCurrentStep('app');
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    clearTimeout(faceTimeout);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setShowFaceRecognition(false);
  };

  // === PASSCODE LOGIC ===
  const pressKey = (n) => {
    if (currentStep === 'passcode-setup') {
      if (!isConfirming && inputCode.length < 4) {
        const newCode = inputCode + n;
        setInputCode(newCode);
        if (newCode.length === 4) {
          setTimeout(() => {
            setSetupCode(newCode);
            setInputCode('');
            setIsConfirming(true);
          }, 300);
        }
      } else if (isConfirming && inputCode.length < 4) {
        const newCode = inputCode + n;
        setInputCode(newCode);
        if (newCode.length === 4) {
          setTimeout(() => {
            if (newCode === setupCode) {
              localStorage.setItem('kommit-passcode', setupCode);
              setCurrentStep('app');
            } else {
              alert('Passcodes do not match');
              setInputCode('');
              setIsConfirming(false);
            }
          }, 300);
        }
      }
    } else if (currentStep === 'passcode-lock' && inputCode.length < 4) {
      const newCode = inputCode + n;
      setInputCode(newCode);
      if (newCode.length === 4) {
        setTimeout(() => {
          const saved = localStorage.getItem('kommit-passcode');
          if (newCode === saved) {
            setCurrentStep('app');
          } else {
            setError('Wrong passcode');
            setInputCode('');
          }
        }, 300);
      }
    }
  };

  const clearLast = () => setInputCode(inputCode.slice(0, -1));

  // === KEYBOARD INPUT ===
  useEffect(() => {
    const handleKey = (e) => {
      if (['passcode-lock', 'passcode-setup'].includes(currentStep)) {
        if (/[0-9]/.test(e.key) && inputCode.length < 4) pressKey(e.key);
        else if (e.key === 'Backspace') clearLast();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [inputCode, currentStep, isConfirming, setupCode]);

  const sendPasscodeResetCode = () => {
    const userData = localStorage.getItem('kommit-current-user');
    if (!userData) return;
    const { email } = JSON.parse(userData);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    alert(`Passcode reset code: ${code} (sent to ${email})`);
  };

  const verifyPasscodeReset = () => {
    if (resetCode === sentCode) {
      localStorage.removeItem('kommit-passcode');
      localStorage.removeItem('kommit-biometric');
      localStorage.removeItem('kommit-face');
      localStorage.removeItem('kommit-session');
      setShowForgotPasscode(false);
      setCurrentStep('passcode-setup');
      setResetCode('');
    } else {
      alert('Invalid code');
    }
  };

  const deleteAccount = () => {
    if (confirm('Delete account? All data will be lost permanently.')) {
      localStorage.removeItem(`kommit-user-${user.email}`);
      localStorage.clear();
      window.location.reload();
    }
  };

  const signOut = () => {
    localStorage.removeItem('kommit-auth');
    localStorage.removeItem('kommit-session');
    window.location.reload();
  };

  // === RENDER ===
  if (currentStep === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;
  if (currentStep === 'auth') return <Auth onAuthComplete={handleAuthComplete} />;

  // BIOMETRIC PROMPT
  if (showBiometricPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <Fingerprint className="w-20 h-20 text-teal-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Use Biometric</h2>
            <p className="text-slate-600 mb-8">Touch sensor or look at camera</p>
            <button onClick={authenticateWithBiometric} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all">
              Unlock
            </button>
            <button onClick={() => { setShowBiometricPrompt(false); setCurrentStep('passcode-lock'); }} className="mt-4 text-teal-600 font-medium hover:text-teal-700">
              Use Passcode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FACE RECOGNITION
  if (showFaceRecognition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <Camera className="w-20 h-20 text-teal-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Face Recognition</h2>
            <video ref={videoRef} autoPlay className="w-full max-w-xs mx-auto rounded-xl mb-4" />
            <canvas ref={canvasRef} width="300" height="200" className="hidden" />
            <p className="text-slate-600">Hold still...</p>
            <button onClick={stopCamera} className="mt-4 text-red-600 font-medium hover:text-red-700">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PASSCODE SCREENS
  if (currentStep === 'passcode-setup' || currentStep === 'passcode-lock') {
    const isSetup = currentStep === 'passcode-setup';
    const title = isSetup
      ? isConfirming ? 'Confirm Passcode' : 'Set Your Passcode'
      : 'Enter Passcode';
    const subtitle = isSetup ? `Welcome, ${user?.name}!` : '';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <Lock className="w-16 h-16 text-teal-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{title}</h2>
            {subtitle && <p className="text-slate-600 mb-8">{subtitle}</p>}

            <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-full border-2 transition-all ${
                    inputCode[i - 1] ? 'bg-teal-500 border-teal-500 scale-110' : 'border-slate-300'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-red-500 text-sm mb-4 bg-red-50 py-2 px-4 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => pressKey(n)}
                  className="w-20 h-20 bg-slate-100 hover:bg-slate-200 rounded-full text-3xl font-black text-slate-900 transition-all active:scale-95 hover:shadow-lg"
                >
                  {n}
                </button>
              ))}
              <div />
              <button
                onClick={() => pressKey(0)}
                className="w-20 h-20 bg-slate-100 hover:bg-slate-200 rounded-full text-3xl font-black text-slate-900 transition-all active:scale-95 hover:shadow-lg"
              >
                0
              </button>
              <button
                onClick={clearLast}
                className="w-20 h-20 bg-red-100 hover:bg-red-200 rounded-full text-red-600 transition-all active:scale-95 hover:shadow-lg flex items-center justify-center"
              >
                <ArrowLeft className="w-8 h-8" />
              </button>
            </div>

            {!isSetup && (
              <div className="space-y-3 border-t border-slate-200 pt-6">
                <button 
                  onClick={startFaceRecognition} 
                  className="w-full text-teal-600 font-bold hover:text-teal-700 flex items-center justify-center gap-2 py-3 hover:bg-teal-50 rounded-lg transition-all"
                >
                  <Camera className="w-5 h-5" /> Unlock with Face
                </button>
                <button 
                  onClick={() => { setShowForgotPasscode(true); sendPasscodeResetCode(); }} 
                  className="w-full text-slate-600 font-medium hover:text-slate-900 py-3 hover:bg-slate-50 rounded-lg transition-all"
                >
                  Forgot Passcode?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === MAIN DASHBOARD ===
  if (currentStep === 'app') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 pb-20 lg:pb-0">
        {/* Desktop: Top Navigation */}
        <div className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Kommit Pro</h1>
                <p className="text-sm text-slate-500">Welcome back, {user?.name}!</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile: Top Bar */}
        <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Kommit Pro</h1>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Content Area - Takes 8 columns on desktop */}
            <div className="lg:col-span-8 space-y-6">
              {/* HOME TAB CONTENT */}
              {activeTab === 'home' && (
                <>
                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-teal-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Streak</span>
                      </div>
                      <p className="text-3xl font-black text-slate-900">0</p>
                      <p className="text-xs text-slate-500 mt-1">days</p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-cyan-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Best</span>
                      </div>
                      <p className="text-3xl font-black text-slate-900">0</p>
                      <p className="text-xs text-slate-500 mt-1">days</p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Badges</span>
                      </div>
                      <p className="text-3xl font-black text-slate-900">0</p>
                      <p className="text-xs text-slate-500 mt-1">earned</p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Journal</span>
                      </div>
                      <p className="text-3xl font-black text-slate-900">0</p>
                      <p className="text-xs text-slate-500 mt-1">entries</p>
                    </div>
                  </div>

                  {/* Main Streak Card */}
                  <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-3xl shadow-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-32 -translate-x-32"></div>
                    
                    <div className="relative z-10">
                      <div className="inline-block mb-4">
                        <div className="text-6xl md:text-8xl font-black mb-2 drop-shadow-lg">0</div>
                        <div className="h-1 bg-white/30 rounded-full"></div>
                      </div>
                      <p className="text-xl md:text-2xl font-bold mb-6 drop-shadow">Day Streak</p>
                      <button className="bg-white text-teal-600 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2 mx-auto">
                        <Plus className="w-5 h-5" />
                        Check In Today
                      </button>
                      <p className="mt-6 text-white/90">Keep the momentum going! 🔥</p>
                    </div>
                  </div>

                  {/* Habits List */}
                  <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-black text-slate-900">Today's Habits</h2>
                      <button 
                        onClick={() => setActiveTab('habits')}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium mb-4">No habits yet</p>
                      <button 
                        onClick={() => setActiveTab('habits')}
                        className="text-teal-600 font-bold hover:text-teal-700 transition-colors flex items-center gap-2 mx-auto"
                      >
                        Create your first habit
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* HABITS TAB CONTENT */}
              {activeTab === 'habits' && (
                <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-200">
                  <h2 className="text-2xl font-black text-slate-900 mb-6">Manage Habits</h2>
                  <div className="text-center py-12">
                    <Plus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium mb-4">Coming soon...</p>
                    <p className="text-sm text-slate-400">Habit management feature in development</p>
                  </div>
                </div>
              )}

              {/* ACHIEVEMENTS TAB CONTENT */}
              {activeTab === 'achievements' && (
                <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-200">
                  <h2 className="text-2xl font-black text-slate-900 mb-6">Achievements</h2>
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium mb-4">Coming soon...</p>
                    <p className="text-sm text-slate-400">Badge system in development</p>
                  </div>
                </div>
              )}

              {/* JOURNAL TAB CONTENT */}
              {activeTab === 'journal' && (
                <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-slate-200">
                  <h2 className="text-2xl font-black text-slate-900 mb-6">Journal</h2>
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium mb-4">Coming soon...</p>
                    <p className="text-sm text-slate-400">Journal feature in development</p>
                  </div>
                </div>
              )}

              {/* PROFILE TAB CONTENT (Mobile) */}
              {activeTab === 'profile' && (
                <div className="lg:hidden space-y-6">
                  {/* Profile Card */}
                  <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{user?.name}</h3>
                        <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Settings Card */}
                  <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Settings
                    </h3>
                    
                    <div className="space-y-1">
                      {/* Notifications Toggle */}
                      <label className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group active:scale-95">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                            <Bell className="w-5 h-5 text-teal-600" />
                          </div>
                          <span className="font-medium text-slate-900">Notifications</span>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => setNotificationsEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-checked:bg-teal-500 rounded-full peer transition-all"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-md"></div>
                        </div>
                      </label>

                      {/* Biometric Toggle */}
                      {typeof window !== 'undefined' && window.PublicKeyCredential && (
                        <label className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group active:scale-95">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                              <Fingerprint className="w-5 h-5 text-teal-600" />
                            </div>
                            <span className="font-medium text-slate-900">Biometric</span>
                          </div>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={biometricEnabled}
                              onChange={async (e) => {
                                const enabled = e.target.checked;
                                if (enabled) {
                                  try {
                                    await authenticateWithBiometric();
                                    localStorage.setItem('kommit-biometric', 'true');
                                    setBiometricEnabled(true);
                                  } catch {
                                    setBiometricEnabled(false);
                                  }
                                } else {
                                  localStorage.setItem('kommit-biometric', 'false');
                                  setBiometricEnabled(false);
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-checked:bg-teal-500 rounded-full peer transition-all"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-md"></div>
                          </div>
                        </label>
                      )}

                      {/* Face Unlock Button */}
                      <button
                        onClick={startFaceRecognition}
                        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-xl transition-all text-left group active:scale-95"
                      >
                        <div className="w-10 h-10 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                          <Camera className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="font-medium text-slate-900 flex-1">Face Unlock</span>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-all" />
                      </button>
                    </div>
                  </div>

                  {/* Sign Out & Danger Zone */}
                  <div className="space-y-3">
                    <button
                      onClick={signOut}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>

                    <button
                      onClick={deleteAccount}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Sidebar - Settings (4 columns on desktop, hidden on mobile) */}
            <div className="hidden lg:block lg:col-span-4 space-y-6">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{user?.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Settings Card */}
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Settings
                </h3>
                
                <div className="space-y-1">
                  {/* Notifications Toggle */}
                  <label className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                        <Bell className="w-5 h-5 text-teal-600" />
                      </div>
                      <span className="font-medium text-slate-900">Notifications</span>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-checked:bg-teal-500 rounded-full peer transition-all"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-md"></div>
                    </div>
                  </label>

                  {/* Biometric Toggle */}
                  {typeof window !== 'undefined' && window.PublicKeyCredential && (
                    <label className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                          <Fingerprint className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="font-medium text-slate-900">Biometric</span>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={biometricEnabled}
                          onChange={async (e) => {
                            const enabled = e.target.checked;
                            if (enabled) {
                              try {
                                await authenticateWithBiometric();
                                localStorage.setItem('kommit-biometric', 'true');
                                setBiometricEnabled(true);
                              } catch {
                                setBiometricEnabled(false);
                              }
                            } else {
                              localStorage.setItem('kommit-biometric', 'false');
                              setBiometricEnabled(false);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-checked:bg-teal-500 rounded-full peer transition-all"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-md"></div>
                      </div>
                    </label>
                  )}

                  {/* Face Unlock Button */}
                  <button
                    onClick={startFaceRecognition}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-teal-50 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                      <Camera className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="font-medium text-slate-900 flex-1">Face Unlock</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-all" />
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-red-200">
                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Danger Zone
                </h3>
                <button
                  onClick={deleteAccount}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  // FORGOT PASSCODE MODAL
  if (showForgotPasscode) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <Shield className="w-16 h-16 text-teal-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Reset Passcode</h3>
            <p className="text-slate-600 mb-6">Enter the 6-digit code sent to your email</p>
            <input
              type="text"
              inputMode="numeric"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-4 rounded-xl border-2 border-slate-300 text-center text-2xl font-mono tracking-widest mb-6 focus:border-teal-500 focus:outline-none transition-all"
              autoFocus
            />
            <button 
              onClick={verifyPasscodeReset} 
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all mb-3"
            >
              Verify & Reset
            </button>
            <button 
              onClick={() => { setShowForgotPasscode(false); setResetCode(''); }} 
              className="text-slate-500 font-medium hover:text-slate-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}