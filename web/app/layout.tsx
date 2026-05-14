import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AiCoche | AI Career Coach',
  description: 'AI-powered CV analysis, mock interviews, quizzes, and career profile coaching.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /** Lets the page reflow when the mobile keyboard opens so inputs stay reachable (Chrome / supporting browsers). */
  interactiveWidget: 'resizes-content',
  themeColor: '#0A0A14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
