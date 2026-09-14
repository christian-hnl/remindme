# 🎨 UI/UX Design System & Product Design Blueprint (Tailored Edition)

> **Design-Leitbild:** Das visuelle und haptische Gefühl von **Apple & Things 3** (sanft, taktil, organisch), kombiniert mit der Präzision und Informationsdichte von **Linear & Raycast** (Dark-Mode-Exzellenz, Keyboard-Shortcuts, Micro-Borders) und den intelligenten Finanz-Visualisierungen von **Copilot Money & Finanzguru**.

---

## 1. Design-System & Visuelle DNA (The Aesthetic Foundation)

### 1.1 Farbsystem & Ambient Glow (Subtile Tiefenwirkung)
Keine harten Kontraste oder grellen Farben, sondern "Muted Vibrancy" mit sanften Lichtkegeln (Ambient Radial Gradients) hinter aktiven Elementen.

```
┌────────────────────────────────────────────────────────────────────────┐
│ FARBPALETTE: DARK MODE (DEFAULT)                                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Element           │ Hex-Code          │ Zweck                          │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Canvas Background │ `#07090E`         │ Ultra-tiefes Obsidian-Schwarz  │
│ Card Surface      │ `#11141D`         │ 1. Ebene Kacheln (Bento)       │
│ Elevated Surface  │ `#1A1F2C`         │ Modals, Drawers, Floating Bars │
│ Sub-Pixel Border  │ `rgba(255,255,255,0.07)` │ Haarlinien-Rahmen       │
│ Muted Foreground  │ `#64748B`         │ Metadaten, Labels, Inaktives   │
│ Main Text         │ `#F8FAFC`         │ Primäre Inhalte & Zahlen       │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

#### Thematische Akzentfarben (Funktionale Kodierung)
* 🔵 **Study & Deep Work (Linear Blue):** `#4F46E5` → `#6366F1` *(Fokus, Aufgaben, Vorlesungen)*
* 🟢 **Wealth & Growth (Copilot Mint):** `#059669` → `#10B981` *(Sparziele, Cashflow, Überschuss)*
* 🟣 **Time & Calendar (Cron Iris):** `#7C3AED` → `#8B5CF6` *(Termine, Blöcke, Events)*
* 🟠 **Urgency & Deadlines (Warm Amber):** `#D97706` → `#F59E0B` *(Abgaben < 24h, Fällige Rechnungen)*

### 1.2 Typografie-Hierarchie
* **Schriftfamilie:** `Geist Sans` (oder `SF Pro Display` auf Apple-Geräten) für maximale Klarheit.
* **Monospace Zahlen:** `Geist Mono` für alle Währungsbeträge, Timer, Noten und Deadlines, um Layout-Jumping bei dynamischen Zahlen zu verhindern.
* **Skalierung:**
  * *Hero KPI (z. B. Kontostand/Restbudget):* `36px` / `Tracking -0.04em` / `Font-Weight: 600`
  * *Section Header:* `18px` / `Tracking -0.02em` / `Font-Weight: 500`
  * *Card Title:* `14px` / `Font-Weight: 500` / `Text-Color: #F8FAFC`
  * *Micro Meta (z. B. "in 3 Tagen"):* `11px` / `Tracking +0.02em` / `Font-Weight: 500` / `Uppercase`

### 1.3 Materialität, Elevation & Schatten
* **Bento Card Style:**
  * `border-radius: 24px` (Mobile: `20px`)
  * `backdrop-filter: blur(20px)`
  * `border: 1px solid rgba(255, 255, 255, 0.06)`
  * `box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.35)`
* **Hover & Active States (Desktop):** Bei Maus-Hovering leuchtet die Kante durch einen dynamischen Maus-Tracker leicht auf (`Glow Border Effect` à la Linear).

---

## 2. Marktführer-Features — Maßgeschneidert adaptiert

### 2.1 Hausaufgaben & Uni (Inspiriert von *Things 3* & *Linear*)
* **"Magic Magic Plus" Button (Things 3):**
  * Auf dem Smartphone kannst du den Erstell-Button nicht nur antippen, sondern per Drag-and-Drop direkt in den heutigen Tag, ein bestimmtes Fach oder direkt in den Kalender ziehen.
