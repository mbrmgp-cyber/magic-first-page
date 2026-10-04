import { createFileRoute, Link } from "@tanstack/react-router";

const EMAIL = "mbrplatform@gmail.com";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Your Account — MBR Platform" },
      { name: "description", content: "Request deletion of your MBR App or Vaaradhi account and personal data." },
      { property: "og:title", content: "Delete Your Account — MBR Platform" },
      { property: "og:description", content: "How to delete your MBR App or Vaaradhi account and data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent("Account deletion request")}&body=${encodeURIComponent("Please delete my account and data.\n\nRegistered email:\nApp (MBR App / Vaaradhi):\nOrganization (if any):")}`;
  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <article className="max-w-2xl mx-auto space-y-5 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold">Delete your account</h1>
        <p>You can delete your <b>MBR App</b> or <b>Vaaradhi</b> account and personal data, provided by <b>MBR Platform</b>, at any time.</p>
        <h2 className="text-lg font-semibold">Option 1: Inside the app (instant)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Sign in to the app.</li>
          <li><b>Vaaradhi:</b> open <b>Profile</b>. <b>MBR App:</b> open your <b>Member Dashboard</b>.</li>
          <li>Tap <b>"Delete my account"</b> at the bottom, then type <b>DELETE</b> to confirm.</li>
          <li>Your account is deleted immediately and you are signed out.</li>
        </ol>
        <h2 className="text-lg font-semibold">Option 2: By email (if you can't sign in)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Send an email from your registered email address to <a href={mailto} className="underline">{EMAIL}</a>.</li>
          <li>Write "Account deletion request" and which app you use.</li>
          <li>We confirm and delete your account within 30 days.</li>
        </ol>
        <a href={mailto} className="inline-block rounded-md bg-destructive text-destructive-foreground px-4 py-2 font-medium">Request account deletion by email</a>
        <h2 className="text-lg font-semibold">What is deleted</h2>
        <p>Your login, profile, photo, Aadhaar, phone, address, bank details and Vaaradhi listings.</p>
        <h2 className="text-lg font-semibold">What may be kept</h2>
        <p>Payment and loan entries your organization must keep by law are kept with your name removed, for up to 7 years.</p>
        <p className="pt-4"><Link to="/privacy" className="underline">Privacy Policy</Link> · <Link to="/" className="underline">Home</Link></p>
      </article>
    </main>
  );
}
