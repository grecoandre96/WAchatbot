# Lead Qualification Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard Next.js read-only su Railway + due workflow n8n che qualificano lead via WhatsApp con GPT-4o e inviano link Calendly.

**Architecture:** Next.js App Router legge da Postgres con polling SWR ogni 20s. n8n scrive direttamente su Postgres. Twilio gestisce WhatsApp sandbox. Nessuna autenticazione, single-tenant.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, SWR, node-postgres (pg), n8n, Twilio WhatsApp Sandbox, OpenAI GPT-4o, Calendly, Railway

---

## File Map

```
whatsappChatbot/
├── app/
│   ├── page.tsx
│   ├── conversation/[id]/page.tsx
│   └── api/conversations/
│       ├── route.ts
│       └── [id]/route.ts
├── components/
│   ├── ConversationCard.tsx
│   ├── ConversationList.tsx
│   ├── ChatView.tsx
│   └── MessageBubble.tsx
├── lib/
│   └── db.ts
├── sql/
│   └── schema.sql
├── n8n/
│   ├── workflow-1-new-lead.json
│   └── workflow-2-incoming-message.json
├── .env.example
└── railway.json
```

---

### Task 1: Scaffold Next.js

**Files:** crea `whatsappChatbot/`

- [ ] **Step 1: Scaffolding**

```bash
cd C:\Users\agrec\Desktop
npx create-next-app@latest whatsappChatbot --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
cd whatsappChatbot
```

- [ ] **Step 2: Installa dipendenze**

```bash
npm install swr pg
npm install --save-dev @types/pg
```

- [ ] **Step 3: Rimuovi boilerplate**

`app/page.tsx`:
```tsx
export default function HomePage() {
  return <main className="min-h-screen bg-gray-50 p-8"><h1>Dashboard</h1></main>
}
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Verifica**

```bash
npm run dev
# http://localhost:3000 → mostra "Dashboard"
```

- [ ] **Step 5: Commit**

```bash
git init && git add . && git commit -m "feat: scaffold Next.js project"
```

---

### Task 2: Schema Database

**Files:** crea `sql/schema.sql`

- [ ] **Step 1: Scrivi il file SQL**

`sql/schema.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  business_desc TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id),
  status        TEXT NOT NULL DEFAULT 'active',
  score         INTEGER,
  outcome       TEXT,
  calendly_sent BOOLEAN DEFAULT false,
  started_at    TIMESTAMP DEFAULT now(),
  completed_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id),
  direction        TEXT NOT NULL,
  body             TEXT NOT NULL,
  sent_at          TIMESTAMP DEFAULT now(),
  twilio_sid       TEXT
);
```

- [ ] **Step 2: Esegui su Postgres**

Nel Railway dashboard → plugin Postgres → tab "Query" → incolla ed esegui.
Oppure:
```bash
psql $DATABASE_URL -f sql/schema.sql
```

- [ ] **Step 3: Verifica**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Deve restituire: leads, conversations, messages
```

- [ ] **Step 4: Inserisci dati di test**

```sql
INSERT INTO leads (first_name, last_name, email, phone, business_desc)
VALUES ('Mario', 'Rossi', 'mario@example.com', '+393331234567', 'Agenzia di marketing digitale');

INSERT INTO conversations (lead_id, status, score, outcome)
VALUES ((SELECT id FROM leads WHERE email = 'mario@example.com'), 'completed', 8, 'zoom_call');

INSERT INTO messages (conversation_id, direction, body) VALUES
  ((SELECT id FROM conversations LIMIT 1), 'outbound', 'Ciao Mario! Ho visto che ti occupi di Agenzia di marketing digitale. Qual è la sfida principale che stai cercando di risolvere?'),
  ((SELECT id FROM conversations LIMIT 1), 'inbound',  'Voglio automatizzare la lead generation.'),
  ((SELECT id FROM conversations LIMIT 1), 'outbound', 'Hai già un budget allocato per questo tipo di soluzione?');
```

