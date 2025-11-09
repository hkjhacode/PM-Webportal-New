import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireRoles } from '@/lib/auth';

/**
 * /api/ai
 * Traceability: FR-15, FR-16 — AI chatbot queries and auto-suggestions.
 * Stubbed for MVP; integrates with Gemini via GEMINI_API_KEY when configured.
 */

export const runtime = 'nodejs';

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  return NextResponse.json({ status: 'ok', provider: 'gemini', configured: hasKey });
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!requireRoles(user, ['Super Admin', 'PMO/CEONITI', 'State Advisor', 'Div YP', 'State Div HOD'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const query: string | undefined = body?.query;
  const context = body?.context ?? {};

  if (!query) {
    return NextResponse.json({ error: 'Missing "query" in body' }, { status: 400 });
  }

  // Integrate Gemini free-tier via REST API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY not configured',
        result: `AI not configured. Stub answer for: ${query}`,
        provider: 'gemini',
        configured: false,
      },
      { status: 501 }
    );
  }

  try {
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: query }],
            },
          ],
        }),
      }
    );
    const json = await resp.json();
    // Extract plain text from Gemini response safely
    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      json?.candidates?.[0]?.output ||
      JSON.stringify(json);
    return NextResponse.json({
      result: text,
      provider: 'gemini',
      configured: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Gemini request failed',
        details: err?.message || String(err),
      },
      { status: 502 }
    );
  }
}
