const { ipcMain, BrowserWindow, app } = require('electron')
const path = require('path')
const fs = require('fs')
const settingsRepository = require('../database/settingsRepository')

function getJsBarcodeScript() {
  const candidates = [
    path.join(app.getAppPath(), 'node_modules/jsbarcode/dist/JsBarcode.all.min.js'),
    path.join(__dirname, '../../node_modules/jsbarcode/dist/JsBarcode.all.min.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8')
  }
  return ''
}

function buildLabelHTML(items, settings) {
  const jsbarcodeScript = getJsBarcodeScript()
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const labelCards = items.flatMap(({ name, price, barcode, qty }) =>
    Array.from({ length: qty }, (_, i) => {
      const barcodeId = `bc-${name.replace(/\W/g, '')}-${i}`
      const barcodeHtml = barcode
        ? `<svg id="${barcodeId}" class="barcode"></svg>
           <p class="barcode-num">${barcode}</p>`
        : ''
      return `
        <div class="label">
          <p class="store">${settings.store_name || 'Toko Saya'}</p>
          <p class="name">${name}</p>
          <p class="price">${fmt(price)}</p>
          ${barcodeHtml}
        </div>`
    })
  ).join('')

  const barcodeInits = items
    .filter(i => i.barcode)
    .flatMap(({ name, barcode, qty }) =>
      Array.from({ length: qty }, (_, i) => {
        const barcodeId = `bc-${name.replace(/\W/g, '')}-${i}`
        return `try { JsBarcode("#${barcodeId}", "${barcode}", { format:"CODE128", width:1.5, height:40, displayValue:false, margin:2 }) } catch(e){}`
      })
    ).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background: white; }
  .grid { display:flex; flex-wrap:wrap; gap:4px; padding:8px; }
  .label {
    width:90mm; border:1px dashed #ccc; padding:6px 8px;
    display:flex; flex-direction:column; align-items:center; gap:2px;
    page-break-inside:avoid;
  }
  .store { font-size:9px; color:#555; text-transform:uppercase; letter-spacing:0.5px; }
  .name  { font-size:11px; font-weight:bold; text-align:center; line-height:1.3; }
  .price { font-size:14px; font-weight:900; color:#111; margin-top:2px; }
  .barcode { max-width:100%; }
  .barcode-num { font-size:9px; color:#444; letter-spacing:1px; margin-top:1px; }
  @media print {
    @page { margin:0; size:A4; }
    body { margin:4mm; }
  }
</style>
</head>
<body>
<div class="grid">${labelCards}</div>
<script>${jsbarcodeScript}</script>
<script>${barcodeInits}</script>
</body>
</html>`
}

ipcMain.handle('labels:print', async (_, items) => {
  const settings = settingsRepository.getAll()
  const html = buildLabelHTML(items, settings)

  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        win.webContents.print({ silent: false, printBackground: false }, (success) => {
          win.destroy()
          resolve({ success })
        })
      }, 500)
    })
  })
})

ipcMain.handle('labels:preview', (_, items) => {
  const settings = settingsRepository.getAll()
  return buildLabelHTML(items, settings)
})
