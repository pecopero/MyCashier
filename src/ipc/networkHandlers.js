const { ipcMain } = require('electron')
const os = require('os')
const { readConfig, writeConfig } = require('../main/networkConfig')

ipcMain.handle('network:ping', () => ({ ok: true, ts: Date.now() }))

ipcMain.handle('network:getConfig', () => readConfig())

ipcMain.handle('network:setConfig', (_, cfg) => {
  writeConfig(cfg)
  return { ok: true }
})

ipcMain.handle('network:getLocalIPs', () => {
  const ifaces = os.networkInterfaces()
  const ips = []
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push({ name, address: addr.address })
      }
    }
  }
  return ips
})
