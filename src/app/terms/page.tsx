export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-xs text-[var(--cream-muted)]">Last updated: March 2025</p>
      </header>

      <div className="space-y-6 text-sm text-[var(--cream-muted)]">
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">1. Acceptance of terms</h2>
          <p>
            By accessing or using Virtual Library (“the Service”), you agree to be bound by these
            Terms and Conditions and our Privacy Policy. If you do not agree, please do not use
            the Service.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">2. Description of service</h2>
          <p>
            Virtual Library provides an online focus environment via video sessions (e.g. Google
            Meet), slot bookings, and related features including body-doubling sessions and
            optional Pomodoro-style structure. Access is subject to the plan you purchase and our
            Code of Conduct.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">3. Account and conduct</h2>
          <p>
            You are responsible for maintaining the accuracy of your account information and for
            all activity under your account. You must comply with our Code of Conduct and
            applicable law. We may suspend or terminate access for breach of these terms or for
            conduct that harms other users or the Service.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">4. Payments and subscriptions</h2>
          <p>
            Fees for plans (e.g. Daily Pass, Monthly Focus, Annual Scholar) are as displayed at
            checkout. Payment is processed by our designated payment provider. All fees are in INR
            unless otherwise stated. Refunds are governed by our Refund Policy.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">5. Intellectual property</h2>
          <p>
            The Service, including its design, branding, and content (excluding user-generated
            content), is owned by Virtual Library or its licensors. You may not copy, modify, or
            distribute our materials without prior written permission.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">6. Limitation of liability</h2>
          <p>
            The Service is provided “as is”. To the fullest extent permitted by law, we disclaim
            warranties and shall not be liable for indirect, incidental, or consequential
            damages arising from your use of the Service.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">7. Changes and contact</h2>
          <p>
            We may update these Terms from time to time; continued use after changes constitutes
            acceptance. For questions, contact us via the details provided on our website.
          </p>
        </section>
      </div>
    </article>
  );
}
