import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Wrench,
  Boxes,
  Truck,
  RotateCcw,
  Maximize2,
  Minimize2,
  Flame,
  BarChart3,
  Copy,
  Check,
  Zap,
  Layers,
  ArrowRight,
  Database,
  Activity,
  AlertTriangle,
  FileText,
  Clock,
} from 'lucide-react';
import { CopilotMarkdown } from './CopilotMarkdown';
import { toast } from 'sonner';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  suggestions?: string[];
}

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: {
    ticketId?: string;
    workOrderId?: string;
    initialPrompt?: string;
  };
}

type OperationalMode = 'all' | 'triage' | 'dispatch' | 'inventory' | 'logistics' | 'analytics';

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  initialContext,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isWide, setIsWide] = useState(false);
  const [activeMode, setActiveMode] = useState<OperationalMode>('all');
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      checkConfig();
      if (initialContext?.initialPrompt) {
        handleSendMessage(initialContext.initialPrompt);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const checkConfig = async () => {
    try {
      const res = await api.get('/copilot/config');
      setIsConfigured(res.data.isConfigured);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/copilot/history');
      if (res.data?.length > 0) {
        setMessages(
          res.data.map((m: any) => ({
            id: m.id,
            role: m.role as any,
            content: m.content,
            createdAt: m.createdAt,
          })),
        );
      } else {
        setMessages([
          {
            role: 'assistant',
            content: `### Welcome to ORBIT Operations Copilot 👋

I am your unified AI operational intelligence copilot, connected directly to your enterprise database via **Google Gemini 2.5 Flash**.

#### What I can do for you:
- **Incident Triage & Diagnosis:** Evaluate SLA countdowns, diagnose root causes, and draft customer replies.
- **Dynamic Field Dispatch:** Recommend certified engineers by technical skills, geolocation zone, and real-time shift availability.
- **Warehouse & Spares Management:** Audit stock levels against safety buffers and trigger stock rebalancing transfers.
- **Logistics & Fleet:** Track delivery routes, SLA transit timers, and vehicle capacities.
- **Executive Digest:** Synthesize First-Time Fix Rates (FTFR), MTTR, and absorbed warranty claims.

Select an operational action below or type any command:`,
            suggestions: [
              'Audit open P1 tickets with upcoming SLA breaches',
              'Check inventory stock and low safety buffer alerts',
              'Which field engineers are available in North Zone?',
              'Generate operational executive digest for today',
            ],
          },
        ]);
      }
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post('/copilot/chat', {
        message: text,
        history: historyPayload,
        ticketId: initialContext?.ticketId,
        workOrderId: initialContext?.workOrderId,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.reply,
        suggestions: res.data.suggestions,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Connection Error:** Failed to communicate with Copilot service.\n\n${
            err.response?.data?.message || err.message
          }\n\nPlease check your **Gemini API Key** in [Organization Settings](/settings/organization).`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = async () => {
    try {
      await api.delete('/copilot/history');
      setMessages([
        {
          role: 'assistant',
          content: 'Chat session reset. All operational context refreshed. How can I assist you with your operations today?',
          suggestions: [
            'Audit open P1 tickets with upcoming SLA breaches',
            'Check inventory stock and low safety buffer alerts',
            'Which field engineers are available in North Zone?',
          ],
          createdAt: new Date().toISOString(),
        },
      ]);
      toast.success('Conversation history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgIdx(idx);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const operationalModes = [
    { id: 'all', label: 'All Operations', icon: Sparkles },
    { id: 'triage', label: 'Incident Triage', icon: Flame },
    { id: 'dispatch', label: 'Field Dispatch', icon: Wrench },
    { id: 'inventory', label: 'Warehouse & Spares', icon: Boxes },
    { id: 'logistics', label: 'Fleet & Transit', icon: Truck },
    { id: 'analytics', label: 'Executive KPIs', icon: BarChart3 },
  ];

  const quickPromptsByMode: Record<OperationalMode, Array<{ title: string; desc: string; prompt: string; icon: any }>> = {
    all: [
      {
        title: 'P1 Incident Triage',
        desc: 'Review SLA countdowns, active breaches, and draft escalation briefs',
        prompt: 'Audit all open P1 and high-priority tickets with upcoming SLA breaches',
        icon: Flame,
      },
      {
        title: 'Smart Dispatch Match',
        desc: 'Find certified field techs by skillset, zone, and shift status',
        prompt: 'Recommend the best available certified engineers for open work orders',
        icon: Wrench,
      },
      {
        title: 'Safety Stock Watch',
        desc: 'Scan regional hubs for parts below safety stock threshold',
        prompt: 'Identify spare parts below safety stock buffer across regional warehouses',
        icon: Boxes,
      },
      {
        title: 'Executive Daily Brief',
        desc: 'Synthesize FTFR, MTTR, logistics SLA, and warranty absorption',
        prompt: 'Generate an executive operational summary of today’s FTFR, MTTR, and SLA compliance',
        icon: BarChart3,
      },
    ],
    triage: [
      {
        title: 'Active P1 Tickets',
        desc: 'List all critical tickets requiring immediate triage',
        prompt: 'Show all open P1 critical tickets and their remaining SLA resolution timers',
        icon: Flame,
      },
      {
        title: 'Draft Customer Reply',
        desc: 'Generate root-cause explanation for delayed tickets',
        prompt: 'Draft an empathetic customer service update explaining hardware diagnostic status',
        icon: FileText,
      },
    ],
    dispatch: [
      {
        title: 'Available Field Engineers',
        desc: 'Review engineer status and current workload',
        prompt: 'Show available field technicians, their active work orders, and completion rates',
        icon: Wrench,
      },
      {
        title: 'Zone Route Optimization',
        desc: 'Evaluate travel time and proximity for next job',
        prompt: 'Analyze dispatch proximity for pending work orders in Central and North zones',
        icon: Activity,
      },
    ],
    inventory: [
      {
        title: 'Critical Stock Deficits',
        desc: 'List spare parts with zero or low quantity on hand',
        prompt: 'List all inventory items where current quantity is below safety threshold',
        icon: Boxes,
      },
      {
        title: 'Inter-Hub Rebalance',
        desc: 'Identify surplus hubs to fulfill depleted warehouses',
        prompt: 'Suggest inter-warehouse transfers to balance inventory between North Hub and South Hub',
        icon: Database,
      },
    ],
    logistics: [
      {
        title: 'In-Transit Shipments',
        desc: 'Inspect carrier status and delayed delivery tracking',
        prompt: 'Review all shipments currently in transit and flag any delivery exceptions',
        icon: Truck,
      },
      {
        title: 'Fleet Vehicle Readiness',
        desc: 'Check delivery vans, capacity utilization, and maintenance status',
        prompt: 'Show fleet vehicles in active transit and scheduled maintenance tasks',
        icon: Activity,
      },
    ],
    analytics: [
      {
        title: 'First-Time Fix Rate (FTFR)',
        desc: 'Audit benchmark 85% target against actual performance',
        prompt: 'Analyze First-Time Fix Rate across all technician tiers this month',
        icon: BarChart3,
      },
      {
        title: 'Warranty vs Billable Split',
        desc: 'Review financial absorption of warranty claims',
        prompt: 'Calculate total parts and labor costs absorbed under manufacturer warranty this cycle',
        icon: Zap,
      },
    ],
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const currentPrompts = quickPromptsByMode[activeMode] || quickPromptsByMode.all;
  const isInitialState = messages.length <= 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className={`w-full ${
          isWide ? 'max-w-4xl' : 'max-w-2xl'
        } bg-[#FAF9F6] h-full shadow-2xl flex flex-col border-l border-border/80 relative transition-all duration-300 ease-in-out`}
      >
        {/* Top Header: High-Tech Executive Campora Bar */}
        <div className="px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-border/70 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Glowing Gradient Orb */}
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-primary to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 ring-4 ring-indigo-500/10">
                <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-poppins font-bold text-sm text-ink tracking-tight">
                  ORBIT Operations Copilot
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-indigo-50/80 text-indigo-700 border-indigo-200/80 py-0 px-2 font-medium"
                >
                  Gemini 2.5 Flash
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span className="inline-flex items-center gap-1 font-mono text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live Operational RAG
                </span>
                <span>•</span>
                <span className="truncate max-w-[220px]">
                  {user?.organizationName || 'Enterprise Context'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsWide(!isWide)}
              className="h-8 w-8 text-muted-foreground hover:text-ink hover:bg-zinc-100 rounded-lg hidden sm:flex"
              title={isWide ? 'Standard view (576px)' : 'Expanded view (896px)'}
            >
              {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Reset conversation session"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border/60 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-ink hover:bg-zinc-100 rounded-lg"
              title="Close Copilot"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Operational System Filter Bar */}
        <div className="px-5 py-2 bg-zinc-50/90 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-poppins font-semibold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
            Modes:
          </span>
          {operationalModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id as OperationalMode)}
                className={`text-[11px] font-poppins font-medium px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white text-primary shadow-2xs border border-border/80 font-semibold'
                    : 'text-muted-foreground hover:text-ink hover:bg-white/60'
                }`}
              >
                <Icon
                  className={`w-3 h-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Warning if Gemini is not configured */}
        {!isConfigured && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold font-poppins">Gemini API Key Required: </span>
              Copilot requires a Google Gemini API key to query operational telemetry.
              <a
                href="/settings/organization"
                className="block mt-1 font-semibold text-amber-800 hover:underline"
              >
                Configure Gemini API Key in Organization Settings →
              </a>
            </div>
          </div>
        )}

        {/* Active Context Banner (if ticket or work order passed) */}
        {(initialContext?.ticketId || initialContext?.workOrderId) && (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="font-semibold">Focused Context:</span>
              {initialContext.ticketId && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  Ticket #{initialContext.ticketId.slice(0, 8)}
                </span>
              )}
              {initialContext.workOrderId && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  Work Order #{initialContext.workOrderId.slice(0, 8)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-indigo-600 font-sans">
              Scoped RAG Retrieval Active
            </span>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs font-sans">
          {/* Hero Welcome Cards if Chat is in Fresh/Initial State */}
          {isInitialState && (
            <div className="space-y-4 pt-1 animate-in fade-in-50 duration-300">
              {/* Telemetry Status Bar */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border border-indigo-100/80 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span className="font-poppins font-bold text-xs text-ink">
                      Enterprise Operations Telemetry
                    </span>
                  </div>
                  <Badge variant="success" className="text-[10px] font-mono py-0">
                    8 Data Stores Live
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Real-time synchronization active across Customers, Products, Service Desk
                  Tickets, Field Service Work Orders, Regional Hubs, Shipments, Invoices, and SLA
                  Engines.
                </p>
              </div>

              {/* Quick Operational Prompts Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-poppins font-bold uppercase tracking-wider text-muted-foreground">
                    Recommended Operational Actions
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click to execute</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentPrompts.map((item, pIdx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={pIdx}
                        onClick={() => handleSendMessage(item.prompt)}
                        className="text-left p-3 rounded-xl bg-white hover:bg-zinc-50/80 border border-border/80 hover:border-primary/50 shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-2.5 mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="font-poppins font-semibold text-xs text-ink group-hover:text-primary transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-primary font-medium mt-1">
                          <span>Run prompt</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Conversation History Stream */}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Assistant Message: Bespoke White Card */}
              {m.role === 'assistant' ? (
                <div className="w-full flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-primary to-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>

                  <div className="flex-1 bg-white border border-border/80 rounded-2xl shadow-2xs p-4 space-y-3 max-w-[92%] transition-all">
                    {/* Header Strip */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/60 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-poppins font-bold text-ink">ORBIT Copilot</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Live'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyMessage(m.content, idx)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-zinc-100 text-muted-foreground hover:text-ink text-[10.5px] transition-colors"
                          title="Copy response"
                        >
                          {copiedMsgIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Rich Formatted Markdown Content */}
                    <CopilotMarkdown content={m.content} />

                    {/* Clickable Suggestion Chips */}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="pt-2.5 border-t border-border/60">
                        <div className="flex items-center gap-1 text-[10.5px] font-poppins font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>Suggested Next Inquiries:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.suggestions.map((s, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSendMessage(s)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-50 hover:bg-primary/10 text-ink-soft hover:text-primary border border-border/80 hover:border-primary/40 transition-colors text-left flex items-center gap-1.5 group"
                            >
                              <ChevronRight className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
                              <span>{s}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* User Message: High-Contrast Dark Slate Capsule */
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="rounded-2xl rounded-tr-xs p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xs space-y-1">
                    <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-100">
                      {m.content}
                    </div>
                    <div className="text-[9.5px] font-mono text-zinc-400 text-right">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-bold font-poppins text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Thinking / Streaming Indicator */}
          {loading && (
            <div className="flex items-start gap-3 justify-start animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-primary to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
              </div>
              <div className="bg-white border border-border/80 rounded-2xl rounded-tl-xs p-4 shadow-2xs flex flex-col gap-2 min-w-[280px]">
                <div className="flex items-center gap-2 text-ink font-poppins font-medium text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Reasoning over operational telemetry...</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span>Synthesizing SLA matrices & enterprise database</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Floating Composer Bar */}
        <div className="p-4 bg-white/95 backdrop-blur-md border-t border-border/70 shrink-0">
          <div className="rounded-2xl border border-border/80 bg-zinc-50/80 focus-within:bg-white focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all p-2.5 shadow-2xs">
            <textarea
              ref={inputRef}
              rows={2}
              placeholder="Ask Copilot (e.g. diagnose ticket, check stock, recommend tech)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full bg-transparent text-xs text-ink placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[9.5px] font-mono py-0 px-1.5 text-muted-foreground border-border/60 bg-white"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-500 mr-1" />
                  Gemini 2.5 Flash
                </Badge>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Enter ↵ to send • Shift+Enter for new line
                </span>
              </div>

              <Button
                onClick={() => handleSendMessage()}
                disabled={loading || !input.trim()}
                size="sm"
                className="h-8 px-3.5 bg-gradient-to-r from-indigo-600 via-primary to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-xs rounded-xl gap-1.5 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Tenant Isolated • Organization Scoped
            </span>
            <span className="font-mono text-[9.5px]">ORBIT v1.0 Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
