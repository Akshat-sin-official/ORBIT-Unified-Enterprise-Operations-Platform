import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Headphones,
  CalendarCheck,
  Wrench,
  Eye,
  EyeOff,
  Sparkles,
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

  const demoRoles = [
    {
      role: 'admin' as const,
      label: 'Platform Admin',
      sub: 'Super Admin • All 10 Modules',
      icon: ShieldCheck,
      badge: 'Full RBAC',
    },
    {
      role: 'support' as const,
      label: 'Service Desk',
      sub: 'Pooja • Incident Triage & SLA',
      icon: Headphones,
      badge: 'Support',
    },
    {
      role: 'dispatcher' as const,
      label: 'Smart Dispatcher',
      sub: 'Amit • Scheduling & Fleet',
      icon: CalendarCheck,
      badge: 'Dispatch',
    },
    {
      role: 'tech' as const,
      label: 'Field Technician',
      sub: 'Ravi • On-Site & Customer OTP',
      icon: Wrench,
      badge: 'Field Ops',
    },
  ];

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');
      onSuccess();
    } catch (err: any) {
      if (!err?.response) {
        toast.error('Cannot connect to ORBIT API server. Please ensure the backend is running.');
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
    } catch (err: any) {
      toast.error('Demo sign-in failed. Please verify API & Database connection.');
    } finally {
      setActiveRole(null);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#FAF9F6] font-sans overflow-x-hidden selection:bg-primary/20">
      {/* Left Panel - Hero / Brand Showcase */}
      <div className="hidden lg:flex flex-col bg-gradient-to-br from-[#F5F3EF] via-[#FAF9F6] to-[#EAE6DF] text-ink p-10 xl:p-14 2xl:p-16 justify-between relative sticky top-0 h-screen overflow-hidden border-r border-border/60">
        {/* Soft atmospheric gradient glow */}
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-[550px] h-[550px] bg-gradient-to-br from-primary/15 to-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Brand Header with Custom Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="h-12 w-auto bg-white/95 px-3 py-1.5 rounded-2xl border border-white shadow-xs backdrop-blur-md flex items-center justify-center">
              <img
                src="/orbit-logo.png"
                alt="ORBIT"
                className="h-8 w-auto object-contain mix-blend-multiply"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-soft uppercase tracking-[0.2em] font-mono font-bold">
                Unified Enterprise Operations
              </span>
              <span className="text-[11px] font-mono text-primary font-semibold">
                Platform v1.0 Production
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono text-[10.5px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>M1–M9 Telemetry Active</span>
          </div>
        </div>

        {/* Hero Content with Elevated Typography */}
        <div className="relative z-10 max-w-lg space-y-7 font-poppins my-auto">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Domain-Driven Operations</span>
            </div>
            <h1 className="text-4xl xl:text-5xl 2xl:text-[54px] font-black tracking-[-0.035em] leading-[1.12] text-ink">
              Autonomous <br />
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Field & Enterprise
              </span>{' '}
              <br />
              Resource Ops.
            </h1>
            <p className="text-sm xl:text-[15px] text-muted-foreground leading-relaxed font-sans max-w-md font-normal">
              Unified orchestration for Customer CRM, Service Desk SLAs, Field Technician
              Dispatches, Multi-Hub Warehouses, Fleet Logistics & Automated Invoicing.
            </p>
          </div>

          {/* Premium Glassmorphic Feature Pill Cards */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 xl:p-6 border border-white shadow-[0_12px_40px_0_rgba(26,11,46,0.04)] space-y-3 font-sans">
            <div className="flex items-center gap-3 text-ink/90">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span className="text-xs font-semibold font-poppins tracking-tight">
                Tenant-Isolated Multi-Tenancy & Granular RBAC Permissions
              </span>
            </div>
            <div className="flex items-center gap-3 text-ink/90">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span className="text-xs font-semibold font-poppins tracking-tight">
                Hardware Serial Number & Manufacturer Warranty Engine
              </span>
            </div>
            <div className="flex items-center gap-3 text-ink/90">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span className="text-xs font-semibold font-poppins tracking-tight">
                Algorithmic Technician Match & Customer OTP Fraud Prevention
              </span>
            </div>
            <div className="flex items-center gap-3 text-ink/90">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span className="text-xs font-semibold font-poppins tracking-tight">
                Google Gemini 2.5 Flash Operations Copilot with Live RAG
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/70 text-ink-soft">
            <p className="text-xs italic text-muted-foreground font-sans">
              "Built for high-volume enterprise operations: fast, keyboard-first, and resilient."
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-end text-xs text-muted-foreground font-medium font-sans">
          <p>© 2026 ORBIT Technologies Inc.</p>
          <span className="font-mono text-[10.5px]">ORBIT Enterprise Suite</span>
        </div>
      </div>

      {/* Right Panel - Login & 1-Click Persona Profiles */}
      <div className="flex flex-col h-screen overflow-hidden bg-[#FAF9F6] relative">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between p-6 lg:p-8 shrink-0 bg-[#FAF9F6] z-20 w-full">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Backend Services Online
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-border/70 shadow-2xs text-[11px] font-mono text-muted-foreground">
            <span className="text-ink font-semibold">PostgreSQL 16</span>
            <span className="text-border">•</span>
            <span>Redis 7</span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-[420px] my-auto space-y-6 animate-fade-in">
            {/* Header Lockup with Logo */}
            <div className="flex flex-col space-y-2 text-center lg:text-left">
              <div className="lg:hidden flex items-center justify-center gap-2 mb-2">
                <img
                  src="/orbit-logo.png"
                  alt="ORBIT"
                  className="h-9 w-auto object-contain mix-blend-multiply"
                />
              </div>
              <h2 className="text-3xl font-black font-poppins tracking-[-0.03em] text-ink">
                Sign In
              </h2>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                Choose a pre-configured role profile below to test distinct RBAC dashboards, or enter your credentials.
              </p>
            </div>

            {/* 1-Click Role Profiles Grid (2x2) */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold font-poppins uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Select Operational Persona:</span>
                <span className="font-mono font-medium text-primary">Instant RBAC Session</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {demoRoles.map((dr) => {
                  const Icon = dr.icon;
                  const isSelected = activeRole === dr.role;
                  return (
                    <button
                      key={dr.role}
                      type="button"
                      onClick={() => handleDemoLogin(dr.role)}
                      disabled={activeRole !== null || isLoading}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border/80 bg-white hover:border-primary/50 hover:bg-zinc-50/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9.5px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/5 border border-primary/20">
                          {dr.badge}
                        </span>
                      </div>
                      <div>
                        <div className="font-poppins font-bold text-xs text-ink tracking-tight">
                          {dr.label}
                        </div>
                        <div className="text-[10.5px] text-muted-foreground truncate font-sans mt-0.5">
                          {dr.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-border/70 flex-1" />
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest font-poppins">
                Or Sign In With Password
              </span>
              <div className="h-px bg-border/70 flex-1" />
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="email" className="font-poppins font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@orbit.local"
                  className="h-10 text-xs bg-white border-border/80 font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="font-poppins font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs bg-white border-border/80 font-mono pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-xs font-poppins font-bold tracking-wide uppercase bg-gradient-to-r from-indigo-600 via-primary to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs rounded-xl"
                disabled={isLoading || activeRole !== null}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 group">
                    <span>Sign In to ORBIT Console</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 duration-150" />
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
