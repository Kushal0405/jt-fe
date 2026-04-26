'use client';
import { useEffect, useState } from 'react';
import { Briefcase, FileText, Building2, TrendingUp, Clock, Target } from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { StatCard, PageHeader, StageBadge, Spinner } from '@/app/components/ui';
import { applicationsApi, jobsApi } from '@/lib/api';
import { Application, PipelineSummary } from '@/types';
import { formatDate, STAGE_META, STAGES } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [recent, setRecent] = useState<Application[]>([]);
  const [jobCount, setJobCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [appRes, jobRes] = await Promise.all([
          applicationsApi.list({ limit: 5 }),
          jobsApi.list({ limit: 1 }),
        ]);
        setSummary(appRes.data.summary);
        setRecent(appRes.data.applications);
        setJobCount(jobRes.data.total);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const totalApps = summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0;

  return (
    <AppLayout>
      <PageHeader
        title={`Good morning, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's your job search overview"
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Applications" value={totalApps} icon={FileText} />
            <StatCard label="Interviews" value={summary?.interview ?? 0} icon={Target} color="text-violet-400" />
            <StatCard label="Offers" value={summary?.offer ?? 0} icon={TrendingUp} color="text-emerald-400" />
            <StatCard label="Jobs Available" value={jobCount} icon={Briefcase} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipeline breakdown */}
            <div className="card p-5 lg:col-span-1">
              <h2 className="text-sm font-semibold text-foreground mb-4">Pipeline</h2>
              <div className="space-y-2.5">
                {STAGES.filter(s => s !== 'withdrawn').map(stage => {
                  const count = summary?.[stage] ?? 0;
                  const meta = STAGE_META[stage];
                  const pct = totalApps ? Math.round((count / totalApps) * 100) : 0;
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${meta.bg.replace('/10', '/60')}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent applications */}
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Recent Applications</h2>
                <Link href="/applications" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              {recent?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                  <Link href="/jobs" className="text-xs text-primary hover:underline mt-2">Browse jobs →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent?.map(app => (
                    <Link
                      key={app._id}
                      href={`/applications/${app._id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {(app.jobSnapshot?.companyName ?? app.job?.companyName ?? '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {app.jobSnapshot?.title ?? app.job?.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.jobSnapshot?.companyName ?? app.job?.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StageBadge stage={app.stage} />
                        <span className="text-xs text-muted-foreground">{formatDate(app.updatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}