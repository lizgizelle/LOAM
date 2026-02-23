import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Report {
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
}

interface ReportNote {
  id: string;
  admin_id: string;
  note_text: string | null;
  status_change: string | null;
  created_at: string;
  admin_name?: string;
}

interface RelatedReport {
  id: string;
  category: string;
  event_name: string;
  status: string;
  created_at: string;
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

export default function AdminReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [notes, setNotes] = useState<ReportNote[]>([]);
  const [relatedReports, setRelatedReports] = useState<RelatedReport[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from('concern_reports')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      setReport(data);

      // Fetch reporter profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_number')
        .eq('id', data.reporter_id)
        .single();
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown';
      setReporterName(fullName);
      setReporterPhone(profile?.phone_number || '');

      // Fetch photo if exists
      if (data.photo_url) {
        const { data: signedData } = await supabase.storage
          .from('report-photos')
          .createSignedUrl(data.photo_url, 3600);
        if (signedData) setPhotoUrl(signedData.signedUrl);
      }

      // Fetch notes
      const { data: notesData } = await supabase
        .from('concern_report_notes')
        .select('*')
        .eq('report_id', id!)
        .order('created_at', { ascending: true });

      // Fetch admin names for notes
      const adminIds = [...new Set((notesData || []).map(n => n.admin_id))];
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, first_name')
        .in('id', adminIds);
      const adminMap = new Map((adminProfiles || []).map(p => [p.id, p.first_name || 'Admin']));

      setNotes((notesData || []).map(n => ({
        ...n,
        admin_name: adminMap.get(n.admin_id) || 'Admin',
      })));

      // Fetch related reports (same name + court, excluding current)
      const { data: related } = await supabase
        .from('concern_reports')
        .select('id, category, event_name, status, created_at')
        .ilike('reported_first_name', data.reported_first_name)
        .eq('court_number', data.court_number)
        .neq('id', id!);

      setRelatedReports(related || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!report || !user) return;
    try {
      await supabase
        .from('concern_reports')
        .update({ status: newStatus })
        .eq('id', report.id);

      await supabase.from('concern_report_notes').insert({
        report_id: report.id,
        admin_id: user.id,
        status_change: newStatus,
        note_text: `Status changed to ${statusLabels[newStatus]}`,
      });

      setReport({ ...report, status: newStatus });
      fetchReport();
      toast({ title: 'Status updated' });
    } catch (error) {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !report || !user) return;
    try {
      await supabase.from('concern_report_notes').insert({
        report_id: report.id,
        admin_id: user.id,
        note_text: newNote.trim(),
      });

      setNewNote('');
      fetchReport();
      toast({ title: 'Note added' });
    } catch (error) {
      toast({ title: 'Error adding note', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Loading…</div>
      </AdminLayout>
    );
  }

  if (!report) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Report not found.</div>
      </AdminLayout>
    );
  }

  const totalReports = relatedReports.length + 1;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Report Detail</h1>
            <p className="text-muted-foreground text-sm">Submitted {format(new Date(report.created_at), 'dd MMM yyyy, h:mma')}</p>
          </div>
        </div>

        {totalReports >= 2 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Multiple reports ({totalReports}) — review recommended
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Reporter</span>
                    <span className="font-medium">{reporterName}</span>
                    {reporterPhone && (
                      <span className="text-muted-foreground text-xs block">{reporterPhone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Reported Person</span>
                    <span className="font-medium">{report.reported_first_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Court Number</span>
                    <span className="font-medium">{report.court_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Court Leader</span>
                    <span className="font-medium">{report.court_leader_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Event Date</span>
                    <span className="font-medium">{format(new Date(report.event_date), 'dd MMM yyyy')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm block mb-1">Category</span>
                  <p className="text-sm font-medium">{report.category}</p>
                </div>

                {report.description && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm block mb-1">Description</span>
                    <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                  </div>
                )}

                {photoUrl && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm block mb-2">Attached Photo</span>
                    <img src={photoUrl} alt="Report attachment" className="max-w-full max-h-64 rounded-lg object-contain" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current:</span>
                  <Badge variant="outline" className={statusColors[report.status]}>
                    {statusLabels[report.status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.status !== 'under_review' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('under_review')}>
                      Mark Under Review
                    </Button>
                  )}
                  {report.status !== 'action_taken' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('action_taken')}>
                      Mark Action Taken
                    </Button>
                  )}
                  {report.status !== 'closed' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('closed')}>
                      Close — No Action
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notes.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notes.map((note) => (
                      <div key={note.id} className="text-sm border-l-2 border-border pl-3 py-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span className="font-medium text-foreground">{note.admin_name}</span>
                          <span>{format(new Date(note.created_at), 'dd MMM yyyy, h:mma')}</span>
                        </div>
                        <p className="mt-0.5">{note.note_text}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an internal note…"
                    rows={2}
                    className="resize-none"
                    maxLength={1000}
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()} className="self-end">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Related reports */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Previous Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {relatedReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous reports for this person.</p>
                ) : (
                  <div className="space-y-3">
                    {relatedReports.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 text-sm"
                        onClick={() => navigate(`/admin/reports/${r.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</span>
                          <Badge variant="outline" className={`text-xs ${statusColors[r.status]}`}>
                            {statusLabels[r.status]}
                          </Badge>
                        </div>
                        <p className="truncate">{r.category}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
