'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { companiesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Props { onClose: () => void; onCreated: () => void; }

export default function AddCompanyModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '', website: '', linkedinUrl: '', industry: '',
    size: '', location: '', notes: '',
  });
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function addTech() {
    const t = techInput.trim();
    if (t && !techStack.includes(t)) setTechStack(p => [...p, t]);
    setTechInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error('Company name is required');
    setLoading(true);
    try {
      await companiesApi.create({ ...form, techStack });
      toast.success('Company added!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="card gradient-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Add Company</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="Darwinbox" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Industry</label>
              <input value={form.industry} onChange={set('industry')} placeholder="SaaS / Fintech" className="input" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Size</label>
              <select value={form.size} onChange={set('size')} className="input">
                <option value="">Select</option>
                {['1-10','11-50','51-200','201-500','500-1000','1000+'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Location</label>
            <input value={form.location} onChange={set('location')} placeholder="Hyderabad / Remote" className="input" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Website</label>
            <input value={form.website} onChange={set('website')} placeholder="https://company.com" className="input" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">LinkedIn</label>
            <input value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/company/..." className="input" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tech Stack</label>
            <div className="flex gap-2 mb-2">
              <input
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())}
                placeholder="React, Node.js..."
                className="input flex-1"
              />
              <button type="button" onClick={addTech} className="btn-secondary px-3">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {techStack.map(t => (
                <span key={t} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md text-xs">
                  {t}
                  <button type="button" onClick={() => setTechStack(p => p.filter(x => x !== t))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className={cn('btn-primary flex-1 justify-center', loading && 'opacity-60')}>
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}