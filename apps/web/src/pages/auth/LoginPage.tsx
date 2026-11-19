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
  ChevronLeft,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your work email address');
      return;
    }
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      toast.error('Please enter a valid work email address');
      return;
    }
    // Proceed to password step with smooth animation
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your password');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
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
    setIsLoading(true);
    try {
      await loginDemo(role);
      toast.success(`Signed in as ${role.toUpperCase()}`);
      onSuccess();
    } catch {
      toast.error('Demo sign-in failed. Please verify API & Database connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090D] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#2F68FE]/30 relative overflow-hidden">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-blue-600/8 via-indigo-600/4 to-transparent blur-[140px] pointer-events-none" />

      {/* Top Header Logo - Standalone Icon Only */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-center pt-2 sm:pt-4">
        <img
          src="/orbit-logo.png"
          alt="ORBIT"
          className="h-7 w-auto object-contain brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
        />
      </header>

      {/* Center Main Card - Widescreen Attio Spread */}
      <main className="relative z-10 w-full max-w-6xl xl:max-w-7xl mx-auto my-auto py-6 sm:py-8">
        <div className="bg-[#0D0F17] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[620px]">
          
          {/* Left Column: Form & Direct Actions (40% width on desktop) */}
          <div className="lg:col-span-5 p-7 sm:p-10 lg:p-12 flex flex-col justify-between">
            <div>
              {/* Header Typography with Inter Variable Precision */}
              <div className="space-y-2">
                <h1 className="text-[20px] font-semibold text-white tracking-[-0.02em] leading-snug">
                  Let's get started.
                </h1>
                <p className="text-[13px] text-[#8F95A3] font-normal leading-[1.62] tracking-[-0.01em]">
                  ORBIT is the operations platform that meets you where you work,
                  compounds every field and logistics signal into context, then acts across
                  your pipeline to let you move at unmatched speed and scale.
                </p>
                <p className="text-[13px] text-[#8F95A3] font-normal leading-[1.62] tracking-[-0.01em] pt-1">
                  From here, you'll always know your next move.
                </p>
              </div>

              {/* Auth Flow Container */}
              <div className="mt-8 space-y-4">
                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin')}
                  className="w-full h-[42px] bg-[#2F68FE] hover:bg-[#2558E5] text-white font-medium text-[13.5px] tracking-[-0.01em] rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
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
                <div className="relative flex items-center justify-center py-2">
                  <div className="w-full border-t border-white/[0.08]" />
                  <span className="bg-[#0D0F17] px-3 text-[10.5px] text-[#555C6B] font-mono tracking-widest uppercase">
                    OR
                  </span>
                </div>

                {/* Step 1: Email Input Only */}
                {step === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-2">
                    <label className="text-[12px] font-medium text-[#8F95A3] tracking-[-0.01em] block">
                      Sign in with email
                    </label>
                    <div className="relative group">
                      <input
                        type="email"
                        placeholder="Enter your work email address..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        className="w-full h-[42px] bg-[#11131A] border border-white/[0.08] focus:border-[#2F68FE] focus:ring-1 focus:ring-[#2F68FE]/30 rounded-lg px-3.5 pr-11 text-[13px] text-white placeholder:text-[#4A505F] transition-all outline-none"
                      />
                      <button
                        type="submit"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-[6px] bg-[#2F68FE] hover:bg-[#2558E5] text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                        title="Continue"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Step 2: Animated Transition to Password Section */
                  <form
                    onSubmit={handlePasswordSubmit}
                    className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-medium text-[#8F95A3] tracking-[-0.01em]">
                        Sign in with email
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email');
                          setPassword('');
                        }}
                        className="text-[11px] text-[#2F68FE] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        <span>Change email</span>
                      </button>
                    </div>

                    {/* Locked Email Pill */}
                    <div className="w-full h-[38px] bg-[#11131A]/70 border border-white/[0.06] rounded-lg px-3 flex items-center text-[12.5px] text-zinc-300 font-mono truncate">
                      {email}
                    </div>

                    {/* Password Input with embedded submit arrow */}
                    <div className="relative group pt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        className="w-full h-[42px] bg-[#11131A] border border-white/[0.08] focus:border-[#2F68FE] focus:ring-1 focus:ring-[#2F68FE]/30 rounded-lg px-3.5 pr-20 text-[13px] text-white placeholder:text-[#4A505F] transition-all outline-none"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-7 h-7 rounded-[6px] bg-[#2F68FE] hover:bg-[#2558E5] text-white flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                          title="Sign in"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom Disclaimer (Pinned cleanly to bottom) */}
            <div className="pt-10 sm:pt-14">
              <p className="text-[10.5px] text-[#525866] leading-[1.6] tracking-[-0.005em]">
                By inserting your email you confirm you agree to ORBIT contacting you about our
                product and services. You can opt out at any time by clicking unsubscribe in our
                emails. Find out more about how we use data in our privacy policy.
              </p>
            </div>
          </div>

          {/* Right Column: Editorial Testimonial Panel (60% width on desktop) */}
          <div
            className="hidden lg:flex lg:col-span-7 flex-col justify-center items-center p-12 xl:p-16 bg-[#080A10] border-l border-white/5 relative overflow-hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 12px)',
            }}
          >
            {/* Subtle inner dark vignette & atmospheric ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(8,10,16,0.85)_100%)] pointer-events-none" />

            {/* Centered Editorial Quote in Tiempos/Newsreader Serif */}
            <div className="relative z-10 text-center max-w-lg mx-auto px-6">
              <blockquote className="font-serif text-[23px] sm:text-[25px] xl:text-[27px] text-[#E6E8EC] font-normal leading-[1.42] tracking-normal">
                &ldquo;ORBIT is the furthest we&rsquo;ve ever gotten with any kind of firm-wide
                software &ndash; it&rsquo;s a huge improvement.&rdquo;
              </blockquote>
              <div className="mt-7 space-y-1">
                <p className="text-[13px] font-medium text-[#E6E8EC] tracking-[-0.01em] font-sans">
                  Matt Cynamon
                </p>
                <p className="text-[12px] text-[#717784] font-sans">
                  Head of Global Operations &middot; USV
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Subtle Dev / Fast Role Access (Discreet bottom pill) */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-end text-[11px] text-zinc-600 font-medium">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 font-mono tracking-wider transition-colors cursor-pointer py-1 px-2 rounded hover:bg-white/5"
          >
            Demo roles {showDemoMenu ? '▾' : '▸'}
          </button>

          {showDemoMenu && (
            <div className="absolute bottom-7 right-0 bg-[#0E111A] border border-white/10 rounded-xl p-2 shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in slide-in-from-bottom-1">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('dispatcher')}
                className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarCheck className="w-3 h-3 text-emerald-400" />
                <span>Dispatch</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('support')}
                className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Headphones className="w-3 h-3 text-purple-400" />
                <span>Support</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('tech')}
                className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3 h-3 text-amber-400" />
                <span>Tech</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
