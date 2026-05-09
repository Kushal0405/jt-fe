'use client';
import { useState } from 'react';
import { X, Plus, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { jobsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Props { onClose: () => void; onCreated: () => void; }

export default function AddJobModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '', companyName: '', location: '', locationType: 'remote',
    salaryMin: '', salaryMax: '', experienceMin: '', experienceMax: '',
    description: '', jdUrl: '', source: 'manual',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  // JD parse state
  const [jdOpen, setJdOpen] = useState(false);
  const [jdText, setJdText] = useState('');
  const [parsing, setParsing] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  }

  async function parseJD() {
    if (!jdText.trim()) return toast.error('Paste a job description first');
    setParsing(true);
    try {
      const { data } = await jobsApi.parseJd(jdText);
      const p = data.parsed;
      setForm(f => ({
        ...f,
        title: p.title || f.title,
        companyName: p.companyName || f.companyName,
        location: p.location || f.location,
        locationType: p.locationType || f.locationType,
        salaryMin: p.salaryMin != null ? String(p.salaryMin) : f.salaryMin,
        salaryMax: p.salaryMax != null ? String(p.salaryMax) : f.salaryMax,
        experienceMin: p.experienceMin != null ? String(p.experienceMin) : f.experienceMin,
        experienceMax: p.experienceMax != null ? String(p.experienceMax) : f.experienceMax,
        description: p.description || f.description,
      }));
      if (p.skills?.length) setSkills(p.skills);
      toast.success('Fields auto-filled from JD!');
      setJdOpen(false);
      setJdText('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Parsing failed');
    } finally { setParsing(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.companyName) return toast.error('Title and company are required');
    setLoading(true);
    try {
      await jobsApi.create({
        ...form,
        skills,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        experienceMin: form.experienceMin ? Number(form.experienceMin) : undefined,
        experienceMax: form.experienceMax ? Number(form.experienceMax) : undefined,
      });
      toast.success('Job added!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add job');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="card gradient-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Add Job</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        {/* ── JD Auto-fill panel ── */}
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setJdOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Auto-fill from Job Description (AI)
            </span>
            {jdOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {jdOpen && (
            <div className="px-5 pb-4 space-y-2">
              <p className="text-[11px] text-muted-foreground">Paste the full job description below. AI will extract title, company, skills, salary, and more.</p>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                rows={6}
                placeholder="Paste the job description here…"
                className="input resize-none text-xs"
              />
              <button
                type="button"
                onClick={parseJD}
                disabled={parsing || !jdText.trim()}
                className={cn('btn-primary w-full justify-center text-xs py-2', (parsing || !jdText.trim()) && 'opacity-60')}
              >
                {parsing
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Parsing…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Auto-fill Fields</>}
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Job Title *</label>
              <input value={form.title} onChange={set('title')} placeholder="Senior Frontend Developer" className="input" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Company *</label>
              <input value={form.companyName} onChange={set('companyName')} placeholder="Razorpay" className="input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Location</label>
              <input value={form.location} onChange={set('location')} placeholder="Hyderabad / Remote" className="input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
              <select value={form.locationType} onChange={set('locationType')} className="input">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Min Salary (₹)</label>
              <input value={form.salaryMin} onChange={set('salaryMin')} type="number" placeholder="900000" className="input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Max Salary (₹)</label>
              <input value={form.salaryMax} onChange={set('salaryMax')} type="number" placeholder="1500000" className="input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Min Exp (yrs)</label>
              <input value={form.experienceMin} onChange={set('experienceMin')} type="number" placeholder="3" className="input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Max Exp (yrs)</label>
              <input value={form.experienceMax} onChange={set('experienceMax')} type="number" placeholder="6" className="input" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">JD URL</label>
              <input value={form.jdUrl} onChange={set('jdUrl')} placeholder="https://jobs.razorpay.com/..." className="input" />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Skills</label>
            <div className="flex gap-2 mb-2">
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="React, TypeScript..."
                className="input flex-1"
              />
              <button type="button" onClick={addSkill} className="btn-secondary px-3">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md text-xs">
                    {s}
                    <button type="button" onClick={() => setSkills(prev => prev.filter(x => x !== s))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Role overview, responsibilities..."
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className={cn('btn-primary flex-1 justify-center', loading && 'opacity-60')}>
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}