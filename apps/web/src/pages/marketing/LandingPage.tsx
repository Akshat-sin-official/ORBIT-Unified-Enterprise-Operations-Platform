import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Scan,
  FileText,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  TrendingUp,
  Cpu,
  BarChart3,
  Boxes,
  Users,
  ChevronRight,
  Play,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dispatch' | 'rma' | 'amc' | 'mobile'>('dispatch');
  const [techCount, setTechCount] = useState<number>(35);
  const [ticketVolume, setTicketVolume] = useState<number>(2400);

  // ROI Calculator Calculations
  const hoursSavedPerYear = Math.round(techCount * 5.5 * 50); // 5.5 hrs saved/tech/wk
  const leakagePreventedAnnual = Math.round((ticketVolume * 12 * 0.04) * 450); // 4% shrinkage prevented @ $450/part
  const totalAnnualValue = Math.round(hoursSavedPerYear * 38 + leakagePreventedAnnual);

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 font-sans selection:bg-blue-600/30 overflow-x-hidden">
      
      {/* ─── 1. TOP NAVIGATION NAVBAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#08090D]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/orbit-logo.png"
                alt="ORBIT"
                className="h-7 w-auto object-contain brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
              />
              <span className="font-semibold text-sm tracking-tight text-white font-sans">
                ORBIT
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-[13px] text-zinc-400 font-medium">
              <a href="#features" className="hover:text-white transition-colors">Platform</a>
              <a href="#simulator" className="hover:text-white transition-colors">Interactive Tour</a>
              <a href="#calculator" className="hover:text-white transition-colors">ROI Calculator</a>
              <a href="#testimonials" className="hover:text-white transition-colors">Case Studies</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <ButtonLink to="/dashboard" variant="primary">
                Open Workspace →
              </ButtonLink>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[13px] font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="h-9 px-4 rounded-lg bg-[#2F68FE] hover:bg-[#2558E5] text-white text-[13px] font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>Start Pilot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        {/* Soft atmospheric ceiling glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-blue-600/12 via-indigo-600/5 to-transparent blur-[140px] pointer-events-none" />

        {/* Product Release Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-white/5 text-[12px] font-medium text-zinc-300 mb-8 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Unified Enterprise Resource & Field Operations</span>
          <span className="text-zinc-600">•</span>
          <span className="text-blue-400 font-mono text-[11px]">v2.4 Released</span>
        </div>

        {/* Primary Headline in Inter Variable */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1.08] text-white max-w-4xl mx-auto">
          Turn frontline chaos into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white">
            precision execution.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base lg:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
          The single system of record for high-velocity dispatching, serialized RMA reverse
          logistics, and automated AMC preventative maintenance.
        </p>

        {/* Dual Call to Action */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#2F68FE] hover:bg-[#2558E5] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span>Book Live Demonstration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto h-11 px-5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-zinc-400" />
            <span>Fast Role Sandbox</span>
          </button>
        </div>

        {/* Trust metrics banner */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-white/[0.06]">
          <div>
            <div className="text-2xl font-semibold text-white tracking-tight">0%</div>
            <div className="text-xs text-zinc-500 mt-0.5">Asset Shrinkage</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white tracking-tight">&lt; 14m</div>
            <div className="text-xs text-zinc-500 mt-0.5">Avg SLA Dispatch</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white tracking-tight">100%</div>
            <div className="text-xs text-zinc-500 mt-0.5">Offline PWA Sync</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white tracking-tight">SOC 2</div>
            <div className="text-xs text-zinc-500 mt-0.5">Type II Architecture</div>
          </div>
        </div>
      </section>

      {/* ─── 3. INTERACTIVE PRODUCT STAGE (SIMULATOR) ─────────────────────────── */}
      <section id="simulator" className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            See the operating system in motion
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
            Switch between modules to preview the live technician and depot workflows.
          </p>
        </div>

        {/* Stage Wrapper Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0D0F17] shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Module Switcher Tabs */}
          <div className="border-b border-white/10 bg-[#090B11] p-2 flex items-center gap-2 overflow-x-auto">
            <StageTab
              active={activeTab === 'dispatch'}
              onClick={() => setActiveTab('dispatch')}
              icon={Calendar}
              label="Visual Dispatch Gantt"
            />
            <StageTab
              active={activeTab === 'rma'}
              onClick={() => setActiveTab('rma')}
              icon={Scan}
              label="Dual-Serial RMA Depot"
            />
            <StageTab
              active={activeTab === 'amc'}
              onClick={() => setActiveTab('amc')}
              icon={FileText}
              label="AMC Maintenance Cron"
            />
            <StageTab
              active={activeTab === 'mobile'}
              onClick={() => setActiveTab('mobile')}
              icon={Smartphone}
              label="Offline Frontline PWA"
            />
          </div>

          {/* Interactive Screen View */}
          <div className="p-6 sm:p-8 min-h-[420px] bg-[#0A0C13] flex flex-col justify-center">
            {activeTab === 'dispatch' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono text-zinc-300">NORTH REGION DISPATCH BOARD • LIVE</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">14 Active Technicians</span>
                </div>
                {/* Mock Gantt Timeline Row */}
                <div className="space-y-2.5">
                  <GanttRow
                    name="Elena Rostova (Senior Tech)"
                    status="On Site • Task #WO-8821"
                    statusColor="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    slot1={{ title: '09:00 - AC Compressor Overhaul', client: 'Apex Plaza', width: 'w-48', bg: 'bg-blue-600/30 border-blue-500/40 text-blue-200' }}
                    slot2={{ title: '13:30 - Preventive Inspection', client: 'NexaTel Hub', width: 'w-40', bg: 'bg-emerald-600/30 border-emerald-500/40 text-emerald-200' }}
                  />
                  <GanttRow
                    name="Devon Miller (Field Tech)"
                    status="Transit • Route Offset +8m"
                    statusColor="bg-amber-500/20 text-amber-400 border-amber-500/30"
                    slot1={{ title: '10:15 - Transformer Diagnostic', client: 'Titan Robotics', width: 'w-56', bg: 'bg-amber-600/30 border-amber-500/40 text-amber-200' }}
                    slot2={{ title: '15:00 - RMA Handover', client: 'Central Depot', width: 'w-36', bg: 'bg-purple-600/30 border-purple-500/40 text-purple-200' }}
                  />
                  <GanttRow
                    name="Priya Sharma (Diagnostics)"
                    status="Available • 1 Pending"
                    statusColor="bg-blue-500/20 text-blue-400 border-blue-500/30"
                    slot1={{ title: '11:00 - Board Replacement', client: 'Lumina Energy', width: 'w-64', bg: 'bg-blue-600/30 border-blue-500/40 text-blue-200' }}
                    slot2={null}
                  />
                </div>
              </div>
            )}

            {activeTab === 'rma' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">RMA Transaction #RMA-2026-9041</span>
                    <h4 className="text-sm font-semibold text-white mt-0.5">Dual-Serial Custody Verification</h4>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ASP Verified • Zero Shrinkage</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#11131A] border border-white/5 space-y-2">
                    <div className="text-[11px] text-zinc-500 font-medium">Defective Part Collected</div>
                    <div className="text-xs font-mono text-zinc-200 bg-white/5 p-2 rounded border border-white/5">
                      OLD-SN: <span className="text-rose-400 font-semibold">SN-DEF-881920-X</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">Collected at customer premises with photo & GPS confirmation.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#11131A] border border-white/5 space-y-2">
                    <div className="text-[11px] text-zinc-500 font-medium">Replacement Unit Installed</div>
                    <div className="text-xs font-mono text-zinc-200 bg-white/5 p-2 rounded border border-white/5">
                      NEW-SN: <span className="text-emerald-400 font-semibold">SN-ACT-994102-Y</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">Inventory balance instantly deducted from Regional Hub Van #4.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'amc' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-500">CRON DISPATCH SCHEDULER</span>
                    <h4 className="text-sm font-semibold text-white mt-0.5">Automated PPM Midnight Engine</h4>
                  </div>
                  <span className="text-xs font-mono text-blue-400">Next Run: 00:00:00 UTC</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#11131A] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-semibold text-zinc-200">Metro Hospitals Group — Quarterly Chiller PPM</div>
                        <div className="text-[11px] text-zinc-500 font-mono">Contract: AMC-2026-HOSP • 14 Assets Covered</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono text-[10px]">
                      AUTO-SCHEDULED
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#11131A] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-zinc-200">Continental Datacenters — Semi-Annual Backup Generator</div>
                        <div className="text-[11px] text-zinc-500 font-mono">Contract: AMC-2026-DATA • 4 Generators</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                      AUTO-SCHEDULED
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mobile' && (
              <div className="space-y-4 animate-in fade-in duration-200 max-w-md mx-auto w-full">
                <div className="p-4 rounded-2xl bg-[#11131A] border border-white/10 shadow-xl space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                    <span className="font-semibold text-white">Work Order Completion</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      GPS LOCKED
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-zinc-400">Customer Sign-off: <span className="text-white font-medium">David Chen</span></div>
                    <div className="text-[11px] font-mono text-zinc-500">Lat: 37.7749 • Lng: -122.4194 (Accurate &plusmn;3m)</div>
                  </div>
                  {/* Digital Canvas Signature Box */}
                  <div className="h-20 rounded-lg bg-black/40 border border-dashed border-white/20 flex items-center justify-center relative">
                    <span className="font-serif italic text-xl text-zinc-400 select-none">David Chen</span>
                    <span className="absolute bottom-1 right-2 text-[9px] font-mono text-zinc-600">TOUCH SIGN VERIFIED</span>
                  </div>
                  <button className="w-full h-8 rounded-lg bg-emerald-600 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-default">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Synced to Enterprise Queue</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 4. BENTO FEATURE MATRIX ─────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Architected for enterprise velocity
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Engineered to replace fragmented point solutions with one unified data layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bento Card 1 (Wide 2-Columns) */}
          <div className="md:col-span-2 p-7 sm:p-9 rounded-2xl bg-[#0D0F17] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Dynamic Gantt Dispatching</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed max-w-xl">
                Dispatch with drag-and-drop simplicity across hundreds of field technicians. Real-time geofence
                alerts, travel-time calculation, and auto-balancing ensure zero missed SLA penalties.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-mono text-zinc-500">
              <span>• SLA Conflict Detection</span>
              <span>• Live Route Re-optimization</span>
            </div>
          </div>

          {/* Bento Card 2 */}
          <div className="p-7 sm:p-9 rounded-2xl bg-[#0D0F17] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Scan className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Dual-Serial RMA</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Atomic barcode verification ensuring defective parts and replacement components
                remain matched from door handover to depot liquidation.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-xs font-mono text-emerald-400/80">
              Zero Inventory Leakage
            </div>
          </div>

          {/* Bento Card 3 */}
          <div className="p-7 sm:p-9 rounded-2xl bg-[#0D0F17] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Automated AMC Engine</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Never miss scheduled preventative maintenance. Our cron triggers dispatch queues
                automatically before SLA expiration dates arrive.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-xs font-mono text-purple-400/80">
              Midnight Auto-Scheduler
            </div>
          </div>

          {/* Bento Card 4 (Wide 2-Columns) */}
          <div className="md:col-span-2 p-7 sm:p-9 rounded-2xl bg-[#0D0F17] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Offline-First Mobile PWA</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed max-w-xl">
                Basements, factory floors, and remote substations don't have WiFi. The ORBIT PWA
                stores job queues locally in IndexedDB and replays signed audits the instant connectivity returns.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-mono text-zinc-500">
              <span>• Touch Glass Signature</span>
              <span>• Timestamped Geo-Stamp</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. INTERACTIVE ROI FLEET CALCULATOR ─────────────────────────────── */}
      <section id="calculator" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/[0.08]">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>FINANCIAL IMPACT CALCULATOR</span>
          </div>
          <h2 className="text-3xl font-semibold text-white tracking-tight">
            Estimate your annual operational savings
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            Adjust the sliders to see what automated dispatch and zero RMA shrinkage deliver to your bottom line.
          </p>
        </div>

        <div className="p-8 sm:p-10 rounded-3xl bg-[#0D0F17] border border-white/10 shadow-2xl grid md:grid-cols-2 gap-8 items-center">
          {/* Sliders Column */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-300 mb-2">
                <span>Field Service Technicians</span>
                <span className="font-mono text-blue-400 text-sm font-semibold">{techCount} Techs</span>
              </div>
              <input
                type="range"
                min="5"
                max="250"
                value={techCount}
                onChange={(e) => setTechCount(Number(e.target.value))}
                className="w-full accent-blue-600 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                <span>5</span>
                <span>125</span>
                <span>250+</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-300 mb-2">
                <span>Monthly Service Work Orders</span>
                <span className="font-mono text-blue-400 text-sm font-semibold">{ticketVolume.toLocaleString()} Orders</span>
              </div>
              <input
                type="range"
                min="200"
                max="15000"
                step="200"
                value={ticketVolume}
                onChange={(e) => setTicketVolume(Number(e.target.value))}
                className="w-full accent-blue-600 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                <span>200</span>
                <span>7,500</span>
                <span>15,000+</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-zinc-500 leading-relaxed">
              Based on empirical customer benchmarks of 5.5 hours saved per technician/week and
              preventing an average 4% inventory leakage on serialized replacement components.
            </div>
          </div>

          {/* Result Card Column */}
          <div className="p-6 rounded-2xl bg-[#090B11] border border-white/5 space-y-5 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                Estimated Net Annual Value
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-mono mt-1 text-emerald-400">
                ${totalAnnualValue.toLocaleString()}
                <span className="text-xs text-zinc-500 font-normal ml-1">/year</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">Tech Capacity Recaptured:</span>
                <span className="font-mono font-medium">{hoursSavedPerYear.toLocaleString()} hrs/yr</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">Shrinkage Prevented:</span>
                <span className="font-mono font-medium">${leakagePreventedAnnual.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm mt-3"
            >
              <span>Schedule Custom ROI Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 6. EDITORIAL TESTIMONIAL ────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-white/[0.08]">
        <blockquote className="font-serif text-2xl sm:text-3xl text-zinc-200 font-normal leading-relaxed">
          &ldquo;ORBIT is the furthest we&rsquo;ve ever gotten with any kind of enterprise-wide
          operations software &ndash; it eliminated our reverse logistics blindspots in thirty days.&rdquo;
        </blockquote>
        <div className="mt-6 space-y-0.5">
          <p className="text-sm font-medium text-zinc-200 tracking-tight font-sans">
            Matt Cynamon
          </p>
          <p className="text-xs text-zinc-500 font-sans">
            Head of Global Operations &middot; USV
          </p>
        </div>
      </section>

      {/* ─── 7. BOTTOM CALL TO ACTION ────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#101422] to-[#0A0D15] border border-blue-500/20 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Ready to unify your service operations?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Deploy in weeks, not quarters. Start with our pre-built sandbox or book an architecture review.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#2F68FE] hover:bg-[#2558E5] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span>Launch Interactive Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto h-11 px-5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Contact Enterprise Sales</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-[#06070A] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <img src="/orbit-logo.png" alt="ORBIT" className="h-5 w-auto brightness-0 invert opacity-70" />
            <span>&copy; 2026 ORBIT Technologies Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-zinc-300">Platform</a>
            <a href="#calculator" className="hover:text-zinc-300">ROI Calculator</a>
            <Link to="/login" className="hover:text-zinc-300">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Sub-components
const ButtonLink: React.FC<{ to: string; variant?: 'primary' | 'secondary'; children: React.ReactNode }> = ({
  to,
  children,
}) => (
  <Link
    to={to}
    className="h-9 px-4 rounded-lg bg-[#2F68FE] hover:bg-[#2558E5] text-white text-[13px] font-medium flex items-center gap-1.5 transition-all shadow-sm"
  >
    {children}
  </Link>
);

const StageTab: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({
  active,
  onClick,
  icon: Icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
      active
        ? 'bg-[#151926] text-white border border-white/10 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
    }`}
  >
    <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-400' : 'text-zinc-500'}`} />
    <span>{label}</span>
  </button>
);

const GanttRow: React.FC<{
  name: string;
  status: string;
  statusColor: string;
  slot1: { title: string; client: string; width: string; bg: string };
  slot2: { title: string; client: string; width: string; bg: string } | null;
}> = ({ name, status, statusColor, slot1, slot2 }) => (
  <div className="p-3 rounded-xl bg-[#11131A] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div className="min-w-[190px]">
      <div className="text-xs font-semibold text-zinc-200">{name}</div>
      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-mono mt-1 ${statusColor}`}>
        {status}
      </span>
    </div>
    <div className="flex-1 flex items-center gap-2 overflow-x-auto">
      <div className={`p-2 rounded-lg border text-[11px] truncate ${slot1.width} ${slot1.bg}`}>
        <div className="font-semibold truncate">{slot1.title}</div>
        <div className="text-[10px] opacity-75 truncate">{slot1.client}</div>
      </div>
      {slot2 && (
        <div className={`p-2 rounded-lg border text-[11px] truncate ${slot2.width} ${slot2.bg}`}>
          <div className="font-semibold truncate">{slot2.title}</div>
          <div className="text-[10px] opacity-75 truncate">{slot2.client}</div>
        </div>
      )}
    </div>
  </div>
);
