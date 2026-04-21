import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface ConcernReport {
  id: string;
  reporter_id: string;
  report_topic: string;
  reported_first_name: string | null;
  activity_id: string | null;
  event_name: string;
  event_date: string;
  event_time: string | null;
  event_aspect: string | null;
  category: string;
  description: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  reporter_name?: string;
  reporter_phone?: string;
  activity_name?: string;
  report_count?: number;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
  action_taken: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  under_review: 'Under Review',
  action_taken: 'Action Taken',
  closed: 'Closed — No Action',
};

const formatTime = (t: string | null) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
};

export default function AdminReports() {
  const [reports, setReports] = useState<ConcernReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: reportsData, error } = await supabase
        .from('concern_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reporter profiles
      const reporterIds = [...new Set((reportsData || []).map(r => r.reporter_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone_number')
        .in('id', reporterIds);

      const profileMap = new Map(
        (profiles || []).map(p => [
          p.id,
          {
            name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
            phone: p.phone_number || '',
          },
        ])
      );

      // Fetch activity names
      const activityIds = [
        ...new Set((reportsData || []).map(r => (r as any).activity_id).filter(Boolean)),
      ] as string[];
      let activityMap = new Map<string, string>();
      if (activityIds.length > 0) {
        const { data: acts } = await supabase
          .from('activities')
          .select('id, name')
          .in('id', activityIds);
        activityMap = new Map((acts || []).map(a => [a.id, a.name]));
      }

      // Count repeat reports per reported person within same activity
      const countMap = new Map<string, number>();
      (reportsData || []).forEach(r => {
        if (r.report_topic === 'person' && r.reported_first_name) {
          const key = `${r.reported_first_name.toLowerCase()}-${(r as any).activity_id || 'na'}`;
          countMap.set(key, (countMap.get(key) || 0) + 1);
        }
      });

      const enriched = (reportsData || []).map(r => ({
        ...(r as any),
        reporter_name: profileMap.get(r.reporter_id)?.name || 'Unknown',
        reporter_phone: profileMap.get(r.reporter_id)?.phone || '',
        activity_name:
          activityMap.get((r as any).activity_id) || (r as any).event_name || '—',
        report_count:
          r.report_topic === 'person' && r.reported_first_name
            ? countMap.get(
                `${r.reported_first_name.toLowerCase()}-${(r as any).activity_id || 'na'}`
              ) || 1
            : 1,
      })) as ConcernReport[];

      setReports(enriched);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-muted-foreground mt-1">Community concern reports for review</p>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="text-muted-foreground text-center py-12">No reports yet.</div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Reported / Aspect</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/reports/${report.id}`)}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{report.reporter_name}</span>
                        {report.reporter_phone && (
                          <span className="text-muted-foreground text-xs block">{report.reporter_phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          report.report_topic === 'activity'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }
                      >
                        {report.report_topic === 'activity' ? 'Activity' : 'Person'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.report_topic === 'person' ? (
                        <div className="flex items-center gap-2">
                          {report.reported_first_name || '—'}
                          {report.report_count! >= 2 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              {report.report_count} reports
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{report.event_aspect || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{report.activity_name}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(report.event_date), 'dd MMM yyyy')}
                      <span className="text-muted-foreground"> · {formatTime(report.event_time)}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{report.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[report.status] || statusColors.new}>
                        {statusLabels[report.status] || report.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
