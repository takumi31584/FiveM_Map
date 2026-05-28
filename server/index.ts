import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { sessionMiddleware } from './middleware/auth.js'
import auth from './routes/auth.js'
import markers from './routes/markers.js'
import categories from './routes/categories.js'
import uploads from './routes/uploads.js'

const app = new Hono()

app.use('*', secureHeaders())
app.use('*', cors({ origin: 'http://localhost:5173', credentials: true }))
app.use('*', sessionMiddleware)

app.route('/api/auth', auth)
app.route('/api/markers', markers)
app.route('/api/categories', categories)
app.route('/api/uploads', uploads)

const port = 3001
serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})
