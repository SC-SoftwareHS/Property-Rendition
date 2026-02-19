import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: February 2026</p>

        <div className="mt-8 space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using RenditionReady, you agree to be bound by these Terms
              of Service. If you do not agree, do not use the service. These terms apply
              to all users, including firm administrators, preparers, and reviewers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Service Description</h2>
            <p className="mt-2">
              RenditionReady is a SaaS platform that assists CPA firms with preparing,
              calculating depreciation for, and generating PDF forms for business personal
              property tax renditions. The service supports Texas, Oklahoma, and Florida
              rendition forms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Accuracy Disclaimer</h2>
            <p className="mt-2">
              While we strive for accuracy, RenditionReady is a tool that assists with
              rendition preparation. It is your responsibility to review all generated
              renditions before filing. We are not a licensed accounting or tax firm and
              do not provide tax advice. Depreciation schedules are sourced from public
              government publications but may change without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Account Responsibilities</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activity under your account. You must notify us
              immediately of any unauthorized access. Firm administrators are responsible
              for managing user access within their organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Billing & Subscriptions</h2>
            <p className="mt-2">
              Subscriptions are billed monthly or annually as selected. All plans include
              a 14-day free trial. After the trial, your selected payment method will be
              charged automatically. You may cancel at any time; access continues until
              the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data Ownership</h2>
            <p className="mt-2">
              You retain all ownership of data you enter into RenditionReady, including
              client information, asset data, and generated renditions. We do not claim
              any intellectual property rights over your data. You may export your data
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Limitation of Liability</h2>
            <p className="mt-2">
              RenditionReady shall not be liable for any penalties, fines, or damages
              resulting from inaccurate renditions, missed filing deadlines, or incorrect
              depreciation calculations. Our total liability is limited to the amount you
              paid for the service in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Termination</h2>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these
              terms, engage in fraudulent activity, or fail to pay subscription fees.
              Upon termination, you may request an export of your data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact us at legal@renditionready.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
