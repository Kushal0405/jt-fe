'use client';
import { useEffect, useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, StageBadge, Spinner } from '@/app/components/ui';
import { applicationsApi } from '@/lib/api';
import { Application, Stage } from '@/types';
import { STAGES, STAGE_META, formatDate, formatSalary, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [activeStage, setActiveStage] = useState<Stage | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStage !== 'all') params.stage = activeStage;
      const { data } = await applicationsApi.list(params);
      setApplications(data.applications);
      setSummary(data.summary);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [activeStage]);

  async function updateStage(id: string, stage: Stage) {
    try {
      await applicationsApi.updateStage(id, stage);
      toast.success(`Moved to ${STAGE_META[stage].label}`);
      load();
    } catch { toast.error('Failed to update'); }
  }

  const totalApps = summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0;

  return (
    <AppLayout>
      <PageHeader
        title="Applications"
        subtitle={`${totalApps} total applications tracked`}
      />

      {/* Stage filter tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveStage('all')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
            activeStage === 'all' ? 'bg-primary/15 text-primary border border-primary/20' : 'btn-ghost'
          )}
        >
          All <span className="bg-secondary px-1.5 py-0.5 rounded-full">{totalApps}</span>
        </button>
        {STAGES?.map(stage => {
          const meta = STAGE_META[stage];
          const count = summary?.[stage] ?? 0;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                activeStage === stage
                  ? `${meta.bg} ${meta.color} border border-current/20`
                  : 'btn-ghost'
              )}
            >
              {meta.label}
              <span className="bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : applications?.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Save jobs from the job board to start tracking your pipeline"
          action={<Link href="/jobs" className="btn-primary">Browse Jobs</Link>}
        />
      ) : (
        <div className="space-y-2">
          {applications?.map(app => (
            <AppRow key={app._id} app={app} onStageChange={updateStage} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function AppRow({ app, onStageChange }: { app: Application; onStageChange: (id: string, stage: Stage) => void }) {
  const [open, setOpen] = useState(false);
  const snap = app.jobSnapshot;

  return (
    <div className="card gradient-border overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Company avatar */}
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {(snap?.companyName ?? app.job?.companyName ?? '?')[0]}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <Link href={`/applications/${app._id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block">
            {snap?.title ?? app.job?.title}
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            {snap?.companyName ?? app.job?.companyName}
            {snap?.location && ` · ${snap.location}`}
            {(snap?.salaryMin || snap?.salaryMax) && ` · ${formatSalary(snap.salaryMin, snap.salaryMax)}`}
          </p>
        </div>

        {/* Stage selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpen(!open)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all',
              STAGE_META[app.stage].bg, STAGE_META[app.stage].color, 'border-current/20'
            )}
          >
            {STAGE_META[app.stage].label}
            <ChevronDown className="w-3 h-3" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-20 card border border-border shadow-xl min-w-[140px] py-1">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => { onStageChange(app._id, s); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors',
                    STAGE_META[s].color
                  )}
                >
                  {STAGE_META[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {formatDate(app.updatedAt)}
        </span>
      </div>
    </div>
  );
}