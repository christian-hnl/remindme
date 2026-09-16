'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  bodyClassName?: string;
  children: React.ReactNode;
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' };

// Stack of open modals, so Escape only closes the topmost one.
const openModals: string[] = [];

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  bodyClassName = 'p-5 sm:p-6',
  children,
}: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    openModals.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === id) {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const frame = requestAnimationFrame(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, id]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(6_12_26/0.5)] backdrop-blur-[3px] animate-in sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`flex max-h-[94dvh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-t-[20px] border border-line/10 bg-sheet shadow-lift outline-none animate-in slide-up sm:max-h-[88vh] sm:rounded-[16px]`}
      >
        <div className="mx-auto mt-2 h-1 w-10 flex-shrink-0 rounded-full bg-line/20 sm:hidden" aria-hidden />
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line/10 px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-inset text-ink-2">{icon}</div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-display text-[22px] font-semibold leading-tight text-ink">{title}</h3>
              {subtitle && <p className="truncate text-[13px] text-ink-3">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="icon-btn -mr-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
