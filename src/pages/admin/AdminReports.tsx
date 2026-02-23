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
  reported_first_name: string;
  court_number: number;
  court_leader_name: string;
  event_name: string;
  event_date: string;
  category: string;
  description: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  reporter_name?: string;
  reporter_phone?: string;
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

      // Fetch reporter names
      const reporterIds = [...new Set((reportsData || []).map(r => r.reporter_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone_number')
        .in('id', reporterIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown', phone: p.phone_number || '' }]));

      // Count reports per person (by first name + court)
      const countMap = new Map<string, number>();
      (reportsData || []).forEach(r => {
        const key = `${r.reported_first_name.toLowerCase()}-${r.court_number}`;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      });

      const enriched = (reportsData || []).map(r => ({
        ...r,
        reporter_name: profileMap.get(r.reporter_id)?.name || 'Unknown',
        reporter_phone: profileMap.get(r.reporter_id)?.phone || '',
        report_count: countMap.get(`${r.reported_first_name.toLowerCase()}-${r.court_number}`) || 1,
      }));

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
                  <TableHead>Reported Person</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
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
                      <div className="flex items-center gap-2">
                        {report.reported_first_name}
                        {report.report_count! >= 2 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            {report.report_count} reports
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{report.court_number}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{report.event_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{report.category}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(report.created_at), 'dd MMM yyyy')}</TableCell>
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
