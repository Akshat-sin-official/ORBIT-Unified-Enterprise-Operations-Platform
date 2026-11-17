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
import { ShieldCheck, Plus, KeyRound, Loader2, Users, CheckSquare, Square, Edit3 } from 'lucide-react';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Edit role permissions state
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleOpenEditRole = (role: any) => {
    setEditingRole(role);
    setEditPermissions(role.permissions || []);
    setIsEditDialogOpen(true);
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;
    setIsSavingEdit(true);
    try {
      await api.post(`/identity/roles/${editingRole.id}/permissions`, {
        permissionCodes: editPermissions,
      });
      toast.success(`Updated capabilities for role "${editingRole.name}"`);
      setIsEditDialogOpen(false);
      setEditingRole(null);
      fetchRolesAndPermissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role permissions');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleCreatePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  const toggleEditPermission = (code: string) => {
    setEditPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  const toggleModulePermissions = (modulePerms: any[], currentList: string[], setFn: (val: string[]) => void) => {
    const codes = modulePerms.map((p) => p.code);
    const allSelected = codes.every((c) => currentList.includes(c));
    if (allSelected) {
      setFn(currentList.filter((c) => !codes.includes(c)));
    } else {
      const merged = Array.from(new Set([...currentList, ...codes]));
      setFn(merged);
    }
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
            Roles & Capabilities Matrix
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

                {/* Edit Capabilities Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditRole(r)}
                  className="w-full text-xs font-semibold h-8 gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                  <span>Edit Role Capabilities ({r.permissionCount})</span>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Role Permissions Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Edit Capabilities: {editingRole?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Check or uncheck granular permissions to grant or revoke operational access for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2 py-2">
            <div className="p-3 bg-zinc-50 rounded-xl border border-border/70 flex items-center justify-between text-xs">
              <span className="font-semibold text-ink font-poppins">
                Active Permissions: {editPermissions.length} of {permissions.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setEditPermissions(permissions.map((p) => p.code))}
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-rose-600"
                  onClick={() => setEditPermissions([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                const moduleCodes = perms.map((p) => p.code);
                const isAllSelected = moduleCodes.every((c) => editPermissions.includes(c));
                return (
                  <div key={moduleName} className="p-3.5 rounded-xl border border-border/70 bg-[#FAF9F6] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold font-poppins text-primary uppercase tracking-wider">
                        {moduleName}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(perms, editPermissions, setEditPermissions)}
                        className="text-[10.5px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        {isAllSelected ? 'Deselect Module' : 'Select Module'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const isChecked = editPermissions.includes(p.code);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-white border-primary/50 text-ink shadow-2xs'
                                : 'bg-white/60 border-border/60 text-muted-foreground hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleEditPermission(p.code)}
                              className="mt-0.5 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-semibold">{p.code}</div>
                              <div className="text-[10px] text-muted-foreground leading-snug">{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRolePermissions}
              disabled={isSavingEdit}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {isSavingEdit ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Capabilities...</span>
                </div>
              ) : (
                'Save Capabilities'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const isChecked = selectedPermissions.includes(p.code);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-white border-primary/50 text-ink shadow-2xs'
                                : 'bg-white/60 border-border/60 text-muted-foreground hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCreatePermission(p.code)}
                              className="mt-0.5 rounded border-zinc-300 text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-semibold">{p.code}</div>
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
