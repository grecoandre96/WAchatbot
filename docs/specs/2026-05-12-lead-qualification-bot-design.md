# Lead Qualification Bot — Design Spec
**Data:** 2026-05-12  
**Stato:** Approvato  
**Stack:** n8n · Twilio WhatsApp · OpenAI GPT-4o · Calendly · Next.js · Postgres · Railway

---

## 1. Obiettivo

Demo per nuovo cliente: automazione completa del processo di qualificazione lead via WhatsApp. Il lead compila un form, un bot AI lo contatta su WhatsApp con 3-4 domande BANT, assegna un punteggio e invia automaticamente il link Calendly corretto (Zoom o call voce) oppure un messaggio di chiusura.

Una dashboard read-only su Railway mostra in tempo reale (polling 20s) tutte le conversazioni, i punteggi e gli esiti.

---

## 2. Architettura

```
[Form Builder Railway]
        │ webhook POST
        ▼
[n8n]
  ├─ Workflow 1: Nuovo Lead
  │   └─ Salva su Postgres → invia primo WA
  │
  └─ Workflow 2: Messaggio in arrivo (Twilio webhook)
      └─ GPT-4o qualifica → risponde su WA → salva su Postgres
                                │
                          [Postgres Railway]
                                │
                    [Next.js Dashboard Railway]
                         polling ogni 20s
```

**Principi:**
- n8n scrive direttamente su Postgres (nodo nativo)
- Next.js è pura UI read-only, nessuna logica di business
- Twilio webhook punta a n8n (non al backend)
- Single-tenant per la demo (nessuna tabella `clients`)
- Nessuna autenticazione per ora

---

## 3. Schema Database

### `leads`
| Campo | Tipo | Note |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | |
| phone | TEXT | Formato E.164 (+39...) |
| business_desc | TEXT | Dal form |
| created_at | TIMESTAMP | DEFAULT now() |

### `conversations`
| Campo | Tipo | Note |
|---|---|---|
| id | UUID PK | |
| lead_id | UUID FK | → leads.id |
| status | TEXT | 'active' \| 'completed' \| 'failed' |
| score | INTEGER | 0-10, NULL finché attiva |
| outcome | TEXT | 'zoom_call' \| 'voice_call' \| 'not_qualified' \| NULL |
| calendly_sent | BOOLEAN | DEFAULT false |
| started_at | TIMESTAMP | DEFAULT now() |
| completed_at | TIMESTAMP | NULL finché attiva |

### `messages`
| Campo | Tipo | Note |
|---|---|---|
| id | UUID PK | |
| conversation_id | UUID FK | → conversations.id |
| direction | TEXT | 'inbound' \| 'outbound' |
| body | TEXT | |
| sent_at | TIMESTAMP | DEFAULT now() |
| twilio_sid | TEXT | Nullable, per debug |

**Logica score → outcome:**
```
score 7-10  →  zoom_call      (link Calendly Zoom)
score 4-6   →  voice_call     (link Calendly call voce)
score 0-3   →  not_qualified  (messaggio chiusura)
```

---

## 4. Flusso n8n

### Workflow 1 — Nuovo Lead
**Trigger:** webhook POST dal form builder

```
[Webhook Trigger]
        │ { first_name, last_name, email, phone, business_desc }
[Postgres: INSERT lead]
        │
[Postgres: INSERT conversation]  ← status='active'
        │
[Function: build primo messaggio]
  "Ciao [Nome]! Ho visto che ti occupi di [business_desc].
   Qual è la sfida principale che stai cercando di risolvere?"
        │
[Twilio: send WA message]
        │
[Postgres: INSERT message]  ← direction='outbound'
```

### Workflow 2 — Messaggio in arrivo
**Trigger:** Twilio webhook POST

```
[Webhook Trigger]  ← { From, Body, MessageSid }
        │
[Postgres: SELECT conversation attiva by phone]
        │
[IF: status = 'completed']
  YES → STOP
  NO  ↓
[Postgres: INSERT message]  ← direction='inbound'
        │
[Postgres: SELECT history]  ← tutti i messaggi della conversazione
        │
[OpenAI GPT-4o]  ← system prompt + history
        │
[IF: is_final = true]
  NO  → [Twilio: send message]
         [Postgres: INSERT message outbound]

  YES → [Postgres: UPDATE conversation]  ← score, outcome, status, completed_at
         [Function: scegli link Calendly]
         [Twilio: send messaggio finale]
         [Postgres: INSERT message outbound + calendly_sent=true]
```

