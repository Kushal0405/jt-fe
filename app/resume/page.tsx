'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Star, Trash2, CheckCircle, Loader } from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, Spinner, SkillTag } from '@/app/components/ui';
import { resumeApi } from '@/lib/api';
import { Resume } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const { data } = await resumeApi.list();
      setResumes(data.resumes);
    } catch { toast.error('Failed to load resumes'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = file.name.replace(/\.[^/.]+$/, '');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      fd.append('label', label);
      await resumeApi.upload(fd);
      toast.success('Resume uploaded and parsed!');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function setDefault(id: string) {
    try {
      await resumeApi.setDefault(id);
      toast.success('Default resume updated');
      load();
    } catch { toast.error('Failed'); }
  }

  async function deleteResume(id: string) {
    try {
      await resumeApi.delete(id);
      toast.success('Resume deleted');
      load();
    } catch { toast.error('Failed'); }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Resume"
        subtitle="Upload and manage your resume versions"
        action={
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
            {uploading
              ? <><Loader className="w-4 h-4 animate-spin" /> Parsing...</>
              : <><Upload className="w-4 h-4" /> Upload Resume</>}
          </button>
        }
      />

      <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} />

      {/* Upload drop zone */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed border-border rounded-lg p-10 text-center mb-8 transition-all cursor-pointer',
          uploading ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-primary/5'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-muted-foreground">Parsing your resume with AI...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Drop your resume here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PDF or DOCX · Max 5MB</p>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Upload your resume to enable AI-powered job matching"
        />
      ) : (
        <div className="space-y-4">
          {resumes.map(resume => (
            <div key={resume._id} className={cn(
              'card gradient-border p-5 transition-all duration-300',
              resume.isDefault && 'border-primary/30 glow'
            )}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-foreground">{resume.label}</h3>
                    {resume.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {resume.fileType.toUpperCase()} · Uploaded {formatDate(resume.createdAt)}
                    {resume.experienceYears ? ` · ${resume.experienceYears} yrs exp` : ''}
                    {resume.currentRole ? ` · ${resume.currentRole}` : ''}
                  </p>

                  {resume.summary && (
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{resume.summary}</p>
                  )}

                  {resume.skills && resume.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {resume.skills.map(s => <SkillTag key={s} skill={s} />)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!resume.isDefault && (
                    <button
                      onClick={() => setDefault(resume._id)}
                      className="btn-ghost text-xs py-1.5"
                    >
                      <Star className="w-3 h-3" /> Set default
                    </button>
                  )}
                  <button
                    onClick={() => deleteResume(resume._id)}
                    className="btn-ghost text-xs py-1.5 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}