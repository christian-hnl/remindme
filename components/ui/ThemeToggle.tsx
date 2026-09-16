'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('lifetracker:theme', next);
    } catch {
      // Storage unavailable – the theme still applies for this visit.
    }
    setTheme(next);
  };

  const label = theme === 'dark' ? 'Tagmodus (Rechenpapier)' : 'Nachtmodus (Blaupause)';

  return (
    <button type="button" onClick={toggle} className={`icon-btn ${className}`} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
    </button>
  );
}
