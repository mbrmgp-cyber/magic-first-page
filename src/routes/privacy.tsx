import { createFileRoute, Link } from "@tanstack/react-router";

const EMAIL = "mbrplatform@gmail.com";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MBR Platform (MBR App & Vaaradhi)" },
      { name: "description", content: "How MBR Platform collects, uses, protects and deletes your data in the MBR App and Vaaradhi." },
      { property: "og:title", content: "Privacy Policy — MBR Platform" },
      { property: "og:description", content: "Data collection, use, security and deletion for MBR App and Vaaradhi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <article className="max-w-3xl mx-auto space-y-5 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: October 4, 2026</p>
        <p>This policy explains how <b>MBR Platform</b> ("we") handles your information in the <b>MBR App</b> and <b>Vaaradhi</b> apps and the website mbrplatform.com.</p>

        <h2 className="text-lg font-semibold">1. Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account details: name, email address, phone number, password (stored only in encrypted/hashed form).</li>
          <li>Membership details: address, date of birth, Aadhaar number, photo, signature, committee role.</li>
          <li>Financial records: payments, subscriptions, loans, auction bids, bank details you provide.</li>
          <li>Vaaradhi listings: item photos, prices, location (state, district, mandal), contact details you publish.</li>
          <li>Basic technical data needed to run the app (device type, error logs).</li>
        </ul>

        <h2 className="text-lg font-semibold">2. How we use it</h2>
        <p>Only to run your organization's records (members, accounts, loans, chit auctions, ID cards, receipts), to show your Vaaradhi listings to buyers, to sign you in, and to send account-related emails. We do not sell your data and do not use it for advertising profiles.</p>

        <h2 className="text-lg font-semibold">3. Who can see it</h2>
        <p>Your organization's authorised committee members can see your membership and financial records. Vaaradhi listing details you choose to publish are visible to other users. We use trusted service providers for hosting, email delivery and translation, bound to protect your data.</p>

        <h2 className="text-lg font-semibold">4. Security</h2>
        <p>Data is sent over encrypted HTTPS connections and protected by access rules so users only see what they are allowed to see.</p>

        <h2 className="text-lg font-semibold">5. Retention and deletion</h2>
        <p>We keep data while your account is active. You can request deletion of your account and data at any time on the <Link to="/delete-account" className="underline">Delete Account</Link> page. Financial records your organization is legally required to keep may be retained in anonymised form.</p>

        <h2 className="text-lg font-semibold">6. Children</h2>
        <p>The apps are intended for users aged 18 and above.</p>

        <h2 className="text-lg font-semibold">7. Contact</h2>
        <p>MBR Platform — <a href={`mailto:${EMAIL}`} className="underline">{EMAIL}</a></p>

        <p className="pt-4"><Link to="/" className="underline">← Home</Link></p>
      </article>
    </main>
  );
}
