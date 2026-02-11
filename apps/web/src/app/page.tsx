import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">RenditionReady</h1>
        <UserButton />
      </header>

      <section className="space-y-4">
        <p className="text-lg text-slate-700">
          Managed property rendition workflow for multi-client CPA firms.
        </p>
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-md bg-slate-900 px-4 py-2 text-white">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-md bg-slate-900 px-4 py-2 text-white"
            >
              Go to dashboard
            </Link>
          </SignedIn>
        </div>
      </section>
    </main>
  );
}
