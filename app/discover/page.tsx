'use client';
import { useEffect, useState } from 'react';
import { Search, MapPin, ExternalLink, BookmarkPlus, Check, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, Spinner, SkillTag } from '@/app/components/ui';
import { discoveredJobsApi, resumeApi } from '@/lib/api';
import { useATSScore } from '@/app/hooks/useATSScore';
import { DiscoveredJob } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Compass } from 'lucide-react';

const LIMIT = 18;

export default function DiscoverPage() {
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [debouncedRole, setDebouncedRole] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [minATSScore, setMinATSScore] = useState(0);
  const [page, setPage] = useState(1);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => { const t = setTimeout(() => setDebouncedRole(role), 400); return () => clearTimeout(t); }, [role]);
  useEffect(() => { const t = setTimeout(() => setDebouncedLocation(location), 400); return () => clearTimeout(t); }, [location]);
  useEffect(() => { setPage(1); }, [debouncedRole, debouncedLocation]);

  // When the user types a role, pass it as ?q= for a live JSearch query.
  // Without a role filter, fall back to the DB-backed list.
  const isLiveSearch = !!debouncedRole.trim();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['discovered-jobs', { page, role: debouncedRole, location: debouncedLocation }],
    queryFn: () =>
      discoveredJobsApi.list({
        q: isLiveSearch ? debouncedRole : undefined,
        role: !isLiveSearch ? debouncedRole || undefined : undefined,
        location: debouncedLocation || undefined,
        page,
        limit: LIMIT,
      }).then(r => r.data),
    staleTime: isLiveSearch ? 60_000 : 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const { data: cvData } = useQuery({
    queryKey: ['my-cv-text'],
    queryFn: () => resumeApi.myText().then(r => r.data.text as string),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const userCV = cvData ?? '';
  const hasCV = !!userCV.trim();

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const isLive = data?.live ?? false;

  return (
    <AppLayout>
      <PageHeader
        title="Discover Jobs"
        subtitle={isLive ? `${total} live results from JSearch` : `${total} saved listings`}
        action={
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['discovered-jobs'] })}
            disabled={isFetching}
            className="btn-secondary px-3 py-2"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
        }
      />

      {/* No-CV warning */}
      {!hasCV && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>ATS scores are hidden — no default resume found.</span>
          <Link href="/resume" className="ml-auto text-xs font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap">
            Upload resume →
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Role or title..."
            className="input pl-9 w-full"
          />
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location..."
            className="input pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Min ATS</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minATSScore}
            onChange={e => setMinATSScore(Number(e.target.value))}
            className="w-24 accent-primary"
          />
          <span className="text-xs font-medium text-foreground w-8">{minATSScore}%</span>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No jobs discovered yet"
          description="Jobs are fetched daily at 8:30 AM IST. Check back soon."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <DiscoveredJobCard
              key={job._id}
              job={job}
              userCV={userCV}
              hasCV={hasCV}
              minATSScore={minATSScore}
              isAdded={addedIds.has(job._id)}
              onAdded={() => setAddedIds(prev => { const n = new Set(prev); n.add(job._id); return n; })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >Prev</button>
          <span className="px-3 py-1.5 text-xs text-muted-foreground">Page {page} of {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >Next</button>
        </div>
      )}
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

function ATSScoreRing({ score, loading }: { score: number | null; loading: boolean }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const pct = score ?? 0;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 71 ? '#10b981' : pct >= 41 ? '#f59e0b' : '#ef4444';

  if (loading) return <div className="w-12 h-12 rounded-full bg-secondary animate-pulse shrink-0" />;
  if (score === null) return <div className="w-12 h-12 rounded-full bg-secondary/50 border border-border shrink-0 flex items-center justify-center"><span className="text-[9px] text-muted-foreground">ATS</span></div>;

  return (
    <div className="relative w-12 h-12 shrink-0" title={`ATS Match: ${score}%`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-secondary" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold leading-none" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

function DiscoveredJobCard({
  job, userCV, hasCV, minATSScore, isAdded, onAdded,
}: {
  job: DiscoveredJob;
  userCV: string;
  hasCV: boolean;
  minATSScore: number;
  isAdded: boolean;
  onAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { ref, score, matchedKeywords, missingKeywords, isLoading: atsLoading } =
    useATSScore(job.description, userCV);

  const addMutation = useMutation({
    mutationFn: () => discoveredJobsApi.addToTracker(job._id),
    onSuccess: () => {
      toast.success('Added to your tracker!');
      onAdded();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add');
    },
  });

  // Hide card if below min ATS threshold (only once score is known)
  if (minATSScore > 0 && score !== null && score < minATSScore) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'card gradient-border p-5 hover:glow transition-all duration-300 flex flex-col gap-3',
        isAdded && 'ring-1 ring-emerald-500/30'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {(job.company || 'J')[0].toUpperCase()}
        </div>
        {hasCV
          ? <ATSScoreRing score={score} loading={atsLoading} />
          : <div className="w-12 h-12 rounded-full bg-secondary/40 border border-border shrink-0 flex items-center justify-center" title="Upload a resume to see ATS score"><span className="text-[9px] text-muted-foreground">N/A</span></div>
        }
      </div>

      {/* Title + company */}
      <div>
        <h3 className="font-semibold text-foreground text-sm leading-snug mb-0.5">{job.title}</h3>
        <p className="text-xs text-muted-foreground">{job.company}</p>
      </div>

      {/* Location + source badge */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {job.location}
          </span>
        )}
        <span className="ml-auto px-2 py-0.5 rounded-full bg-secondary border border-border capitalize text-[10px] font-medium">
          {job.source}
        </span>
      </div>

      {/* ATS matched keywords */}
      {matchedKeywords.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Matched</p>
          <div className="flex flex-wrap gap-1">
            {matchedKeywords.slice(0, 3).map(kw => (
              <SkillTag key={kw} skill={kw} matched />
            ))}
          </div>
        </div>
      )}

      {/* ATS missing keywords */}
      {missingKeywords.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Missing from CV</p>
          <div className="flex flex-wrap gap-1">
            {missingKeywords.slice(0, 3).map(kw => (
              <span key={kw} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable JD */}
      {job.description && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide JD' : 'View JD'}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-[12]">
              {job.description}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-3 border-t border-border">
        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || isAdded}
          className={cn('btn-secondary flex-1 justify-center text-xs py-1.5', isAdded && 'opacity-60 cursor-default')}
        >
          {addMutation.isPending
            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            : isAdded
              ? <><Check className="w-3 h-3" /> In Tracker</>
              : <><BookmarkPlus className="w-3 h-3" /> Add to Tracker</>}
        </button>
        {job.applyLink && (
          <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-1.5" title="Apply externally">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