* **Triage & Swiping Flow (Linear Triage):**
  * Hausaufgaben werden nicht in endlosen Tabellen gewälzt. Unsortierte Aufgaben landen im "Inbox-Stack" und können mit schnellen Gesten einem Fach, einem Bearbeitungsdatum oder einer Priorität zugewiesen werden.
* **Effort-Pills (Geschätzter Zeitaufwand):**
  * Jede Hausaufgabe hat eine visuelle Zeit-Pille (z. B. `⏱️ 45m`). Das System warnt automatisch, wenn für den heutigen Tag mehr als 3 Stunden Hausaufgaben geplant sind.

### 2.2 Finanzen & Spartöpfe (Inspiriert von *Copilot Money*, *Finanzguru* & *Apple Fitness*)
* **"Safe-to-Spend" Dial (Finanzguru/Copilot Evolution):**
  * Kein starres "Du darfst diesen Monat nur X ausgeben", sondern eine dynamische Zahl: **„Heute noch 24,50 € frei“**. Gibt man heute weniger aus, erhöht sich der Betrag für das Wochenende automatisch.
* **Haptische Sparziel-Ringe (Apple Watch Rings / Copilot):**
  * Spartöpfe (z. B. *MacBook Pro*, *Japan-Reise*, *Notgroschen*) werden als elegante, ineinandergreifende Ringe oder flüssigkeitsgefüllte Zylinder visualisiert.
  * Beim Erreichen eines Meilensteins gibt es eine dezente, edle Partikel-Animation (kein kitschiges Konfetti, sondern matt-goldenes Glühen).
* **Smart Subscription & Contract Radar:**
  * Verträge und wiederkehrende Fixkosten werden automatisch auf einer Zeitachse visualisiert, inklusive Kündigungs-Countdowns.

### 2.3 Kalender & Timeblocking (Inspiriert von *Cron / Notion Calendar*)
* **Direct Drop Timeblocking:**
  * Hausaufgaben aus der Seitenleiste können per Drag & Drop direkt in freie Lücken des Stundenplans / Kalenders gezogen werden. Die Aufgabe wird automatisch zu einem Kalenderblock.
* **Live Dynamic Indicator:**
  * Eine dezente Linie wandert live durch den aktuellen Tag und zeigt exakt an, wie viel Zeit von der aktuellen Vorlesung / Lernsession noch übrig ist.

### 2.4 Command Palette & Schnellsuche (Inspiriert von *Raycast*)
* **Globaler Schnellzugriff via `Cmd+K` (PC) oder 2-Finger-Tap (Mobile):**
  * Sofort-Eingabe in natürlicher Sprache: *„Mathe Hausaufgabe Seite 42 bis Donnerstag 14 Uhr“* oder *„15€ Döner Ausgaben bar“* legt die Einträge vollautomatisch in Sekundenbruchteilen an.

---

## 3. Mobile-First UX Blueprint (Phone Interface)

```
┌─────────────────────────────────────────────────────────────┐
│ 100% DAUMENFREUNDLICH (THUMB ZONE ARCHITEKTUR)              │
└─────────────────────────────────────────────────────────────┘

         [ Dynamic Status Pill: "Noch 18€ heute • Nächste: Mathe (11:30)" ]
         ┌──────────────────────────────────────────────────────┐
         │ 🔵 STUDY SPOTLIGHT (Heutige Priorität #1)            │
         │  Matheblatt 04 — Vektorrechnung (fällig morgen 10:00)│
         │  [ ⏱️ 45 Min ]   [ Tag: Mathe ]       [ O Erledigen ]│
         └──────────────────────────────────────────────────────┘
         ┌─────────────────────────┬────────────────────────────┐
         │ 🟢 SPAR-SPOTLIGHT       │ 🟣 NÄCHSTER TERMIN         │
         │  Neuer Laptop (68%)     │  Informatik Übung          │
         │  [=====>    ] 850/1.250€│  Raum 204 • in 45 Min      │
         └─────────────────────────┴────────────────────────────┘
         ┌──────────────────────────────────────────────────────┐
         │ ⚡ SCHNELL-AKTIONEN & TIMELINE                       │
         │  14:00 - 15:30 [ Hausaufgaben-Block geblockt ]       │
         │  18:00         [ Fitness / Gym ]                     │
         └──────────────────────────────────────────────────────┘

         ┌──────────────────────────────────────────────────────┐
         │ [ 🏠 Heute ]  [ 📚 Study ]  [ ( + ) ]  [ 💰 Geld ]  [ 📅 Plan ] │
         └──────────────────────────────────────────────────────┘
                          ^ Floating Dock ^
```

