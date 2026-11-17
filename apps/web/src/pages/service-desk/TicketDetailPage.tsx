import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  Send,
  Lock,
  MessageSquare,
  History,
  Loader2,
  Calendar,
  Flame,
  ChevronRight,
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Status transition state
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/service-desk/tickets/${id}`);
      setTicket(res.data);
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentSubmitting(true);
      await api.post(`/service-desk/tickets/${id}/comments`, {
        message: newComment,
        isInternal,
      });
      setNewComment('');
      fetchTicket();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus: string) => {
    try {
      setStatusSubmitting(true);
      await api.patch(`/service-desk/tickets/${id}/status`, {
        status: nextStatus,
        reason: statusReason || undefined,
      });
      setStatusReason('');
      fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="py-24 text-center text-ink-muted">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        Loading incident details...
      </div>
    );
  }

  const steps = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const currentStepIdx = steps.indexOf(ticket.status);

  const isWarrantyActive =
    ticket.registration?.warranty?.status === 'ACTIVE' &&
    new Date(ticket.registration?.warranty?.endDate) > new Date();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/operations/tickets')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Service Desk
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-100 border border-zinc-200 font-bold text-ink">
            {ticket.ticketNumber}
          </span>
          <Badge
            className={
              ticket.priority === 'P1_CRITICAL'
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-mono text-xs'
                : ticket.priority === 'P2_HIGH'
                ? 'bg-amber-100 text-amber-800 border-amber-300 font-mono text-xs'
                : 'bg-blue-50 text-blue-800 border-blue-200 font-mono text-xs'
            }
          >
            {ticket.priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {ticket.status}
          </Badge>
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <Card className="bg-white border-border/70 p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px]">
          {steps.map((step, idx) => {
            const isCompleted = currentStepIdx > idx;
            const isCurrent = currentStepIdx === idx;
            return (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-poppins font-medium ${
                      isCurrent ? 'text-ink font-bold' : isCompleted ? 'text-emerald-800' : 'text-zinc-400'
                    }`}
                  >
                    {step.replace('_', ' ')}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
                      currentStepIdx > idx ? 'bg-emerald-500' : 'bg-border/70'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Description */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider block">
                  Category: {ticket.category}
                </span>
                <h1 className="text-xl font-bold font-poppins text-ink mt-1">
                  {ticket.title}
                </h1>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-border/70 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60 text-xs text-ink-muted">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> Opened:{' '}
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
                <span>•</span>
                <span>Source: {ticket.source}</span>
                {ticket.closedAt && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      Closed: {new Date(ticket.closedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer & Asset Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <Card className="bg-white border-border/70 shadow-sm">
              <CardContent className="p-4 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Customer Profile
                </span>
                <p className="font-semibold text-ink font-poppins text-sm">{ticket.customer.name}</p>
                <p className="font-mono text-ink-soft flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-ink-muted" /> {ticket.customer.phone}
                </p>
                {ticket.customer.email && (
                  <p className="text-ink-muted flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-ink-muted" /> {ticket.customer.email}
                  </p>
                )}
                {ticket.customer.addresses?.[0] && (
                  <p className="text-ink-muted flex items-start gap-1.5 pt-1 border-t border-border/40">
                    <MapPin className="w-3 h-3 text-ink-muted shrink-0 mt-0.5" />
                    <span>
                      {ticket.customer.addresses[0].street}, {ticket.customer.addresses[0].city}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Hardware & Warranty Entitlement */}
            <Card className="bg-white border-border/70 shadow-sm">
              <CardContent className="p-4 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                  <Laptop className="w-3.5 h-3.5 text-primary" /> Hardware Entitlement
                </span>
                {ticket.product ? (
                  <>
                    <p className="font-semibold text-ink font-poppins">{ticket.product.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-muted">
                        SN: {ticket.registration?.serialNumber || 'N/A'}
                      </span>
                      {ticket.registration?.warranty ? (
                        <Badge
                          variant="outline"
                          className={
                            isWarrantyActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                              : 'bg-rose-50 text-rose-800 border-rose-200 text-[10px]'
                          }
                        >
                          {isWarrantyActive ? 'Active OEM Warranty' : 'Expired Warranty'}
                        </Badge>
                      ) : null}
                    </div>
                    {ticket.registration?.warranty && (
                      <p className="text-[10px] text-ink-muted font-mono pt-1">
                        Valid till: {new Date(ticket.registration.warranty.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-ink-muted italic py-2">No hardware asset linked to ticket.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Conversation & Internal Notes Thread */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold font-poppins text-ink text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Incident Log & Communication Stream ({ticket.comments?.length || 0})
                </h3>
              </div>

              {/* Messages list */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {ticket.comments?.length === 0 ? (
                  <p className="text-xs text-ink-muted italic text-center py-6">
                    No comments logged on this ticket yet.
                  </p>
                ) : (
                  ticket.comments.map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        c.isInternal
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-[#FAF9F6] border-border/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink font-poppins">
                            {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'System'}
                          </span>
                          {c.isInternal && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-900 font-mono text-[9px] font-bold">
                              <Lock className="w-2.5 h-2.5" /> Internal Note
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-muted font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({new Date(c.createdAt).toLocaleDateString()})
                        </span>
                      </div>
                      <p className="text-ink leading-relaxed whitespace-pre-wrap">{c.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Box */}
              <form
                onSubmit={handleAddComment}
                className="pt-3 border-t border-border/60 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-muted">Add Update</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-xs">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span className={isInternal ? 'text-amber-800 font-bold' : 'text-ink-muted'}>
                      Internal Engineering Note
                    </span>
                  </label>
                </div>

                <textarea
                  rows={2}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    isInternal
                      ? 'Add confidential internal note (visible to support staff only)...'
                      : 'Send update or response to customer...'
                  }
                  className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none transition-colors ${
                    isInternal
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-[#FAF9F6] border-border/80'
                  }`}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={commentSubmitting}
                    size="sm"
                    className="bg-primary hover:bg-primary-hover text-white text-xs flex items-center gap-1.5"
                  >
                    {commentSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isInternal ? 'Log Note' : 'Post Reply'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: SLA Timer & Lifecycle Actions (1 col) */}
        <div className="space-y-6">
          {/* Dynamic SLA Countdown Card */}
          <Card
            className={`border shadow-sm overflow-hidden ${
              ticket.isResolutionBreached
                ? 'bg-rose-50/70 border-rose-200'
                : ticket.minutesRemaining < 120
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <CardContent className="p-5 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">
                Dynamic SLA Engine
              </span>

              <div>
                <span className="text-xs text-ink-muted">Resolution Deadline Countdown:</span>
                <div className="text-2xl font-extrabold font-mono text-ink mt-0.5">
                  {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6" /> Completed
                    </span>
                  ) : ticket.isResolutionBreached ? (
                    <span className="text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-6 h-6" /> SLA Breached
                    </span>
                  ) : (
                    `${Math.floor(ticket.minutesRemaining / 60)}h ${ticket.minutesRemaining % 60}m`
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">First Response:</span>
                  <span className="font-mono font-medium">
                    {ticket.respondedAt ? (
                      <span className="text-emerald-700">Met in time</span>
                    ) : (
                      'Pending response'
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-ink-muted">Target Resolution:</span>
                  <span className="font-mono font-medium">
                    {new Date(ticket.resolutionDeadline).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow State Machine Actions */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Lifecycle State Actions
              </h3>

              <div className="space-y-2">
                {ticket.status === 'OPEN' && (
                  <Button
                    onClick={() => handleStatusChange('TRIAGED')}
                    disabled={statusSubmitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
                  >
                    Mark as Triaged
                  </Button>
                )}

                {(ticket.status === 'OPEN' ||
                  ticket.status === 'TRIAGED' ||
                  ticket.status === 'WAITING_FOR_CUSTOMER') && (
                  <Button
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={statusSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                  >
                    Start In-Progress Diagnosis
                  </Button>
                )}

                {ticket.status === 'IN_PROGRESS' && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('WAITING_FOR_CUSTOMER')}
                    disabled={statusSubmitting}
                    className="w-full text-xs h-9 border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    Await Customer Feedback
                  </Button>
                )}

                {ticket.status === 'IN_PROGRESS' && (
                  <Button
                    onClick={() => handleStatusChange('RESOLVED')}
                    disabled={statusSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                  >
                    Resolve Incident
                  </Button>
                )}

                {ticket.status === 'RESOLVED' && (
                  <Button
                    onClick={() => handleStatusChange('CLOSED')}
                    disabled={statusSubmitting}
                    className="w-full bg-zinc-800 hover:bg-zinc-900 text-white text-xs h-9"
                  >
                    Close Ticket
                  </Button>
                )}

                {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={statusSubmitting}
                    className="w-full text-xs h-9 text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    Reopen Incident
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Transition Audit Log */}
          <Card className="bg-white border-border/70 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" /> State Machine Audit
              </h3>

              <div className="space-y-2 text-xs">
                {ticket.statusHistory?.map((h: any) => (
                  <div key={h.id} className="p-2.5 rounded-lg bg-[#FAF9F6] border border-border/60">
                    <div className="flex items-center justify-between font-mono text-[11px] font-semibold">
                      <span>{h.fromStatus}</span>
                      <ChevronRight className="w-3 h-3 text-ink-muted" />
                      <span className="text-primary">{h.toStatus}</span>
                    </div>
                    {h.reason && <p className="text-ink-muted text-[11px] mt-1">{h.reason}</p>}
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
