'use client';

import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

/** Toolbar of the print view; with `?autoprint=1` the print dialog opens right away. */
export function PrintButton({ autoprint }: { autoprint: boolean }) {
  useEffect(() => {
    if (!autoprint) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [autoprint]);

  return (
    <div className="print-hide sticky top-0 z-10 flex items-center gap-2 border-b border-line/10 bg-paper/90 px-4 py-3 backdrop-blur-md">
      <a href="/" className="btn-ghost h-9 px-3">
        <ArrowLeft className="h-4 w-4" /> LifeTracker
      </a>
      <p className="ml-auto hidden text-[13px] text-ink-3 sm:block">Tipp: Im Druckdialog „Als PDF speichern“ wählen.</p>
      <button type="button" onClick={() => window.print()} className="btn-primary">
        <Printer className="h-4 w-4" /> Drucken / PDF
      </button>
    </div>
  );
}
