// Server-side AI proxy for the University Copilot.
// Keeps GROQ_API_KEY on the server and only answers signed-in users.
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAWF57TakNaSkGXCRpw_Ig5NSxAVSozCvg'

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

/** Checks a Firebase ID token with Google's Identity Toolkit (no Admin SDK needed). */
async function verifyFirebaseToken(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      cache: 'no-store',
    })
    if (!r.ok) return false
    const data = await r.json()
    return Array.isArray(data.users) && data.users.length > 0
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const key = process.env.GROQ_API_KEY || ''
  if (!key) {
    return Response.json({ error: 'not_configured', message: 'The AI Copilot isn’t set up yet. Add GROQ_API_KEY in the hosting settings.' }, { status: 503 })
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!(await verifyFirebaseToken(token))) {
    return Response.json({ error: 'unauthorized', message: 'Please sign in again.' }, { status: 401 })
  }

  let body: { messages?: Msg[]; max_tokens?: number; temperature?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'bad_request', message: 'Invalid request.' }, { status: 400 })
  }
  const messages = (body.messages || [])
    .filter(m => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
    .slice(-16)
    .map(m => ({ role: m.role, content: m.content.slice(0, 12000) }))
  if (!messages.length) {
    return Response.json({ error: 'bad_request', message: 'Nothing to answer.' }, { status: 400 })
  }

  try {
    const r = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: Math.min(1, Math.max(0, body.temperature ?? 0.4)),
        max_tokens: Math.min(1500, body.max_tokens ?? 800),
      }),
    })
    if (!r.ok) {
      console.error('[api/ai] Groq error', r.status, await r.text())
      return Response.json(
        { error: 'upstream', message: r.status === 429 ? 'The AI is busy right now. Try again in a minute.' : 'The AI service had a problem. Try again.' },
        { status: 502 },
      )
    }
    const data = await r.json()
    return Response.json({ text: data.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    console.error('[api/ai] unexpected', err)
    return Response.json({ error: 'upstream', message: 'Couldn’t reach the AI service. Try again.' }, { status: 502 })
  }
}
