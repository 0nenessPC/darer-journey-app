import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Minimal multipart parser for STT proxy
function parseMultipartStt(rawBody, boundary) {
  const map = new Map()
  const delimiter = '--' + boundary
  const text = rawBody.toString('binary')
  const parts = text.split(delimiter)
  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--' || part.trim() === '') continue
    const sepIdx = part.indexOf('\r\n\r\n')
    if (sepIdx === -1) continue
    const headerBlock = part.slice(0, sepIdx)
    let bodyPart = part.slice(sepIdx + 4)
    if (bodyPart.endsWith('\r\n')) bodyPart = bodyPart.slice(0, -2)
    const nameMatch = headerBlock.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const name = nameMatch[1]
    const filenameMatch = headerBlock.match(/filename="([^"]+)"/)
    if (filenameMatch) {
      map.set(name, Buffer.from(bodyPart, 'binary'))
    } else {
      map.set(name, Buffer.from(bodyPart, 'binary').toString('utf-8'))
    }
  }
  return map
}

export default defineConfig(({ mode }) => {
  // Load .env files (including .env.local) into process.env for server-side proxy use
  const envDir = path.resolve(__dirname)
  const env = loadEnv(mode, envDir, '')
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v
  }

  return {
    server: {
      port: 3000,
      host: true,
    },
    plugins: [
      react(),
      // Dev-only proxy: intercept /api/qwen-chat and forward to OpenAI
      {
        name: 'qwen-dev-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/api/qwen-chat' || req.method !== 'POST') return next()
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body)
                const openaiBody = {
                  model: parsed.options?.model || 'gpt-5.4-mini',
                  max_completion_tokens: parsed.options?.maxTokens || 1000,
                  messages: [
                    { role: 'system', content: parsed.systemPrompt || '' },
                    ...parsed.messages.map(m => ({ role: m.role, content: m.text })),
                  ],
                }
                const apiKey = process.env.OPENAI_API_KEY || ''
                const r = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify(openaiBody),
                })
                if (!r.ok) {
                  const err = await r.text()
                  console.error('[openai-proxy] OpenAI error:', r.status, err)
                  res.writeHead(r.status, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: err }))
                  return
                }
                const d = await r.json()
                const reply = (d.choices || []).map(c => c.message?.content ?? '').join('\n').trim()
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ reply }))
              } catch (e) {
                console.error('[openai-proxy] Proxy error:', e)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: String(e) }))
              }
            })
          })
        }
      },
      // Dev-only proxy: intercept /api/stt and forward to OpenAI Whisper
      {
        name: 'stt-dev-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/api/stt' || req.method !== 'POST') return next()
            let body = []
            req.on('data', chunk => body.push(chunk))
            req.on('end', async () => {
              try {
                const rawBody = Buffer.concat(body)
                const contentType = req.headers['content-type'] || ''
                const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
                if (!boundaryMatch) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Missing multipart boundary' }))
                  return
                }
                const boundary = boundaryMatch[1] || boundaryMatch[2]
                const fields = parseMultipartStt(rawBody, boundary)
                const audioBuffer = fields.get('file')
                const language = fields.get('language') || 'en'
                if (!audioBuffer) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'No audio file in request' }))
                  return
                }
                const apiKey = process.env.OPENAI_WHISPER_API_KEY || process.env.OPENAI_API_KEY || ''
                const formData = new FormData()
                formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm')
                formData.append('model', 'whisper-1')
                formData.append('language', language)
                const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${apiKey}` },
                  body: formData,
                })
                if (!r.ok) {
                  const err = await r.text()
                  console.error('[stt-proxy] Whisper error:', r.status, err)
                  res.writeHead(r.status, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: err }))
                  return
                }
                const data = await r.json()
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ text: data.text }))
              } catch (e) {
                console.error('[stt-proxy] Proxy error:', e)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: String(e) }))
              }
            })
          })
        }
      },
      // Dev-only proxy: intercept /api/tts and forward to OpenAI TTS
      {
        name: 'tts-dev-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/api/tts' || req.method !== 'POST') return next()
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body)
                const { text, voice = 'nova', speed = 0.9, model = 'tts-1' } = parsed
                if (!text) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'No text provided' }))
                  return
                }
                const apiKey = process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY || ''
                const r = await fetch('https://api.openai.com/v1/audio/speech', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify({ model, voice, input: text, speed }),
                })
                if (!r.ok) {
                  const err = await r.text()
                  console.error('[tts-proxy] TTS error:', r.status, err)
                  res.writeHead(r.status, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: err }))
                  return
                }
                const audioBuffer = Buffer.from(await r.arrayBuffer())
                res.writeHead(200, { 'Content-Type': 'audio/mpeg' })
                res.end(audioBuffer)
              } catch (e) {
                console.error('[tts-proxy] Proxy error:', e)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: String(e) }))
              }
            })
          })
        }
      }
    ]
  }
})
