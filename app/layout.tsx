import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifeTracker — All-in-One Life & Finance Dashboard',
  description:
    'Das taktile Life & Finance Dashboard: Apple & Things 3 Ästhetik kombiniert mit Linear Keyboard Shortcuts und Copilot Money Visualisierungen.',
  keywords: ['LifeTracker', 'Hausaufgaben', 'Uni', 'Finanzen', 'Spartöpfe', 'Bento Dashboard'],
  authors: [{ name: 'LifeTracker Team' }],
};

export const viewport: Viewport = {
  themeColor: '#07090E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="bg-[#07090E] text-[#F8FAFC] antialiased selection:bg-indigo-500/25">
        {children}
      </body>
    </html>
  );
}
