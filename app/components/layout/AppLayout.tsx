'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}