### System Prompt GPT-4o
```
Sei un assistente di qualificazione commerciale per [nome cliente].
Il lead si chiama [Nome] [Cognome] e si occupa di: [business_desc].
Conduci la conversazione in italiano, in modo naturale e professionale.

Fai queste domande in sequenza (una alla volta):
1. Qual è la sfida principale che stai cercando di risolvere?
2. Hai già un budget allocato per questo tipo di soluzione?
3. In che arco di tempo vorresti vedere dei risultati?
4. Sei tu la persona che prende le decisioni su questo investimento?

Dopo aver raccolto tutte le risposte, assegna un punteggio da 0 a 10.

Rispondi SEMPRE e SOLO con JSON valido:
{
  "message": "testo da inviare al lead",
  "score": null,
  "is_final": false
}

Quando hai tutte le informazioni necessarie:
{
  "message": "testo del messaggio finale (senza link, lo aggiunge n8n)",
  "score": 8,
  "is_final": true
}
```

---

## 5. Dashboard Next.js

### Struttura file
```
app/
  page.tsx                        ← HomePage (lista conversazioni)
  conversation/[id]/page.tsx      ← ConversationPage (dettaglio)
  api/
    conversations/
      route.ts                    ← GET /api/conversations
      [id]/route.ts               ← GET /api/conversations/[id]
components/
  ConversationCard.tsx
  ConversationList.tsx
  ChatView.tsx
  MessageBubble.tsx
lib/
  db.ts                           ← connessione Postgres (pg)
```

### API Routes

**GET /api/conversations**
```sql
SELECT c.id, c.status, c.score, c.outcome, c.started_at,
       l.first_name, l.last_name, l.phone
FROM conversations c
JOIN leads l ON l.id = c.lead_id
ORDER BY c.started_at DESC
```
Risposta: `[{ id, status, score, outcome, started_at, first_name, last_name, phone }]`

**GET /api/conversations/[id]**
```sql
SELECT * FROM conversations WHERE id = $1
SELECT * FROM leads WHERE id = conversation.lead_id
SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC
```
Risposta: `{ lead, conversation, messages }`

### Componenti

**HomePage**
- `ConversationList` con SWR polling ogni 20s su `/api/conversations`
- Per ogni conversazione: `ConversationCard` con nome lead, badge status (active/completed/failed), badge outcome (zoom_call/voice_call/not_qualified), score, timestamp

**ConversationPage**
- Sidebar sinistra: dati lead (nome, email, telefono, descrizione attività)
- Area destra: `ChatView` con lista messaggi
- `MessageBubble`: bolla sinistra per inbound (lead), bolla destra per outbound (bot)

### Badge colori
| Valore | Colore |
|---|---|
| active | Giallo |
| completed | Verde |
| failed | Rosso |
| zoom_call | Blu |
| voice_call | Azzurro |
| not_qualified | Grigio |

---

## 6. Variabili d'ambiente

```env
# Postgres
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  ← sandbox

# OpenAI
OPENAI_API_KEY=...

# Calendly
CALENDLY_ZOOM_LINK=https://calendly.com/...
CALENDLY_VOICE_LINK=https://calendly.com/...

# Cliente (iniettato nel system prompt)
CLIENT_NAME=Nome Cliente Demo
```

---

## 7. Deployment Railway

- **Servizio 1:** Next.js app (build da GitHub, auto-deploy)
- **Servizio 2:** Postgres (plugin Railway nativo)
- n8n gira separatamente (istanza esistente dell'utente)
- Twilio sandbox punta al webhook URL n8n pubblico

---

## 8. Scope fuori dalla demo

Queste feature sono escluse dalla demo e verranno aggiunte in produzione:

- Autenticazione dashboard
- Multi-tenant (tabella `clients`, routing per numero WA)
- Risposta manuale dalla dashboard
- Real-time WebSocket
- Rate limiting su webhook
- Retry logic messaggi falliti
