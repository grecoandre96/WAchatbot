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
