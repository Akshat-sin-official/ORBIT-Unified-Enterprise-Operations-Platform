import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldCheck, Plus, KeyRound, Loader2, Users } from 'lucide-react';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/identity/roles'),
        api.get('/identity/permissions'),
      ]);
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
    } catch {
      toast.error('Failed to load roles and permissions matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) {
      toast.error('Please enter a role name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/identity/roles', {
        name: roleName,
        description: roleDescription || undefined,
        permissionCodes: selectedPermissions,
      });

      toast.success('Custom role created successfully');
      setIsDialogOpen(false);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      fetchRolesAndPermissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-poppins tracking-tight text-ink">
            Roles & Permissions Matrix
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permission-based authorization governing access boundaries across all 10 modules
          </p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} className="sm:self-start">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Role
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading roles matrix...</span>
          </div>
        ) : (
          roles.map((r) => (
            <Card key={r.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {r.description || 'System operational access role'}
                    </p>
                  </div>
                  {r.isSystemRole ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                      System
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                      Custom
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground border-y border-border/60 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>{r.userCount} Members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{r.permissionCount} Permissions</span>
                  </div>
                </div>

                {/* Sample Permissions List */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold font-poppins text-ink-soft uppercase tracking-wider">
                    Assigned Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {r.permissions?.slice(0, 8).map((code: string) => (
                      <span
                        key={code}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-border/60"
                      >
                        {code}
                      </span>
                    ))}
                    {r.permissions?.length > 8 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-muted-foreground">
                        +{r.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Custom Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Custom Operational Role</DialogTitle>
            <DialogDescription>
              Select granular permissions to grant to users assigned this role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 flex-1 overflow-hidden flex flex-col py-2">
            <div className="space-y-3 shrink-0">
              <div className="space-y-1.5">
                <Label htmlFor="customRoleName">Role Name *</Label>
                <Input
                  id="customRoleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Warranty Auditor"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customRoleDesc">Description</Label>
                <Input
                  id="customRoleDesc"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="e.g. Validates warranty documents and claims"
                />
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              <Label>Select Granular Permissions ({selectedPermissions.length} selected)</Label>
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                  <div key={moduleName} className="p-3 rounded-xl border border-border/60 bg-[#FAF9F6]">
                    <div className="text-[11px] font-bold font-poppins text-primary uppercase tracking-wider mb-2">
                      {moduleName}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const isChecked = selectedPermissions.includes(p.code);
                        return (
                          <label
                            key={p.code}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary/10 border-primary text-primary font-semibold'
                                : 'bg-white border-border/60 text-ink/80 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(p.code)}
                              className="mt-0.5 rounded text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <div className="font-mono text-[11px]">{p.code}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Role...</span>
                  </div>
                ) : (
                  'Create Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
