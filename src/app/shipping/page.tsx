export default function ShippingPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Shipping &amp; Delivery Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--cream-muted)]">Last updated: March 2025</p>
      </header>

      <div className="space-y-6 text-sm text-[var(--cream-muted)]">
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">1. Digital delivery only</h2>
          <p>
            Virtual Library provides only digital products and services. We do not ship physical
            goods. All offerings—including access to focus sessions, study slots, and membership
            plans—are delivered electronically.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">2. When you get access</h2>
          <p>
            After successful payment, your access is activated immediately. You will receive a
            confirmation email with instructions to join study sessions, access your dashboard,
            and (where applicable) support or information channels for enrolled learners (e.g.
            WhatsApp announcement group). No shipping address is required; access is tied to your
            account and the email used at checkout.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">3. Delivery of access</h2>
          <p>
            “Delivery” for our purposes means: (a) payment confirmation, (b) email containing
            access details and links, and (c) ability to log in and use the purchased plan for
            the relevant period. If you do not receive the confirmation email within 24 hours,
            check spam or contact us with your order details.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">4. No physical shipping</h2>
          <p>
            We do not offer or guarantee any physical shipment. Any references to “shipping” in
            general policies do not apply to physical delivery. For refunds and cancellations,
            please refer to our Refund Policy.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">5. Contact</h2>
          <p>
            For delivery or access issues, contact us using the details in the footer of our
            website.
          </p>
        </section>
      </div>
    </article>
  );
}
