import { Priority } from "@/types";

export interface ParsedTask {
  type: 'task';
  title: string;
  subjectName?: string;
  dueDate: string;
  estimatedMinutes: number;
  priority: Priority;
}

export interface ParsedTransaction {
  type: 'transaction';
  title: string;
  amount: number;
  category: string;
  txType: 'expense' | 'income';
}

export interface ParsedDeposit {
  type: 'deposit';
  amount: number;
  potName: string;
}

export type ParsedIntent = ParsedTask | ParsedTransaction | ParsedDeposit;

export function parseNaturalLanguage(input: string): ParsedIntent | null {
  const text = input.trim();
  if (!text) return null;

  // Check for Money/Transaction pattern: e.g. "15€ Döner", "4,50 € Bäcker", "+1200€ Gehalt", "25€ in MacBook sparen"
  const moneyMatch = text.match(/([+-]?\d+(?:[.,]\d{1,2})?)\s*€/i) || text.match(/€\s*(\d+(?:[.,]\d{1,2})?)/i);

  if (moneyMatch) {
    const rawAmount = moneyMatch[1].replace(',', '.');
    const amountVal = Math.abs(parseFloat(rawAmount));
    const isExplicitIncome = text.includes('+') || text.toLowerCase().includes('gehalt') || text.toLowerCase().includes('einnahme');
    
    // Check if it's a deposit into a savings pot: "sparen", "einzahlen", "in MacBook"
    if (text.toLowerCase().includes('spar') || text.toLowerCase().includes('einzahl') || text.toLowerCase().includes('in ')) {
      const potMatch = text.match(/(?:in|für)\s+([a-zA-Z0-9äöüÄÖÜ\s-]+?)(?:\s+spar|\s+einzahl|$)/i);
      const potName = potMatch ? potMatch[1].trim() : "MacBook";
      return {
        type: 'deposit',
        amount: amountVal,
        potName: potName || "MacBook",
      };
    }

    // Otherwise it's a regular transaction
    let desc = text.replace(moneyMatch[0], '').replace(/\b(bar|karte|ausgabe|einnahme)\b/gi, '').trim();
    if (!desc) desc = isExplicitIncome ? "Einnahme" : "Ausgabe";

    // Auto-detect category
    let category = "Sonstiges";
    const lower = text.toLowerCase();
    if (lower.includes('döner') || lower.includes('bäcker') || lower.includes('supermarkt') || lower.includes('essen') || lower.includes('rewe') || lower.includes('edeka')) {
      category = "Lebensmittel";
    } else if (lower.includes('ticket') || lower.includes('bahn') || lower.includes('bus') || lower.includes('tanken')) {
      category = "Transport";
    } else if (lower.includes('kaffee') || lower.includes('bar') || lower.includes('kino') || lower.includes('bier')) {
      category = "Freizeit";
    } else if (lower.includes('buch') || lower.includes('kurs') || lower.includes('uni')) {
      category = "Bildung";
    } else if (isExplicitIncome) {
      category = "Einkommen";
    }

    return {
      type: 'transaction',
      title: desc.charAt(0).toUpperCase() + desc.slice(1),
      amount: amountVal,
      category,
      txType: isExplicitIncome ? 'income' : 'expense',
    };
  }

  // Otherwise assume it's a Task (Hausaufgabe / Uni / Todo)
  const lowerText = text.toLowerCase();

  // 1. Detect Subject
  const knownSubjects = ['mathe', 'mathematik', 'physik', 'informatik', 'info', 'bwl', 'vwl', 'latein', 'deutsch', 'englisch', 'chemie', 'biologie', 'geschichte'];
  let subjectName: string | undefined;
  for (const s of knownSubjects) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(lowerText)) {
      subjectName = s.charAt(0).toUpperCase() + s.slice(1);
      if (subjectName === 'Info') subjectName = 'Informatik';
      break;
    }
  }

  // 2. Detect Priority
  let priority: Priority = 'medium';
  if (/prio\s*1|dringend|urgent|sofort|wichtig/i.test(lowerText)) {
    priority = 'urgent';
  } else if (/prio\s*2|hoch|high/i.test(lowerText)) {
    priority = 'high';
  } else if (/prio\s*4|niedrig|low/i.test(lowerText)) {
    priority = 'low';
  }

  // 3. Detect Estimated Duration
  let estimatedMinutes = 30;
  const timeMatch = text.match(/(\d+)\s*(?:min|m|h|std|stunden)/i);
  if (timeMatch) {
    const val = parseInt(timeMatch[1], 10);
    if (/h|std/i.test(timeMatch[0])) {
      estimatedMinutes = val * 60;
    } else {
      estimatedMinutes = val;
    }
  }

  // 4. Detect Due Date
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(18, 0, 0, 0); // default 18:00

  // Check specific time (e.g. 14:00 or 14 Uhr)
  const hourMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?/i);
  if (hourMatch && !text.includes('min')) {
    const h = parseInt(hourMatch[1], 10);
    const m = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    if (h >= 0 && h <= 24) {
      targetDate.setHours(h, m, 0, 0);
    }
  }

  if (lowerText.includes('heute')) {
    // today
  } else if (lowerText.includes('morgen')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lowerText.includes('übermorgen')) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else {
    // Days of week: montag, dienstag, mittwoch, donnerstag, freitag, samstag, sonntag
    const days = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(days[i])) {
        const currentDay = now.getDay();
        let diff = i - currentDay;
        if (diff <= 0) diff += 7;
        targetDate.setDate(now.getDate() + diff);
        break;
      }
    }
  }

  // Clean title by stripping keywords
  let cleanTitle = text
    .replace(/\b(bis\s+(?:heute|morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag))\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*uhr\b/gi, '')
    .replace(/\b\d+\s*(?:min|m|std|h)\b/gi, '')
    .replace(/\bprio\s*[1-4]\b/gi, '')
    .replace(/\b(dringend|urgent|sofort)\b/gi, '')
    .trim();

  // Remove leading subject name if duplicate
  if (subjectName && cleanTitle.toLowerCase().startsWith(subjectName.toLowerCase())) {
    cleanTitle = cleanTitle.substring(subjectName.length).replace(/^[-:\s]+/, '').trim();
  }

  if (!cleanTitle) {
    cleanTitle = subjectName ? `${subjectName} Aufgabe` : "Neue Aufgabe";
  }

  return {
    type: 'task',
    title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
    subjectName,
    dueDate: targetDate.toISOString(),
    estimatedMinutes,
    priority,
  };
}
