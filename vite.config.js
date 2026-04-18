import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
      // Dev-only proxy: intercept /api/qwen-chat and forward to DashScope with body transformation
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
                const dashScopeBody = {
                  model: parsed.options?.model || 'qwen3.5-flash',
                  max_tokens: parsed.options?.maxTokens || 1000,
                  messages: [
                    { role: 'system', content: parsed.systemPrompt || '' },
                    ...parsed.messages.map(m => ({ role: m.role, content: m.text })),
                  ],
                }
                const apiKey = process.env.VITE_QWEN_API_KEY || ''
                const r = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify(dashScopeBody),
                })
                if (!r.ok) {
                  const err = await r.json()
                  console.error('[qwen-proxy] DashScope error:', r.status, JSON.stringify(err))
                  res.writeHead(r.status, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: err.error?.message || 'API error' }))
                  return
                }
                const d = await r.json()
                const reply = (d.choices || []).map(c => c.message?.content ?? '').join('\n').trim()
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ reply }))
              } catch (e) {
                console.error('[qwen-proxy] Proxy error:', e)
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
