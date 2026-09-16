import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible, Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const bodyFont = Atkinson_Hyperlegible({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

const displayFont = Barlow_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LifeTracker',
  description: 'Stundenplan, Hausübungen, Erinnerungen, Notizen und Geld – dein Schulalltag auf einen Blick.',
  appleWebApp: { capable: true, title: 'LifeTracker', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EBEFF4' },
    { media: '(prefers-color-scheme: dark)', color: '#0B182C' },
  ],
};

// Runs before first paint so the saved theme never flashes.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('lifetracker:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans text-[15px] antialiased">{children}</body>
    </html>
  );
}
