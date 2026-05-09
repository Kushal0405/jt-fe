'use client';
import { useState } from 'react';
import { FileText, ChevronDown, LayoutList, Columns, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  useDroppable, useDraggable, closestCorners,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, StageBadge, Spinner } from '@/app/components/ui';
import { applicationsApi } from '@/lib/api';
import { Application, Stage } from '@/types';
import { STAGES, STAGE_META, formatDate, formatSalary, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

type ViewMode = 'list' | 'kanban';

const QUERY_KEY = ['applications'] as const;

/** Fetch all applications (up to 500) — single source of truth for both views */
async function fetchApplications() {
  const { data } = await applicationsApi.list({ limit: 500 });
  return {
    applications: data.applications as Application[],
    summary: (data.summary ?? {}) as Record<string, number>,
  };
}

export default function ApplicationsPage() {
  const [activeStage, setActiveStage] = useState<Stage | 'all'>('all');
  const [view, setView] = useState<ViewMode>('list');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchApplications,
  });

  const allApplications = data?.applications ?? [];
  const summary = data?.summary ?? {};
  const totalApps = Object.values(summary).reduce((a, b) => a + b, 0);

  // Filter client-side — no extra fetch needed
  const applications =
    activeStage === 'all'
      ? allApplications
      : allApplications.filter(a => a.stage === activeStage);

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) =>
      applicationsApi.updateStage(id, stage),
    // Optimistic update — update cache immediately, no spinner
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData(QUERY_KEY);
      qc.setQueryData(QUERY_KEY, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          applications: old.applications.map(a =>
            a._id === id ? { ...a, stage, updatedAt: new Date().toISOString() } : a
          ),
          summary: recalcSummary(old.applications, id, stage),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous);
      toast.error('Failed to update stage');
    },
    onSuccess: (_res, { stage }) => {
      toast.success(`Moved to ${STAGE_META[stage].label}`);
    },
    onSettled: () => {
      // Re-validate in background to sync server truth
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  function updateStage(id: string, stage: Stage) {
    stageMutation.mutate({ id, stage });
  }

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
          {STAGES.map(stage => {
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

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : view === 'kanban' ? (
        <KanbanBoard applications={allApplications} summary={summary} onStageChange={updateStage} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Save jobs from the job board to start tracking your pipeline"
          action={<Link href="/jobs" className="btn-primary">Browse Jobs</Link>}
        />
      ) : (
        <div className="space-y-2">
          {applications.map(app => (
            <AppRow key={app._id} app={app} onStageChange={updateStage} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

/** Recompute summary counts after an optimistic stage move */
function recalcSummary(
  apps: Application[],
  movedId: string,
  newStage: Stage
): Record<string, number> {
  return apps.reduce<Record<string, number>>((acc, a) => {
    const stage = a._id === movedId ? newStage : a.stage;
    acc[stage] = (acc[stage] ?? 0) + 1;
    return acc;
  }, {});
}

/* ── Kanban Board ───────────────────────────────────────────── */
function KanbanBoard({
  applications,
  onStageChange,
}: {
  applications: Application[];
  summary: Record<string, number>;
  onStageChange: (id: string, stage: Stage) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeApp = activeId ? applications.find(a => a._id === activeId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStage = STAGES.reduce<Record<Stage, Application[]>>((acc, s) => {
    acc[s] = applications.filter(a => a.stage === s);
    return acc;
  }, {} as Record<Stage, Application[]>);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const targetStage = String(over.id) as Stage;
    const app = applications.find(a => a._id === String(active.id));
    if (app && app.stage !== targetStage && STAGES.includes(targetStage)) {
      onStageChange(String(active.id), targetStage);
    }
  }

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {STAGES.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            cards={byStage[stage]}
            onStageChange={onStageChange}
          />
        ))}
      </div>

      {/* Ghost card that follows the cursor */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeApp && <KanbanCardGhost app={activeApp} />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  stage,
  cards,
  onStageChange,
}: {
  stage: Stage;
  cards: Application[];
  onStageChange: (id: string, stage: Stage) => void;
}) {
  const meta = STAGE_META[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px] shrink-0">
      {/* Column header */}
      <div className={cn('flex items-center justify-between px-3 py-2 rounded-md border', meta.bg, 'border-current/20')}>
        <span className={cn('text-xs font-semibold', meta.color)}>{meta.label}</span>
        <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full bg-background/40', meta.color)}>
          {cards.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 rounded-lg p-1 min-h-[80px] transition-colors',
          isOver && 'bg-primary/5 ring-1 ring-primary/30'
        )}
      >
        {cards.length === 0 ? (
          <div className={cn(
            'flex-1 border border-dashed rounded-lg flex items-center justify-center py-10 transition-colors',
            isOver ? 'border-primary/50 bg-primary/5' : 'border-border'
          )}>
            <span className="text-xs text-muted-foreground">Drop here</span>
          </div>
        ) : (
          cards.map(app => (
            <KanbanCard key={app._id} app={app} onStageChange={onStageChange} />
          ))
        )}
      </div>
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app._id });

  const snap = app.jobSnapshot;
  const title = snap?.title ?? app.job?.title ?? 'Untitled';
  const company = snap?.companyName ?? app.job?.companyName ?? '—';
  const salaryMin = snap?.salaryMin ?? app.job?.salaryMin;
  const salaryMax = snap?.salaryMax ?? app.job?.salaryMax;

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'card gradient-border p-3 flex flex-col gap-2 transition-all duration-150 relative',
        isDragging ? 'opacity-30 ring-1 ring-primary/40 shadow-none' : 'hover:glow'
      )}
    >
      {/* Drag handle + avatar + title */}
      <div className="flex items-start gap-1.5">
        <button
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors touch-none"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
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
        <p className="text-[10px] font-medium text-foreground/80 pl-5">
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
            <div className="absolute bottom-full right-0 mb-1 z-50 card border border-border shadow-xl min-w-[130px] py-1">
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

/** Visual ghost that follows the cursor while dragging */
function KanbanCardGhost({ app }: { app: Application }) {
  const snap = app.jobSnapshot;
  const title = snap?.title ?? app.job?.title ?? 'Untitled';
  const company = snap?.companyName ?? app.job?.companyName ?? '—';
  const salaryMin = snap?.salaryMin ?? app.job?.salaryMin;
  const salaryMax = snap?.salaryMax ?? app.job?.salaryMax;

  return (
    <div className="card gradient-border p-3 flex flex-col gap-2 w-[220px] shadow-2xl ring-1 ring-primary/40 rotate-1 scale-[1.03] opacity-95">
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/30 shrink-0" />
        <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
          {company[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{company}</p>
        </div>
      </div>
      {(salaryMin || salaryMax) && (
        <p className="text-[10px] font-medium text-foreground/80 pl-5">{formatSalary(salaryMin, salaryMax)}</p>
      )}
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