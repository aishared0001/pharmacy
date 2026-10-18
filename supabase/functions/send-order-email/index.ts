// Supabase Edge Function: send-order-email
// -----------------------------------------------------------------------------
// Invoked from the app right after an order is inserted. It looks up the order
// (with items + customer email) using the service role, formats an email
// containing the order id, TIMESTAMP, items and the full DELIVERY ADDRESS, and:
//   1. sends it to the store owner (OWNER_EMAIL), and
//   2. sends an order confirmation to the customer.
//
// Email is sent through Gmail SMTP using an App Password, so it can deliver to
// any recipient (owner alert + customer confirmation) without owning a domain.
// If the Gmail secrets are not configured, it logs the composed email instead
// of failing — so the app works end-to-end before email is wired up.
//
// Deploy:  supabase functions deploy send-order-email
// Secrets: supabase secrets set OWNER_EMAIL=... GMAIL_USER=... GMAIL_APP_PASSWORD=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// The Gmail account that sends the mail (also the default owner-alert address).
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? '';
const GMAIL_APP_PASSWORD = (Deno.env.get('GMAIL_APP_PASSWORD') ?? '').replace(/\s+/g, '');
// Where owner alerts go. Defaults to the sending Gmail account.
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') ?? GMAIL_USER ?? 'aishared0001@gmail.com';

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

const gmailConfigured = GMAIL_USER.length > 0 && GMAIL_APP_PASSWORD.length > 0;

function makeClient(): SMTPClient {
  return new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });
}

// Strip HTML tags for a plain-text fallback part.
function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sendViaGmail(
  client: SMTPClient,
  msg: { to: string; subject: string; html: string },
) {
  await client.send({
    from: `MediGo <${GMAIL_USER}>`,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    content: toText(msg.html),
  });
  return { sent: true, to: msg.to };
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

    // If Gmail isn't configured yet, log the composed email and succeed so the
    // order flow is never blocked.
    if (!gmailConfigured) {
      console.log('[send-order-email] Gmail not configured. Would send:', {
        owner: { to: emails.owner.to, subject: emails.owner.subject },
        customer: emails.customer
          ? { to: emails.customer.to, subject: emails.customer.subject }
          : null,
      });
      return new Response(
        JSON.stringify({ ok: true, order: emails.shortId, skipped: 'gmail-not-configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send both emails independently so one failing (e.g. a bad customer
    // address) never stops the other.
    const client = makeClient();
    const results: Record<string, unknown> = {};
    try {
      try {
        results.owner = await sendViaGmail(client, emails.owner);
      } catch (e) {
        results.owner = { error: String(e) };
        console.error('[send-order-email] owner email failed:', e);
      }
      if (emails.customer) {
        try {
          results.customer = await sendViaGmail(client, emails.customer);
        } catch (e) {
          results.customer = { error: String(e) };
          console.error('[send-order-email] customer email failed:', e);
        }
      }
    } finally {
      try {
        await client.close();
      } catch (_) {
        // ignore close errors
      }
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
