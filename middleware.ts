import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/verify-email(.*)',
  '/',                 // Landing page
  '/api/upload/webhook', 
  '/api/webhooks(.*)' 
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/videos',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth(); 
  const currentUrl = new URL(req.url);
  const isAccessingDashboard = currentUrl.pathname === '/dashboard';
  const isApiRequest = currentUrl.pathname.startsWith('/api');

  if (userId && isPublicRoute(req) && !isAccessingDashboard) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!userId) {
    if (!isPublicRoute(req) && !isPublicApiRoute(req)) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    if (isApiRequest && !isPublicApiRoute(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
