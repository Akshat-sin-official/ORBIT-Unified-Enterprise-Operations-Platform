import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  Headphones,
  CalendarCheck,
  Wrench,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both work email and password');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');
      onSuccess();
    } catch (err: any) {
      if (!err?.response) {
        toast.error('Cannot connect to ORBIT API server. Ensure backend is running.');
      } else if (err.response?.status === 401) {
        toast.error('Invalid credentials. Check your email and password.');
      } else {
        toast.error(err.response?.data?.message || 'Sign in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'support' | 'dispatcher' | 'tech') => {
    setActiveRole(role);
    try {
      await loginDemo(role);
      toast.success(`Signed in as ${role.toUpperCase()}`);
      onSuccess();
    } catch {
      toast.error('Demo sign-in failed. Please verify API & Database connection.');
    } finally {
      setActiveRole(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090D] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600/30 relative overflow-hidden">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Top Header Logo - Standalone Icon Only */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-center pt-2 sm:pt-4">
        <img
          src="/orbit-logo.png"
          alt="ORBIT"
          className="h-7 sm:h-8 w-auto object-contain brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
        />
      </header>

      {/* Center Main Card - Exact Attio Style Framing */}
      <main className="relative z-10 w-full max-w-4xl xl:max-w-5xl mx-auto my-auto">
        <div className="bg-[#0D0F17] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden grid md:grid-cols-2">
          
          {/* Left Column: Form & Direct Actions */}
          <div className="p-7 sm:p-9 lg:p-12 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Let's get started.
              </h1>
              <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed font-normal">
                ORBIT is the operations platform that meets you where you work,
                compounds every field and logistics signal into context, then acts across
                your pipeline to let you move at unmatched speed and scale.
              </p>
              <p className="text-xs text-zinc-500 pt-1 font-normal">
                From here, you'll always know your next move.
              </p>
            </div>

            {/* Auth Actions */}
            <div className="space-y-4 pt-1">
              {/* Google SSO Button */}
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="w-full h-10 sm:h-11 bg-[#2563EB] hover:bg-blue-600 text-white font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {/* Minimal Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="w-full border-t border-zinc-800" />
                <span className="bg-[#0D0F17] px-3 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                  OR
                </span>
              </div>

              {/* Manual Email / Password Form */}
              <form onSubmit={handleManualLogin} className="space-y-3">
                <div>
                  <label className="text-[11px] text-zinc-400 font-medium mb-1.5 block">
                    Sign in with email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Enter your work email address..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 bg-[#121520] border border-white/10 rounded-xl px-3.5 pr-10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
                      title="Continue"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password field */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-[#121520] border border-white/10 rounded-xl px-3.5 pr-10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </form>

              {/* 1-Click Role Sandbox Pills */}
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-2">
                  Fast Demo Access
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(activeRole)}
                    onClick={() => handleDemoLogin('admin')}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[11px] text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>Admin</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(activeRole)}
                    onClick={() => handleDemoLogin('dispatcher')}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[11px] text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CalendarCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Dispatch</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(activeRole)}
                    onClick={() => handleDemoLogin('support')}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[11px] text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Headphones className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Support</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(activeRole)}
                    onClick={() => handleDemoLogin('tech')}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[11px] text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Field Tech</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Disclaimer */}
            <p className="text-[10px] text-zinc-600 leading-relaxed pt-2">
              By inserting your email you confirm you agree to ORBIT contacting you about our
              product and services. You can opt out at any time by clicking unsubscribe in our
              emails. Find out more about how we use data in our privacy policy.
            </p>
          </div>

          {/* Right Column: Editorial Testimonial Panel */}
          <div
            className="hidden md:flex flex-col justify-between p-8 sm:p-10 lg:p-12 bg-[#080A10] border-l border-white/5 relative overflow-hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 10px)',
            }}
          >
            {/* Subtle inner dark vignette & moody ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(8,10,16,0.75)_100%)] pointer-events-none" />

            <div className="relative z-10" />

            {/* Centered Editorial Quote in Tiempos/Newsreader Serif */}
            <div className="relative z-10 my-auto text-center max-w-sm mx-auto px-4">
              <blockquote className="font-serif text-lg sm:text-xl lg:text-[22px] text-zinc-100 font-normal leading-relaxed tracking-normal">
                “ORBIT is the furthest we’ve ever gotten with any kind of firm-wide
                software – it’s a huge improvement.”
              </blockquote>
              <div className="mt-6 space-y-1">
                <p className="text-xs sm:text-sm font-medium text-zinc-200 tracking-tight font-sans">
                  Matt Cynamon
                </p>
                <p className="text-[11px] text-zinc-500 font-sans">
                  Head of Global Operations &middot; USV
                </p>
              </div>
            </div>

            <div className="relative z-10" />
          </div>

        </div>
      </main>
    </div>
  );
};
