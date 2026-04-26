'use client';
import { useEffect, useState } from 'react';
import { Building2, Plus, Globe, Star, StarOff, ExternalLink } from 'lucide-react';
import AppLayout from '@/app/components/layout/AppLayout';
import { PageHeader, EmptyState, Spinner } from '@/app/components/ui';
import { companiesApi } from '@/lib/api';
import { Company } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import AddCompanyModal from '@/app/components/companies/AddCompanyModal';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'targeted'>('all');

  async function load() {
    setLoading(true);
    try {
      const params = filter === 'targeted' ? { targeted: 'true' } : undefined;
      const { data } = await companiesApi.list(params);
      setCompanies(data.companies);
    } catch { toast.error('Failed to load companies'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function toggleTarget(company: Company) {
    try {
      await companiesApi.toggleTarget(company._id);
      toast.success(company.isTargeted ? 'Removed from targets' : 'Added to targets!');
      load();
    } catch { toast.error('Failed to update'); }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Companies"
        subtitle="Track and target companies you want to work at"
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Company
          </button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-1 bg-secondary border border-border rounded-md p-1 w-fit mb-6">
        {(['all', 'targeted'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded text-xs font-medium capitalize transition-all',
              filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'targeted' ? '⭐ Targeted' : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Add companies you want to target in your job search"
          action={<button onClick={() => setShowAdd(true)} className="btn-primary">Add Company</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map(company => (
            <div key={company._id} className="card gradient-border p-5 hover:glow transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {company.name[0]}
                </div>
                <button
                  onClick={() => toggleTarget(company)}
                  className={cn('p-1.5 rounded-md transition-all', company.isTargeted ? 'text-amber-400 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-secondary')}
                >
                  {company.isTargeted ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                </button>
              </div>

              <h3 className="font-semibold text-foreground mb-0.5">{company.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{company.industry} · {company.size} employees</p>

              {company.location && (
                <p className="text-xs text-muted-foreground mb-3">📍 {company.location}</p>
              )}

              {company.techStack && company.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {company.techStack.slice(0, 4).map(t => (
                    <span key={t} className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-md text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-border">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="btn-ghost text-xs py-1.5 flex-1 justify-center">
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
                {company.linkedinUrl && (
                  <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-ghost text-xs py-1.5 flex-1 justify-center">
                    <ExternalLink className="w-3 h-3" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddCompanyModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </AppLayout>
  );
}