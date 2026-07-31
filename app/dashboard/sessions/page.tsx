'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wifi, WifiOff, Download, ArrowUpDown, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { RadAcct } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { StatusBadge, statusVariant } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDuration, formatOctets, formatRelativeTime } from '@/lib/utils';

type SortField = 'acctstarttime' | 'acctsessiontime' | 'data';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<RadAcct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('acctstarttime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('radacct')
      .select('*')
      .order('acctstarttime', { ascending: false })
      .limit(100);
    if (error) {
      toast.error('Failed to load sessions');
      setLoading(false);
      return;
    }
    setSessions(data as RadAcct[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = sessions.filter((s) => {
      const mq =
        !query ||
        (s.username ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (s.nasipaddress ?? '').includes(query) ||
        (s.callingstationid ?? '').toLowerCase().includes(query.toLowerCase());
      const ms = statusFilter === 'all' || s.status === statusFilter;
      return mq && ms;
    });
    list = [...list].sort((a, b) => {
      let av: number;
      let bv: number;
      if (sortField === 'acctstarttime') {
        av = new Date(a.acctstarttime).getTime();
        bv = new Date(b.acctstarttime).getTime();
      } else if (sortField === 'data') {
        av = Number(a.acctinputoctets) + Number(a.acctoutputoctets);
        bv = Number(b.acctinputoctets) + Number(b.acctoutputoctets);
      } else {
        av = a.acctsessiontime;
        bv = b.acctsessiontime;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [sessions, query, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const stats = useMemo(() => {
    const connected = sessions.filter((s) => s.status === 'connected');
    const totalData = sessions.reduce(
      (s, x) => s + Number(x.acctinputoctets) + Number(x.acctoutputoctets),
      0
    );
    const avgDur =
      sessions.reduce((s, x) => s + x.acctsessiontime, 0) /
      (sessions.length || 1);
    return {
      connected: connected.length,
      disconnected: sessions.length - connected.length,
      totalData,
      avgDur,
    };
  }, [sessions]);

  function renderSortHeader(field: SortField, children: React.ReactNode) {
    const active = sortField === field;
    return (
      <TableHead>
        <button
          onClick={() => toggleSort(field)}
          className={`inline-flex items-center gap-1 transition-colors ${
            active ? 'text-foreground' : 'hover:text-foreground'
          }`}
        >
          {children}
          <ArrowUpDown
            className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-40'}`}
          />
        </button>
      </TableHead>
    );
  }

  return (
    <PageShell
      title="Sessions"
      subtitle="FreeRADIUS accounting records (radacct)"
    >
      {!loading && (
        <div className="mb-5 grid gap-4 sm:grid-cols-4">
          <MiniStat
            label="Connected Now"
            value={stats.connected}
            icon={Wifi}
            accent="text-success"
            pulse
          />
          <MiniStat
            label="Disconnected"
            value={stats.disconnected}
            icon={WifiOff}
            accent="text-muted-foreground"
          />
          <MiniStat
            label="Total Data"
            value={formatOctets(stats.totalData)}
            icon={Download}
            accent="text-info"
          />
          <MiniStat
            label="Avg Duration"
            value={formatDuration(Math.round(stats.avgDur))}
            icon={Clock}
            accent="text-warning"
          />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user, NAS IP, or MAC..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} cols={7} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No sessions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>NAS IP</TableHead>
                    <TableHead>MAC / Client IP</TableHead>
                    {renderSortHeader('data', 'Data')}
                    {renderSortHeader('acctsessiontime', 'Duration')}
                    {renderSortHeader('acctstarttime', 'Started')}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const sv = statusVariant(s.status);
                    const totalOctets =
                      Number(s.acctinputoctets) + Number(s.acctoutputoctets);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.username ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {s.nasipaddress ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <div className="font-mono text-foreground">
                              {s.framedipaddress ?? '—'}
                            </div>
                            <div className="font-mono text-muted-foreground">
                              {s.callingstationid ?? '—'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatOctets(totalOctets)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDuration(s.acctsessiontime)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(s.acctstarttime)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={s.status}
                            variant={sv.variant}
                            pulse={sv.pulse}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  accent,
  pulse,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`relative flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${accent}`}
        >
          <Icon className="h-5 w-5" />
          {pulse && (
            <span className="absolute inset-0 animate-ping rounded-lg bg-success/30" />
          )}
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
