import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Sparkles, Ticket, CalendarClock, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  activeActivities: number;
  upcomingSlots: number;
  upcomingBookings: number;
  openReports: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    activeActivities: 0,
    upcomingSlots: 0,
    upcomingBookings: 0,
    openReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const nowIso = new Date().toISOString();

      const [
        totalUsers,
        activeUsers,
        activeActivities,
        upcomingSlots,
        openReports,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_shadow_blocked', false),
        supabase.from('activities').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('activity_slots').select('id', { count: 'exact', head: true }).gt('start_time', nowIso).eq('status', 'open'),
        supabase.from('concern_reports').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      // Upcoming bookings = confirmed bookings on slots in the future
      const { data: futureSlots } = await supabase
        .from('activity_slots')
        .select('id')
        .gt('start_time', nowIso);
      const slotIds = (futureSlots || []).map((s) => s.id);
      let bookingsCount = 0;
      if (slotIds.length) {
        const { count } = await supabase
          .from('activity_bookings')
          .select('*', { count: 'exact', head: true })
          .in('slot_id', slotIds)
          .eq('status', 'confirmed');
        bookingsCount = count || 0;
      }

      setStats({
        totalUsers: totalUsers.count || 0,
        activeUsers: activeUsers.count || 0,
        activeActivities: activeActivities.count || 0,
        upcomingSlots: upcomingSlots.count || 0,
        upcomingBookings: bookingsCount,
        openReports: openReports.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, link: '/admin/users' },
    { title: 'Active Users', value: stats.activeUsers, icon: UserCheck, link: '/admin/users' },
    { title: 'Active Activities', value: stats.activeActivities, icon: Sparkles, link: '/admin/activities' },
    { title: 'Upcoming Slots', value: stats.upcomingSlots, icon: CalendarClock, link: '/admin/activities' },
    { title: 'Upcoming Bookings', value: stats.upcomingBookings, icon: Ticket, link: '/admin/bookings' },
    { title: 'Open Reports', value: stats.openReports, icon: ClipboardList, link: '/admin/reports' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your platform</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.link}>
              <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loading ? '—' : stat.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
