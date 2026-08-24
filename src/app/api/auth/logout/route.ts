import { NextResponse } from 'next/server';
import { USER_AUTH_CONFIG } from '@/lib/user-auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  // Clear cookie
  response.cookies.set({
    name: USER_AUTH_CONFIG.sessionCookieName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
