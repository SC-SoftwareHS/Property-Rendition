import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

async function getHealth() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ??
    'http://localhost:3002';
  const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }

  return (await res.json()) as { status: string };
}

export default async function Dashboard() {
  let healthStatus = 'unknown';

  try {
    const health = await getHealth();
    healthStatus = health.status ?? 'unknown';
  } catch {
    healthStatus = 'unreachable';
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-sm text-slate-500">
        API health: <span className="font-medium text-slate-900">{healthStatus}</span>
      </p>
      <SignedIn>
        <p className="text-slate-700">You are signed in. Next: firm setup.</p>
      </SignedIn>
      <SignedOut>
        <p className="text-slate-700">You are signed out.</p>
        <Link className="text-slate-900 underline" href="/sign-in">
          Sign in
        </Link>
      </SignedOut>
    </main>
  );
}