- [ ] **Step 5: Commit**

```bash
git add sql/schema.sql && git commit -m "feat: add database schema"
```

---

### Task 3: Connessione Postgres

**Files:** crea `lib/db.ts`, `.env.local`

- [ ] **Step 1: Connection pool**

`lib/db.ts`:
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export default pool
```

- [ ] **Step 2: Crea .env.local (NON committare)**

`.env.local`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/leadbot
```

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts && git commit -m "feat: add postgres connection pool"
```

---

### Task 4: API Route — GET /api/conversations

**Files:** crea `app/api/conversations/route.ts`

- [ ] **Step 1: Scrivi la route**

`app/api/conversations/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  const result = await pool.query(`
    SELECT
      c.id, c.status, c.score, c.outcome,
      c.started_at, c.completed_at,
      l.first_name, l.last_name, l.phone
    FROM conversations c
    JOIN leads l ON l.id = c.lead_id
    ORDER BY c.started_at DESC
  `)
  return NextResponse.json(result.rows)
}
```

- [ ] **Step 2: Testa**

```bash
curl http://localhost:3000/api/conversations
# Risposta attesa: array con Mario Rossi, score 8, outcome zoom_call
```

- [ ] **Step 3: Commit**

```bash
git add app/api/conversations/route.ts && git commit -m "feat: add GET /api/conversations"
```

---

### Task 5: API Route — GET /api/conversations/[id]

**Files:** crea `app/api/conversations/[id]/route.ts`

- [ ] **Step 1: Scrivi la route**

`app/api/conversations/[id]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const convResult = await pool.query(
    'SELECT * FROM conversations WHERE id = $1',
    [params.id]
  )
  if (!convResult.rows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const conversation = convResult.rows[0]

  const [leadResult, messagesResult] = await Promise.all([
    pool.query('SELECT * FROM leads WHERE id = $1', [conversation.lead_id]),
    pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC',
      [params.id]
    ),
  ])

  return NextResponse.json({
    conversation,
    lead: leadResult.rows[0],
    messages: messagesResult.rows,
  })
}
```

- [ ] **Step 2: Testa**

```bash
# Prendi l'id dalla risposta del task precedente
curl http://localhost:3000/api/conversations/<id>
# Risposta attesa: { conversation, lead, messages: [3 messaggi] }
```

- [ ] **Step 3: Commit**

```bash
git add app/api/conversations/[id]/route.ts && git commit -m "feat: add GET /api/conversations/[id]"
```

---

### Task 6: Component — ConversationCard

**Files:** crea `components/ConversationCard.tsx`

- [ ] **Step 1: Scrivi il componente**

`components/ConversationCard.tsx`:
```tsx
export type ConversationRow = {
  id: string
  status: 'active' | 'completed' | 'failed'
  score: number | null
  outcome: 'zoom_call' | 'voice_call' | 'not_qualified' | null
  started_at: string
  completed_at: string | null
  first_name: string
  last_name: string
  phone: string
}

const statusStyle: Record<string, string> = {
  active:    'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
}

const outcomeStyle: Record<string, string> = {
  zoom_call:     'bg-blue-100 text-blue-800',
  voice_call:    'bg-sky-100 text-sky-800',
  not_qualified: 'bg-gray-100 text-gray-600',
}

const outcomeLabel: Record<string, string> = {
  zoom_call:     'Zoom Call',
  voice_call:    'Call Voce',
  not_qualified: 'Non qualificato',
}

