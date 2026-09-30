import type { NutritionSettingsData } from './types';

/**
 * Body data the targets were derived from (18 years, male, 170 cm, 67 kg, recomposition,
 * training 3–4× a week). Weight is replaced by the latest check-in once there is one.
 */
export const PROFILE = { age: 18, heightCm: 170, weightKg: 67, sex: 'male' as const, activityFactor: 1.45 };

/** Mifflin-St Jeor resting energy and the resulting daily need. */
export function energyNeed(weightKg = PROFILE.weightKg) {
  const bmr = 10 * weightKg + 6.25 * PROFILE.heightCm - 5 * PROFILE.age + 5;
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * PROFILE.activityFactor) };
}

/** Why the targets are what they are – for the printed plan. */
export function targetReasons(settings: NutritionSettingsData, weightKg = PROFILE.weightKg) {
  const { bmr, tdee } = energyNeed(weightKg);
  const deficit = Math.round((1 - settings.kcalTarget / tdee) * 100);
  const carbsLow = Math.round((settings.kcalTarget - settings.kcalTolerance - settings.proteinMax * 4 - settings.fatMax * 9) / 4);
  const carbsHigh = Math.round((settings.kcalTarget + settings.kcalTolerance - settings.proteinMin * 4 - settings.fatMin * 9) / 4);
  const perKg = (g: number) => (g / weightKg).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return [
    {
      title: `${settings.kcalTarget.toLocaleString('de-DE')} kcal (±${settings.kcalTolerance})`,
      text: `Grundumsatz nach Mifflin-St Jeor ≈ ${bmr.toLocaleString('de-DE')} kcal (${weightKg} kg, ${PROFILE.heightCm} cm, ${PROFILE.age} J.). Mit Schulalltag und 3–4 Trainings (Faktor ${PROFILE.activityFactor.toLocaleString('de-DE')}) ergibt das ≈ ${tdee.toLocaleString('de-DE')} kcal. ${settings.kcalTarget.toLocaleString('de-DE')} kcal liegen ${deficit > 0 ? `rund ${deficit} % darunter` : 'etwa auf Erhaltung'} – ein kleines Defizit, bei dem mit viel Protein und Krafttraining Fett weggeht und Muskeln trotzdem wachsen (Recomposition).`,
    },
    {
      title: `Protein ${settings.proteinMin}–${settings.proteinMax} g`,
      text: `≈ ${perKg(settings.proteinMin)}–${perKg(settings.proteinMax)} g pro kg Körpergewicht – der obere Bereich der Empfehlungen für Muskelaufbau im leichten Defizit. Verteilt auf fünf Mahlzeiten mit je 10–45 g, so kann der Körper es gut verwerten.`,
    },
    {
      title: `Fett ${settings.fatMin}–${settings.fatMax} g`,
      text: 'Etwa 25–30 % der Energie: genug für Hormone (auch Testosteron) und die fettlöslichen Vitamine A, D, E, K – aber nicht so viel, dass für Kohlenhydrate rund ums Training nichts bleibt.',
    },
    {
      title: `Kohlenhydrate ≈ ${carbsLow}–${carbsHigh} g`,
      text: 'Der Rest. An Trainingstagen gebündelt rund ums Training – ein kohlenhydratreicher Pre-Workout-Snack eine Stunde vorher und das Abendessen danach. An Ruhetagen ersetzt ein Snack mit mehr Fett und Gemüse den Pre-Workout-Snack, die Tagessumme bleibt gleich.',
    },
  ];
}

export const STORAGE_TIPS = [
  'Gekochtes innerhalb einer Stunde abkühlen lassen – flach in den Boxen verteilt geht es schneller – und dann in den Kühlschrank (höchstens 5 °C).',
  'Gekochtes hält im Kühlschrank 3–4 Tage. Alles für Donnerstag und Freitag kommt entweder vom Mini-Prep am Mittwoch oder direkt nach dem Kochen ins Tiefkühlfach.',
  'Reis besonders schnell abkühlen und nicht lange warm stehen lassen (Bacillus cereus). Kalt aus dem Kühlschrank gegessen ist er unproblematisch.',
  'Boxen beschriften: Gericht + Datum. Was zuerst gekocht wurde, wird zuerst gegessen.',
  'Einfrieren in flachen Boxen oder Beuteln, Luft raus – hält 2–3 Monate. Auftauen immer über Nacht im Kühlschrank („Box aus dem TK nehmen“-Erinnerung am Vorabend), nie auf der Arbeitsfläche.',
  'Aufwärmen, bis es durch und durch dampft (Kern ≥ 70 °C, etwa 2 Minuten halten). Reis und Nudeln mit einem Esslöffel Wasser – dann werden sie nicht trocken. Nur einmal aufwärmen.',
  'Saucen und Dressings im eigenen Glas mitnehmen und erst beim Essen drübergeben – so bleibt nichts matschig.',
  'Ohne Mikrowelle in der Schule: Box mit einem Kühlakku in die Tasche. Die Schul-Gerichte sind so gewählt, dass sie kalt schmecken (Bowls, Salate, Wraps).',
];
