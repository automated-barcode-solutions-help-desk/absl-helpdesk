/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const fromEmail = Deno.env.get("FROM_EMAIL") || "helpdesk@automatedbarcode.net";

const admin = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async () => {
  const { data: notifications, error } = await admin
    .from("notifications")
    .select("*")
    .in("status", ["pending", "retry"])
    .lte("next_attempt_at", new Date().toISOString())
    .limit(20);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];

  for (const notification of notifications ?? []) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: notification.recipient_email,
          subject: notification.subject,
          text: notification.body
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await admin
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: notification.attempts + 1,
          error_message: null
        })
        .eq("id", notification.id);

      await admin.from("notification_attempts").insert({
        notification_id: notification.id,
        success: true
      });

      results.push({ id: notification.id, status: "sent" });
    } catch (sendError) {
      const attempts = notification.attempts + 1;
      const deadLetter = attempts >= notification.max_attempts;
      const nextAttempt = new Date(Date.now() + attempts * 5 * 60 * 1000);

      await admin
        .from("notifications")
        .update({
          status: deadLetter ? "dead_letter" : "retry",
          attempts,
          next_attempt_at: nextAttempt.toISOString(),
          error_message: String(sendError)
        })
        .eq("id", notification.id);

      await admin.from("notification_attempts").insert({
        notification_id: notification.id,
        success: false,
        error_message: String(sendError)
      });

      results.push({
        id: notification.id,
        status: deadLetter ? "dead_letter" : "retry"
      });
    }
  }

  return Response.json({ ok: true, processed: results.length, results });
});
