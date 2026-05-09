'use client';
import { useEffect, useState } from 'react';
import { Search, Plus, MapPin, Briefcase, Clock, ExternalLink, BookmarkPlus, Check } from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, Spinner, SkillTag, ScoreBadge } from '@/app/components/ui';
import { jobsApi, applicationsApi } from '@/lib/api';
import { Job } from '@/types';
import { formatSalary, timeAgo, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import AddJobModal from '@/app/components/jobs/AddJobModal';

const LOCATION_TYPES = ['all', 'remote', 'hybrid', 'onsite'];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locType, setLocType] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (search) params.q = search;
      if (locType !== 'all') params.locationType = locType;
      const { data } = await jobsApi.list(params);
      setJobs(data.jobs);
      setTotal(data.total);
    } catch { toast.error('Failed to load jobs'); }
    finally { setLoading(false); }
  }

  async function loadApplied() {
    try {
      const { data } = await applicationsApi.list({ limit: 1000 });
      setAppliedJobIds(new Set(
        data.applications
          .map((a: any) => (typeof a.job === 'string' ? a.job : a.job?._id))
          .filter(Boolean)
      ));
    } catch { /* silent — not critical */ }
  }

  useEffect(() => { load(); }, [page, locType]);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { loadApplied(); }, []);

  async function saveJob(job: Job) {
    setSaving(job._id);
    try {
      await applicationsApi.create({ job: job._id, stage: 'saved' });
      toast.success('Job saved to pipeline!');
      setAppliedJobIds(prev => new Set([...prev, job._id]));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Already saved');
    } finally { setSaving(null); }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Job Board"
        subtitle={`${total} openings matching your profile`}
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Job
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, skills, companies..."
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary border border-border rounded-md p-1">
          {LOCATION_TYPES.map(t => (
            <button
              key={t}
              onClick={() => { setLocType(t); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium capitalize transition-all',
                locType === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description="Try adjusting your filters or add a job manually"
          action={<button onClick={() => setShowAdd(true)} className="btn-primary">Add Job</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard key={job._id} job={job} onSave={() => saveJob(job)} saving={saving === job._id} isApplied={appliedJobIds.has(job._id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 12 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >Prev</button>
          <span className="px-3 py-1.5 text-xs text-muted-foreground">Page {page} of {Math.ceil(total / 12)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 12)}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >Next</button>
        </div>
      )}

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </AppLayout>
  );
}

function JobCard({ job, onSave, saving, isApplied }: { job: Job; onSave: () => void; saving: boolean; isApplied: boolean }) {
  return (
    <div className={cn('card gradient-border p-5 hover:glow transition-all duration-300 flex flex-col gap-4', isApplied && 'ring-1 ring-emerald-500/30')}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {(job.companyName ?? 'J')[0]}
        </div>
        <div className="flex items-center gap-2">
          {isApplied && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {job.matchScore !== undefined && <ScoreBadge score={job.matchScore} />}
        </div>
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold text-foreground text-sm leading-snug mb-0.5">{job.title}</h3>
        <p className="text-xs text-muted-foreground">{job.companyName}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {job.location}
          </span>
        )}
        {job.locationType && (
          <span className="capitalize bg-secondary px-2 py-0.5 rounded-full">{job.locationType}</span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" /> {timeAgo(job.postedAt)}
        </span>
      </div>

      {/* Salary */}
      <p className="text-sm font-semibold text-foreground">
        {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
      </p>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map(s => <SkillTag key={s} skill={s} />)}
          {job.skills.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">+{job.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-border">
        <button
          onClick={onSave}
          disabled={saving || isApplied}
          className={cn('btn-secondary flex-1 justify-center text-xs py-1.5', isApplied && 'opacity-60 cursor-default')}
        >
          {saving
            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            : isApplied
              ? <><Check className="w-3 h-3" /> Saved to Pipeline</>
              : <><BookmarkPlus className="w-3 h-3" /> Save</>}
        </button>
        {job.jdUrl && (
          <a href={job.jdUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-1.5">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}