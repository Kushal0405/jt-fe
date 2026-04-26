import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Stage } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min?: number, max?: number, currency = 'INR') {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) =>
    currency === 'INR'
      ? `₹${n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString()}`
      : `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

export function formatDate(date?: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
}

export function timeAgo(date?: string) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const STAGE_META: Record<Stage, { label: string; color: string; bg: string }> = {
  saved:     { label: 'Saved',      color: 'text-slate-400',   bg: 'bg-slate-500/10' },
  applied:   { label: 'Applied',    color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  screening: { label: 'Screening',  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  interview: { label: 'Interview',  color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  offer:     { label: 'Offer',      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  rejected:  { label: 'Rejected',   color: 'text-red-400',     bg: 'bg-red-500/10' },
  withdrawn: { label: 'Withdrawn',  color: 'text-slate-500',   bg: 'bg-slate-500/10' },
};

export const STAGES: Stage[] = ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

export function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}