import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import {
  FileText,
  Calculator,
  Download,
  Users,
  ArrowRight,
  Check,
  Shield,
  Clock,
  RefreshCw,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Calculator,
    title: 'Auto Depreciation',
    description:
      'State-specific percent-good and straight-line depreciation calculated automatically from PTAD, OTC, and FL DOR schedules.',
  },
  {
    icon: FileText,
    title: 'Multi-State PDF Forms',
    description:
      'Generate TX Form 50-144, OK Form 901, and FL DR-405/DR-405EZ with one click. Every field filled automatically.',
  },
  {
    icon: Download,
    title: 'Batch Generation & Export',
    description:
      'Generate renditions in bulk and download as a ZIP. Export data to CSV, Excel, or JSON anytime.',
  },
  {
    icon: RefreshCw,
    title: 'Year-Over-Year Rollover',
    description:
      'Roll assets forward to the next tax year with frozen snapshots. Edit new year data without changing prior filings.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Invite preparers and reviewers. Role-based access controls ensure the right people approve and file.',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description:
      'SOC 2 ready architecture. Encrypted at rest and in transit. Hosted on Supabase with automatic backups.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 29,
    period: '/mo',
    features: ['1 user', '25 clients', 'TX, OK, FL', 'PDF generation', 'Data export'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: 79,
    period: '/mo',
    features: [
      '5 users',
      'Unlimited clients',
      'All supported states',
      'Batch generation + ZIP',
      'Year-over-year rollover',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Firm',
    price: 149,
    period: '/mo',
    features: [
      'Unlimited users',
      'Unlimited clients',
      'All supported states',
      'Priority support',
      'Custom branding (coming soon)',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
];

const FAQ = [
  {
    q: 'What states are supported?',
    a: 'Currently Texas (Form 50-144), Oklahoma (Form 901), and Florida (DR-405 and DR-405EZ). We\'re expanding to additional states based on customer demand.',
  },
  {
    q: 'Do I need to enter depreciation schedules manually?',
    a: 'No. RenditionReady ships with official depreciation schedules from the Texas PTAD, Oklahoma Tax Commission, and Florida Department of Revenue. They\'re applied automatically based on asset category and acquisition year.',
  },
  {
    q: 'Can I try it for free?',
    a: 'Yes. Every plan includes a 14-day free trial with no credit card required. You can import your clients and assets and generate test renditions before subscribing.',
  },
  {
    q: 'How does the year-over-year rollover work?',
    a: 'When you roll assets forward, RenditionReady creates frozen snapshots. The prior year\'s rendition values are locked, while the new year starts fresh for any asset changes or additions.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. Data is encrypted at rest and in transit. We use Supabase (built on PostgreSQL) with automatic daily backups and row-level security. Authentication is handled by Clerk with MFA support.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold">RenditionReady</span>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          BPP Tax Renditions,
          <br />
          <span className="text-blue-600">Done Right</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          The only platform built for CPA firms that file business personal property
          renditions across Texas, Oklahoma, and Florida. Auto-depreciation, PDF form
          generation, and team workflows in one place.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </SignedIn>
          <Link
            href="#pricing"
            className="inline-flex items-center rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          14-day free trial. No credit card required.
        </p>
      </section>

      {/* Problem */}
      <section className="border-y bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Stop Filing Renditions the Hard Way
            </h2>
            <p className="mt-4 text-gray-600">
              CPAs spend hours per client manually calculating depreciation, filling
              PDF forms by hand, and tracking filing deadlines across counties. Miss a
              deadline? Your client faces a 10% penalty. RenditionReady automates the
              entire process so you can file confidently and focus on advisory work.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <Clock className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-2xl font-bold text-gray-900">80%</p>
              <p className="text-sm text-gray-600">Less time per rendition</p>
            </div>
            <div>
              <Shield className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600">Calculation errors</p>
            </div>
            <div>
              <FileText className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-2xl font-bold text-gray-900">3</p>
              <p className="text-sm text-gray-600">States supported at launch</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything You Need to File
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            From data entry to filed PDF, RenditionReady handles every step of the
            rendition process.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border p-6">
                <f.icon className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-600">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border bg-white p-8 ${
                  plan.highlight ? 'border-blue-600 ring-2 ring-blue-600' : ''
                }`}
              >
                {plan.highlight && (
                  <span className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-blue-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      className={`mt-8 w-full rounded-md px-4 py-2 text-sm font-medium ${
                        plan.highlight
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/settings?tab=billing"
                    className={`mt-8 block w-full rounded-md px-4 py-2 text-center text-sm font-medium ${
                      plan.highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </SignedIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-12 space-y-8">
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="text-lg font-semibold text-gray-900">{item.q}</h3>
                <p className="mt-2 text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold">RenditionReady</span>
              <p className="mt-1 text-sm text-gray-500">
                BPP tax rendition software for CPA firms.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-900">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} RenditionReady. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
