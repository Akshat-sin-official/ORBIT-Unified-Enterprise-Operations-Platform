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
  QrCode,
  RefreshCw,
  Power,
  X,
  Bell,
  Sliders,
  Check,
  CheckSquare,
  Square,
  Ticket,
  UserCheck,
  Wrench,
  Receipt,
  Shield,
  Package,
} from 'lucide-react';

export const OrganizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'whatsapp' | 'notifications' | 'copilot'>('general');
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

  // WhatsApp Device Pairing & Automations
  const [whatsAppStatus, setWhatsAppStatus] = useState<{
    isConnected: boolean;
    phoneNumber?: string;
    jid?: string;
    instanceName: string;
    notifyCustomer: boolean;
    notifyStaff: boolean;
  }>({
    isConnected: false,
    phoneNumber: '',
    jid: '',
    instanceName: 'orbit',
    notifyCustomer: true,
    notifyStaff: true,
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrConnected, setQrConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Test WhatsApp Sender
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

  // Enterprise Multi-Channel Notification Matrix
  const [notificationSettings, setNotificationSettings] = useState<any[]>([]);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [notificationSavedSuccess, setNotificationSavedSuccess] = useState(false);
  const [testNotificationCategory, setTestNotificationCategory] = useState<string>('TICKET_CREATED');
  const [testNotificationEmail, setTestNotificationEmail] = useState<string>('');
  const [testNotificationPhone, setTestNotificationPhone] = useState<string>('');
  const [sendingNotificationTest, setSendingNotificationTest] = useState(false);
  const [notificationTestResult, setNotificationTestResult] = useState<{
    inApp: boolean;
    emailSent: boolean;
    whatsappSent: boolean;
    errors: string[];
  } | null>(null);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const [orgRes, smtpRes, geminiRes, waRes, notifRes] = await Promise.all([
        api.get('/organizations/current').catch(() => ({ data: null })),
        api.get('/settings/smtp').catch(() => ({ data: null })),
        api.get('/copilot/config').catch(() => ({ data: null })),
        api.get('/whatsapp/status').catch(() => ({ data: null })),
        api.get('/notifications/settings').catch(() => ({ data: [] })),
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
        if (smtpRes.data.fromEmail && !testNotificationEmail) {
          setTestNotificationEmail(smtpRes.data.fromEmail);
        }
      }

      if (waRes.data) {
        setWhatsAppStatus(waRes.data);
        if (waRes.data.phoneNumber && !testNotificationPhone) {
          setTestNotificationPhone(waRes.data.phoneNumber);
        }
      }

      if (geminiRes.data) {
        setGeminiConfig(geminiRes.data);
      }

      if (notifRes.data && Array.isArray(notifRes.data)) {
        setNotificationSettings(notifRes.data);
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

  // QR Code Auto-Polling
  useEffect(() => {
    if (!showQrModal || qrConnected) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/whatsapp/status');
        if (isSubscribed && res.data?.isConnected) {
          setQrConnected(true);
          setWhatsAppStatus(res.data);
          setTimeout(() => {
            if (isSubscribed) setShowQrModal(false);
          }, 2500);
        }
      } catch (e) {
        // silent catch
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [showQrModal, qrConnected]);

  const handleOpenPairingModal = async () => {
    setShowQrModal(true);
    setQrLoading(true);
    setQrConnected(false);
    setQrCodeData('');
    try {
      const res = await api.post('/whatsapp/pair-qr');
      if (res.data?.qrcode) {
        setQrCodeData(res.data.qrcode);
      }
      if (res.data?.isConnected) {
        setQrConnected(true);
        setWhatsAppStatus((prev) => ({ ...prev, isConnected: true }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to initiate WhatsApp pairing session');
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (
      !confirm(
        'Are you sure you want to unlink this WhatsApp device? Outgoing WhatsApp alerts will pause until re-linked.',
      )
    )
      return;
    setDisconnecting(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWhatsAppStatus((prev) => ({
        ...prev,
        isConnected: false,
        phoneNumber: '',
        jid: '',
      }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unlink device');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTogglePreference = async (key: 'notifyCustomer' | 'notifyStaff', val: boolean) => {
    const updated = {
      ...whatsAppStatus,
      [key]: val,
    };
    setWhatsAppStatus(updated);
    setSavingPrefs(true);
    try {
      await api.patch('/whatsapp/preferences', {
        notifyCustomer: updated.notifyCustomer,
        notifyStaff: updated.notifyStaff,
      });
    } catch (err: any) {
      alert('Failed to update preference');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!whatsAppTestPhone.trim()) {
      alert('Please enter a valid phone number with country code (e.g. 919876543210)');
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

  const handleToggleChannel = (
    category: string,
    channel: 'inAppEnabled' | 'emailEnabled' | 'whatsappEnabled',
  ) => {
    setNotificationSavedSuccess(false);
    setNotificationSettings((prev) =>
      prev.map((item) =>
        item.category === category
          ? { ...item, [channel]: !item[channel] }
          : item,
      ),
    );
  };

  const handleBulkToggle = (
    channel: 'inAppEnabled' | 'emailEnabled' | 'whatsappEnabled',
    enable: boolean,
  ) => {
    setNotificationSavedSuccess(false);
    setNotificationSettings((prev) =>
      prev.map((item) => ({ ...item, [channel]: enable })),
    );
  };

  const handleSaveNotificationSettings = async () => {
    setSavingNotificationSettings(true);
    setNotificationSavedSuccess(false);
    try {
      const payload = {
        settings: notificationSettings.map((s) => ({
          category: s.category,
          inAppEnabled: s.inAppEnabled,
          emailEnabled: s.emailEnabled,
          whatsappEnabled: s.whatsappEnabled,
        })),
      };
      const res = await api.put('/notifications/settings', payload);
      if (res.data) {
        setNotificationSettings(res.data);
      }
      setNotificationSavedSuccess(true);
      setTimeout(() => setNotificationSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update notification channel matrix');
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  const handleSendNotificationTest = async (categoryName?: string) => {
    const targetCat = categoryName || testNotificationCategory;
    setSendingNotificationTest(true);
    setNotificationTestResult(null);
    try {
      const res = await api.post('/notifications/test', {
        category: targetCat,
        recipientEmail: testNotificationEmail || undefined,
        recipientPhone: testNotificationPhone || undefined,
      });
      setNotificationTestResult(res.data);
    } catch (err: any) {
      setNotificationTestResult({
        inApp: false,
        emailSent: false,
        whatsappSent: false,
        errors: [err.response?.data?.message || 'Test dispatch failed'],
      });
    } finally {
      setSendingNotificationTest(false);
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
                {whatsAppStatus.isConnected ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </div>
              {activeTab === 'whatsapp' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 px-3 text-xs font-medium font-poppins transition-colors relative ${
                activeTab === 'notifications' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Notification Matrix
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              </div>
              {activeTab === 'notifications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
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
              {/* WhatsApp Device Connection Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold font-poppins text-ink flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        WhatsApp Device Pairing & Automation
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Link your operational WhatsApp account via QR Code to automate field dispatch messages and customer notifications.
                      </p>
                    </div>
                    {whatsAppStatus.isConnected ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ONLINE & PAIRED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] font-mono">
                        DEVICE NOT LINKED
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Status Banner */}
                  {whatsAppStatus.isConnected ? (
                    <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-emerald-50/30 to-transparent rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-ink">
                              {whatsAppStatus.phoneNumber || whatsAppStatus.jid || 'WhatsApp Connected'}
                            </h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 font-mono">
                              Live Session
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Line ID: <span className="font-mono text-ink font-semibold">{whatsAppStatus.instanceName}</span> • Operational notifications are delivering in real-time.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleOpenPairingModal}
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold border-border hover:bg-slate-50"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                          Re-scan QR
                        </Button>
                        <Button
                          onClick={handleDisconnectWhatsApp}
                          disabled={disconnecting}
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Power className="w-3.5 h-3.5 mr-1.5" />}
                          Unlink Device
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-transparent rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                          <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-ink">Pair WhatsApp Web Companion</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Scan a QR code from WhatsApp on your mobile phone to activate instant alerts. No API credentials required.
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleOpenPairingModal}
                        size="sm"
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5 mr-1.5" />
                        Pair Device (Scan QR Code)
                      </Button>
                    </div>
                  )}

                  {/* Channel Description Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 bg-zinc-50/70 rounded-xl border border-border/70 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          Customer Touchpoints
                        </span>
                        <input
                          type="checkbox"
                          checked={whatsAppStatus.notifyCustomer}
                          onChange={(e) => handleTogglePreference('notifyCustomer', e.target.checked)}
                          disabled={savingPrefs}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Dispatches automated notifications for service request acknowledgments, engineer dispatch arrival slots, 6-digit repair OTP sign-offs, and payment receipts.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-50/70 rounded-xl border border-border/70 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-blue-600" />
                          Field Staff Dispatch Alerts
                        </span>
                        <input
                          type="checkbox"
                          checked={whatsAppStatus.notifyStaff}
                          onChange={(e) => handleTogglePreference('notifyStaff', e.target.checked)}
                          disabled={savingPrefs}
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Sends instant work order assignments straight to technicians' WhatsApp with customer address, direct phone link, issue title, and priority SLA.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Live Test Console */}
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-xs font-bold font-poppins text-ink flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    Verify WhatsApp Delivery (Test Dispatch)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Send an instantaneous test WhatsApp message to any phone number to verify routing and companion line health.
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

              {/* QR PAIRING MODAL */}
              {showQrModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-150 relative">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div>
                      <h4 className="text-xl font-bold text-slate-900 font-poppins">Pair WhatsApp Web</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Operational Line: <span className="font-semibold text-slate-700">{whatsAppStatus.instanceName}</span>
                      </p>
                    </div>

                    {qrConnected ? (
                      <div className="py-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h5 className="text-lg font-bold text-emerald-800">Successfully Connected!</h5>
                        <p className="text-xs text-slate-500">
                          Your WhatsApp operational line is now linked and persistent.
                        </p>
                        <Button
                          type="button"
                          onClick={() => setShowQrModal(false)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 text-xs rounded-xl"
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                          {qrLoading ? (
                            <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                              <span className="text-xs font-poppins">Requesting Pairing Session...</span>
                            </div>
                          ) : qrCodeData ? (
                            <img
                              src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                              alt="WhatsApp Pairing QR"
                              className="w-56 h-56 object-contain rounded-lg shadow-xs"
                            />
                          ) : (
                            <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                              <span className="text-xs">Generating Pairing QR...</span>
                            </div>
                          )}
                        </div>

                        <div className="text-left text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="font-semibold text-slate-800 mb-1">To Link Your Phone:</div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                            <span>Open WhatsApp on your mobile phone</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                            <span>Tap <b>Menu (⋮)</b> or <b>Settings</b> &rarr; <b>Linked Devices</b></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                            <span>Tap <b>Link a Device</b> and point camera at this QR code</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={handleOpenPairingModal}
                            disabled={qrLoading}
                            variant="outline"
                            className="w-1/2 text-xs font-semibold"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${qrLoading ? 'animate-spin' : ''}`} />
                            Refresh QR
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setShowQrModal(false)}
                            variant="ghost"
                            className="w-1/2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                          >
                            Close
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Enterprise Multi-Channel Notification Matrix */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-bold font-poppins text-ink flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        Enterprise Notification & Multi-Channel Dispatch Matrix
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Granular admin control over which delivery channels fire for each operational event across Field Service, Service Desk, Invoicing, and Inventory.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleSaveNotificationSettings}
                        disabled={savingNotificationSettings}
                        size="sm"
                        className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      >
                        {savingNotificationSettings ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Saving Matrix...
                          </>
                        ) : notificationSavedSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                            Saved!
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Save Channel Preferences
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Channel Gateway Health Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-blue-200/60 bg-blue-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">In-App Notification Feed</div>
                          <div className="text-[10px] text-muted-foreground">Header bell & event ledger</div>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                        ACTIVE
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">WhatsApp Gateway</div>
                          <div className="text-[10px] text-muted-foreground">WhatsFlow API automation</div>
                        </div>
                      </div>
                      <Badge
                        variant={whatsAppStatus.isConnected ? 'success' : 'outline'}
                        className="text-[10px]"
                      >
                        {whatsAppStatus.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl border border-indigo-200/60 bg-indigo-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">SMTP Mail Gateway</div>
                          <div className="text-[10px] text-muted-foreground">
                            {smtpConfig.host || 'Not configured'}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={smtpConfig.isConfigured ? 'success' : 'outline'}
                        className="text-[10px]"
                      >
                        {smtpConfig.isConfigured ? 'VERIFIED' : 'PENDING'}
                      </Badge>
                    </div>
                  </div>

                  {/* Bulk Quick-Toggles */}
                  <div className="p-3 bg-zinc-50 rounded-xl border border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-ink text-xs">Batch Channel Toggles:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggle('inAppEnabled', true)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        Enable All In-App
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggle('whatsappEnabled', true)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        Enable All WhatsApp
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggle('emailEnabled', true)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        Enable All Email
                      </Button>
                    </div>
                  </div>

                  {/* Category Matrix Table */}
                  <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-100/80 border-b border-border/80 text-[11px] font-bold text-ink">
                          <th className="py-3 px-4">Event Category & Trigger</th>
                          <th className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-blue-700">
                              <Bell className="w-3.5 h-3.5" />
                              <span>In-App</span>
                            </div>
                          </th>
                          <th className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </div>
                          </th>
                          <th className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-indigo-700">
                              <Mail className="w-3.5 h-3.5" />
                              <span>Outbound Mail</span>
                            </div>
                          </th>
                          <th className="py-3 px-3 text-right">Instant Test</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 bg-white">
                        {notificationSettings.map((cat) => {
                          const getCategoryIcon = (code: string) => {
                            switch (code) {
                              case 'TICKET_CREATED':
                                return <Ticket className="w-4 h-4 text-blue-600" />;
                              case 'TECHNICIAN_ASSIGNED':
                                return <UserCheck className="w-4 h-4 text-amber-600" />;
                              case 'WORK_ORDER_COMPLETED':
                                return <Wrench className="w-4 h-4 text-emerald-600" />;
                              case 'INVOICE_GENERATED':
                                return <Receipt className="w-4 h-4 text-purple-600" />;
                              case 'WARRANTY_CLAIM_UPDATED':
                                return <Shield className="w-4 h-4 text-teal-600" />;
                              case 'LOW_STOCK_ALERT':
                                return <Package className="w-4 h-4 text-rose-600" />;
                              default:
                                return <Bell className="w-4 h-4 text-slate-600" />;
                            }
                          };

                          return (
                            <tr key={cat.category} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-1.5 rounded-lg bg-zinc-100 shrink-0 mt-0.5">
                                    {getCategoryIcon(cat.category)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-ink">{cat.label}</span>
                                      <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5">
                                        {cat.targetAudience}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                      {cat.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* In-App Checkbox */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleChannel(cat.category, 'inAppEnabled')}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    cat.inAppEnabled
                                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                                      : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-600'
                                  }`}
                                >
                                  {cat.inAppEnabled ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400" />
                                  )}
                                  <span>{cat.inAppEnabled ? 'Enabled' : 'Off'}</span>
                                </button>
                              </td>

                              {/* WhatsApp Checkbox */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleChannel(cat.category, 'whatsappEnabled')}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    cat.whatsappEnabled
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                                      : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-600'
                                  }`}
                                >
                                  {cat.whatsappEnabled ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400" />
                                  )}
                                  <span>{cat.whatsappEnabled ? 'Enabled' : 'Off'}</span>
                                </button>
                              </td>

                              {/* Email Checkbox */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleChannel(cat.category, 'emailEnabled')}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    cat.emailEnabled
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                                      : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-600'
                                  }`}
                                >
                                  {cat.emailEnabled ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400" />
                                  )}
                                  <span>{cat.emailEnabled ? 'Enabled' : 'Off'}</span>
                                </button>
                              </td>

                              {/* Row Test Button */}
                              <td className="py-3.5 px-3 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendNotificationTest(cat.category)}
                                  disabled={sendingNotificationTest}
                                  className="h-7 text-[11px] text-muted-foreground hover:text-ink px-2.5"
                                  title="Send instant test alert"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Test
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Live Diagnostic & Test Broadcast Sandbox */}
                  <div className="p-5 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-indigo-600" />
                          Multi-Channel Verification Dispatcher
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Simulate an operational event and verify delivery across all enabled channels in real-time.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold text-ink">Target Event Category</Label>
                        <select
                          value={testNotificationCategory}
                          onChange={(e) => setTestNotificationCategory(e.target.value)}
                          className="mt-1 w-full text-xs font-medium border border-border rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {notificationSettings.map((cat) => (
                            <option key={cat.category} value={cat.category}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold text-ink">Test Email Recipient</Label>
                        <Input
                          type="email"
                          value={testNotificationEmail}
                          onChange={(e) => setTestNotificationEmail(e.target.value)}
                          placeholder="e.g. manager@orbit.local"
                          className="mt-1 text-xs h-9 bg-white"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold text-ink">Test WhatsApp Recipient</Label>
                        <Input
                          type="tel"
                          value={testNotificationPhone}
                          onChange={(e) => setTestNotificationPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="mt-1 text-xs h-9 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        onClick={() => handleSendNotificationTest()}
                        disabled={sendingNotificationTest}
                        size="sm"
                        className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      >
                        {sendingNotificationTest ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Dispatching Broadcast...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Dispatch Verification Broadcast
                          </>
                        )}
                      </Button>

                      {notificationTestResult && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-ink">Channel Results:</span>
                          <Badge
                            variant={notificationTestResult.inApp ? 'success' : 'outline'}
                            className="text-[10px]"
                          >
                            In-App: {notificationTestResult.inApp ? 'Dispatched' : 'Skipped'}
                          </Badge>
                          <Badge
                            variant={notificationTestResult.whatsappSent ? 'success' : 'outline'}
                            className="text-[10px]"
                          >
                            WhatsApp: {notificationTestResult.whatsappSent ? 'Dispatched' : 'Skipped'}
                          </Badge>
                          <Badge
                            variant={notificationTestResult.emailSent ? 'success' : 'outline'}
                            className="text-[10px]"
                          >
                            Email: {notificationTestResult.emailSent ? 'Dispatched' : 'Skipped'}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {notificationTestResult?.errors && notificationTestResult.errors.length > 0 && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Delivery Notices:
                        </div>
                        {notificationTestResult.errors.map((err, i) => (
                          <div key={i} className="pl-5">• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
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
