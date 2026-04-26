import { cn, STAGE_META } from '@/lib/utils';
import { Stage } from '@/types';
import { LucideIcon } from 'lucide-react';

// ---- StageBadge ----
export function StageBadge({ stage }: { stage: Stage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={cn('badge', meta.bg, meta.color)}>
      {meta.label}
    </span>
  );
}

// ---- StatCard ----
interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}
export function StatCard({ label, value, icon: Icon, trend, color = 'text-primary' }: StatCardProps) {
  return (
    <div className="card p-5 gradient-border hover:glow transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10', color === 'text-primary' ? 'bg-primary/10' : 'bg-emerald-500/10')}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        {trend && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ---- PageHeader ----
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ---- EmptyState ----
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      {action}
    </div>
  );
}

// ---- Spinner ----
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin', className)} />
  );
}

// ---- SkillTag ----
export function SkillTag({ skill, matched }: { skill: string; matched?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      matched
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-secondary text-muted-foreground border-border'
    )}>
      {skill}
    </span>
  );
}

// ---- ScoreBadge ----
export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : score >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : score >= 40 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border', color)}>
      {score}% match
    </span>
  );
}