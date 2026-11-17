import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { TablePagination } from '@/components/common/TablePagination';
import { toast } from 'sonner';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (p = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/identity/audit-logs?page=${p}&limit=10`);
      setLogs(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotal(res.data?.pagination?.total || 0);
      setPage(p);
    } catch {
      toast.error('Failed to load audit trails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-poppins tracking-tight text-ink">
            Audit Trails & Mutation History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable operational logs capturing every state-altering mutation across ORBIT modules
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchLogs(page)} className="sm:self-start">
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Refresh ({total} Total)
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-[#FBFBFA] text-[11px] font-bold font-poppins text-ink-soft uppercase tracking-wider">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading audit events...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No audit trails logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-ink capitalize">{log.entityType}</span>
                        <span className="block text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                          {log.entityId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-ink">
                          {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System Agent'}
                        </span>
                        {log.actor?.email && (
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {log.actor.email}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            startIndex={total > 0 ? (page - 1) * 10 + 1 : 0}
            endIndex={Math.min(page * 10, total)}
            setCurrentPage={(p) => fetchLogs(p)}
          />
        </CardContent>
      </Card>
    </div>
  );
};
