// Vercel Serverless Function - Whisper STT Proxy
// Receives audio blob from client, transcribes via OpenAI Whisper API.

import OpenAI from 'openai';

export const config = {
  maxDuration: 30,
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_WHISPER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Whisper API key not configured' });
  }

  try {
    // Collect raw body (multipart form data)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    // Parse Content-Type boundary
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Missing multipart boundary' });
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const fields = parseMultipart(body, boundary);

    const audioBuffer = fields.get('file');
    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio file in request' });
    }

    const language = fields.get('language') || 'en';

    const openai = new OpenAI({ apiKey });

    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
    });

    return res.status(200).json({ text: transcription.text });
  } catch (err) {
    console.error('STT error:', err);
    return res.status(500).json({ error: err.message || 'Transcription failed' });
  }
}

// ── Minimal multipart parser (no dependencies) ──
function parseMultipart(body, boundary) {
  const map = new Map();
  const delimiter = '--' + boundary;
  const text = body.toString('binary');
  const parts = text.split(delimiter);

  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--' || part.trim() === '') continue;

    const sepIdx = part.indexOf('\r\n\r\n');
    if (sepIdx === -1) continue;

    const headerBlock = part.slice(0, sepIdx);
    // Body: strip trailing \r\n (2 chars) from the end
    let bodyPart = part.slice(sepIdx + 4);
    if (bodyPart.endsWith('\r\n')) bodyPart = bodyPart.slice(0, -2);

    // Extract field name
    const nameMatch = headerBlock.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headerBlock.match(/filename="([^"]+)"/);

    if (filenameMatch) {
      // Binary file field
      map.set(name, Buffer.from(bodyPart, 'binary'));
    } else {
      // Text field
      map.set(name, Buffer.from(bodyPart, 'binary').toString('utf-8'));
    }
  }

  return map;
}
