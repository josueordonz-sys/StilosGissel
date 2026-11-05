import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import geminiHandler from './api/gemini-analyze.js'

function geminiDevPlugin(env) {
  return {
    name: 'gemini-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/gemini-analyze')) {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            res.statusCode = 200
            return res.end()
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {}
              } catch {
                req.body = {}
              }

              // Inyectar claves del .env a process.env para el handler
              process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY
              process.env.VITE_GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY

              const mockRes = {
                setHeader: (k, v) => res.setHeader(k, v),
                status: (code) => {
                  res.statusCode = code
                  return {
                    json: (data) => {
                      res.setHeader('Content-Type', 'application/json')
                      res.end(JSON.stringify(data))
                    },
                    end: () => res.end()
                  }
                }
              }

              try {
                await geminiHandler(req, mockRes)
              } catch (err) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message || 'Error en endpoint dev Gemini' }))
              }
            })
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), geminiDevPlugin(env)],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      proxy: {
        '/storage-img': {
          target: 'https://yibbhuauimlfabtnacwb.supabase.co/storage/v1/object/public/productos',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/storage-img/, '')
        }
      }
    }
  }
})
