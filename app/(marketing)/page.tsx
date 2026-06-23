import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">
        Never let a client&apos;s site lapse again.
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Sentinel watches SSL certificates, domain expiry, and uptime across every
        site you manage — and emails you <em>before</em> something breaks. The
        expired cert that gets a freelancer fired? You&apos;ll see it coming weeks out.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white hover:bg-neutral-700"
        >
          Start free — 2 sites
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-5 py-2.5 font-medium hover:bg-neutral-50"
        >
          Sign in
        </Link>
      </div>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          ["SSL expiry", "Know weeks before a certificate lapses."],
          ["Domain expiry", "Catch lapsing registrations before they drop."],
          ["Uptime", "Daily checks with instant down alerts."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-neutral-200 bg-white p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-neutral-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 rounded-xl border border-neutral-200 bg-white p-8">
        <h2 className="text-2xl font-bold">Simple pricing</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 p-5">
            <h3 className="font-semibold">Free</h3>
            <p className="mt-1 text-3xl font-bold">$0</p>
            <p className="mt-2 text-sm text-neutral-600">2 sites · daily checks · email alerts</p>
          </div>
          <div className="rounded-lg border-2 border-neutral-900 p-5">
            <h3 className="font-semibold">Pro</h3>
            <p className="mt-1 text-3xl font-bold">
              $9<span className="text-base font-normal text-neutral-500">/mo</span>
            </p>
            <p className="mt-2 text-sm text-neutral-600">25 sites · daily checks · email alerts</p>
          </div>
        </div>
      </section>
    </main>
  );
}