export function ConversationCard({
  conv,
  onClick,
}: {
  conv: ConversationRow
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-gray-900">
          {conv.first_name} {conv.last_name}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[conv.status] ?? ''}`}>
          {conv.status}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-2">{conv.phone}</p>

      <div className="flex items-center gap-2 flex-wrap">
        {conv.outcome && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeStyle[conv.outcome] ?? ''}`}>
            {outcomeLabel[conv.outcome]}
          </span>
        )}
        {conv.score !== null && (
          <span className="text-xs font-bold text-gray-700">{conv.score}/10</span>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {new Date(conv.started_at).toLocaleString('it-IT')}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ConversationCard.tsx && git commit -m "feat: add ConversationCard component"
```

---

### Task 7: Component — ConversationList

**Files:** crea `components/ConversationList.tsx`

- [ ] **Step 1: Scrivi il componente**

`components/ConversationList.tsx`:
```tsx
'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { ConversationCard, ConversationRow } from './ConversationCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ConversationList() {
  const router = useRouter()
  const { data, isLoading, error } = useSWR<ConversationRow[]>(
    '/api/conversations',
    fetcher,
    { refreshInterval: 20000 }
  )

  if (isLoading) return <p className="text-center text-gray-500 py-12">Caricamento...</p>
  if (error)     return <p className="text-center text-red-500 py-12">Errore nel caricamento.</p>
  if (!data?.length) return <p className="text-center text-gray-500 py-12">Nessuna conversazione ancora.</p>

  return (
    <div className="grid gap-3">
      {data.map(conv => (
        <ConversationCard
          key={conv.id}
          conv={conv}
          onClick={() => router.push(`/conversation/${conv.id}`)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ConversationList.tsx && git commit -m "feat: add ConversationList with SWR polling"
```

---

### Task 8: Components — MessageBubble & ChatView

**Files:** crea `components/MessageBubble.tsx`, `components/ChatView.tsx`

- [ ] **Step 1: MessageBubble**

`components/MessageBubble.tsx`:
```tsx
export type Message = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  sent_at: string
}

export function MessageBubble({ message }: { message: Message }) {
  const isInbound = message.direction === 'inbound'
  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm break-words ${
        isInbound
          ? 'bg-gray-100 text-gray-900 rounded-tl-none'
          : 'bg-green-500 text-white rounded-tr-none'
      }`}>
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={`text-xs mt-1 text-right ${isInbound ? 'text-gray-400' : 'text-green-100'}`}>
          {new Date(message.sent_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ChatView**

`components/ChatView.tsx`:
```tsx
import { Message, MessageBubble } from './MessageBubble'

export function ChatView({ messages }: { messages: Message[] }) {
  if (!messages.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Nessun messaggio ancora.
      </div>
    )
  }
  return (
    <div className="flex flex-col p-4 overflow-y-auto h-full">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/MessageBubble.tsx components/ChatView.tsx && git commit -m "feat: add MessageBubble and ChatView components"
```

---

### Task 9: Pagine Home e Dettaglio

**Files:** modifica `app/page.tsx`, crea `app/conversation/[id]/page.tsx`

- [ ] **Step 1: HomePage**

`app/page.tsx`:
```tsx
import { ConversationList } from '@/components/ConversationList'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Lead Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Aggiornamento automatico ogni 20s</p>
        </div>
        <ConversationList />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: ConversationPage**

`app/conversation/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import pool from '@/lib/db'
import { ChatView } from '@/components/ChatView'

const outcomeLabel: Record<string, string> = {
  zoom_call:     'Zoom Call',
  voice_call:    'Call Voce',
  not_qualified: 'Non qualificato',
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const convResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [params.id])
  if (!convResult.rows.length) notFound()
  const conversation = convResult.rows[0]

  const [leadResult, messagesResult] = await Promise.all([
    pool.query('SELECT * FROM leads WHERE id = $1', [conversation.lead_id]),
    pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC', [params.id]),
  ])
  const lead = leadResult.rows[0]
  const messages = messagesResult.rows

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="text-blue-600 hover:underline text-sm mb-6 block">
          ← Torna alla lista
        </Link>
        <div className="flex gap-6" style={{ height: 'calc(100vh - 140px)' }}>
          <aside className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-4">Info Lead</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500">Nome</dt>
                <dd className="font-medium">{lead.first_name} {lead.last_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{lead.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Telefono</dt>
                <dd className="font-medium">{lead.phone}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Attività</dt>
                <dd className="font-medium">{lead.business_desc}</dd>
              </div>
              <hr className="border-gray-100" />
              <div>
                <dt className="text-gray-500">Score</dt>
                <dd className="font-bold text-2xl">
                  {conversation.score !== null ? `${conversation.score}/10` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Esito</dt>
                <dd className="font-medium">
                  {conversation.outcome ? outcomeLabel[conversation.outcome] : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Stato</dt>
                <dd className="font-medium">{conversation.status}</dd>
              </div>
            </dl>
          </aside>
          <section className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <ChatView messages={messages} />
          </section>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verifica in browser**

`http://localhost:3000` → card Mario Rossi → click → sidebar + 3 messaggi di test.

- [ ] **Step 4: Commit**

```bash
git add app/ && git commit -m "feat: add HomePage and ConversationPage"
```

---

### Task 10: n8n — Workflow 1 (Nuovo Lead)

**Files:** crea `n8n/workflow-1-new-lead.json`

- [ ] **Step 1: Crea il file**

`n8n/workflow-1-new-lead.json`:
```json
{
  "name": "WA Bot - Nuovo Lead",
  "nodes": [
    {
      "parameters": { "httpMethod": "POST", "path": "new-lead", "responseMode": "responseNode", "options": {} },
      "id": "webhook", "name": "Webhook",
      "type": "n8n-nodes-base.webhook", "typeVersion": 1, "position": [240, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO leads (first_name, last_name, email, phone, business_desc) VALUES ('{{ $json.body.first_name }}', '{{ $json.body.last_name }}', '{{ $json.body.email }}', '{{ $json.body.phone }}', '{{ $json.body.business_desc }}') RETURNING id, first_name, business_desc, phone;",
        "options": {}
      },
      "id": "insert-lead", "name": "Insert Lead",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [460, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO conversations (lead_id) VALUES ('{{ $json[0].id }}') RETURNING id;",
        "options": {}
      },
      "id": "insert-conv", "name": "Insert Conversation",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [680, 300]
    },
    {
      "parameters": {
        "jsCode": "const lead = $('Insert Lead').first().json[0];\nconst convId = $input.first().json[0].id;\nconst msg = `Ciao ${lead.first_name}! 👋\\nHo visto che ti occupi di: ${lead.business_desc}.\\n\\nQual è la sfida principale che stai cercando di risolvere in questo momento?`;\nreturn [{ json: { to: lead.phone, message: msg, conversation_id: convId } }];"
      },
      "id": "build-msg", "name": "Build First Message",
      "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [900, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.twilio.com/2010-04-01/Accounts/{{ $env.TWILIO_ACCOUNT_SID }}/Messages.json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "sendBody": true,
        "contentType": "form-urlencoded",
        "bodyParameters": {
          "parameters": [
            { "name": "From", "value": "={{ $env.TWILIO_WHATSAPP_NUMBER }}" },
            { "name": "To", "value": "=whatsapp:{{ $json.to }}" },
            { "name": "Body", "value": "={{ $json.message }}" }
          ]
        },
        "options": {}
      },
      "id": "send-wa", "name": "Send WA",
      "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [1120, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO messages (conversation_id, direction, body, twilio_sid) VALUES ('{{ $('Build First Message').first().json.conversation_id }}', 'outbound', '{{ $('Build First Message').first().json.message }}', '{{ $json.sid }}');",
        "options": {}
      },
      "id": "insert-msg", "name": "Insert Outbound Message",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [1340, 300]
    },
    {
      "parameters": { "respondWith": "text", "responseBody": "OK" },
      "id": "respond", "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1, "position": [1560, 300]
    }
  ],
  "connections": {
    "Webhook":               { "main": [[{ "node": "Insert Lead",            "type": "main", "index": 0 }]] },
    "Insert Lead":           { "main": [[{ "node": "Insert Conversation",    "type": "main", "index": 0 }]] },
    "Insert Conversation":   { "main": [[{ "node": "Build First Message",    "type": "main", "index": 0 }]] },
    "Build First Message":   { "main": [[{ "node": "Send WA",               "type": "main", "index": 0 }]] },
    "Send WA":               { "main": [[{ "node": "Insert Outbound Message","type": "main", "index": 0 }]] },
    "Insert Outbound Message": { "main": [[{ "node": "Respond",             "type": "main", "index": 0 }]] }
  },
  "active": false,
  "settings": { "executionOrder": "v1" }
}
```

- [ ] **Step 2: Importa in n8n**

n8n → **Workflows** → **Import from file** → `workflow-1-new-lead.json`

- [ ] **Step 3: Configura credenziali nei nodi Postgres**

Ogni nodo Postgres → seleziona credenziale con `DATABASE_URL` Railway.

- [ ] **Step 4: Configura credenziale HTTP Basic Auth per Twilio**

Nel nodo Send WA → crea credenziale **HTTP Basic Auth**:
- Username: `TWILIO_ACCOUNT_SID`
- Password: `TWILIO_AUTH_TOKEN`

- [ ] **Step 5: Aggiungi variabili ambiente n8n**

n8n Settings → Environment Variables:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

- [ ] **Step 6: Copia il webhook URL**

Nodo Webhook → copia **Production URL** (es. `https://tuon8n.app/webhook/new-lead`). Configura questo URL nel tuo form builder come endpoint POST.

- [ ] **Step 7: Test**

```bash
curl -X POST https://tuon8n.app/webhook/new-lead \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"Lead","email":"test@example.com","phone":"+393331234567","business_desc":"Studio di consulenza aziendale"}'
```
Atteso: messaggio WA arriva sul numero sandbox. Dashboard mostra nuova conversazione.

- [ ] **Step 8: Commit**

```bash
git add n8n/workflow-1-new-lead.json && git commit -m "feat: add n8n workflow 1 - new lead"
```

---

### Task 11: n8n — Workflow 2 (Messaggio in arrivo)

**Files:** crea `n8n/workflow-2-incoming-message.json`

- [ ] **Step 1: Crea il file**

`n8n/workflow-2-incoming-message.json`:
```json
{
  "name": "WA Bot - Messaggio in arrivo",
  "nodes": [
    {
      "parameters": { "httpMethod": "POST", "path": "wa-incoming", "responseMode": "responseNode", "options": {} },
      "id": "twilio-wh", "name": "Twilio Webhook",
      "type": "n8n-nodes-base.webhook", "typeVersion": 1, "position": [240, 400]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT c.id, c.status, l.first_name, l.last_name, l.business_desc, l.phone FROM conversations c JOIN leads l ON l.id = c.lead_id WHERE l.phone = replace('{{ $json.body.From }}', 'whatsapp:', '') ORDER BY c.started_at DESC LIMIT 1;",
        "options": {}
      },
      "id": "find-conv", "name": "Find Conversation",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [460, 400]
    },
    {
      "parameters": {
        "conditions": { "string": [{ "value1": "={{ $json[0].status }}", "operation": "equal", "value2": "completed" }] }
      },
      "id": "check-done", "name": "Already Completed?",
      "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [680, 400]
    },
    {
      "parameters": { "respondWith": "text", "responseBody": "OK" },
      "id": "stop", "name": "Stop",
      "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1, "position": [900, 260]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO messages (conversation_id, direction, body, twilio_sid) VALUES ('{{ $('Find Conversation').first().json[0].id }}', 'inbound', '{{ $('Twilio Webhook').first().json.body.Body }}', '{{ $('Twilio Webhook').first().json.body.MessageSid }}');",
        "options": {}
      },
      "id": "insert-inbound", "name": "Insert Inbound",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [900, 540]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT direction, body FROM messages WHERE conversation_id = '{{ $('Find Conversation').first().json[0].id }}' ORDER BY sent_at ASC;",
        "options": {}
      },
      "id": "get-history", "name": "Get History",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [1120, 540]
    },
    {
      "parameters": {
        "jsCode": "const conv = $('Find Conversation').first().json[0];\nconst history = $input.all().map(i => i.json);\nconst clientName = $env.CLIENT_NAME || 'il nostro team';\n\nconst chatMessages = history.map(m => ({\n  role: m.direction === 'outbound' ? 'assistant' : 'user',\n  content: m.body\n}));\n\nconst systemPrompt = `Sei un assistente di qualificazione commerciale per ${clientName}.\\nIl lead si chiama ${conv.first_name} ${conv.last_name} e si occupa di: ${conv.business_desc}.\\nConduci la conversazione in italiano, in modo naturale e professionale.\\n\\nFai queste domande in sequenza (una alla volta, senza ripetere domande già poste):\\n1. Qual è la sfida principale che stai cercando di risolvere?\\n2. Hai già un budget allocato per questo tipo di soluzione?\\n3. In che arco di tempo vorresti vedere dei risultati?\\n4. Sei tu la persona che prende le decisioni su questo investimento?\\n\\nDopo aver raccolto le risposte a tutte le domande, assegna un punteggio da 0 a 10.\\n\\nRispondi SEMPRE e SOLO con JSON valido, senza markdown:\\n{\\\"message\\\": \\\"testo da inviare\\\", \\\"score\\\": null, \\\"is_final\\\": false}\\n\\nQuando hai tutte le informazioni:\\n{\\\"message\\\": \\\"messaggio finale senza link calendly\\\", \\\"score\\\": 8, \\\"is_final\\\": true}`;\n\nconst requestBody = JSON.stringify({\n  model: 'gpt-4o',\n  messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],\n  response_format: { type: 'json_object' },\n  temperature: 0.7\n});\n\nreturn [{ json: {\n  requestBody,\n  conversation_id: conv.id,\n  phone: $('Twilio Webhook').first().json.body.From\n} }];"
      },
      "id": "build-prompt", "name": "Build GPT Prompt",
      "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1340, 540]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.openai.com/v1/chat/completions",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": { "parameters": [{ "name": "Content-Type", "value": "application/json" }] },
        "sendBody": true,
        "contentType": "raw",
        "body": "={{ $json.requestBody }}",
        "options": {}
      },
      "id": "gpt4o", "name": "GPT-4o",
      "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [1560, 540]
    },
    {
      "parameters": {
        "jsCode": "const raw = $input.first().json.choices[0].message.content;\nlet parsed;\ntry { parsed = JSON.parse(raw); } catch(e) {\n  const m = raw.match(/\\{[\\s\\S]*\\}/);\n  parsed = m ? JSON.parse(m[0]) : { message: raw, score: null, is_final: false };\n}\nconst prev = $('Build GPT Prompt').first().json;\nreturn [{ json: { ...parsed, conversation_id: prev.conversation_id, phone: prev.phone } }];"
      },
      "id": "parse-gpt", "name": "Parse GPT",
      "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1780, 540]
    },
    {
      "parameters": {
        "conditions": { "boolean": [{ "value1": "={{ $json.is_final }}", "operation": "equal", "value2": true }] }
      },
      "id": "is-final", "name": "Is Final?",
      "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [2000, 540]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.twilio.com/2010-04-01/Accounts/{{ $env.TWILIO_ACCOUNT_SID }}/Messages.json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "sendBody": true,
        "contentType": "form-urlencoded",
        "bodyParameters": { "parameters": [
          { "name": "From", "value": "={{ $env.TWILIO_WHATSAPP_NUMBER }}" },
          { "name": "To",   "value": "={{ $json.phone }}" },
          { "name": "Body", "value": "={{ $json.message }}" }
        ]},
        "options": {}
      },
      "id": "send-interim", "name": "Send Interim WA",
      "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [2220, 400]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO messages (conversation_id, direction, body) VALUES ('{{ $('Parse GPT').first().json.conversation_id }}', 'outbound', '{{ $('Parse GPT').first().json.message }}');",
        "options": {}
      },
      "id": "insert-interim", "name": "Insert Interim",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [2440, 400]
    },
    {
      "parameters": {
        "jsCode": "const d = $input.first().json;\nconst score = d.score;\nlet outcome, finalMessage;\nif (score >= 7) {\n  outcome = 'zoom_call';\n  finalMessage = `${d.message}\\n\\n📅 Prenota la tua call Zoom qui: ${$env.CALENDLY_ZOOM_LINK}`;\n} else if (score >= 4) {\n  outcome = 'voice_call';\n  finalMessage = `${d.message}\\n\\n📞 Prenota la tua chiamata qui: ${$env.CALENDLY_VOICE_LINK}`;\n} else {\n  outcome = 'not_qualified';\n  finalMessage = d.message;\n}\nreturn [{ json: { ...d, outcome, finalMessage } }];"
      },
      "id": "build-final", "name": "Build Final Message",
      "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [2220, 680]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE conversations SET status='completed', score={{ $json.score }}, outcome='{{ $json.outcome }}', completed_at=now(), calendly_sent={{ $json.outcome !== 'not_qualified' }} WHERE id='{{ $json.conversation_id }}';",
        "options": {}
      },
      "id": "update-conv", "name": "Update Conversation",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [2440, 680]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.twilio.com/2010-04-01/Accounts/{{ $env.TWILIO_ACCOUNT_SID }}/Messages.json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "sendBody": true,
        "contentType": "form-urlencoded",
        "bodyParameters": { "parameters": [
          { "name": "From", "value": "={{ $env.TWILIO_WHATSAPP_NUMBER }}" },
          { "name": "To",   "value": "={{ $('Build Final Message').first().json.phone }}" },
          { "name": "Body", "value": "={{ $('Build Final Message').first().json.finalMessage }}" }
        ]},
        "options": {}
      },
      "id": "send-final", "name": "Send Final WA",
      "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [2660, 680]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO messages (conversation_id, direction, body) VALUES ('{{ $('Build Final Message').first().json.conversation_id }}', 'outbound', '{{ $('Build Final Message').first().json.finalMessage }}');",
        "options": {}
      },
      "id": "insert-final", "name": "Insert Final Message",
      "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [2880, 680]
    },
    {
      "parameters": { "respondWith": "text", "responseBody": "OK" },
      "id": "respond-end", "name": "Respond End",
      "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1, "position": [3100, 540]
    }
  ],
  "connections": {
    "Twilio Webhook":    { "main": [[{ "node": "Find Conversation",    "type": "main", "index": 0 }]] },
    "Find Conversation": { "main": [[{ "node": "Already Completed?",   "type": "main", "index": 0 }]] },
    "Already Completed?":{ "main": [
      [{ "node": "Stop",            "type": "main", "index": 0 }],
      [{ "node": "Insert Inbound",  "type": "main", "index": 0 }]
    ]},
    "Insert Inbound":    { "main": [[{ "node": "Get History",          "type": "main", "index": 0 }]] },
    "Get History":       { "main": [[{ "node": "Build GPT Prompt",     "type": "main", "index": 0 }]] },
    "Build GPT Prompt":  { "main": [[{ "node": "GPT-4o",              "type": "main", "index": 0 }]] },
    "GPT-4o":            { "main": [[{ "node": "Parse GPT",           "type": "main", "index": 0 }]] },
    "Parse GPT":         { "main": [[{ "node": "Is Final?",           "type": "main", "index": 0 }]] },
    "Is Final?":         { "main": [
      [{ "node": "Build Final Message", "type": "main", "index": 0 }],
      [{ "node": "Send Interim WA",     "type": "main", "index": 0 }]
    ]},
    "Send Interim WA":       { "main": [[{ "node": "Insert Interim",      "type": "main", "index": 0 }]] },
    "Insert Interim":        { "main": [[{ "node": "Respond End",         "type": "main", "index": 0 }]] },
    "Build Final Message":   { "main": [[{ "node": "Update Conversation", "type": "main", "index": 0 }]] },
    "Update Conversation":   { "main": [[{ "node": "Send Final WA",      "type": "main", "index": 0 }]] },
    "Send Final WA":         { "main": [[{ "node": "Insert Final Message","type": "main", "index": 0 }]] },
    "Insert Final Message":  { "main": [[{ "node": "Respond End",        "type": "main", "index": 0 }]] }
  },
  "active": false,
  "settings": { "executionOrder": "v1" }
}
```

- [ ] **Step 2: Importa in n8n**

n8n → **Workflows** → **Import from file** → `workflow-2-incoming-message.json`

- [ ] **Step 3: Configura credenziali**

- Tutti i nodi Postgres → credenziale Railway Postgres
- Nodi HTTP Twilio → stessa credenziale HTTP Basic Auth del Workflow 1
- Nodo GPT-4o → crea credenziale **HTTP Header Auth**: `Authorization` = `Bearer sk-...`

- [ ] **Step 4: Aggiungi variabili ambiente n8n**

n8n Settings → Environment Variables (aggiungi alle esistenti):
```
CLIENT_NAME=Nome Cliente Demo
CALENDLY_ZOOM_LINK=https://calendly.com/tuolink/zoom
CALENDLY_VOICE_LINK=https://calendly.com/tuolink/call
OPENAI_API_KEY=sk-...
```

- [ ] **Step 5: Configura Twilio Sandbox**

Twilio Console → Messaging → Try it out → Send a WhatsApp message:
- **WHEN A MESSAGE COMES IN**: `https://tuon8n.app/webhook/wa-incoming` (Method: HTTP POST)

