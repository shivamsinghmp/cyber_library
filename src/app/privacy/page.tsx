export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--cream-muted)]">Last updated: March 2025</p>
      </header>

      <div className="space-y-6 text-sm text-[var(--cream-muted)]">
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">1. Introduction</h2>
          <p>
            The Cyber Library (“we”, “our”, or “us”) is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our website and services, including focus sessions, slot bookings, and
            payments.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">2. Information we collect</h2>
          <p className="mb-2">We may collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name, email address, and phone number when you sign up, book a slot, or checkout</li>
            <li>Payment and transaction details (processed by our payment provider; we do not store full card numbers)</li>
            <li>Usage data such as session times, pages visited, and device/browser information</li>
            <li>Communications you send to us (e.g. support or feedback)</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">3. How we use your information</h2>
          <p>
            We use your information to provide and improve our services, process payments, send
            booking confirmations and reminders, respond to inquiries, send relevant updates (with
            your consent where required), and to comply with applicable law.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">4. Sharing and disclosure</h2>
          <p>
            We do not sell your personal data. We may share data with service providers (e.g.
            hosting, payment processors, email delivery) only to the extent necessary to operate
            our services. We may disclose information if required by law or to protect our rights
            and safety.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">5. Data security and retention</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your data.
            We retain your information only as long as needed for the purposes described in this
            policy or as required by law.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">6. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or restrict
            processing of your personal data, or to withdraw consent. Contact us using the details
            on our website to exercise these rights.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">7. Contact</h2>
          <p>
            For privacy-related questions or requests, contact us at the email or address provided
            on our website or in the footer.
          </p>
        </section>
      </div>
    </article>
  );
}
