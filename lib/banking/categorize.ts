export type TransactionKind = 'income' | 'expense' | 'transfer' | 'investment';

/** Matches at a word start (umlaut-aware), so "BILLA DANKT" and "Netflix.com" both hit. */
const starts = (source: string) => new RegExp(String.raw`(?<![\p{L}\d])(?:${source})`, 'iu');

const EXPENSE_RULES: [RegExp, string][] = [
  [
    starts(
      String.raw`netflix|spotify|disney|dazn|youtube premium|apple\.com|icloud|google (?:one|play|storage)|amazon prime|magenta|a1 telekom|drei |hutchison|hot |yesss|spusu|miete|versicherung|uniqa|wiener st[äa]dtische|generali|allianz|gis |orf-beitrag|wien energie|evn|verbund|strom|fitinn|mcfit|clever fit|john harris|abo`
    ),
    'Fixkosten',
  ],
  [
    starts(
      String.raw`mcdonald|burger king|subway|kfc|starbucks|mensa|buffet|kantine|anker|str[öo]ck|der mann|kebap|kebab|d[öo]ner|pizza|lieferando|mjam|foodora|wolt|restaurant|caf[eé]|gasthaus|gasthof|heuriger|sushi|five guys|dunkin|nordsee|vapiano|leberkas|w[üu]rstel|gelato|bubble tea`
    ),
    'Essen gehen',
  ],
  [
    starts(
      String.raw`eurospar|interspar|spar |spar$|billa|hofer|lidl|penny|mpreis|merkur|unimarkt|nah ?& ?frisch|adeg|rewe|edeka|aldi|b[äa]ckerei|b[äa]cker|supermarkt`
    ),
    'Lebensmittel',
  ],
  [starts(String.raw`dm drogerie|dm-drogerie|dm fil|bipa|m[üu]ller|douglas|marionnaud|rossmann`), 'Drogerie'],
  [
    starts(
      String.raw`amazon|amzn|media ?markt|saturn|ikea|galaxus|shein|temu|aliexpress|tedi|xxxlutz|m[öo]max|libro|thalia|conrad|cyberport`
    ),
    'Shopping',
  ],
  [
    starts(
      String.raw`[öo]bb|wiener linien|westbahn|flixbus|linz ag linien|graz linien|vor |vvt|shell|omv|bp |eni |jet |avanti|turm[öo]l|tankstelle|uber|bolt|taxi|parkgarage|parken|lime|tier mobility`
    ),
    'Transport',
  ],
  [starts(String.raw`zalando|h ?& ?m|zara|about you|primark|c ?& ?a|peek|snipes|foot locker|new yorker|bershka|pull ?& ?bear|nike|adidas`), 'Kleidung'],
  [starts(String.raw`kino|cineplexx|steam|playstation|xbox|nintendo|eventim|oeticket|ticketmaster|bowling|therme|museum|konzert|twitch|epic games|riot`), 'Freizeit'],
  [starts(String.raw`morawa|pagro|schulbedarf|kopier|schulbuch|elternverein|schulveranstaltung|skikurs|projektwoche`), 'Schule'],
  [starts(String.raw`geschenk|blumen|fleurop|gutschein`), 'Geschenke'],
  [starts(String.raw`apotheke|arzt|zahnarzt|optik|fielmann|pharmacy`), 'Gesundheit'],
];

const INCOME_RULES: [RegExp, string][] = [
  [starts(String.raw`taschengeld`), 'Taschengeld'],
  [starts(String.raw`gehalt|lohn|lehrlingsentsch|familienbeihilfe|stipendium|beihilfe|pension`), 'Einkommen'],
  [starts(String.raw`honorar|nebenjob|ferialjob|praktikum`), 'Nebenjob'],
  [starts(String.raw`willhaben|vinted|ebay|kleinanzeigen`), 'Verkauf'],
  [starts(String.raw`geschenk|geburtstag|christkind`), 'Geschenk'],
  [starts(String.raw`dividende|dividend|zinsen|interest|aussch[üu]ttung`), 'Kapitalerträge'],
];

const TRANSFER_TEXT = starts(String.raw`umbuchung|[üu]bertrag|eigen[üu]berweisung|trade republic|traderepublic|n26 |revolut|bunq`);
const INVESTMENT_TEXT = starts(String.raw`sparplan|wertpapier|depotkauf|etf `);
const INVESTMENT_TYPE = starts(String.raw`kauf|verkauf|buy|sell|sparplan|savings ?plan|trade|order|wertpapier|saveback|round ?up`);
const INCOME_TYPE = starts(String.raw`dividend|aussch[üu]ttung|zins|interest`);
const TRANSFER_TYPE = starts(String.raw`einzahlung|auszahlung|deposit|withdraw|[üu]berweisung|transfer|umbuchung`);

export function categorize(text: string, amount: number): string {
  const rules = amount < 0 ? EXPENSE_RULES : INCOME_RULES;
  return rules.find(([rule]) => rule.test(text))?.[1] ?? 'Sonstiges';
}

/** Tells spending apart from moving money between own accounts or buying securities. */
export function detectKind(text: string, amount: number, typeText: string | null): TransactionKind {
  if (typeText) {
    if (INVESTMENT_TYPE.test(typeText)) return 'investment';
    if (INCOME_TYPE.test(typeText)) return 'income';
    if (TRANSFER_TYPE.test(typeText)) return 'transfer';
  }
  if (TRANSFER_TEXT.test(text)) return 'transfer';
  if (INVESTMENT_TEXT.test(text)) return 'investment';
  return amount < 0 ? 'expense' : 'income';
}

/** Trade Republic lists some outflows as positive numbers together with their type. */
export const isOutflowType = (typeText: string | null) =>
  !!typeText && starts(String.raw`kauf|buy|sparplan|savings|auszahlung|withdraw|karte|card|geb[üu]hr|fee|steuer|tax`).test(typeText);

/** Maps Finanzguru's analysis categories onto LifeTracker's categories. */
export function mapFinanzguruCategory(
  main: string | null,
  sub: string | null,
  amount: number
): { category?: string; type?: TransactionKind } {
  const text = `${main ?? ''} ${sub ?? ''}`.toLowerCase();
  if (!text.trim()) return {};
  if (/umbuchung|übertrag|eigene konten/.test(text)) return { type: 'transfer' };
  if (/sparen|anlegen|invest|geldanlage/.test(text)) return { type: 'investment' };
  if (amount > 0) {
    if (/gehalt|lohn|einkommen|einnahm/.test(text)) return { category: 'Einkommen' };
    return {};
  }
  const table: [RegExp, string][] = [
    [/restaurant|lieferdienst|gastronomie|essen gehen|fast ?food|café|cafe/, 'Essen gehen'],
    [/lebensmittel|supermarkt/, 'Lebensmittel'],
    [/drogerie|körperpflege/, 'Drogerie'],
    [/geschenk|spende/, 'Geschenke'],
    [/mobilit|verkehr|auto|tanken|öffentlich|reisen & mobil/, 'Transport'],
    [/wohnen|miete|energie|versicherung|vertr|abo|kommunikation|internet|mobilfunk|rundfunk|streaming|medien/, 'Fixkosten'],
    [/freizeit|hobby|unterhaltung|urlaub|reise|sport/, 'Freizeit'],
    [/kleidung|mode|shopping/, 'Kleidung'],
    [/bildung|schule|bücher/, 'Schule'],
    [/gesundheit|apotheke|arzt|pflege/, 'Gesundheit'],
  ];
  return { category: table.find(([rule]) => rule.test(text))?.[1] };
}
