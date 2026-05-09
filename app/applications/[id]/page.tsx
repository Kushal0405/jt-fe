'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Briefcase, MapPin, DollarSign, Calendar, User,
  Mail, ChevronDown, FileText, MessageSquare, Clock,
} from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { Spinner, SkillTag, StageBadge } from '@/app/components/ui';
import { applicationsApi } from '@/lib/api';
import { Application, Stage } from '@/types';
import { STAGES, STAGE_META, formatDate, formatSalary, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageOpen, setStageOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await applicationsApi.get(id);
      setApp(data.application);
    } catch {
      toast.error('Failed to load application');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function changeStage(stage: Stage) {
    if (!app) return;
    setUpdating(true);
    setStageOpen(false);
    try {
      const { data } = await applicationsApi.updateStage(app._id, stage);
      setApp(data.application);
      toast.success(`Moved to ${STAGE_META[stage].label}`);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20"><Spinner /></div>
      </AppLayout>
    );
  }

  if (!app) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Application not found.</div>
      </AppLayout>
    );
  }

  const snap = app.jobSnapshot;
  const title = snap?.title ?? app.job?.title ?? 'Untitled';
  const company = snap?.companyName ?? app.job?.companyName ?? '—';
  const location = snap?.location ?? app.job?.location;
  const salaryMin = snap?.salaryMin ?? app.job?.salaryMin;
  const salaryMax = snap?.salaryMax ?? app.job?.salaryMax;

  return (
    <AppLayout>
      {/* Back nav */}
      <div className="mb-6">
        <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Applications
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header card */}
          <div className="card gradient-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shrink-0">
                {company[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{company}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {location}
                    </span>
                  )}
                  {(salaryMin || salaryMax) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {formatSalary(salaryMin, salaryMax)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Added {formatDate(app.createdAt)}
                  </span>
                </div>
              </div>

              {/* Stage selector */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setStageOpen(v => !v)}
                  disabled={updating}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                    STAGE_META[app.stage].bg, STAGE_META[app.stage].color, 'border-current/20'
                  )}
                >
                  {updating
                    ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    : STAGE_META[app.stage].label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {stageOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 card border border-border shadow-xl min-w-[150px] py-1">
                    {STAGES.map(s => (
                      <button
                        key={s}
                        onClick={() => changeStage(s)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors',
                          STAGE_META[s].color,
                          s === app.stage && 'bg-secondary'
                        )}
                      >
                        {STAGE_META[s].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Skills from job */}
            {app.job?.skills && app.job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                {app.job.skills.map(s => <SkillTag key={s} skill={s} />)}
              </div>
            )}
          </div>

          {/* Notes */}
          {app.notes && (
            <div className="card gradient-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" /> Notes
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.notes}</p>
            </div>
          )}

          {/* Cover letter */}
          {app.coverLetter && (
            <div className="card gradient-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" /> Cover Letter
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.coverLetter}</p>
            </div>
          )}

          {/* Activity timeline */}
          {app.activity && app.activity.length > 0 && (
            <div className="card gradient-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" /> Activity
              </h2>
              <ol className="relative border-l border-border space-y-4 pl-4">
                {[...app.activity].reverse().map((act, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full border-2 border-primary bg-background" />
                    <div className="flex items-center gap-2">
                      <StageBadge stage={act.stage} />
                      <span className="text-xs text-muted-foreground">{formatDate(act.createdAt)}</span>
                    </div>
                    {act.note && <p className="text-xs text-muted-foreground mt-1">{act.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-5">
          {/* Dates */}
          <div className="card gradient-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Details</h2>
            <dl className="space-y-3 text-xs">
              {app.appliedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Applied</dt>
                  <dd className="text-foreground font-medium">{formatDate(app.appliedAt)}</dd>
                </div>
              )}
              {app.followUpAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Follow-up</dt>
                  <dd className="text-foreground font-medium">{formatDate(app.followUpAt)}</dd>
                </div>
              )}
              {app.matchScore !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Match score</dt>
                  <dd className="font-bold text-primary">{app.matchScore}%</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="text-foreground font-medium">{formatDate(app.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Recruiter */}
          {(app.recruiterName || app.recruiterEmail) && (
            <div className="card gradient-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Recruiter
              </h2>
              <dl className="space-y-2 text-xs">
                {app.recruiterName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="text-foreground">{app.recruiterName}</span>
                  </div>
                )}
                {app.recruiterEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <a href={`mailto:${app.recruiterEmail}`} className="text-primary hover:underline truncate">
                      {app.recruiterEmail}
                    </a>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Resume */}
          {app.resume && (
            <div className="card gradient-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Resume Used
              </h2>
              <p className="text-xs font-medium text-foreground">{app.resume.label}</p>
              {app.resume.currentRole && (
                <p className="text-xs text-muted-foreground mt-0.5">{app.resume.currentRole}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
