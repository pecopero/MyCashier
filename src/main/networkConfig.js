const { app } = require('electron')
const path = require('path')
const fs = require('fs')

const DEFAULTS = {
  mode: 'standalone', // 'standalone' | 'server' | 'client'
  serverPort: 3737,
  serverUrl: '',
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'network.json')
}

function readConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeConfig(cfg) {
  const data = { ...DEFAULTS, ...cfg }
  fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2))
  return data
}

module.exports = { readConfig, writeConfig }
