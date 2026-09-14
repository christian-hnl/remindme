import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseNaturalLanguage } from '@/lib/nlp-parser';

export async function POST(req: Request) {
  try {
    const { input } = await req.json();
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input string is required' }, { status: 400 });
    }

    const intent = parseNaturalLanguage(input);
    if (!intent) {
      return NextResponse.json({ error: 'Could not parse input' }, { status: 400 });
    }

    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (intent.type === 'task') {
      let subjectId: string | null = null;
      if (intent.subjectName) {
        let subj = await db.subject.findFirst({
          where: { name: { equals: intent.subjectName } },
        });
        if (!subj) {
          subj = await db.subject.create({
            data: {
              userId: user.id,
              name: intent.subjectName,
              colorHex: '#6366F1',
            },
          });
        }
        subjectId = subj.id;
      }

      const task = await db.task.create({
        data: {
          userId: user.id,
          subjectId,
          title: intent.title,
          dueDate: new Date(intent.dueDate),
          estimatedMinutes: intent.estimatedMinutes,
          priority: intent.priority,
          status: 'backlog',
        },
        include: { subject: true },
      });

      return NextResponse.json({
        type: 'task',
        message: `Aufgabe "${task.title}" angelegt (${task.estimatedMinutes}m, Prio: ${task.priority})`,
        data: task,
      });
    }

    if (intent.type === 'transaction') {
      const tx = await db.transaction.create({
        data: {
          userId: user.id,
          title: intent.title,
          amount: intent.txType === 'expense' ? -Math.abs(intent.amount) : Math.abs(intent.amount),
          category: intent.category,
          type: intent.txType,
          isRecurring: false,
          transactionDate: new Date(),
        },
      });

      return NextResponse.json({
        type: 'transaction',
        message: `${intent.txType === 'income' ? 'Einnahme' : 'Ausgabe'} "${tx.title}" (${Math.abs(tx.amount).toFixed(2)} €) erfasst`,
        data: tx,
      });
    }

    if (intent.type === 'deposit') {
      // Find pot by name or fallback to first pot
      const pots = await db.savingsPot.findMany({ where: { userId: user.id, isArchived: false } });
      const targetPot =
        pots.find((p) => p.name.toLowerCase().includes(intent.potName.toLowerCase())) ||
        pots[0];

      if (!targetPot) {
        return NextResponse.json({ error: 'Kein Spartopf gefunden' }, { status: 404 });
      }

      const newAmount = targetPot.currentAmount + intent.amount;
      const [updatedPot, tx] = await db.$transaction([
        db.savingsPot.update({
          where: { id: targetPot.id },
          data: { currentAmount: newAmount },
        }),
        db.transaction.create({
          data: {
            userId: user.id,
            savingsPotId: targetPot.id,
            title: `Einzahlung: ${targetPot.name}`,
            amount: -intent.amount,
            category: 'Sparen',
            type: 'transfer_to_pot',
            transactionDate: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        type: 'deposit',
        message: `${intent.amount.toFixed(2)} € in "${updatedPot.name}" eingezahlt!`,
        data: { pot: updatedPot, transaction: tx },
      });
    }

    return NextResponse.json({ error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('Quick add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
