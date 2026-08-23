import * as React from "react";
import { render } from "react-email";
import { sendLovableEmail } from "@lovable.dev/email-js";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-url";

async function findAuthUserIdByEmail(supabaseAdmin: any, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u: any) => u.email?.toLowerCase() === target);
    if (user) return user.id as string;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function sendMemberDashboardMagicLink(opts: {
  memberId: string;
  subject?: string;
  label?: string;
  note?: string;
  lang?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("id, email, name, user_id, preferred_lang")
    .eq("id", opts.memberId)
    .maybeSingle();
  if (memberError) throw new Error(memberError.message);

  const email = ((member as any)?.email || "").trim().toLowerCase();
  if (!email) return { sent: false as const, reason: "missing_email" as const };

  let userId = ((member as any)?.user_id as string | null) ?? await findAuthUserIdByEmail(supabaseAdmin, email);
  if (!userId) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: `MBR-${crypto.randomUUID()}`,
      email_confirm: true,
      user_metadata: { role: "member" },
    });
    if (createError) throw new Error(createError.message);
    userId = created.user?.id ?? null;
  }

  if (userId) {
    await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", opts.memberId);
    await supabaseAdmin.from("members").update({ user_id: userId }).is("user_id", null).ilike("email", email);
  }

  const lang = opts.lang || (member as any)?.preferred_lang || "te";
  const redirectTo = `${PUBLIC_APP_ORIGIN}/auth?lang=${encodeURIComponent(lang)}`;
  // No magic links: link to the normal login page only.
  const confirmationUrl = redirectTo;


  const label = opts.label || "member_dashboard_magiclink";
  const subject = opts.subject || "MBR APP — Login link";
  const note = opts.note || "మీ వివరాలు అడ్మిన్ అప్‌డేట్ చేశారు. ఈ లింక్ ఓపెన్ చేస్తే మీ డాష్‌బోర్డ్ నేరుగా ఓపెన్ అవుతుంది.";
  const element = React.createElement(MagicLinkEmail, {
    siteName: "MBR APP",
    confirmationUrl,
    note,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const messageId = crypto.randomUUID();
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Email service configure కాలేదు");

  try {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "pending",
    });

    await sendLovableEmail(
      {
        to: email,
        from: "MBR APP <noreply@notify.mbrplatform.com>",
        sender_domain: "notify.mbrplatform.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label,
        message_id: messageId,
        idempotency_key: messageId,
        unsubscribe_token: `auth-${messageId}`,
      },
      { apiKey, idempotencyKey: messageId },
    );

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "sent",
    });
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : String(emailError);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: email,
      status: "failed",
      error_message: message,
    });
    throw new Error(message);
  }

  return { sent: true as const };
}