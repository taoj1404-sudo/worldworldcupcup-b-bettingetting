/**
 * 简单的测试端点，用于调试
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('[TEST_ENDPOINT] POST /api/test called')
  
  try {
    const body = await req.json()
    console.log('[TEST_ENDPOINT] Body:', JSON.stringify(body))
    return NextResponse.json({ 
      received: true, 
      body,
      headers: Object.fromEntries(req.headers.entries())
    })
  } catch (e: any) {
    console.error('[TEST_ENDPOINT] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
