// Cron-driven dispatch: for any confirmed booking whose slot ended 3+ hours ago,
// create a feedback_invite (if missing) and mark it as 'sent'. Delivery to users
// happens via WhatsApp (handled outside this function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FEEDBACK_DELAY_HOURS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    const { data: bookings, error: bErr } = await supabase
      .from("activity_bookings")
      .select(
        "id, user_id, slot_id, status, activity_slots:slot_id(id, activity_id, start_time, duration_minutes)"
      )
      .eq("status", "confirmed");

    if (bErr) throw bErr;

    let created = 0;
    let marked = 0;

    for (const b of bookings || []) {
      const slot: any = (b as any).activity_slots;
      if (!slot) continue;

      const endsAt = new Date(
        new Date(slot.start_time).getTime() +
          (slot.duration_minutes || 90) * 60 * 1000
      );
      const dueAt = new Date(
        endsAt.getTime() + FEEDBACK_DELAY_HOURS * 60 * 60 * 1000
      );

      if (dueAt > now) continue;

      const { data: existing } = await supabase
        .from("feedback_invites")
        .select("id, status")
        .eq("booking_id", b.id)
        .maybeSingle();

      let inviteId = existing?.id;
      if (!inviteId) {
        const { data: ins, error: iErr } = await supabase
          .from("feedback_invites")
          .insert({
            booking_id: b.id,
            user_id: b.user_id,
            slot_id: b.slot_id,
            activity_id: slot.activity_id,
            scheduled_at: dueAt.toISOString(),
            status: "pending",
          })
          .select("id")
          .single();
        if (iErr) {
          console.error("invite insert", iErr);
          continue;
        }
        inviteId = ins.id;
        created++;
      } else if (existing.status !== "pending") {
        continue;
      }

      await supabase
        .from("feedback_invites")
        .update({ sent_at: now.toISOString(), status: "sent" })
        .eq("id", inviteId);

      marked++;
    }

    return new Response(
      JSON.stringify({ ok: true, created, marked, ranAt: now.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