- [ ] **Step 6: Test end-to-end**

1. Dal telefono: manda `join <sandbox-keyword>` al numero Twilio sandbox
2. Esegui il curl del Task 10 Step 7 con il tuo numero reale come `phone`
3. Verifica che arrivi il primo messaggio WA
4. Rispondi alle 4 domande BANT
5. Verifica messaggio finale con link Calendly
6. Dashboard: conversazione deve mostrare `status=completed`, score e outcome corretti

- [ ] **Step 7: Commit**

```bash
git add n8n/workflow-2-incoming-message.json && git commit -m "feat: add n8n workflow 2 - GPT-4o qualification"
```

---

### Task 12: Deploy Railway

**Files:** crea `.env.example`, `railway.json`

- [ ] **Step 1: .env.example**

`.env.example`:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

OPENAI_API_KEY=sk-...

CALENDLY_ZOOM_LINK=https://calendly.com/tuolink/zoom
CALENDLY_VOICE_LINK=https://calendly.com/tuolink/call

CLIENT_NAME=Nome Cliente Demo
```

- [ ] **Step 2: railway.json**

`railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- [ ] **Step 3: Push su GitHub**

```bash
git add .env.example railway.json && git commit -m "feat: add deployment config"
gh repo create whatsappChatbot --public --source=. --push
```

- [ ] **Step 4: Collega Railway**

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → seleziona `whatsappChatbot`
2. Railway aggiunge `DATABASE_URL` automaticamente
3. Settings → Variables → aggiungi le variabili mancanti da `.env.example`

- [ ] **Step 5: Esegui schema in produzione**

```bash
psql $DATABASE_URL -f sql/schema.sql
```

- [ ] **Step 6: Verifica**

Apri l'URL Railway → dashboard visibile con le conversazioni.

- [ ] **Step 7: Commit finale**

```bash
git push
```
