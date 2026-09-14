# 🚀 Fullstack Life & Finance Dashboard — Client-Server & System Architecture

> **Leitfaden & Spezifikation:** Ein vollkommen modulares, selbst-hostbares All-in-One-System mit entkoppelter **Client-Server-Architektur**, relationaler Datenbank (PostgreSQL), Offline-First-Fähigkeit, Realtime-Synchronisation und einer flexiblen **Entity-Creation-Engine** zum Erstellen und Erweitern beliebiger neuer Datenmodule (Hausaufgaben, Spartöpfe, Widgets, Budgets, Notizen).

---

## 📑 Inhaltsverzeichnis
1. [System-Architektur: Client vs. Server](#1-system-architektur-client-vs-server)
2. [Server- & Hosting-Blueprint (Docker, VPS, Self-Hosting)](#2-server--hosting-blueprint)
3. [Datenbank-Architektur & Erweitertes Schema](#3-datenbank-architektur--erweitertes-schema)
4. [Universal Creation Engine (CRUD & Dynamic Extensibility)](#4-universal-creation-engine)
5. [Realtime-Sync & Offline-First State Machine](#5-realtime-sync--offline-first-state-machine)
6. [API-Spezifikation (REST & WebSockets)](#6-api-spezifikation)
7. [Docker-Compose Setup (1-Click Deployment)](#7-docker-compose-setup)

---

## 1. System-Architektur: Client vs. Server

Das System ist in drei klar getrennte Schichten unterteilt, um maximale Performance, Plattformunabhängigkeit und Datensicherheit zu garantieren:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (FRONTEND)                           │
│  • Mobile PWA (iOS / Android) & Desktop Web (Tailwind, shadcn/ui, Framer)   │
│  • Local State & Cache: TanStack Query + Zustand (Optimistic UI)            │
│  • Offline Store: IndexedDB (RxDB / Dexie.js)                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS (REST API & Realtime SSE)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           SERVER LAYER (BACKEND)                            │
│  • Node.js (Hono / Next.js Server / Fastify) oder Go / Python Backend       │
│  • Auth & Session Engine: JWT / HTTP-Only Cookies / Role-Based Access       │
│  • Zod Validation Pipeline (Typsichere Eingaben für alle neuen Entities)    │
│  • Cron Jobs & Workers: Nächtlicher Bank-Sync, Deadline-Reminder            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQL / Connection Pooling
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      DATABASE & STORAGE LAYER (DATA)                        │
│  • PostgreSQL 16 (mit JSONB für dynamische Custom-Felder & Widgets)        │
│  • ORM / Query Builder: Drizzle ORM oder Prisma                             │
│  • Redis / In-Memory: Session Caching & Realtime Pub/Sub                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Client-Aufgaben (Frontend)
* **Zero-Latency UI (Optimistic Updates):** Beim Erstellen einer neuen Hausaufgabe oder Ausgabe wird das UI *sofort* aktualisiert, noch bevor der Server antwortet. Scheitert der Server-Call, wird der Zustand sanft zurückgerollt.
* **Responsive Bento Renderer:** Dynamisches Rendern von Kacheln basierend auf Gerätegröße und aktivem Arbeitsmodus (*Study*, *Finance*, *Daily Focus*).
* **Keyboard Navigation & Quick Capture:** Globale Shortcuts (`Cmd+K`, `N`, `Q`) für Blitz-Erstellung neuer Datensätze.

### 1.2 Server-Aufgaben (Backend)
* **Zentrale Geschäftslogik & Validierung:** Berechnung von dynamischen Sparraten, Zieldaten und Budget-Grenzen.
* **Sichere API-Gateways:** Geschützte Anbindung von Open-Banking (GoCardless PSD2), iCal-Feeds und Push-Notifications.
* **Realtime-Broadcast:** Informiert verbundene Clients sofort via WebSockets / Server-Sent Events, wenn auf einem anderen Gerät ein Element geändert wurde.

---

## 2. Server- & Hosting-Blueprint (Self-Hosting & Cloud)

Das Backend ist containerisiert und läuft auf jedem gängigen Setup:

| Hosting-Ziel | Hardware-Empfehlung | Geeignet für |
| :--- | :--- | :--- |
| **Kleiner VPS (Hetzner / Netcup / Linode)** | 1–2 vCPU, 2 GB RAM (~3–5 €/Monat) | **Empfohlen** (24/7 online, schnell, eigene Domain) |
| **Home-Server / Raspberry Pi (4 oder 5)** | 4 GB RAM, Docker installiert | 100% lokal im Heimnetzwerk (via Cloudflare Tunnel oder Tailscale) |
| **Serverless Cloud (Vercel + Supabase/Neon)** | Free Tier | Zero Maintenance, sofort online ohne Server-Management |

---

## 3. Datenbank-Architektur & Erweitertes Schema

Das Datenbankschema nutzt relationale Integrität für Kernbereiche, kombiniert mit flexiblen `JSONB`-Spalten, damit du **neue Felder oder eigene Module anlegen kannst, ohne die Datenbank migrieren zu müssen**.

```sql
-- 1. BENUTZER & WORKSPACES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    preferences JSONB DEFAULT '{"theme": "dark", "currency": "EUR", "active_mode": "all"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FÄCHER / KATEGORIEN (STUDY)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT DEFAULT 'book',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HAUSAUFGABEN & TASKS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    estimated_minutes INT DEFAULT 30,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('backlog', 'in_progress', 'done', 'archived')) DEFAULT 'backlog',
    custom_metadata JSONB DEFAULT '{}'::jsonb, -- Für zukünftige Extra-Felder wie "Noten", "Dateilinks" etc.
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SPARTÖPFE (SINKING FUNDS)
CREATE TABLE savings_pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(10,2) NOT NULL,
    current_amount NUMERIC(10,2) DEFAULT 0.00,
    monthly_contribution NUMERIC(10,2) DEFAULT 0.00,
    target_date DATE,
    icon TEXT DEFAULT 'piggy-bank',
    color_hex TEXT DEFAULT '#10b981',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TRANSAKTIONEN & AUSGABEN
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    savings_pot_id UUID REFERENCES savings_pots(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL, -- 'Fixkosten', 'Lebensmittel', 'Freizeit', etc.
    type TEXT CHECK (type IN ('income', 'expense', 'transfer_to_pot')) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. DYNAMISCHE CUSTOM-MODULE & WIDGETS (ERWEITERBARKEIT)
CREATE TABLE user_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    widget_key TEXT NOT NULL, -- z. B. 'habit_tracker', 'grade_calculator', 'wishlist'
    title TEXT NOT NULL,
    layout_position JSONB NOT NULL DEFAULT '{"col": 1, "row": 1, "width": 1, "height": 1}'::jsonb,
    config JSONB DEFAULT '{}'::jsonb, -- Speichert individuelle Widget-Einstellungen
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Universal Creation Engine (CRUD & Dynamic Extensibility)

Um neue Sachen (Hausaufgaben, Fächer, Spartöpfe, Ausgaben, eigene Widgets) blitzschnell und ohne Codeänderungen anzulegen, nutzt das System eine standardisierte **Entity-Pipeline**:

```
[ User Input / Voice / Cmd+K ]
              │
              ▼
    [ Zod Schema Validation ]
              │
              ├── Typensicher auf Client & Server
              ├── Automatische Default-Werte
              │
              ▼
   [ Optimistic Client Store ] ───► UI aktualisiert sich in 0ms!
              │
              ▼ (Background Sync)
    [ Server API Controller ]
              │
              ▼
      [ PostgreSQL DB ] ──────────► Broadcast an andere Geräte via WebSocket
```

### 4.1 Einheitlicher Payload-Standard (Beispiel: Neues Sparziel)
```json
POST /api/v1/savings-pots
Headers: { "Authorization": "Bearer <token>", "Content-Type": "application/json" }

{
  "name": "Neues iPad Air",
  "target_amount": 799.00,
  "current_amount": 150.00,
  "monthly_contribution": 100.00,
  "target_date": "2026-12-01",
  "icon": "tablet",
  "color_hex": "#3b82f6"
}
```

### 4.2 Standardisierter Quick-Add Parser (Command Bar & Natural Language)
Gibt der Nutzer z. B. Folgendes in die `Cmd+K`-Suchleiste ein:
> *"Physik Protokoll bis Freitag 18:00 45min Prio 1"*

Parst die Client-Engine den String automatisch in:
```json
{
  "entity": "task",
  "subject": "Physik",
  "title": "Protokoll",
  "due_date": "2026-09-18T18:00:00Z",
  "estimated_minutes": 45,
  "priority": "high"
}
```

---

## 5. Realtime-Sync & Offline-First State Machine

1. **Offline-Fähigkeit:** Wenn du in der Bahn oder Schule kein Internet hast, speichert die PWA alle neuen Einträge im lokalen Speicher (`IndexedDB`).
2. **Re-Sync Queue:** Sobald eine Verbindung besteht, arbeitet der Client eine Synchronisations-Warteschlange ab (`Sync Worker`).
3. **Konfliktlösung:** Bei gleichzeitigen Änderungen auf zwei Geräten gilt das Prinzip **Last-Write-Wins** basierend auf `updated_at` Zeitstempeln.

---

## 6. API-Spezifikation (REST Endpoints Übersicht)

| Methode | Endpoint | Beschreibung |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Login & Ausgabe des Session-Tokens |
| `GET` | `/api/v1/dashboard/summary` | Lädt alle Daten für den heutigen Tag in einem einzigen Call |
| `POST` | `/api/v1/tasks` | Neue Hausaufgabe / Aufgabe erstellen |
| `PATCH` | `/api/v1/tasks/:id` | Status ändern (z. B. auf `done`), verschieben, bearbeiten |
| `DELETE` | `/api/v1/tasks/:id` | Aufgabe löschen / archivieren |
| `POST` | `/api/v1/savings-pots` | Neuen Spartopf anlegen |
| `POST` | `/api/v1/savings-pots/:id/deposit` | Betrag in Spartopf einzahlen |
| `POST` | `/api/v1/transactions` | Einnahme / Ausgabe manuell eintragen |
| `POST` | `/api/v1/transactions/import-csv` | CSV-Upload von Online-Banking / Finanzguru |
| `GET` | `/api/v1/calendar/ical` | Privater iCal-Feed für Apple Kalender / Google Calendar |
| `POST` | `/api/v1/widgets` | Neues Custom-Widget zum Dashboard hinzufügen |

---

## 7. Docker-Compose Setup (1-Click Deployment auf Server)

Erstelle eine `docker-compose.yml` auf deinem Server (z. B. Hetzner VPS oder Raspberry Pi), um das komplette System in 60 Sekunden zu starten:

```yaml
version: '3.8'

services:
  # 1. PostgreSQL Datenbank
  db:
    image: postgres:16-alpine
    container_name: life_dashboard_db
    restart: always
    environment:
      POSTGRES_USER: dashboard_user
      POSTGRES_PASSWORD: supersecretpassword123
      POSTGRES_DB: life_dashboard
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - dashboard_net

  # 2. Web App (Client & Server Backend)
  app:
    image: ghcr.io/yourusername/life-dashboard:latest
    container_name: life_dashboard_app
    restart: always
    depends_on:
      - db
    environment:
      DATABASE_URL: "postgresql://dashboard_user:supersecretpassword123@db:5432/life_dashboard?schema=public"
      NEXTAUTH_SECRET: "generate_a_random_32_char_secret_key"
      NEXTAUTH_URL: "https://mein-dashboard.de"
      PORT: 3000
    networks:
      - dashboard_net

  # 3. Caddy Reverse Proxy (Automatisches SSL-Zertifikat)
  caddy:
    image: caddy:2-alpine
    container_name: life_dashboard_proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    environment:
      DOMAIN: "mein-dashboard.de" # Deine Domain
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    networks:
      - dashboard_net

volumes:
  db_data:
  caddy_data:
  caddy_config:

networks:
  dashboard_net:
    driver: bridge
```

### Passende `Caddyfile` für automatische HTTPS-Verschlüsselung:
```caddy
mein-dashboard.de {
    reverse_proxy app:3000 {
        header_up X-Forwarded-Proto https
    }
}
```

---

## 8. Schnellstart-Befehle auf dem Server

```bash
# 1. Projektordner erstellen
mkdir life-dashboard && cd life-dashboard

# 2. docker-compose.yml und Caddyfile anlegen
# (Dateien wie oben beschrieben einfügen)

# 3. Server starten
docker compose up -d

# 4. Logs überprüfen
docker compose logs -f
```