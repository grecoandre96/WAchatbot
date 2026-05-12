import { NextResponse } from 'next/server'
import pool from '@/lib/db'

const MOCK_CONVERSATIONS = [
  { id: 'mock-1', status: 'completed', score: 9, outcome: 'zoom_call',     started_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 1800000).toISOString(), first_name: 'Marco',  last_name: 'Ferrari',  phone: '+393331234567' },
  { id: 'mock-2', status: 'completed', score: 5, outcome: 'voice_call',    started_at: new Date(Date.now() - 7200000).toISOString(), completed_at: new Date(Date.now() - 5400000).toISOString(), first_name: 'Giulia', last_name: 'Bianchi',  phone: '+393479876543' },
  { id: 'mock-3', status: 'active',    score: null, outcome: null,         started_at: new Date(Date.now() - 900000).toISOString(),  completed_at: null,                                          first_name: 'Luca',   last_name: 'Romano',   phone: '+393201112233' },
  { id: 'mock-4', status: 'completed', score: 2, outcome: 'not_qualified', started_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 82800000).toISOString(), first_name: 'Sara',   last_name: 'Esposito', phone: '+393664445566' },
]

export async function GET() {
  try {
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
  } catch {
    return NextResponse.json(MOCK_CONVERSATIONS)
  }
}
