// Supabase Edge Function: notify-order-status
// -----------------------------------------------------------------------------
// Invoked after an order's status changes. Looks up the order's customer and
// their Expo push token (service role), then sends a push via Expo's free Push
// API (https://exp.host/--/api/v2/push/send) - no extra credentials needed.
//
// Deploy:  supabase functions deploy notify-order-status
// (Uses the auto-provided SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY secrets.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESSAGES: Record<string, { title: string; body: string }> = {
  placed: { title: 'Order placed', body: 'We have received your MediGo order.' },
  confirmed: { title: 'Order confirmed', body: 'Your MediGo order is confirmed and being prepared.' },
  out_for_delivery: { title: 'Out for delivery', body: 'Your MediGo order is on the way!' },
  delivered: { title: 'Delivered', body: 'Your MediGo order has been delivered. Thank you!' },
  cancelled: { title: 'Order cancelled', body: 'Your MediGo order was cancelled.' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: order, error } = await admin
      .from('orders')
      .select('id, user_id, status')
      .eq('id', order_id)
      .single();
    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('push_token')
      .eq('id', order.user_id)
      .maybeSingle();

    const token = profile?.push_token as string | undefined;
    const msg = MESSAGES[order.status as string] ?? MESSAGES.placed;

    if (!token) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no-push-token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title: msg.title,
        body: msg.body,
        sound: 'default',
        data: { orderId: order.id },
      }),
    });
    const result = await res.json();

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[notify-order-status] failed:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
