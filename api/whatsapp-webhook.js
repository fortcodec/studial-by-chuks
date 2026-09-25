import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendWhatsAppMessage(to, text) {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

export default async function handler(req, res) {
  // 1. GET REQUEST: Meta's Verification Handshake
  if (req.method === 'GET') {
    // These are the query parameters Meta sends to verify your webhook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // This token must match the one you set in your Vercel Environment Variables
    // and the one you will type into the Meta Developer Dashboard.
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        // You MUST return the raw challenge string with a 200 status to pass verification
        return res.status(200).send(challenge);
      } else {
        // Token didn't match
        return res.status(403).json({ error: 'Verification failed' });
      }
    }
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // 2. POST REQUEST: Handling incoming WhatsApp messages and PDFs
  if (req.method === 'POST') {
    const body = req.body;

    // Confirm this is a WhatsApp API event
    if (body.object === 'whatsapp_business_account') {
      
      console.log('Incoming Webhook Event:', JSON.stringify(body, null, 2));

      try {
        const changes = body.entry?.[0]?.changes?.[0]?.value;
        if (changes?.messages && changes.messages.length > 0) {
          const senderNumber = changes.messages[0].from;
          
          // Allowlist Security Check
          const { data, error } = await supabase
            .from('whatsapp_admins')
            .select('phone_number')
            .eq('phone_number', senderNumber)
            .single();

          if (error || !data) {
            await sendWhatsAppMessage(senderNumber, "Hey there!! This number isn't available for messages...");
            // Still return 200 OK so Meta doesn't retry
            return res.status(200).send('EVENT_RECEIVED');
          }
          
          // Build PDF extraction and Bot conversational logic here next
        }
      } catch (err) {
        console.error('Webhook error:', err);
      }

      // Meta requires an immediate 200 OK response, or it will retry the message
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).send('NOT_FOUND');
    }
  }

  // Handle unsupported methods
  return res.status(405).json({ error: 'Method Not Allowed' });
}

