'use client';
import { useEffect, useState } from 'react';
import { FileText, ChevronDown, LayoutList, Columns } from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, StageBadge, Spinner } from '@/app/components/ui';
import { applicationsApi } from '@/lib/api';
import { Application, Stage } from '@/types';
import { STAGES, STAGE_META, formatDate, formatSalary, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

type ViewMode = 'list' | 'kanban';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [activeStage, setActiveStage] = useState<Stage | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');

  async function load() {
    setLoading(true);
    try {
      // Always fetch all for kanban; filtered list for list view
      const [allRes, filteredRes] = await Promise.all([
        applicationsApi.list({ limit: 500 }),
        activeStage !== 'all'
          ? applicationsApi.list({ stage: activeStage, limit: 500 })
          : Promise.resolve(null),
      ]);
      setAllApplications(allRes.data.applications);
      setSummary(allRes.data.summary ?? {});
      setApplications(filteredRes ? filteredRes.data.applications : allRes.data.applications);
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
        action={
          <div className="flex items-center gap-1 bg-secondary border border-border rounded-md p-1">
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded transition-all', view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn('p-1.5 rounded transition-all', view === 'kanban' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
              title="Kanban view"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {view === 'list' && (
        /* Stage filter tabs — only shown in list mode */
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
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : view === 'kanban' ? (
        <KanbanBoard applications={allApplications} summary={summary} onStageChange={updateStage} />
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

/* ── Kanban Board ───────────────────────────────────────────── */
function KanbanBoard({
  applications,
  summary,
  onStageChange,
}: {
  applications: Application[];
  summary: Record<string, number>;
  onStageChange: (id: string, stage: Stage) => void;
}) {
  if (applications.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No applications yet"
        description="Save jobs from the job board to start tracking your pipeline"
        action={<Link href="/jobs" className="btn-primary">Browse Jobs</Link>}
      />
    );
  }

  const byStage = STAGES.reduce<Record<Stage, Application[]>>((acc, s) => {
    acc[s] = applications.filter(a => a.stage === s);
    return acc;
  }, {} as Record<Stage, Application[]>);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {STAGES.map(stage => {
        const meta = STAGE_META[stage];
        const cards = byStage[stage];
        return (
          <div key={stage} className="flex flex-col gap-2 min-w-[220px] w-[220px] shrink-0">
            {/* Column header */}
            <div className={cn('flex items-center justify-between px-3 py-2 rounded-md border', meta.bg, 'border-current/20')}>
              <span className={cn('text-xs font-semibold', meta.color)}>{meta.label}</span>
              <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full bg-background/40', meta.color)}>
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1">
              {cards.length === 0 ? (
                <div className="flex-1 border border-dashed border-border rounded-lg flex items-center justify-center py-8">
                  <span className="text-xs text-muted-foreground">Empty</span>
                </div>
              ) : (
                cards.map(app => (
                  <KanbanCard key={app._id} app={app} onStageChange={onStageChange} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  app,
  onStageChange,
}: {
  app: Application;
  onStageChange: (id: string, stage: Stage) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const snap = app.jobSnapshot;
  const title = snap?.title ?? app.job?.title ?? 'Untitled';
  const company = snap?.companyName ?? app.job?.companyName ?? '—';
  const salaryMin = snap?.salaryMin ?? app.job?.salaryMin;
  const salaryMax = snap?.salaryMax ?? app.job?.salaryMax;

  return (
    <div className="card gradient-border p-3 flex flex-col gap-2 hover:glow transition-all duration-200 relative">
      {/* Avatar + title */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {company[0]}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/applications/${app._id}`}
            className="text-xs font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
          >
            {title}
          </Link>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{company}</p>
        </div>
      </div>

      {/* Salary */}
      {(salaryMin || salaryMax) && (
        <p className="text-[10px] font-medium text-foreground/80">
          {formatSalary(salaryMin, salaryMax)}
        </p>
      )}

      {/* Footer: date + move menu */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground">{formatDate(app.updatedAt)}</span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            Move <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-1 z-30 card border border-border shadow-xl min-w-[130px] py-1">
              {STAGES.filter(s => s !== app.stage).map(s => (
                <button
                  key={s}
                  onClick={() => { onStageChange(app._id, s); setMenuOpen(false); }}
                  className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-secondary transition-colors', STAGE_META[s].color)}
                >
                  {STAGE_META[s].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppRow({ app, onStageChange }: { app: Application; onStageChange: (id: string, stage: Stage) => void }) {
  const [open, setOpen] = useState(false);
  const snap = app.jobSnapshot;

  return (
    <div className="card gradient-border">
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
            <div className="absolute right-0 top-full mt-1 z-50 card border border-border shadow-xl min-w-[140px] py-1">
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