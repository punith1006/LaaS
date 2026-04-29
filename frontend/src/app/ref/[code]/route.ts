import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  // Create redirect response to signup page
  const response = NextResponse.redirect(new URL('/signup', request.url));
  
  // Set referral code cookie
  response.cookies.set('laas_ref_code', code, {
    maxAge: 90 * 24 * 60 * 60, // 90 days
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  });
  
  // Fire-and-forget click tracking
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  fetch(`${backendUrl}/api/referral/track-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  }).catch(() => {}); // Ignore errors
  
  return response;
}
