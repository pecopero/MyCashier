const { ipcMain, BrowserWindow } = require('electron')
const settingsRepository = require('../database/settingsRepository')

function buildReceiptHTML(tx, settings) {
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const date = new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })

  const rows = tx.items.map(item => `
    <tr>
      <td colspan="3" class="product">${item.product_name}</td>
    </tr>
    <tr>
      <td class="qty">${item.quantity} x ${fmt(item.price)}</td>
      <td></td>
      <td class="amount">${fmt(item.subtotal)}</td>
    </tr>`).join('')

  const discountRow = tx.discount > 0 ? `
    <tr class="separator"><td colspan="3"><hr/></td></tr>
    <tr>
      <td colspan="2">Subtotal</td>
      <td class="amount">${fmt(tx.subtotal || tx.total)}</td>
    </tr>
    <tr>
      <td colspan="2">Diskon</td>
      <td class="amount">- ${fmt(tx.discount)}</td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 280px;
    padding: 8px;
    color: #000;
  }
  .center { text-align: center; }
  .store-name { font-size: 15px; font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .product { font-weight: bold; padding-top: 4px; }
  .qty { color: #333; font-size: 11px; }
  .amount { text-align: right; white-space: nowrap; }
  .total-row td { font-weight: bold; font-size: 13px; border-top: 1px dashed #000; padding-top: 4px; }
  .note { font-size: 11px; text-align: center; margin-top: 6px; }
  @media print {
    @page { margin: 0; size: 58mm auto; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="store-name">${settings.store_name || 'Toko Saya'}</div>
    ${settings.store_address ? `<div>${settings.store_address}</div>` : ''}
    ${settings.store_phone ? `<div>Telp: ${settings.store_phone}</div>` : ''}
  </div>
  <div class="divider"></div>
  <div>${date}</div>
  <div class="divider"></div>

  <table>
    ${rows}
    ${discountRow}
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td class="amount">${fmt(tx.total)}</td>
    </tr>
    <tr>
      <td colspan="2">Bayar</td>
      <td class="amount">${fmt(tx.payment)}</td>
    </tr>
    <tr>
      <td colspan="2">Kembalian</td>
      <td class="amount">${fmt(tx.change)}</td>
    </tr>
  </table>

  <div class="divider"></div>
  ${settings.receipt_note ? `<div class="note">${settings.receipt_note}</div>` : ''}
</body>
</html>`
}

ipcMain.handle('print:receipt', async (_, tx) => {
  const settings = settingsRepository.getAll()
  const html = buildReceiptHTML(tx, settings)

  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

    win.webContents.once('did-finish-load', () => {
      win.webContents.print(
        { silent: false, printBackground: false },
        (success) => {
          win.destroy()
          resolve({ success })
        }
      )
    })
  })
})

ipcMain.handle('print:preview', (_, tx) => {
  const settings = settingsRepository.getAll()
  return buildReceiptHTML(tx, settings)
})
