// Supabase Edge Function: send-order-email
// -----------------------------------------------------------------------------
// Invoked from the app right after an order is inserted. It looks up the order
// (with items + customer email) using the service role, formats an email
// containing the order id, TIMESTAMP, items and the full DELIVERY ADDRESS, and:
//   1. sends it to the store owner (OWNER_EMAIL), and
//   2. sends an order confirmation to the customer.
//
// Email provider is pluggable. By default it uses Resend (set RESEND_API_KEY).
// If no provider key is configured, it logs the composed email instead of
// failing — so the app works end-to-end before email is wired up.
//
// Deploy:  supabase functions deploy send-order-email
// Secrets: supabase secrets set OWNER_EMAIL=... FROM_EMAIL=... RESEND_API_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') ?? 'aishared0001@gmail.com';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'MediGo <onboarding@resend.dev>';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
  prescription_url: string | null;
  payment_method: string;
  created_at: string;
  order_items: { name: string; price: number; quantity: number }[];
};

function buildEmails(order: OrderRow, customerEmail: string | null) {
  const placedAt = new Date(order.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const itemsRows = order.order_items
    .map(
      (it) =>
        `<tr><td style="padding:6px 0">${it.name} × ${it.quantity}</td>` +
        `<td style="padding:6px 0;text-align:right">${inr(it.price * it.quantity)}</td></tr>`,
    )
    .join('');

  const address =
    `${order.full_name}, ${order.phone}<br>` +
    `${order.address_line1}` +
    (order.address_line2 ? `, ${order.address_line2}` : '') +
    (order.landmark ? `, near ${order.landmark}` : '') +
    `<br>${order.city} - ${order.pincode}`;

  const shortId = order.id.slice(0, 8).toUpperCase();

  const summaryTable = `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${itemsRows}
      <tr><td colspan="2"><hr style="border:none;border-top:1px solid #eee"></td></tr>
      <tr><td>Item total</td><td style="text-align:right">${inr(order.subtotal)}</td></tr>
      <tr><td>Delivery</td><td style="text-align:right">${
        order.delivery_fee === 0 ? 'FREE' : inr(order.delivery_fee)
      }</td></tr>
      <tr><td style="font-weight:700">Total (Cash on Delivery)</td>
          <td style="text-align:right;font-weight:700">${inr(order.total)}</td></tr>
    </table>`;

  const rxLine = order.prescription_url
    ? `<p><strong>Prescription:</strong> <a href="${order.prescription_url}">View uploaded prescription</a></p>`
    : '';

  const ownerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#12211d">
      <h2 style="color:#0B9E7A">New order #${shortId}</h2>
      <p><strong>Placed at:</strong> ${placedAt}</p>
      <h3>Delivery address</h3>
      <p>${address}</p>
      ${rxLine}
      <h3>Items</h3>
      ${summaryTable}
    </div>`;

  const customerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#12211d">
      <h2 style="color:#0B9E7A">Thank you for your order!</h2>
      <p>Your MediGo order <strong>#${shortId}</strong> was placed on ${placedAt}.</p>
      <p>Payment method: <strong>Cash on Delivery</strong>.</p>
      <h3>Delivering to</h3>
      <p>${address}</p>
      <h3>Order summary</h3>
      ${summaryTable}
      <p style="color:#5C6B66;font-size:12px">MediGo — medicine delivery in Chandigarh. This is an automated confirmation.</p>
    </div>`;

  return {
    placedAt,
    shortId,
    owner: {
      to: OWNER_EMAIL,
      subject: `New MediGo order #${shortId} — ${inr(order.total)} (COD)`,
      html: ownerHtml,
    },
    customer: customerEmail
      ? {
          to: customerEmail,
          subject: `Your MediGo order #${shortId} is confirmed`,
          html: customerHtml,
        }
      : null,
  };
}

async function sendViaResend(msg: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.log('[send-order-email] No RESEND_API_KEY set. Would send email:', {
      to: msg.to,
      subject: msg.subject,
    });
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
      .select('*, order_items(name, price, quantity)')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the customer's email from auth.
    let customerEmail: string | null = null;
    const { data: userRes } = await admin.auth.admin.getUserById((order as OrderRow).user_id);
    customerEmail = userRes?.user?.email ?? null;

    const emails = buildEmails(order as OrderRow, customerEmail);

    const results: Record<string, unknown> = {};
    results.owner = await sendViaResend(emails.owner);
    if (emails.customer) {
      results.customer = await sendViaResend(emails.customer);
    }

    return new Response(
      JSON.stringify({ ok: true, order: emails.shortId, sentTo: OWNER_EMAIL, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[send-order-email] failed:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
