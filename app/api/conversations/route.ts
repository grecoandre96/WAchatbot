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
