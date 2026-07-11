import * as React from "react";
import { render } from "react-email";
import { sendLovableEmail } from "@lovable.dev/email-js";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";

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

export async function ensureDonorAuthAndSendLink(donorId: string, emailRaw: string) {
  try {
    const email = emailRaw.trim().toLowerCase();
    if (!email) return { ok: false as const, error: "Email లేదు" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId = await findAuthUserIdByEmail(supabaseAdmin, email);

    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: `MBR-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { role: "donor" },
      });
      if (createError) throw new Error(createError.message);
      userId = created?.user?.id ?? null;
    }

    if (userId) {
      await supabaseAdmin.from("donors").update({ user_id: userId }).eq("id", donorId);
    }

    const origin = process.env.PUBLIC_APP_URL || "https://mbrplatform.com";
    const redirectTo = `${origin}/donor/dashboard`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (error) throw new Error(error.message);

    const confirmationUrl = data?.properties?.action_link;
    if (!confirmationUrl) throw new Error("Login link తయారు కాలేదు");

    const messageId = crypto.randomUUID();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Email service configure కాలేదు");

    const note = "మీ డోనర్ వివరాలు అప్‌డేట్ అయ్యాయి. చెక్ చేసుకోవడానికి ఈ లింక్‌తో లాగిన్ అవ్వండి.";
    const element = React.createElement(MagicLinkEmail, {
      siteName: "MBR APP",
      confirmationUrl,
      note,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "donor_magiclink",
      recipient_email: email,
      status: "pending",
    });

    await sendLovableEmail(
      {
        to: email,
        from: "MBR APP <noreply@notify.mbrplatform.com>",
        sender_domain: "notify.mbrplatform.com",
        subject: "MBR APP — Donor login link",
        html,
        text,
        purpose: "transactional",
        label: "donor_magiclink",
        message_id: messageId,
        idempotency_key: messageId,
        unsubscribe_token: `auth-${messageId}`,
      },
      { apiKey, idempotencyKey: messageId },
    );

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "donor_magiclink",
      recipient_email: email,
      status: "sent",
    });

    return { ok: true as const };
  } catch (e: any) {
    console.error("[donor magic link] failed", e);
    return { ok: false as const, error: e?.message || String(e) };
  }
}