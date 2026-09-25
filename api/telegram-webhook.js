import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text, inlineKeyboard = null) {
  const payload = { chat_id: chatId, text: text, parse_mode: 'HTML' };
  if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function generatePDFBuffer(text, title) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(20).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(text);
    doc.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const update = req.body;

  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    const { data: admin } = await supabase.from('telegram_admins').select('telegram_user_id').eq('telegram_user_id', userId).single();
    if (!admin) return res.status(200).send('OK');

    if (data.startsWith('price_')) {
      const price = parseInt(data.replace('price_', ''), 10);
      const { data: state } = await supabase.from('telegram_admin_states').select('*').eq('telegram_user_id', userId).single();

      if (state && state.temp_file_url) {
        const { error: insertError } = await supabase.from('study_materials').insert({
          title: state.pending_title || state.pending_filename,
          file_url: state.temp_file_url,
          price_in_coins: price,
          uploaded_by: 'Admin (Telegram)',
          course_code: 'General',
          department: 'General'
        });

        if (insertError) {
          await sendMessage(
            callbackQuery.message.chat.id, 
            `❌ <b>Database Error:</b> ${insertError.message}\n\nUpload failed.`
          );
          return res.status(200).send('OK');
        }

        await supabase.from('telegram_admin_states').delete().eq('telegram_user_id', userId);
        await sendMessage(callbackQuery.message.chat.id, `✅ <b>Uploaded successfully!</b>\n\n<b>Title:</b> ${state.pending_title || state.pending_filename}\n<b>Price:</b> ${price === 0 ? 'Free' : price + ' C-Coins'}`);
      }
    }
    return res.status(200).send('OK');
  }

  const message = update.message;
  if (!message) return res.status(200).send('OK');

  const userId = message.from.id;
  const chatId = message.chat.id;

  const { data: admin } = await supabase.from('telegram_admins').select('telegram_user_id').eq('telegram_user_id', userId).single();
  if (!admin) {
    await sendMessage(chatId, "Hey there!! This bot isn't available for messages...");
    return res.status(200).send('OK');
  }

  // Handle Bot Commands
  if (message.text && message.text.startsWith('/')) {
    if (message.text === '/start') {
      await sendMessage(
        chatId,
        "👋 <b>Welcome to Studial Admin!</b>\n\nYou are authorized to upload study materials.\n\n• <b>Forward a PDF</b> to upload it directly.\n• <b>Paste lecture notes</b> to convert them into a PDF.\n\nI am ready when you are!"
      );
    }
    return res.status(200).send('OK');
  }

  if (message.document) {
    const doc = message.document;
    const fileName = doc.file_name || `document_${Date.now()}.pdf`;
    const title = message.caption || fileName;

    await sendMessage(chatId, `📥 Downloading <b>${fileName}</b>...`);

    const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${doc.file_id}`);
    const fileData = await fileRes.json();
    const fileDownloadRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`);
    const fileBuffer = Buffer.from(await fileDownloadRes.arrayBuffer());

    const storagePath = `materials/${Date.now()}_${fileName}`;
    await supabase.storage.from('study-materials').upload(storagePath, fileBuffer, { contentType: doc.mime_type || 'application/pdf' });
    const { data: publicUrlData } = supabase.storage.from('study-materials').getPublicUrl(storagePath);

    await supabase.from('telegram_admin_states').upsert({
      telegram_user_id: userId, current_step: 'awaiting_price', temp_file_url: publicUrlData.publicUrl, pending_filename: fileName, pending_title: title,
    });

    const keyboard = [[{ text: '🎁 Free', callback_data: 'price_0' }, { text: '🪙 50 C', callback_data: 'price_50' }], [{ text: '🪙 100 C', callback_data: 'price_100' }, { text: '🪙 200 C', callback_data: 'price_200' }]];
    await sendMessage(chatId, `📄 <b>${fileName}</b> received!\nHow many C-Coins should this cost?`, keyboard);
    return res.status(200).send('OK');
  }

  if (message.text && !message.text.startsWith('/')) {
    const title = `Notes_${new Date().toISOString().slice(0, 10)}`;
    await sendMessage(chatId, '📝 Converting notes to PDF...');

    const pdfBuffer = await generatePDFBuffer(message.text, title);
    const storagePath = `materials/${Date.now()}_${title}.pdf`;
    
    await supabase.storage.from('study-materials').upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });
    const { data: publicUrlData } = supabase.storage.from('study-materials').getPublicUrl(storagePath);

    await supabase.from('telegram_admin_states').upsert({
      telegram_user_id: userId, 
      current_step: 'awaiting_price', 
      temp_file_url: publicUrlData.publicUrl, 
      pending_filename: title + '.pdf', 
      pending_title: title
    });

    const keyboard = [[{ text: '🎁 Free', callback_data: 'price_0' }, { text: '🪙 50 C', callback_data: 'price_50' }], [{ text: '🪙 100 C', callback_data: 'price_100' }, { text: '🪙 200 C', callback_data: 'price_200' }]];
    await sendMessage(chatId, `📄 <b>${title}.pdf</b> generated!\nHow many C-Coins should this cost?`, keyboard);
    return res.status(200).send('OK');
  }

  return res.status(200).send('OK');
}
