'use client';
import { useEffect, useState } from 'react';
import { Search, Plus, MapPin, Briefcase, Clock, ExternalLink, BookmarkPlus, Check, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, Spinner, SkillTag, ScoreBadge } from '@/app/components/ui';
import { jobsApi, applicationsApi, resumeApi } from '@/lib/api';
import { useATSScore } from '@/app/hooks/useATSScore';
import { Job } from '@/types';
import { formatSalary, timeAgo, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import AddJobModal from '@/app/components/jobs/AddJobModal';

const LOCATION_TYPES = ['all', 'remote', 'hybrid', 'onsite'];

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locType, setLocType] = useState('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, locType]);

  const jobsQueryKey = ['jobs', { page, locType, search: debouncedSearch }] as const;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: jobsQueryKey,
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (debouncedSearch) params.q = debouncedSearch;
      if (locType !== 'all') params.locationType = locType;
      const { data } = await jobsApi.list(params);
      return { jobs: data.jobs as Job[], total: data.total as number };
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;

  // Fetch the user's default resume text once for ATS scoring
  const { data: cvData } = useQuery({
    queryKey: ['my-cv-text'],
    queryFn: () => resumeApi.myText().then(r => r.data.text as string),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
  const userCV = cvData ?? '';

  // Load which jobs the current user has already saved
  useEffect(() => {
    applicationsApi.list({ limit: 1000 }).then(({ data }) => {
      setAppliedJobIds(new Set(
        data.applications
          .map((a: any) => (typeof a.job === 'string' ? a.job : a.job?._id))
          .filter(Boolean)
      ));
    }).catch(() => {/* silent */});
  }, []);

  async function handleRefetch() {
    await qc.invalidateQueries({ queryKey: ['jobs'] });
    toast.success('Jobs refreshed');
  }

  async function saveJob(job: Job) {
    setSaving(job._id);
    try {
      await applicationsApi.create({ job: job._id, stage: 'saved' });
      toast.success('Job saved to pipeline!');
      setAppliedJobIds(prev => { const next = new Set(prev); next.add(job._id); return next; });
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefetch}
              disabled={isFetching}
              className="btn-secondary px-3 py-2"
              title="Refresh jobs"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Job
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
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
      {isLoading ? (
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
            <JobCard key={job._id} job={job} onSave={() => saveJob(job)} saving={saving === job._id} isApplied={appliedJobIds.has(job._id)} userCV={userCV} />
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

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['jobs'] })} />}
    </AppLayout>
  );
}

function ATSScoreRing({ score, loading }: { score: number | null; loading: boolean }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const pct = score ?? 0;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 71 ? '#10b981' : pct >= 41 ? '#f59e0b' : '#ef4444';

  if (loading) {
    return <div className="w-12 h-12 rounded-full bg-secondary animate-pulse shrink-0" />;
  }
  if (score === null) return null;

  return (
    <div className="relative w-12 h-12 shrink-0" title={`ATS Match: ${score}%`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor"
          strokeWidth="3.5" className="text-secondary" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color}
          strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold leading-none" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

function JobCard({ job, onSave, saving, isApplied, userCV }: {
  job: Job; onSave: () => void; saving: boolean; isApplied: boolean; userCV: string;
}) {
  const { ref, score, missingKeywords, isLoading: atsLoading } =
    useATSScore(job.description ?? (job.skills?.join(' ') ?? ''), userCV);

  return (
    <div
      ref={ref}
      className={cn('card gradient-border p-5 hover:glow transition-all duration-300 flex flex-col gap-4', isApplied && 'ring-1 ring-emerald-500/30')}
    >
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
          <ATSScoreRing score={score} loading={atsLoading} />
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

      {/* ATS missing keywords */}
      {missingKeywords.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Missing from your CV</p>
          <div className="flex flex-wrap gap-1">
            {missingKeywords.slice(0, 3).map(kw => (
              <span
                key={kw}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
              >
                {kw}
              </span>
            ))}
          </div>
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