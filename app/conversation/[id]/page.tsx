import { notFound } from 'next/navigation'
import Link from 'next/link'
import pool from '@/lib/db'
import { ChatView } from '@/components/ChatView'

const outcomeLabel: Record<string, string> = {
  zoom_call:     'Zoom Call',
  voice_call:    'Call Voce',
  not_qualified: 'Non qualificato',
}

// Mock data per demo senza DB — rimosso in produzione
async function fetchConversationData(id: string) {
  try {
    const convResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [id])
    if (!convResult.rows.length) return null
    const conversation = convResult.rows[0]
    const [leadResult, messagesResult] = await Promise.all([
      pool.query('SELECT * FROM leads WHERE id = $1', [conversation.lead_id]),
      pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC', [id]),
    ])
    return { conversation, lead: leadResult.rows[0], messages: messagesResult.rows }
  } catch {
    const res = await fetch(`http://localhost:3000/api/conversations/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  }
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const data = await fetchConversationData(params.id)
  if (!data) notFound()
  const { conversation, lead, messages } = data

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
