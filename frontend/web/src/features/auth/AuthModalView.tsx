import React, { useState } from 'react';
import { Store, Lock, Mail, User, Phone, LogIn, UserPlus, CheckCircle2, ChevronRight, ChevronLeft, Building, ShieldCheck, FileText, Upload, Eye, EyeOff, Globe } from 'lucide-react';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';

interface AuthModalViewProps {
  onClose: () => void;
}

export const AuthModalView: React.FC<AuthModalViewProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Sign-Up fields
  const [businessName, setBusinessName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [phone, setPhone] = useState('');
  const [tagline, setTagline] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.src = evt.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 450;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setLogoUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setLogoUrl(evt.target?.result as string);
        }
      };
      img.onerror = () => setLogoUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { showToast } = useAlertStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await ApiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.success) {
        login(res.data.user, res.data.token, res.data.user.branches);
        showToast('success', 'Logged In Successfully', `Welcome back, ${res.data.user.name}!`);
        onClose();
      }
    } catch (err: any) {
      showToast('error', 'Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    if (!businessName.trim()) {
      showToast('error', 'Validation Error', 'Please enter your Business / Company Name.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!adminName.trim()) {
      showToast('error', 'Validation Error', 'Please enter the Owner / Manager Name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('error', 'Validation Error', 'Please enter a valid Owner Email Address.');
      return false;
    }
    if (!password || password.length < 4) {
      showToast('error', 'Validation Error', 'Password must be at least 4 characters long.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    try {
      const res = await ApiClient.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ businessName, adminName, email, password, phone, tagline, taxNumber, address, website, logoUrl })
      });
      if (res.success) {
        login(res.data.user, res.data.token, res.data.user.branches);
        showToast('success', 'Business Registered!', `Welcome to Ave, ${businessName}! You are configured as Business Owner & Admin.`);
        onClose();
      }
    } catch (err: any) {
      showToast('error', 'Registration Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'cashier' | 'admin') => {
    if (role === 'cashier') {
      setEmail('cashier@ave.com');
      setPassword('cashier123');
    } else {
      setEmail('admin@ave.com');
      setPassword('admin123');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg space-y-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center space-x-2 bg-teal-600/10 dark:bg-teal-600/20 text-teal-600 dark:text-teal-400 px-4 py-2 rounded-2xl border border-teal-500/30">
            <Store className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span className="font-extrabold text-xl tracking-wider text-slate-900 dark:text-white">Ave</span>
            <span className="text-[10px] uppercase font-bold bg-teal-600/20 px-2 py-0.5 rounded text-teal-700 dark:text-teal-300">Retail</span>
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {mode === 'login' ? 'Sign In to Your Register' : 'Register Business Account'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? 'Enter your employee credentials to access checkout.'
              : 'Complete the 3-step setup to register your multi-branch enterprise.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => {
              setMode('login');
              setStep(1);
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
              mode === 'login'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setStep(1);
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
              mode === 'signup'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Business</span>
          </button>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cashier@ave.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Quick Demo Fill:</span>
              <div className="space-x-1">
                <button
                  type="button"
                  onClick={() => fillDemo('cashier')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
                >
                  Cashier Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin')}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
                >
                  Admin Demo
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition text-sm flex items-center justify-center space-x-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Ave'}
            </button>
          </form>
        ) : (
          /* MULTI-STEP SIGN-UP WIZARD FORM */
          <form onSubmit={handleSignUp} className="space-y-4 text-xs">
            {/* Step Stepper Progress Indicator */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div
                onClick={() => setStep(1)}
                className={`flex items-center space-x-1.5 cursor-pointer ${
                  step === 1 ? 'text-teal-600 dark:text-teal-400 font-extrabold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 1
                      ? 'bg-teal-600 text-white'
                      : step > 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className="hidden sm:inline text-xs">1. Business</span>
              </div>

              <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-800" />

              <div
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className={`flex items-center space-x-1.5 cursor-pointer ${
                  step === 2 ? 'text-teal-600 dark:text-teal-400 font-extrabold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 2
                      ? 'bg-teal-600 text-white'
                      : step > 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className="hidden sm:inline text-xs">2. Owner</span>
              </div>

              <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-800" />

              <div
                onClick={() => {
                  if (validateStep1() && validateStep2()) setStep(3);
                }}
                className={`flex items-center space-x-1.5 cursor-pointer ${
                  step === 3 ? 'text-teal-600 dark:text-teal-400 font-extrabold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  3
                </div>
                <span className="hidden sm:inline text-xs">3. Review</span>
              </div>
            </div>

            {/* STEP 1: BUSINESS DETAILS */}
            {step === 1 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold text-xs">
                  <Building className="w-4 h-4" />
                  <span>Step 1 of 3: Business Information</span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Business / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Retail Supermarket Ltd"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Business Logo File Upload (Base64) */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Business Logo (Saved as Base64)
                  </label>
                  <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700">
                    {logoUrl ? (
                      <div className="relative group">
                        <img src={logoUrl} alt="Logo Preview" className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-0.5" />
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center shadow"
                          title="Remove logo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Upload className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">PNG or JPG up to 2MB (Auto-converts to Base64)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Business Tagline
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Quality Everyday Retail"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Tax ID / TIN Number
                    </label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="e.g. C0012345678"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Business Website (Optional)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://www.yourbusiness.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Store Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 24 111 2233"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Plot 12 Ring Road, Accra"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition text-sm flex items-center justify-center space-x-2 mt-4"
                >
                  <span>Next: Owner Account</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: OWNER & ADMIN ACCOUNT */}
            {step === 2 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Step 2 of 3: Owner Account Credentials</span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Owner / Manager Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Kwame Nkrumah"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Owner Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@supermarket.com"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Account Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                      title={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition text-sm flex items-center justify-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-2/3 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition text-sm flex items-center justify-center space-x-2"
                  >
                    <span>Next: Review & Confirm</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & CONFIRM */}
            {step === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <FileText className="w-4 h-4" />
                  <span>Step 3 of 3: Review & Enable Registration</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Business Enterprise</span>
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white">{businessName || 'N/A'}</p>
                    {tagline && <p className="text-slate-500 italic text-[11px]">"{tagline}"</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Tax ID / TIN:</span>
                      <span className="font-mono font-semibold">{taxNumber || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone:</span>
                      <span className="font-semibold">{phone || 'None'}</span>
                    </div>
                  </div>

                  {address && (
                    <div className="text-[11px]">
                      <span className="text-slate-400 block">Address:</span>
                      <span className="font-semibold">{address}</span>
                    </div>
                  )}

                  {website && (
                    <div className="text-[11px]">
                      <span className="text-slate-400 block">Website:</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400 font-mono">{website}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Owner / Admin Account</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{adminName}</p>
                    <p className="text-teal-600 dark:text-teal-400 font-mono">{email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold rounded text-[10px]">
                      Roles: OWNER, ADMIN, CASHIER
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition text-sm flex items-center justify-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition text-sm flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'Creating...' : 'Create Business Account'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
