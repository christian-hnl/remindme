'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface CheckButtonProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

/** Round tick box with an enlarged touch target (44px) around the 22px circle. */
export function CheckButton({ checked, onChange, label, className = '' }: CheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={`relative flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-all before:absolute before:-inset-[11px] before:content-[''] active:scale-90 ${
        checked
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line/30 text-transparent hover:border-accent hover:text-accent/70'
      } ${className}`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
    </button>
  );
}
