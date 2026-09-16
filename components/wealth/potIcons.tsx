import React from 'react';
import { Car, Gift, GraduationCap, Heart, Laptop, Palmtree, PiggyBank, ShieldCheck, type LucideIcon } from 'lucide-react';

export const POT_ICONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'piggy-bank', label: 'Sparen', Icon: PiggyBank },
  { id: 'laptop', label: 'Technik', Icon: Laptop },
  { id: 'palmtree', label: 'Urlaub', Icon: Palmtree },
  { id: 'shield-check', label: 'Notgroschen', Icon: ShieldCheck },
  { id: 'car', label: 'Auto', Icon: Car },
  { id: 'graduation-cap', label: 'Bildung', Icon: GraduationCap },
  { id: 'gift', label: 'Geschenk', Icon: Gift },
  { id: 'heart', label: 'Herzensziel', Icon: Heart },
];

export const POT_COLORS = ['#10B981', '#2A4BDC', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

export function PotIcon({ icon, className = 'h-4 w-4' }: { icon: string; className?: string }) {
  const Icon = POT_ICONS.find((i) => i.id === icon)?.Icon ?? PiggyBank;
  return <Icon className={className} />;
}

interface PickerProps {
  icon: string;
  colorHex: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

/** Icon and colour selection shared by the create and edit pot forms. */
export function PotAppearancePicker({ icon, colorHex, onIconChange, onColorChange }: PickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <span className="field-label">Symbol</span>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Symbol">
          {POT_ICONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={icon === id}
              onClick={() => onIconChange(id)}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[10px] border text-[12px] font-bold transition-colors ${
                icon === id ? 'border-ink bg-inset text-ink' : 'border-line/10 text-ink-3 hover:text-ink'
              }`}
            >
              <Icon className="h-5 w-5" style={icon === id ? { color: colorHex } : undefined} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="field-label">Farbe</span>
        <div className="flex items-center gap-2" role="group" aria-label="Farbe">
          {POT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              aria-pressed={colorHex === c}
              aria-label={`Farbe ${c}`}
              className={`h-9 w-9 rounded-full border-[3px] transition-transform ${colorHex === c ? 'scale-110 border-ink' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
