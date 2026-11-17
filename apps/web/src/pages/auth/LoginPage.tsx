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
  Orbit,
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

  const demoRoles = [
    {
      role: 'admin' as const,
      label: 'Admin',
      sub: 'Platform Owner',
      icon: ShieldCheck,
    },
    {
      role: 'support' as const,
      label: 'Support Desk',
      sub: 'Pooja (Diagnostics)',
      icon: Headphones,
    },
    {
      role: 'dispatcher' as const,
      label: 'Dispatcher',
      sub: 'Amit (Scheduling)',
      icon: CalendarCheck,
    },
    {
      role: 'tech' as const,
      label: 'Field Tech',
      sub: 'Ravi (On-Site Repair)',
      icon: Wrench,
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
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#FAF9F6] font-sans overflow-x-hidden">
      {/* Left Panel - Hero / Enterprise Branding */}
      <div className="hidden lg:flex flex-col bg-gradient-to-br from-[#F5F3EF] via-[#FAF9F6] to-[#EAE6DF] text-ink p-8 xl:p-12 2xl:p-16 justify-between relative sticky top-0 h-screen overflow-hidden border-r border-border/40">
        {/* Soft corporate gradient glow orbs */}
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-[500px] h-[500px] bg-gradient-to-br from-primary/15 to-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(26,11,46,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(26,11,46,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-11 h-11 bg-white/95 rounded-2xl border border-white/90 shadow-xs backdrop-blur-md flex items-center justify-center text-primary">
              <Orbit className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold font-poppins tracking-tight text-ink leading-none">
                ORBIT
              </span>
              <span className="text-[10px] text-ink-soft uppercase tracking-widest font-mono mt-0.5">
                Enterprise Resource Ops Platform
              </span>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-md space-y-6 xl:space-y-8 font-poppins my-auto">
          <div className="space-y-3">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.15] text-ink">
              Unified <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Operations</span>
            </h1>
            <p className="text-sm xl:text-base text-ink-soft leading-relaxed font-sans max-w-sm">
              One platform connecting customer requests, field technicians, parts inventory, and management intelligence.
            </p>
          </div>

          {/* Premium Glassmorphic Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 xl:p-6 border border-white/95 shadow-[0_12px_40px_0_rgba(26,11,46,0.04)] space-y-3.5 xl:space-y-4 font-sans hover:border-white transition-all duration-300">
            <div className="flex items-center gap-3.5 text-ink/90">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[13.5px] font-semibold tracking-wide">
                Tenant-Isolated Security & Granular RBAC
              </span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/90">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[13.5px] font-semibold tracking-wide">
                Serial Number & Warranty Engine Validation
              </span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/90">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[13.5px] font-semibold tracking-wide">
                Smart Dispatch & Field Service Workflow
              </span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/90">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[13.5px] font-semibold tracking-wide">
                Full Immutable Audit Trails & Stock Traceability
              </span>
            </div>
          </div>

          <div className="pt-4 xl:pt-6 border-t border-border/80 text-ink-soft">
            <p className="text-sm xl:text-base italic text-ink-soft/80 font-sans">
              "Built for real-world enterprise operations, not just another CRUD portal."
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-end text-[11px] text-ink-soft/60 font-medium font-sans">
          <p>© 2026 ORBIT Technologies Inc.</p>
          <span className="font-mono text-[10px] text-ink-soft/60">v1.0-foundation</span>
        </div>
      </div>

      {/* Right Panel - Login & 1-Click Profiles */}
      <div className="flex flex-col h-screen overflow-hidden bg-[#FAF9F6] relative">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between p-6 lg:p-8 shrink-0 bg-[#FAF9F6] z-20 w-full">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-poppins">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API & Database Live
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-border/60 shadow-2xs text-[11px] font-medium text-ink-soft font-poppins">
            <span className="text-ink font-semibold">PostgreSQL 16</span>
            <span className="text-border">|</span>
            <span className="font-mono text-ink-soft/70">Redis 7</span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-[400px] my-auto space-y-6 animate-fade-in">
            <div className="flex flex-col space-y-2 text-center lg:text-left">
              <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-border/60 p-1 flex items-center justify-center text-primary shadow-xs">
                  <Orbit className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xl font-bold font-poppins text-ink">ORBIT</span>
              </div>
              <h2 className="text-3xl font-extrabold font-poppins tracking-tight text-ink">Sign In</h2>
              <p className="text-sm text-ink-soft font-sans">
                Choose a role profile below or sign in with your account
              </p>
            </div>

            {/* 1-Click Role Profiles Grid (2x2) */}
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
                    className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-border/70 bg-white hover:border-primary/50 hover:bg-slate-50/60 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-ink-soft/70">1-click</span>
                    </div>
                    <div className="mt-2.5">
                      <div className="font-poppins font-bold text-xs text-ink">{dr.label}</div>
                      <div className="text-[11px] text-ink-soft truncate mt-0.5">{dr.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-border/60 flex-1" />
              <span className="text-[11px] font-bold text-ink-soft/70 uppercase tracking-widest font-poppins">
                Or credentials
              </span>
              <div className="h-px bg-border/60 flex-1" />
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@orbit.local"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-[13.5px] font-bold"
                disabled={isLoading || activeRole !== null}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 group">
                    <span>Sign In to ORBIT</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
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
