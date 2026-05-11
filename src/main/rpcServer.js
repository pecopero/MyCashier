const { ipcMain } = require('electron')
const http = require('http')

const _handlers = new Map()

// Monkey-patch ipcMain.handle so every handler is captured for RPC dispatch.
// This file must be required BEFORE any ipc handler files are loaded.
const _origHandle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = function (channel, handler) {
  _handlers.set(channel, handler)
  return _origHandle(channel, handler)
}

let _server = null

function startRpcServer(port) {
  if (_server) return
  _server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/rpc') {
      res.writeHead(404)
      return res.end()
    }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const { channel, args = [] } = JSON.parse(body)
        const handler = _handlers.get(channel)
        if (!handler) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: `No handler: ${channel}` }))
        }
        // ipcMain handlers receive (event, ...args) — pass a plain object as fake event
        const result = await handler({}, ...args)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ result: result ?? null }))
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message || String(err) }))
      }
    })
  })
  _server.listen(port, '0.0.0.0', () => {
    console.log(`[RPC] Server listening on :${port}`)
  })
  _server.on('error', (err) => {
    console.error('[RPC] Server error:', err.message)
  })
}

module.exports = { startRpcServer }
