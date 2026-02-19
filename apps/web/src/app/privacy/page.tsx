import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            RenditionReady
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: February 2026</p>

        <div className="mt-8 space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
            <p className="mt-2">
              We collect information you provide directly, including your name, email address,
              firm details, and client business personal property data entered into the platform.
              We also collect usage data such as pages visited, features used, and session duration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
            <p className="mt-2">
              We use your information to provide and improve RenditionReady services, process
              tax renditions, communicate with you about your account, and comply with legal
              obligations. We never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Data Storage & Security</h2>
            <p className="mt-2">
              Your data is stored on Supabase (PostgreSQL) with encryption at rest and in
              transit. Authentication is handled by Clerk with support for multi-factor
              authentication. We maintain regular backups and follow industry-standard
              security practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Data Retention</h2>
            <p className="mt-2">
              We retain your data for as long as your account is active. Upon account
              deletion, we will remove your personal data within 30 days. Tax rendition
              data may be retained longer as required by applicable tax laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Third-Party Services</h2>
            <p className="mt-2">
              We use the following third-party services: Clerk (authentication), Supabase
              (database), Stripe (payments), and Vercel (hosting). Each service has its
              own privacy policy governing data handling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Your Rights</h2>
            <p className="mt-2">
              You have the right to access, correct, or delete your personal information.
              You may also request a copy of your data in a portable format. Contact us
              at privacy@renditionready.com to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Contact</h2>
            <p className="mt-2">
              For privacy-related inquiries, contact us at privacy@renditionready.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
