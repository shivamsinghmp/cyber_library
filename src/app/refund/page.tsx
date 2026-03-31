export default function RefundPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Refund Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--cream-muted)]">Last updated: March 2025</p>
      </header>

      <div className="space-y-6 text-sm text-[var(--cream-muted)]">
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">1. Overview</h2>
          <p>
            The Cyber Library offers digital access to focus sessions and study slots. This Refund
            Policy explains when and how we process refunds for purchases made through our
            website.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">2. Eligibility for refunds</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-[var(--cream)]">Daily Pass:</strong> Refund requests may be
              considered if made before the start of the purchased day and the pass has not been
              used.
            </li>
            <li>
              <strong className="text-[var(--cream)]">Monthly / Annual plans:</strong> We may offer
              a full or prorated refund if requested within 7 days of purchase and before
              substantial use, at our discretion.
            </li>
            <li>Duplicate or erroneous charges will be refunded in full upon verification.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">3. Non-refundable cases</h2>
          <p>
            We generally do not refund once the purchased period has been substantially used, or
            if the request is made after the eligibility window. Refunds are not provided for
            change of mind after use.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">4. How to request a refund</h2>
          <p>
            Send a clear refund request to our contact email with your order details (email used
            at purchase, plan name, and date of purchase). We will respond within 5–7 business
            days. Approved refunds will be processed to the original payment method within 10–14
            business days, depending on your bank or card issuer.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-[var(--cream)] mb-2">5. Contact</h2>
          <p>
            For refund-related queries, use the contact details provided in the footer of our
            website.
          </p>
        </section>
      </div>
    </article>
  );
}
