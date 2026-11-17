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
import {
  UserPlus,
  Trash2,
  Loader2,
  Users,
  Search,
  Shield,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';
import { ExcelImportModal, ColumnDefinition } from '@/components/common/ExcelImportModal';
import { TablePagination, usePagination } from '@/components/common/TablePagination';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  const userImportColumns: ColumnDefinition[] = [
    { key: 'firstName', label: 'First Name', required: true, example: 'Vikram' },
    { key: 'lastName', label: 'Last Name', example: 'Sharma' },
    { key: 'email', label: 'Corporate Email', required: true, example: 'vikram.s@orbit.local' },
    { key: 'password', label: 'Initial Password', example: 'Orbit@1234' },
    { key: 'phone', label: 'Phone Number', example: '+919876543210' },
    { key: 'designation', label: 'Designation / Title', example: 'Lead Field Engineer' },
    { key: 'employeeCode', label: 'Employee Code', example: 'EMP-088' },
    { key: 'roleName', label: 'Assigned Role', example: 'Field Technician' },
  ];

  const handleBulkImportUsers = async (rows: Record<string, any>[]) => {
    for (const row of rows) {
      if (!row.firstName || !row.email) continue;
      await api.post('/identity/users', {
        firstName: String(row.firstName),
        lastName: row.lastName ? String(row.lastName) : '',
        email: String(row.email).toLowerCase().trim(),
        password: row.password ? String(row.password) : 'Orbit@1234',
        phone: row.phone ? String(row.phone) : undefined,
        designation: row.designation ? String(row.designation) : undefined,
        employeeCode: row.employeeCode ? String(row.employeeCode) : undefined,
        roleNames: [row.roleName ? String(row.roleName) : 'Support Agent'],
      });
    }
    await fetchUsers();
  };

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    employeeCode: '',
    roleName: 'Support Agent',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/identity/users?limit=50'),
        api.get('/identity/roles'),
      ]);
      setUsers(usersRes.data?.data || []);
      setRoles(rolesRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load organization users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/identity/users', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        designation: formData.designation || undefined,
        employeeCode: formData.employeeCode || undefined,
        roleNames: [formData.roleName],
      });

      toast.success('User created successfully');
      setIsDialogOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        designation: '',
        employeeCode: '',
        roleName: 'Support Agent',
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) {
      return;
    }

    try {
      await api.delete(`/identity/users/${userId}`);
      toast.success('User removed');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q)
    );
  });

  const userPagination = usePagination(filteredUsers, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-poppins tracking-tight text-ink">
            Users & Organization Team
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage organization members, assignments, designations, and access credentials
          </p>
        </div>

        <div className="flex items-center gap-2 sm:self-start">
          <Button
            variant="outline"
            onClick={() => setIsExcelImportOpen(true)}
            className="border-border text-ink hover:bg-zinc-100 flex items-center gap-2 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import Excel
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader className="p-4 border-b border-border/60">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-[#FBFBFA] text-[11px] font-bold font-poppins text-ink-soft uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading team members...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  userPagination.paginatedItems.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink font-poppins">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r: any) => (
                            <Badge key={r.id || r.name} variant="default" className="text-[10px]">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-ink/80">
                          {u.employee?.designation || 'Operational Staff'}
                        </span>
                        {u.employee?.employeeCode && (
                          <span className="block text-[10px] font-mono text-muted-foreground">
                            {u.employee.employeeCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination {...userPagination} />
        </CardContent>
      </Card>

      {/* Add User Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Organization Member</DialogTitle>
            <DialogDescription>
              Assign roles, credentials, and departmental designation for this tenant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Kavita"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Iyer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newEmail">Email Address *</Label>
              <Input
                id="newEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="kavita@orbit.local"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Temporary Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+919876543210"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roleSelect">Assign Role *</Label>
                <select
                  id="roleSelect"
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  className="flex h-11 w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary shadow-xs"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Lead Dispatcher"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empCode">Employee Code</Label>
                <Input
                  id="empCode"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  placeholder="e.g. EMP-104"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
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
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Excel Importer */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        title="Upload & Populate Team Members"
        entityName="Users"
        columns={userImportColumns}
        onImport={handleBulkImportUsers}
      />
    </div>
  );
};
