import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobTrack — Your Job Search Command Center',
  description: 'Track applications, match your resume to jobs, and land your next role.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(224 18% 9%)',
              color: 'hsl(210 20% 96%)',
              border: '1px solid hsl(224 15% 14%)',
              borderRadius: '10px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}