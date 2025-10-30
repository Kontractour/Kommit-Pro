// app/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import Onboarding from '@/components/Onboarding';
import Auth from '@/components/Auth';
import { Lock, Fingerprint, Camera, AlertCircle, ArrowLeft, Shield, Trash2, Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      alert('Camera denied');
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
              alert('Passcodes don’t match');
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

  // === RENDER ===
  if (currentStep === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;
  if (currentStep === 'auth') return <Auth onAuthComplete={handleAuthComplete} />;

  // BIOMETRIC PROMPT
  if (showBiometricPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <Fingerprint className="w-16 h-16 md:w-20 md:h-20 text-teal-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Use Biometric</h2>
            <p className="text-slate-600 mb-8 text-sm md:text-base">Touch sensor or look at camera</p>
            <button onClick={authenticateWithBiometric} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg">
              Unlock
            </button>
            <button onClick={() => { setShowBiometricPrompt(false); setCurrentStep('passcode-lock'); }} className="mt-4 text-teal-600 font-medium">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <Camera className="w-16 h-16 md:w-20 md:h-20 text-teal-500 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Face Recognition</h2>
            <video ref={videoRef} autoPlay className="w-full max-w-xs mx-auto rounded-xl mb-4" />
            <canvas ref={canvasRef} width="300" height="200" className="hidden" />
            <p className="text-slate-600">Hold still...</p>
            <button onClick={stopCamera} className="mt-4 text-red-600 font-medium">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PASSCODE SCREENS — FULLY RESPONSIVE
  if (currentStep === 'passcode-setup' || currentStep === 'passcode-lock') {
    const isSetup = currentStep === 'passcode-setup';
    const title = isSetup
      ? isConfirming ? 'Confirm Passcode' : 'Set Your Passcode'
      : 'Enter Passcode';
    const subtitle = isSetup ? `Welcome, ${user?.name}!` : '';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
            <Lock className="w-12 h-12 md:w-16 md:h-16 text-teal-500 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{title}</h2>
            {subtitle && <p className="text-slate-600 mb-8 text-sm md:text-base">{subtitle}</p>}

            <div className="flex justify-center gap-3 md:gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 transition-all ${
                    inputCode[i - 1] ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => pressKey(n)}
                  aria-label={`Number ${n}`}
                  className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 hover:bg-slate-200 rounded-full text-2xl md:text-3xl font-black text-slate-900 transition-all active:scale-95"
                >
                  {n}
                </button>
              ))}
              <div />
              <button
                onClick={() => pressKey(0)}
                aria-label="Number 0"
                className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 hover:bg-slate-200 rounded-full text-2xl md:text-3xl font-black text-slate-900 transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={clearLast}
                aria-label="Backspace"
                className="w-16 h-16 md:w-20 md:h-20 bg-red-100 hover:bg-red-200 rounded-full text-red-600 transition-all active:scale-95"
              >
                <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>

            {!isSetup && (
              <div className="mt-8 space-y-3 text-sm md:text-base">
                <button onClick={startFaceRecognition} className="w-full text-teal-600 font-bold hover:text-teal-700 flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" /> Unlock with Face
                </button>
                <button onClick={() => { setShowForgotPasscode(true); sendPasscodeResetCode(); }} className="w-full text-teal-600 font-bold hover:text-teal-700">
                  Forgot Passcode?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD — FULL WIDTH, RESPONSIVE
  if (currentStep === 'app') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-black text-teal-600">Kommit</h1>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Streak Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
                <h1 className="text-8xl md:text-9xl font-black text-teal-500 mb-4">0</h1>
                <p className="text-2xl md:text-3xl font-bold text-slate-700 mb-8">KOMMIT Streak</p>
                <button className="w-full max-w-xs mx-auto bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transition-all">
                  +1 Day
                </button>
                <p className="mt-6 text-slate-600 text-lg">Welcome back, {user?.name}!</p>
              </div>
            </div>

            {/* Settings Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Security</h3>
                <div className="space-y-4">
                  {typeof window !== 'undefined' && window.PublicKeyCredential && (
                    <label className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="w-5 h-5 text-teal-600" />
                        <span className="font-medium">Biometric</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={biometricEnabled}
                        onChange={async (e) => {
                          const enabled = e.target.checked;
                          if (enabled) {
                            await authenticateWithBiometric();
                            localStorage.setItem('kommit-biometric', 'true');
                            setBiometricEnabled(true);
                          } else {
                            localStorage.setItem('kommit-biometric', 'false');
                            setBiometricEnabled(false);
                          }
                        }}
                        className="w-5 h-5 text-teal-600 rounded"
                      />
                    </label>
                  )}
                  <button
                    onClick={startFaceRecognition}
                    className="w-full text-teal-600 font-medium hover:text-teal-700 flex items-center justify-center gap-2 py-2"
                  >
                    <Camera className="w-5 h-5" /> Face Unlock
                  </button>
                </div>
              </div>

              <button
                onClick={deleteAccount}
                className="w-full text-red-600 font-medium flex items-center justify-center gap-2 py-3 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
              >
                <Trash2 className="w-5 h-5" /> Delete Account
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('kommit-auth');
                  localStorage.removeItem('kommit-session');
                  window.location.reload();
                }}
                className="w-full text-slate-600 font-medium py-3"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 bottom-0 bg-white border-t border-slate-200 p-4 space-y-3">
            <button className="w-full text-left py-3 px-4 rounded-lg hover:bg-slate-50 flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-teal-600" /> Biometric
            </button>
            <button onClick={startFaceRecognition} className="w-full text-left py-3 px-4 rounded-lg hover:bg-slate-50 flex items-center gap-3">
              <Camera className="w-5 h-5" /> Face Unlock
            </button>
            <button onClick={deleteAccount} className="w-full text-left py-3 px-4 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-3">
              <Trash2 className="w-5 h-5" /> Delete Account
            </button>
          </div>
        )}
      </div>
    );
  }

  // FORGOT PASSCODE
  if (showForgotPasscode) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <Shield className="w-12 h-12 text-teal-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-4">Reset Passcode</h3>
            <p className="text-slate-600 mb-6">Enter 6-digit code</p>
            <input
              type="text"
              inputMode="numeric"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3.5 rounded-xl border-2 text-center text-2xl font-mono tracking-widest mb-4 focus:border-teal-500"
              autoFocus
            />
            <button onClick={verifyPasscodeReset} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold">
              Verify & Reset
            </button>
            <button onClick={() => { setShowForgotPasscode(false); setResetCode(''); }} className="mt-4 text-slate-500 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}