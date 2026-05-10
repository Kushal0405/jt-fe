import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from "@vercel/analytics/next"
import QueryProvider from '@/app/components/QueryProvider';
import ThemeProvider from '@/app/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobTrack — Your Job Search Command Center',
  description: 'Track applications, match your resume to jobs, and land your next role.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <ThemeProvider>
            <QueryProvider>
              {children}
              <SpeedInsights />
              <Analytics />
            </QueryProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: '!bg-card !text-foreground !border !border-border !rounded-[10px] !text-sm',
              }}
            />
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}