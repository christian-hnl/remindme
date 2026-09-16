import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { createTask } from '@/lib/tasks';
import { parseNaturalLanguage } from '@/lib/nlp-parser';
import { jsonError, readJson, serverError } from '@/lib/api';

const PRIORITY_LABELS: Record<string, string> = { urgent: 'Prio 1', high: 'Prio 2', medium: 'Prio 3', low: 'Prio 4' };

export async function POST(req: Request) {
  try {
    const { input } = await readJson(req);
    if (!input || typeof input !== 'string') return jsonError('Bitte einen Befehl eingeben');

    const intent = parseNaturalLanguage(input);
    if (!intent) return jsonError('Eingabe konnte nicht interpretiert werden');

    const user = await getCurrentUser();

    if (intent.type === 'task') {
      const task = await createTask(user.id, {
        title: intent.title,
        dueDate: new Date(intent.dueDate),
        estimatedMinutes: intent.estimatedMinutes,
        priority: intent.priority,
        subjectName: intent.subjectName,
      });
      return NextResponse.json({
        type: 'task',
        message: `Aufgabe „${task.title}“ angelegt (${task.estimatedMinutes} min, ${PRIORITY_LABELS[task.priority]})`,
        data: task,
      });
    }

    if (intent.type === 'transaction') {
      const tx = await db.transaction.create({
        data: {
          userId: user.id,
          title: intent.title,
          amount: intent.txType === 'expense' ? -intent.amount : intent.amount,
          category: intent.category,
          type: intent.txType,
        },
      });
      return NextResponse.json({
        type: 'transaction',
        message: `${intent.txType === 'income' ? 'Einnahme' : 'Ausgabe'} „${tx.title}“ (${intent.amount.toFixed(2)} €) erfasst`,
        data: tx,
      });
    }

    const pots = await db.savingsPot.findMany({ where: { userId: user.id, isArchived: false } });
    const needle = intent.potName.toLowerCase();
    const targetPot = needle
      ? pots.find((p) => p.name.toLowerCase().includes(needle) || needle.includes(p.name.toLowerCase()))
      : pots.length === 1
      ? pots[0]
      : undefined;

    if (!targetPot) {
      const names = pots.map((p) => `„${p.name}“`).join(', ');
      return jsonError(
        pots.length
          ? `Kein passender Spartopf${intent.potName ? ` für „${intent.potName}“` : ''} gefunden. Verfügbar: ${names}`
          : 'Du hast noch keinen Spartopf angelegt.',
        404
      );
    }

    const [pot, tx] = await db.$transaction([
      db.savingsPot.update({ where: { id: targetPot.id }, data: { currentAmount: { increment: intent.amount } } }),
      db.transaction.create({
        data: {
          userId: user.id,
          savingsPotId: targetPot.id,
          title: `Einzahlung: ${targetPot.name}`,
          amount: -intent.amount,
          category: 'Sparen',
          type: 'transfer_to_pot',
        },
      }),
    ]);

    return NextResponse.json({
      type: 'deposit',
      message: `${intent.amount.toFixed(2)} € in „${pot.name}“ eingezahlt`,
      data: { pot, transaction: tx },
    });
  } catch (error) {
    return serverError('POST /quick-add', error);
  }
}
