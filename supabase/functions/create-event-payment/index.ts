import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { eventId, answers } = await req.json();
    if (!eventId) throw new Error("eventId is required");

    // Fetch event details
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, name, ticket_price, currency, requires_approval")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    if (!event.ticket_price || event.ticket_price <= 0) throw new Error("Event is free");

    // Save participant as pending_payment
    const { error: participantError } = await supabaseAdmin
      .from("event_participants")
      .insert({ event_id: eventId, user_id: user.id, status: "pending_payment" });

    if (participantError) throw new Error("Could not create participant: " + participantError.message);

    // Save registration answers
    if (answers && Object.keys(answers).length > 0) {
      const rows = Object.entries(answers).map(([questionId, answerValue]) => ({
        event_id: eventId,
        user_id: user.id,
        question_id: questionId,
        answer_value: answerValue as string,
      }));
      await supabaseAdmin.from("event_registration_answers").insert(rows);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Amount in smallest currency unit (cents/sen)
    const amount = Math.round(event.ticket_price * 100);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: event.currency.toLowerCase(),
            product_data: {
              name: event.name,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/event/${eventId}?payment=success`,
      cancel_url: `${req.headers.get("origin")}/event/${eventId}?payment=cancelled`,
      metadata: {
        event_id: eventId,
        user_id: user.id,
      },
    });

    // Update participant with checkout session id
    await supabaseAdmin
      .from("event_participants")
      .update({ status: "pending" })
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
