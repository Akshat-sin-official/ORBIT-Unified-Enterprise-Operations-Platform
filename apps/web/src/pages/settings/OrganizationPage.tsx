import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Clock,
  Loader2,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  Key,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

export const OrganizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'whatsapp' | 'copilot'>('general');
  const [loading, setLoading] = useState(true);

  // General Org Profile
  const [org, setOrg] = useState<any>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);

  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    passwordConfigured: false,
    fromEmail: '',
    fromName: 'ORBIT Notifications',
    isConfigured: false,
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('admin@orbit.local');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // WhatsApp Automation Gateway Configuration
  const [whatsAppConfig, setWhatsAppConfig] = useState({
    gatewayUrl: 'https://nakshtraventures.in/wa-api',
    apiKey: '',
    senderNumber: '',
    sessionName: 'default',
    enableCustomerAlerts: true,
    enableStaffAlerts: true,
    maskedApiKey: null as string | null,
    isConfigured: false,
  });
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [whatsAppTestPhone, setWhatsAppTestPhone] = useState('');
  const [whatsAppTestMessage, setWhatsAppTestMessage] = useState('Hello! This is a test notification from ORBIT Enterprise Operations platform.');
  const [sendingWhatsAppTest, setSendingWhatsAppTest] = useState(false);
  const [whatsAppTestResult, setWhatsAppTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Gemini AI Copilot Configuration
  const [geminiConfig, setGeminiConfig] = useState<{
    isConfigured: boolean;
    source: string;
    maskedKey: string | null;
  }>({
    isConfigured: false,
    source: 'none',
    maskedKey: null,
  });
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [savingGemini, setSavingGemini] = useState(false);
  const [geminiStatusMessage, setGeminiStatusMessage] = useState('');

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const [orgRes, smtpRes, geminiRes, waRes] = await Promise.all([
        api.get('/organizations/current').catch(() => ({ data: null })),
        api.get('/settings/smtp').catch(() => ({ data: null })),
        api.get('/copilot/config').catch(() => ({ data: null })),
        api.get('/whatsapp/config').catch(() => ({ data: null })),
      ]);

      if (orgRes.data) {
        setOrg(orgRes.data);
        setName(orgRes.data.name || '');
        setTimezone(orgRes.data.timezone || 'Asia/Kolkata');
      }

      if (smtpRes.data) {
        setSmtpConfig({
          host: smtpRes.data.host || '',
          port: smtpRes.data.port || 587,
          secure: Boolean(smtpRes.data.secure),
          username: smtpRes.data.username || '',
          password: '',
          passwordConfigured: Boolean(smtpRes.data.passwordConfigured),
          fromEmail: smtpRes.data.fromEmail || '',
          fromName: smtpRes.data.fromName || 'ORBIT Service Operations',
          isConfigured: Boolean(smtpRes.data.isConfigured),
        });
      }

      if (waRes.data) {
        setWhatsAppConfig({
          gatewayUrl: waRes.data.gatewayUrl || 'https://nakshtraventures.in/wa-api',
          apiKey: '',
          senderNumber: waRes.data.senderNumber || '',
          sessionName: waRes.data.sessionName || 'default',
          enableCustomerAlerts: waRes.data.enableCustomerAlerts ?? true,
          enableStaffAlerts: waRes.data.enableStaffAlerts ?? true,
          maskedApiKey: waRes.data.maskedApiKey || null,
          isConfigured: Boolean(waRes.data.isConfigured),
        });
      }

      if (geminiRes.data) {
        setGeminiConfig(geminiRes.data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      const res = await api.patch('/organizations/current', { name, timezone });
      setOrg(res.data);
      alert('Organization profile updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update organization profile');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setTestResult(null);
    try {
      const payload: any = {
        host: smtpConfig.host,
        port: Number(smtpConfig.port),
        secure: smtpConfig.secure,
        username: smtpConfig.username || undefined,
        fromEmail: smtpConfig.fromEmail,
        fromName: smtpConfig.fromName,
      };

      if (smtpConfig.password && smtpConfig.password.trim() !== '') {
        payload.password = smtpConfig.password;
      }

      const res = await api.put('/settings/smtp', payload);
      setSmtpConfig((prev) => ({
        ...prev,
        isConfigured: res.data.isConfigured,
        passwordConfigured: res.data.passwordConfigured,
        password: '',
      }));
      alert('SMTP Email Gateway configuration saved successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save SMTP configuration');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/smtp/test', {
        recipientEmail: testEmailRecipient,
      });
      setTestResult({
        success: true,
        message: res.data.message || `Test message dispatched to ${testEmailRecipient}`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Failed to send test email',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWhatsApp(true);
    setWhatsAppTestResult(null);
    try {
      const payload: any = {
        gatewayUrl: whatsAppConfig.gatewayUrl,
        sessionName: whatsAppConfig.sessionName,
        senderNumber: whatsAppConfig.senderNumber || undefined,
        enableCustomerAlerts: whatsAppConfig.enableCustomerAlerts,
        enableStaffAlerts: whatsAppConfig.enableStaffAlerts,
      };

      if (whatsAppConfig.apiKey && whatsAppConfig.apiKey.trim() !== '') {
        payload.apiKey = whatsAppConfig.apiKey;
      }

      const res = await api.patch('/whatsapp/config', payload);
      setWhatsAppConfig((prev) => ({
        ...prev,
        ...res.data,
        apiKey: '',
      }));
      alert('WhatsApp Automation Gateway configuration saved successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update WhatsApp configuration');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!whatsAppTestPhone.trim()) {
      alert('Please enter a valid phone number (e.g. 919876543210)');
      return;
    }
    setSendingWhatsAppTest(true);
    setWhatsAppTestResult(null);
    try {
      const res = await api.post('/whatsapp/send-test', {
        recipientPhone: whatsAppTestPhone,
        message: whatsAppTestMessage || undefined,
      });
      setWhatsAppTestResult({
        success: true,
        message: res.data.message || `WhatsApp test notification sent to ${whatsAppTestPhone}`,
      });
    } catch (err: any) {
      setWhatsAppTestResult({
        success: false,
        message: err.response?.data?.message || 'Failed to send WhatsApp message through gateway',
      });
    } finally {
      setSendingWhatsAppTest(false);
    }
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKeyInput.trim()) return;
    setSavingGemini(true);
    setGeminiStatusMessage('');
    try {
      const res = await api.put('/copilot/config', { apiKey: geminiApiKeyInput });
      setGeminiConfig(res.data);
      setGeminiApiKeyInput('');
      setGeminiStatusMessage('Google Gemini API Key successfully saved and active!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save Gemini API Key');
    } finally {
      setSavingGemini(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold font-poppins tracking-tight text-ink">
          Workspace Profile & Integrations
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tenant identity, WhatsApp automation platform, outbound SMTP email notification gateway, and Gemini AI Copilot.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs font-poppins">Loading workspace configuration...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Tenant Summary Card */}
          <Card className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent border-primary/20 shadow-xs">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-primary/20 text-primary shadow-xs flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-poppins text-ink">{org?.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono text-[11px] bg-zinc-100 px-1.5 py-0.2 rounded text-ink">
                        {org?.slug}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        {org?.timezone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={org?.status === 'ACTIVE' ? 'success' : 'destructive'}>
                    Tenant Status: {org?.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          <div className="border-b border-border/70 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
                activeTab === 'general' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Tenant Profile
              </div>
              {activeTab === 'general' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab('smtp')}
              className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
                activeTab === 'smtp' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                SMTP Email Gateway
                {smtpConfig.isConfigured ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </div>
              {activeTab === 'smtp' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
                activeTab === 'whatsapp' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Automation
                {whatsAppConfig.isConfigured ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </div>
              {activeTab === 'whatsapp' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab('copilot')}
              className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
                activeTab === 'copilot' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Gemini AI Copilot
                {geminiConfig.isConfigured ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              {activeTab === 'copilot' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          </div>

          {/* Tab 1: General Workspace Profile */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold font-poppins text-ink">Organization Boundary Settings</CardTitle>
                <p className="text-xs text-muted-foreground">
                  All enterprise assets, customer registrations, service orders, and audit trails are scoped to this organization.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOrg} className="space-y-4 max-w-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Organization Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tenant Slug (Immutable Key)</Label>
                    <Input
                      value={org?.slug || ''}
                      disabled
                      className="bg-slate-50 font-mono text-muted-foreground text-xs cursor-not-allowed h-10"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Unique identifier used for multi-tenant workspace partitioning.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Operational Timezone</Label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-border/80 bg-white px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" size="sm" disabled={savingOrg} className="text-xs font-semibold">
                      {savingOrg ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                      Save Organization Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: SMTP Configuration */}
          {activeTab === 'smtp' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold font-poppins text-ink flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Outbound SMTP Mail Server Configuration
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure your company's SMTP mail relay for customer notifications, service order dispatch emails, OTP alerts, and billing receipts.
                      </p>
                    </div>
                    {smtpConfig.isConfigured ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 font-mono">
                        <CheckCircle2 className="w-2.5 h-2.5" /> CONFIGURED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px] gap-1 font-mono">
                        <AlertTriangle className="w-2.5 h-2.5" /> NOT CONFIGURED
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSaveSmtp} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium">SMTP Server Host</Label>
                        <Input
                          required
                          placeholder="e.g. smtp.gmail.com or mail.yourcompany.com"
                          value={smtpConfig.host}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Port</Label>
                        <Input
                          type="number"
                          required
                          placeholder="587"
                          value={smtpConfig.port}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Username / Account Email</Label>
                        <Input
                          placeholder="e.g. notifications@yourdomain.com"
                          value={smtpConfig.username}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Password / App Secret {smtpConfig.passwordConfigured && <span className="text-[10px] text-emerald-600 font-normal">(Password currently saved)</span>}
                        </Label>
                        <Input
                          type="password"
                          placeholder={smtpConfig.passwordConfigured ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter SMTP password'}
                          value={smtpConfig.password}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">From Email Address</Label>
                        <Input
                          type="email"
                          required
                          placeholder="no-reply@yourdomain.com"
                          value={smtpConfig.fromEmail}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">From Display Name</Label>
                        <Input
                          placeholder="ORBIT Enterprise Support"
                          value={smtpConfig.fromName}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="smtpSecureToggle"
                        checked={smtpConfig.secure}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <Label htmlFor="smtpSecureToggle" className="text-xs font-medium cursor-pointer">
                        Enable SSL/TLS Encryption (Recommended checked for Port 465, unchecked for Port 587 STARTTLS)
                      </Label>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <Button type="submit" size="sm" disabled={savingSmtp} className="text-xs font-semibold">
                        {savingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                        Save SMTP Settings
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* SMTP Test Console */}
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-xs font-bold font-poppins text-ink flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    Verify SMTP Gateway Connectivity
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Send an instantaneous test email message through your configured mail server to verify TLS handshakes and authentication credentials.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-2 max-w-lg">
                    <Input
                      type="email"
                      placeholder="Enter test recipient email..."
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={sendingTest || !testEmailRecipient}
                      size="sm"
                      variant="outline"
                      className="text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 shrink-0 w-full sm:w-auto"
                    >
                      {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                      Send Test Email
                    </Button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {testResult.success ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{testResult.message}</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{testResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 3: WhatsApp Automation Gateway */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold font-poppins text-ink flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        WhatsApp Messaging & Automation Gateway
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automated real-time notifications for field service engineers and consumer touchpoints via the WhatsApp Automation Platform.
                      </p>
                    </div>
                    {whatsAppConfig.isConfigured ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 font-mono">
                        <CheckCircle2 className="w-2.5 h-2.5" /> GATEWAY CONNECTED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] font-mono">
                        SETUP REQUIRED
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        Customer Touchpoints
                      </div>
                      <p className="text-emerald-700/80 text-[11px] leading-relaxed">
                        Automatic customer updates for ticket creation acknowledgments, technician dispatch with estimated arrival slot, 6-digit completion OTP verification, and invoice payment receipts.
                      </p>
                    </div>

                    <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                        Internal Staff Dispatch Alerts
                      </div>
                      <p className="text-blue-700/80 text-[11px] leading-relaxed">
                        Instant dispatch messages sent straight to technician WhatsApp numbers with customer address, direct phone link, issue title, and priority SLA.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveWhatsApp} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Gateway Base URL</Label>
                        <Input
                          placeholder="https://nakshtraventures.in/wa-api"
                          value={whatsAppConfig.gatewayUrl}
                          onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, gatewayUrl: e.target.value })}
                          required
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Live API gateway endpoint (e.g. wa.nakshtraventures.in).
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Gateway API Key</Label>
                        <Input
                          type="password"
                          placeholder={whatsAppConfig.maskedApiKey ? `Configured: ${whatsAppConfig.maskedApiKey}` : 'Enter gateway API key...'}
                          value={whatsAppConfig.apiKey}
                          onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, apiKey: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {whatsAppConfig.maskedApiKey
                            ? `Active: ${whatsAppConfig.maskedApiKey}. Leave blank to keep current.`
                            : 'Global authentication key for the WhatsApp gateway.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Session Identifier</Label>
                        <Input
                          placeholder="default"
                          value={whatsAppConfig.sessionName}
                          onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, sessionName: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Active WhatsApp session name registered on the automation server.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Sender Number (Optional)</Label>
                        <Input
                          placeholder="e.g. 919876543210"
                          value={whatsAppConfig.senderNumber}
                          onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, senderNumber: e.target.value })}
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Linked sender WhatsApp number (digits with country code).
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="waCustomerToggle"
                          checked={whatsAppConfig.enableCustomerAlerts}
                          onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, enableCustomerAlerts: e.target.checked })}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <Label htmlFor="waCustomerToggle" className="text-xs font-medium cursor-pointer">
                          Enable Consumer WhatsApp Notifications (Ticket creation, Technician en route, OTP, Invoices)
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="waStaffToggle"
                          checked={whatsAppConfig.enableStaffAlerts}
                          onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, enableStaffAlerts: e.target.checked })}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <Label htmlFor="waStaffToggle" className="text-xs font-medium cursor-pointer">
                          Enable Field Staff WhatsApp Alerts (Immediate job dispatch notifications to engineers)
                        </Label>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <Button type="submit" size="sm" disabled={savingWhatsApp} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                        {savingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                        Save WhatsApp Gateway Settings
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* WhatsApp Live Test Console */}
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-xs font-bold font-poppins text-ink flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    Dispatch Test WhatsApp Message
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Send an instantaneous WhatsApp message to any phone number to verify gateway routing and delivery.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-ink">Recipient Phone Number</Label>
                      <Input
                        type="tel"
                        placeholder="e.g. 919876543210"
                        value={whatsAppTestPhone}
                        onChange={(e) => setWhatsAppTestPhone(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">Country code + digits (no + or spaces)</p>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] font-medium text-ink">Custom Message Text</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Type test notification content..."
                          value={whatsAppTestMessage}
                          onChange={(e) => setWhatsAppTestMessage(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Button
                          onClick={handleSendTestWhatsApp}
                          disabled={sendingWhatsAppTest || !whatsAppTestPhone.trim()}
                          size="sm"
                          className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                          {sendingWhatsAppTest ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3 h-3 mr-1.5" />}
                          Send WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>

                  {whatsAppTestResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs ${
                        whatsAppTestResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {whatsAppTestResult.success ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{whatsAppTestResult.message}</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{whatsAppTestResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 4: Google Gemini AI Copilot Settings */}
          {activeTab === 'copilot' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold font-poppins text-ink flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Google Gemini AI Operations Copilot
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Powers automated incident diagnostics, SLA risk analysis, smart technician dispatch, and natural language operations queries.
                    </p>
                  </div>
                  {geminiConfig.isConfigured ? (
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] gap-1 font-mono">
                      <Sparkles className="w-2.5 h-2.5" /> GEMINI ACTIVE
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 text-[10px] font-mono">
                      STANDALONE MODE
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="p-4 bg-zinc-50 rounded-xl border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Active Copilot Model</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      gemini-2.5-flash
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    The Copilot uses real-time retrieval-augmented context (RAG) over your organization's open tickets, active work orders, inventory stock buffers, and field technicians to deliver contextual assistance.
                  </p>
                  {geminiConfig.maskedKey && (
                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-primary" />
                      <span>Current API Key: <strong className="font-mono text-ink">{geminiConfig.maskedKey}</strong></span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveGeminiKey} className="space-y-3.5 max-w-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Google Gemini API Key</Label>
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKeyInput}
                      onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                      className="h-10 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Obtain an API key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-primary underline">Google AI Studio</a>.
                    </p>
                  </div>

                  <div className="pt-1">
                    <Button type="submit" size="sm" disabled={savingGemini || !geminiApiKeyInput.trim()} className="text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white">
                      {savingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                      Update Gemini API Key
                    </Button>
                  </div>

                  {geminiStatusMessage && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{geminiStatusMessage}</span>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
