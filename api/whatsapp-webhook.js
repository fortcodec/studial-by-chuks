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
      
      // We will build the PDF extraction and Bot conversational logic here next!
      console.log('Incoming Webhook Event:', JSON.stringify(body, null, 2));

      // Meta requires an immediate 200 OK response, or it will retry the message
      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).send('NOT_FOUND');
    }
  }

  // Handle unsupported methods
  return res.status(405).json({ error: 'Method Not Allowed' });
}

