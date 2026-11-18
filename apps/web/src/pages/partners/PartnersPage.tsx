import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Users,
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface RateCard {
  id: string;
  productCategory: string;
  labourAllowance: string;
  tatBonusPercent: string;
  rcrPenaltyPercent: string;
}

interface Settlement {
  id: string;
  settlementNumber: string;
  periodStart: string;
  periodEnd: string;
  totalJobsCompleted: number;
  grossLabourEarned: string;
  tatBonusAmount: string;
  rcrPenaltyAmount: string;
  netPayable: string;
  status: string;
  createdAt: string;
}

interface Partner {
  id: string;
  partnerCode: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  region: string;
  tier: string;
  status: string;
  gstNumber?: string;
  rateCards: RateCard[];
  settlements: Settlement[];
}

export const PartnersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // New Partner Modal
  const [isNewPartnerOpen, setIsNewPartnerOpen] = useState(false);
  const [newPartnerData, setNewPartnerData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    region: 'Bengaluru Urban',
    tier: 'SILVER',
    gstNumber: '',
  });

  // Rate Card Modal
  const [isRateCardOpen, setIsRateCardOpen] = useState(false);
  const [rateCardData, setRateCardData] = useState({
    productCategory: 'Air Conditioners',
    labourAllowance: 450,
    tatBonusPercent: 5.0,
    rcrPenaltyPercent: 10.0,
  });

  // Generate Settlement Modal
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementData, setSettlementData] = useState({
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    notes: 'Standard Monthly Service Network Settlement',
  });
  const [generatingSettlement, setGeneratingSettlement] = useState(false);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await api.get(`/partners?${params.toString()}`);
      setPartners(res.data || []);
      if (res.data?.length > 0 && !selectedPartner) {
        setSelectedPartner(res.data[0]);
      }
    } catch {
      toast.error('Failed to load partner network directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/partners', newPartnerData);
      toast.success(`Partner ${res.data.companyName} registered as #${res.data.partnerCode}`);
      setIsNewPartnerOpen(false);
      fetchPartners();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register partner');
    }
  };

  const handleSaveRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    try {
      await api.post(`/partners/${selectedPartner.id}/rate-card`, rateCardData);
      toast.success(`Rate card updated for ${rateCardData.productCategory}`);
      setIsRateCardOpen(false);
      // Reload single partner
      const res = await api.get(`/partners/${selectedPartner.id}`);
      setSelectedPartner(res.data);
      fetchPartners();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update rate card');
    }
  };

  const handleGenerateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setGeneratingSettlement(true);
    try {
      const res = await api.post('/partners/settlements/generate', {
        partnerId: selectedPartner.id,
        ...settlementData,
      });
      toast.success(
        `Statement #${res.data.settlementNumber} generated! Net Payable: ₹${Number(res.data.netPayable).toLocaleString()}`,
      );
      setIsSettlementOpen(false);
      const updated = await api.get(`/partners/${selectedPartner.id}`);
      setSelectedPartner(updated.data);
      fetchPartners();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate settlement statement');
    } finally {
      setGeneratingSettlement(false);
    }
  };

  const handleUpdateSettlementStatus = async (settlementId: string, status: string) => {
    try {
      await api.patch(`/partners/settlements/${settlementId}/status`, { status });
      toast.success(`Settlement status updated to ${status}`);
      if (selectedPartner) {
        const updated = await api.get(`/partners/${selectedPartner.id}`);
        setSelectedPartner(updated.data);
      }
      fetchPartners();
    } catch (err: any) {
      toast.error('Failed to update settlement status');
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Platinum ASP</Badge>;
      case 'GOLD':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Gold ASP</Badge>;
      case 'SILVER':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Silver ASP</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-2xs">
        <div>
          <h1 className="text-xl font-bold font-poppins text-ink tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Franchisee & ASP Partner Settlements
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authorized Service Partner directory, category labour rate cards, turnaround-time bonuses, and monthly billing statements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchPartners} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewPartnerOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Register Franchisee Partner
          </Button>
        </div>
      </div>

      {/* Main Dual-Panel View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Partner Directory */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-border">
            <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold font-poppins flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Authorized Partner Network ({partners.length})
                </CardTitle>
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search partner..."
                    className="pl-7 h-7 text-xs bg-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 max-h-[600px] overflow-y-auto space-y-2.5">
              {partners.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No service partners registered yet.
                </div>
              ) : (
                partners.map((p) => {
                  const isSelected = selectedPartner?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPartner(p)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                          : 'border-border/80 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-ink text-[13px]">{p.companyName}</span>
                        {getTierBadge(p.tier)}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center justify-between mt-1">
                        <span>Code: <strong className="font-mono text-ink">{p.partnerCode}</strong></span>
                        <span>Region: <strong>{p.region}</strong></span>
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60 text-[10px] text-slate-500">
                        <span>Contact: {p.contactName} ({p.phone})</span>
                        <span className="font-semibold text-primary">
                          {p.rateCards?.length || 0} Rate Cards →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Partner Profile, Rate Cards & Monthly Settlement Statements */}
        <div className="lg:col-span-7 space-y-4">
          {selectedPartner ? (
            <>
              {/* Partner Overview Banner */}
              <Card className="border-border bg-white shadow-2xs">
                <CardHeader className="p-4 pb-3 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold font-poppins text-ink">
                          {selectedPartner.companyName}
                        </h2>
                        {getTierBadge(selectedPartner.tier)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Code: #{selectedPartner.partnerCode} • Region: {selectedPartner.region} • GST: {selectedPartner.gstNumber || 'GST Exempt / Unregistered'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsRateCardOpen(true)}
                        className="h-8 text-xs gap-1"
                      >
                        <Percent className="w-3.5 h-3.5" />
                        Configure Rate Card
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsSettlementOpen(true)}
                        className="h-8 text-xs gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Generate Settlement
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Category Rate Card Matrix */}
                  <div>
                    <div className="text-xs font-bold font-poppins text-ink mb-2 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-primary" />
                      Approved Labour Allowance & Bonus Matrix
                    </div>

                    {selectedPartner.rateCards.length === 0 ? (
                      <div className="p-3 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                        No category rate cards configured. Using default flat allowance of ₹350 per completed ticket.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedPartner.rateCards.map((rc) => (
                          <div
                            key={rc.id}
                            className="p-3 rounded-xl border border-border bg-zinc-50 text-xs space-y-1"
                          >
                            <div className="font-bold text-ink">{rc.productCategory}</div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Standard Allowance:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                ₹{Number(rc.labourAllowance).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>TAT Speed Bonus (≤24h):</span>
                              <span className="font-mono text-blue-700 font-semibold">
                                +{Number(rc.tatBonusPercent)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>RCR Rework Penalty (≤30d):</span>
                              <span className="font-mono text-rose-700 font-semibold">
                                -{Number(rc.rcrPenaltyPercent)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Monthly Settlement History */}
                  <div>
                    <div className="text-xs font-bold font-poppins text-ink mb-2 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-primary" />
                      Monthly Settlement Statements
                    </div>

                    {selectedPartner.settlements.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground border border-border rounded-xl">
                        No billing settlement statements generated yet for this contractor partner.
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                        {selectedPartner.settlements.map((st) => (
                          <div key={st.id} className="p-3.5 bg-white text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-primary">
                                  #{st.settlementNumber}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold ${
                                    st.status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : st.status === 'APPROVED'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {st.status}
                                </Badge>
                              </div>

                              <div className="font-mono text-base font-bold text-ink">
                                ₹{Number(st.netPayable).toLocaleString()}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[11px] p-2 rounded-lg bg-zinc-50 border border-border">
                              <div>
                                <span className="text-muted-foreground">Jobs Closed:</span>{' '}
                                <strong className="text-ink">{st.totalJobsCompleted}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">TAT Bonus:</span>{' '}
                                <strong className="text-blue-700">+₹{Number(st.tatBonusAmount).toLocaleString()}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">RCR Penalty:</span>{' '}
                                <strong className="text-rose-700">-₹{Number(st.rcrPenaltyAmount).toLocaleString()}</strong>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <span className="text-muted-foreground">
                                Period: {new Date(st.periodStart).toLocaleDateString()} to {new Date(st.periodEnd).toLocaleDateString()}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {st.status === 'DRAFT' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateSettlementStatus(st.id, 'APPROVED')}
                                    className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700"
                                  >
                                    Approve Payout
                                  </Button>
                                )}
                                {st.status === 'APPROVED' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateSettlementStatus(st.id, 'PAID')}
                                    className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    Mark as Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-border p-8 text-center text-xs text-muted-foreground">
              Select a contractor partner from the directory to inspect rate cards and settlement statements.
            </Card>
          )}
        </div>
      </div>

      {/* New Partner Modal */}
      {isNewPartnerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold font-poppins text-ink">
                Register Authorized Service Partner (ASP)
              </h2>
              <button
                onClick={() => setIsNewPartnerOpen(false)}
                className="text-muted-foreground hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Company / Entity Name *</label>
                <Input
                  value={newPartnerData.companyName}
                  onChange={(e) => setNewPartnerData({ ...newPartnerData, companyName: e.target.value })}
                  placeholder="e.g. Apex Tech Solutions LLP"
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Contact Person *</label>
                  <Input
                    value={newPartnerData.contactName}
                    onChange={(e) => setNewPartnerData({ ...newPartnerData, contactName: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone Number *</label>
                  <Input
                    value={newPartnerData.phone}
                    onChange={(e) => setNewPartnerData({ ...newPartnerData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Official Email *</label>
                  <Input
                    type="email"
                    value={newPartnerData.email}
                    onChange={(e) => setNewPartnerData({ ...newPartnerData, email: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Territory / Region *</label>
                  <Input
                    value={newPartnerData.region}
                    onChange={(e) => setNewPartnerData({ ...newPartnerData, region: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Partner Tier</label>
                  <select
                    value={newPartnerData.tier}
                    onChange={(e) => setNewPartnerData({ ...newPartnerData, tier: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-white"
                  >
                    <option value="PLATINUM">Platinum</option>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                    <option value="BRONZE">Bronze</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">GST Number</label>
                  <Input
                    value={newPartnerData.gstNumber}
                    onChange={(e) => setNewPartnerData({ ...newPartnerData, gstNumber: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewPartnerOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Register Partner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Rate Card Modal */}
      {isRateCardOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold font-poppins text-ink">
                Configure Labour Rate Card
              </h2>
              <button
                onClick={() => setIsRateCardOpen(false)}
                className="text-muted-foreground hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRateCard} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Product Category</label>
                <Input
                  value={rateCardData.productCategory}
                  onChange={(e) => setRateCardData({ ...rateCardData, productCategory: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Standard Labour Allowance (₹)</label>
                <Input
                  type="number"
                  value={rateCardData.labourAllowance}
                  onChange={(e) => setRateCardData({ ...rateCardData, labourAllowance: Number(e.target.value) })}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">TAT Bonus % (≤24h)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={rateCardData.tatBonusPercent}
                    onChange={(e) => setRateCardData({ ...rateCardData, tatBonusPercent: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">RCR Penalty % (≤30d)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={rateCardData.rcrPenaltyPercent}
                    onChange={(e) => setRateCardData({ ...rateCardData, rcrPenaltyPercent: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRateCardOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Rate Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Settlement Modal */}
      {isSettlementOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold font-poppins text-ink">
                Generate Monthly Settlement Statement
              </h2>
              <button
                onClick={() => setIsSettlementOpen(false)}
                className="text-muted-foreground hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSettlement} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-border">
                <div className="text-muted-foreground">Partner:</div>
                <div className="font-bold text-ink">{selectedPartner.companyName} (#{selectedPartner.partnerCode})</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Period Start</label>
                  <Input
                    type="date"
                    value={settlementData.periodStart}
                    onChange={(e) => setSettlementData({ ...settlementData, periodStart: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Period End</label>
                  <Input
                    type="date"
                    value={settlementData.periodEnd}
                    onChange={(e) => setSettlementData({ ...settlementData, periodEnd: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Notes</label>
                <Input
                  value={settlementData.notes}
                  onChange={(e) => setSettlementData({ ...settlementData, notes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettlementOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={generatingSettlement}>
                  {generatingSettlement ? 'Computing...' : 'Calculate & Generate Statement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