### Mobile Interaktions-Details
1. **Das Floating Glass Dock:** Die Navigationsleiste schwebt 12px über dem unteren Bildschirmrand mit starkem Hintergrund-Blur.
2. **Der Quick-Add Trigger `(+)`:**
   * **Kurzer Tap:** Öffnet das Bottom-Sheet für Soforterfassung.
   * **Gedrückt halten:** Sprachaufnahme (Voice-to-Task via KI transkribiert).
3. **One-Handed Drawers:** Alle Detailansichten öffnen sich von unten nach oben als modale Karten, die mit dem Daumen leicht nach unten weggewischt werden können (`Swipe-down-to-dismiss`).

---

## 4. Desktop & Tablet UI Blueprint (PC Ultrawide & Laptop)

Auf dem Desktop verwandelt sich die mobile Ansicht in ein ultra-aufgeräumtes **3-Zonen Bento-Dashboard**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ⌘ Command Bar [ Suchen, Rechnen, Erstellen mit Cmd+K... ]                     (Q) Quick-Add  ⚙️ │
├─────────────────┬───────────────────────────────────────────────┬────────────────────────────────┤
│ 1. FOKUS & PLAN │ 2. WORKSPACE & AKTIONEN                       │ 3. WEALTH & GOALS              │
│ (25% Breite)    │ (50% Breite)                                  │ (25% Breite)                   │
├─────────────────┼───────────────────────────────────────────────┼────────────────────────────────┤
│ 📅 Mini-Kalender│ 📚 HAUSAUFGABEN & DEADLINES (Kanban / Matrix) │ 💰 KONTO-ÜBERSICHT             │
│ Mo 14. Sep      │ ┌───────────────────────────────────────────┐ │  Gesamt: 2.840,50 €            │
│                 │ │ 🔴 Dringend (Heute fällig)                │ │  Frei verfügbar: 420,00 €      │
│ ⏰ Stundenplan  │ │  • Physik Protokoll fertigstellen [30m]   │ ├────────────────────────────────┤
│ 09:00 Mathe     │ │  • Latein Vokabeln Lektion 12     [15m]   │ 🎯 SPARTÖPFE (Visual Rings)     │
│ 11:30 Pause     │ ├───────────────────────────────────────────┤ │  💻 MacBook M-Chip            │
│ 12:00 Info      │ │ 🟡 Demnächst (Diese Woche)                │ │  [████████░░░░] 72% (1.080€)   │
│                 │ │  • BWL Präsentation Folien      [90m]   │ │  🌴 Sommerurlaub 2027         │
│ 🏷️ Fächer-Filter│ └───────────────────────────────────────────┘ │  [████░░░░░░░░] 35% (350€)     │
│  [■] Mathe      │                                               ├────────────────────────────────┤
│  [■] Info       │ 💳 REZENTE TRANSAKTIONEN & AUSGABEN           │ 📊 CASHFLOW HORIZONT           │
│  [■] Physik     │  • Heute: -4,50 € Bäcker (Lebensmittel)       │  Fixkosten gedeckt: ✅          │
│                 │  • Gestern: -49,00 € Deutschlandticket        │  Monats-Sparrate: +250,00 €    │
└─────────────────┴───────────────────────────────────────────────┴────────────────────────────────┘
```

---

## 5. Anti-Clutter Architektur (Warum es nie unübersichtlich wird)

Viele Dashboards scheitern daran, dass sie nach 3 Monaten mit Daten und Widgets zugemüllt sind. Dieses Design nutzt **3 strikte Schutzmechanismen**:

```
┌─────────────────────────────────────────────────────────────────┐
│              DAS 3-STUFEN ANTI-CLUTTER-FRAMEWORK                │
├───────────────────┬──────────────────────┬──────────────────────┤
│ STUFE 1: GLANCE   │ STUFE 2: EXPAND      │ STUFE 3: FOCUS MODE  │
│ (Nur das Wesentliche) (Detail bei Klick) │ (Kontext-Isolation)  │
├───────────────────┼──────────────────────┼──────────────────────┤
│ Zeigt nur KPIs,   │ Klick auf Kachel     │ Arbeitsmodi schalten │
│ Ringe & 3 Prio-   │ öffnet Detail-Drawer │ irrelevante Bereiche │
│ Aufgaben          │ ohne Seitenwechsel   │ komplett stumm       │
└───────────────────┴──────────────────────┴──────────────────────┘
```

### 5.1 Context-Aware Workspaces (Automatische Modus-Umschaltung)
* **🎓 Deep Study Mode:**
  * Finanzen, Shopping-Wunschlisten und Freizeit-Widgets werden **vollständig ausgeblendet**.
  * Der Fokus liegt zu 100% auf Deadlines, Aufgaben, Skripten und dem Pomodoro-Timer.
* **💳 Wealth & Budget Mode:**
  * Schulsachen verschwinden in den Hintergrund. Voller Fokus auf Cashflow, Spartöpfe, Zinseszins-Prognosen und Transaktionen.
* **🌙 Weekend / Chill Mode:**
  * Am Wochenende zeigt das Dashboard standardmäßig keine Schulaufgaben mehr an (außer es stehen P0-Deadlines am Montag an), sondern Erholung, Hobbys und Budget für Freizeitaktivitäten.

### 5.2 Auto-Archivierung & Smart Collapsing
* Erledigte Hausaufgaben wandern nach 60 Minuten automatisch in ein dezentes, eingeklapptes Archiv.
* Erreichte Sparziele feiern kurz ihren Erfolg und können mit einem Klick in den Bereich "Erreichte Meilensteine" überführt werden, um Platz für neue Wünsche zu machen.

---

## 6. Detaillierte Kachel-Anatomie (Bento Components)

### 6.1 Die Sparziel-Kachel (`SavingsPotCard`)
```
┌───────────────────────────────────────────────────────┐
│ 💻  MacBook Pro M4                         850 / 1.400 €│
│     Tech & Setup                                      │
│                                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │████████████████████████████░░░░░░░░░░░░░░░░░░░░░░│ │ 61%
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ 📈 Noch 550 € • Ziel: 15. Nov (ca. 183 € / Monat)    │
│ [ + 25 € Einzahlen ]                 [ ⋯ Details ]    │
└───────────────────────────────────────────────────────┘
```

### 6.2 Die Hausaufgaben-Kachel (`TaskMatrixCard`)
```
┌───────────────────────────────────────────────────────┐
│ 🔵 MATHE  •  Übungsblatt 05            Morgen, 08:00 │
│ Lineare Algebra & Matrizenrechnung                    │
│                                                       │
│ ⏱️ 45 min    ⚡ Prio 1 (Dringend)      📎 1 PDF Anhang │
│                                                       │
│ [ O Als erledigt markieren ]     [ 📅 In Kalender ]  │
└───────────────────────────────────────────────────────┘
```

---

## 7. Animationen & Micro-Interactions (Der "Polished Feel")

* **Layout Animations:** Alle Positionsänderungen nutzen `Framer Motion` mit Spring-Physik (`stiffness: 300, damping: 30`). Elemente teleportieren nicht, sie gleiten an ihren neuen Platz.
* **Progressive Filling:** Wenn das Dashboard geladen wird, füllen sich die Sparziel-Balken und Ringe in einer geschmeidigen 600ms-Kurve mit flüssigem Glow-Effekt.
* **Haptic Touch (auf iOS/Android PWA):**
  * Sanfter Klick-Impuls beim Abhaken einer Hausaufgabe.
  * Kräftigerer doppelter Impuls beim Erreichen eines Sparziel-Meilensteins.
