import { NextResponse } from 'next/server'
import pool from '@/lib/db'

const MOCK_DETAIL: Record<string, object> = {
  'mock-1': {
    conversation: { id: 'mock-1', lead_id: 'lead-1', status: 'completed', score: 9, outcome: 'zoom_call', calendly_sent: true, started_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 1800000).toISOString() },
    lead: { id: 'lead-1', first_name: 'Marco', last_name: 'Ferrari', email: 'marco@ferrari.it', phone: '+393331234567', business_desc: 'Agenzia di marketing digitale — gestisco campagne per PMI nel settore retail' },
    messages: [
      { id: 'm1', conversation_id: 'mock-1', direction: 'outbound', body: 'Ciao Marco! 👋\nHo visto che ti occupi di: Agenzia di marketing digitale — gestisco campagne per PMI nel settore retail.\n\nQual è la sfida principale che stai cercando di risolvere in questo momento?', sent_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm2', conversation_id: 'mock-1', direction: 'inbound',  body: 'Il problema principale è che i miei clienti vogliono più lead qualificati ma con budget limitati. Sto cercando un sistema di automazione.', sent_at: new Date(Date.now() - 3540000).toISOString() },
      { id: 'm3', conversation_id: 'mock-1', direction: 'outbound', body: 'Capito, è una sfida molto comune! Hai già un budget allocato per questo tipo di soluzione?', sent_at: new Date(Date.now() - 3480000).toISOString() },
      { id: 'm4', conversation_id: 'mock-1', direction: 'inbound',  body: 'Sì, ho circa 500-800€ al mese da investire per questa cosa.', sent_at: new Date(Date.now() - 3420000).toISOString() },
      { id: 'm5', conversation_id: 'mock-1', direction: 'outbound', body: 'Perfetto! In che arco di tempo vorresti vedere dei risultati?', sent_at: new Date(Date.now() - 3360000).toISOString() },
      { id: 'm6', conversation_id: 'mock-1', direction: 'inbound',  body: 'Idealmente entro 2-3 mesi vorrei avere il sistema operativo.', sent_at: new Date(Date.now() - 3300000).toISOString() },
      { id: 'm7', conversation_id: 'mock-1', direction: 'outbound', body: 'Ottimo! Ultima domanda: sei tu la persona che prende le decisioni su questo tipo di investimento?', sent_at: new Date(Date.now() - 3240000).toISOString() },
      { id: 'm8', conversation_id: 'mock-1', direction: 'inbound',  body: 'Sì, sono il titolare dell\'agenzia, decido tutto io.', sent_at: new Date(Date.now() - 3180000).toISOString() },
      { id: 'm9', conversation_id: 'mock-1', direction: 'outbound', body: 'Grazie Marco, ho tutte le informazioni che mi servono! Sei un lead molto qualificato per la nostra soluzione.\n\n📅 Prenota la tua call Zoom qui: https://calendly.com/demo/zoom', sent_at: new Date(Date.now() - 1800000).toISOString() },
    ],
  },
  'mock-2': {
    conversation: { id: 'mock-2', lead_id: 'lead-2', status: 'completed', score: 5, outcome: 'voice_call', calendly_sent: true, started_at: new Date(Date.now() - 7200000).toISOString(), completed_at: new Date(Date.now() - 5400000).toISOString() },
    lead: { id: 'lead-2', first_name: 'Giulia', last_name: 'Bianchi', email: 'giulia@studiob.it', phone: '+393479876543', business_desc: 'Studio di consulenza HR per aziende medie' },
    messages: [
      { id: 'n1', conversation_id: 'mock-2', direction: 'outbound', body: 'Ciao Giulia! 👋\nHo visto che ti occupi di: Studio di consulenza HR.\n\nQual è la sfida principale che stai cercando di risolvere?', sent_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 'n2', conversation_id: 'mock-2', direction: 'inbound',  body: 'Vorrei automatizzare il processo di selezione candidati.', sent_at: new Date(Date.now() - 7140000).toISOString() },
      { id: 'n3', conversation_id: 'mock-2', direction: 'outbound', body: 'Interessante! Hai già un budget allocato?', sent_at: new Date(Date.now() - 7080000).toISOString() },
      { id: 'n4', conversation_id: 'mock-2', direction: 'inbound',  body: 'Non ancora, devo ancora valutare quanto investire.', sent_at: new Date(Date.now() - 7020000).toISOString() },
      { id: 'n5', conversation_id: 'mock-2', direction: 'outbound', body: 'Capito. In che arco di tempo vorresti vedere risultati?', sent_at: new Date(Date.now() - 6960000).toISOString() },
      { id: 'n6', conversation_id: 'mock-2', direction: 'inbound',  body: 'Entro 6 mesi andrebbe bene.', sent_at: new Date(Date.now() - 6900000).toISOString() },
      { id: 'n7', conversation_id: 'mock-2', direction: 'outbound', body: 'Sei la persona che decide su questo tipo di investimento?', sent_at: new Date(Date.now() - 6840000).toISOString() },
      { id: 'n8', conversation_id: 'mock-2', direction: 'inbound',  body: 'Insieme al mio socio, sì.', sent_at: new Date(Date.now() - 6780000).toISOString() },
      { id: 'n9', conversation_id: 'mock-2', direction: 'outbound', body: 'Grazie Giulia! Ti propongo una chiamata rapida per esplorare le opzioni insieme.\n\n📞 Prenota la tua chiamata qui: https://calendly.com/demo/call', sent_at: new Date(Date.now() - 5400000).toISOString() },
    ],
  },
  'mock-3': {
    conversation: { id: 'mock-3', lead_id: 'lead-3', status: 'active', score: null, outcome: null, calendly_sent: false, started_at: new Date(Date.now() - 900000).toISOString(), completed_at: null },
    lead: { id: 'lead-3', first_name: 'Luca', last_name: 'Romano', email: 'luca@romanotech.it', phone: '+393201112233', business_desc: 'Startup SaaS nel settore logistica' },
    messages: [
      { id: 'p1', conversation_id: 'mock-3', direction: 'outbound', body: 'Ciao Luca! 👋\nHo visto che ti occupi di: Startup SaaS nel settore logistica.\n\nQual è la sfida principale che stai cercando di risolvere?', sent_at: new Date(Date.now() - 900000).toISOString() },
      { id: 'p2', conversation_id: 'mock-3', direction: 'inbound',  body: 'Dobbiamo aumentare i nostri clienti enterprise, il nostro funnel attuale è troppo lento.', sent_at: new Date(Date.now() - 840000).toISOString() },
      { id: 'p3', conversation_id: 'mock-3', direction: 'outbound', body: 'Capito, è una priorità chiara! Hai già un budget allocato per questo?', sent_at: new Date(Date.now() - 780000).toISOString() },
    ],
  },
  'mock-4': {
    conversation: { id: 'mock-4', lead_id: 'lead-4', status: 'completed', score: 2, outcome: 'not_qualified', calendly_sent: false, started_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 82800000).toISOString() },
    lead: { id: 'lead-4', first_name: 'Sara', last_name: 'Esposito', email: 'sara@gmail.com', phone: '+393664445566', business_desc: 'Freelance grafica, cerco clienti occasionali' },
    messages: [
      { id: 'q1', conversation_id: 'mock-4', direction: 'outbound', body: 'Ciao Sara! 👋\nHo visto che ti occupi di: Freelance grafica.\n\nQual è la sfida principale che stai cercando di risolvere?', sent_at: new Date(Date.now() - 86400000).toISOString() },
      { id: 'q2', conversation_id: 'mock-4', direction: 'inbound',  body: 'Cerco qualcuno che mi aiuti a trovare clienti ogni tanto.', sent_at: new Date(Date.now() - 86340000).toISOString() },
      { id: 'q3', conversation_id: 'mock-4', direction: 'outbound', body: 'Capito! Hai un budget dedicato per questo tipo di servizio?', sent_at: new Date(Date.now() - 86280000).toISOString() },
      { id: 'q4', conversation_id: 'mock-4', direction: 'inbound',  body: 'Non proprio, dipende da quanto costa. Preferirei qualcosa gratis o quasi.', sent_at: new Date(Date.now() - 86220000).toISOString() },
      { id: 'q5', conversation_id: 'mock-4', direction: 'outbound', body: 'Grazie Sara per le informazioni! Al momento la nostra soluzione non si adatta perfettamente alle tue esigenze. Ti auguro buona fortuna con la tua attività! 😊', sent_at: new Date(Date.now() - 82800000).toISOString() },
    ],
  },
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
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
  } catch {
    const mock = MOCK_DETAIL[id]
    if (!mock) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(mock)
  }
}
