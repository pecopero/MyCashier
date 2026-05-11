const { ipcMain, BrowserWindow } = require('electron')
const settingsRepository = require('../database/settingsRepository')

ipcMain.handle('print:getInstalledPrinters', async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } })
  await win.loadURL('about:blank')
  const printers = await win.webContents.getPrintersAsync()
  win.destroy()
  return printers.map(p => ({ name: p.name, isDefault: p.isDefault }))
})

const METHOD_LABEL = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS', credit: 'Piutang' }

function buildPaymentRows(tx, fmt) {
  // Credit / piutang transaction
  if (tx.payment_type === 'credit') {
    const downPayment = tx.payment || 0
    const remaining   = tx.total - downPayment
    const rows = downPayment > 0
      ? `<tr><td colspan="2">Bayar Muka</td><td class="amount">${fmt(downPayment)}</td></tr>`
      : ''
    return `
      ${rows}
      <tr><td colspan="2" class="credit-label">Piutang</td><td class="amount credit-label">${fmt(remaining)}</td></tr>`
  }

  const methods = tx.paymentMethods || []
  const hasSplit = methods.length > 1

  if (hasSplit) {
    const rows = methods
      .filter(m => m.amount > 0)
      .map(m => `<tr><td colspan="2">${METHOD_LABEL[m.method] ?? m.method}</td><td class="amount">${fmt(m.amount)}</td></tr>`)
      .join('')
    return `
      ${rows}
      <tr><td colspan="2">Kembalian</td><td class="amount">${fmt(Math.max(0, tx.change))}</td></tr>`
  }

  const label = methods[0] ? (METHOD_LABEL[methods[0].method] ?? methods[0].method) : 'Bayar'
  return `
    <tr><td colspan="2">${label}</td><td class="amount">${fmt(tx.payment)}</td></tr>
    <tr><td colspan="2">Kembalian</td><td class="amount">${fmt(Math.max(0, tx.change))}</td></tr>`
}

function buildReceiptHTML(tx, settings, paperWidth) {
  const mm  = (paperWidth || settings.thermal_paper_width || '58') === '80' ? '80mm' : '58mm'
  const px  = mm === '80mm' ? '375px' : '280px'
  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const date = new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })

  const rows = tx.items.map(item => {
    const hasItemDisc = item.item_discount > 0
    const itemDiscAmt = item.item_discount_type === 'percent'
      ? Math.round(item.price * item.quantity * (item.item_discount / 100))
      : item.item_discount
    const discRow = hasItemDisc
      ? `<tr><td class="qty" colspan="2">  Diskon${item.item_discount_type === 'percent' ? ` ${item.item_discount}%` : ''}</td><td class="amount">- ${fmt(itemDiscAmt)}</td></tr>`
      : ''
    const unitLabel = item.unit_name ? ` ${item.unit_name}` : ''
    return `
    <tr>
      <td colspan="3" class="product">${item.product_name}</td>
    </tr>
    <tr>
      <td class="qty">${item.quantity}${unitLabel} x ${fmt(item.price)}</td>
      <td></td>
      <td class="amount">${fmt(item.price * item.quantity)}</td>
    </tr>
    ${discRow}`
  }).join('')

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

  const footerLines = (settings.receipt_note || '').split('\n').filter(l => l.trim())

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: ${px};
    padding: 8px;
    color: #000;
  }
  .center { text-align: center; }
  .store-name { font-size: 15px; font-weight: bold; }
  .tagline { font-size: 11px; color: #444; margin-top: 2px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .product { font-weight: bold; padding-top: 4px; }
  .qty { color: #333; font-size: 11px; }
  .amount { text-align: right; white-space: nowrap; }
  .total-row td { font-weight: bold; font-size: 13px; border-top: 1px dashed #000; padding-top: 4px; }
  .credit-label { font-weight: bold; color: #c00; }
  .note { font-size: 11px; text-align: center; margin-top: 4px; line-height: 1.5; }
  @media print {
    @page { margin: 0; size: ${mm} auto; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="store-name">${settings.store_name || 'Toko Saya'}</div>
    ${settings.store_tagline ? `<div class="tagline">${settings.store_tagline}</div>` : ''}
    ${settings.store_address ? `<div>${settings.store_address}</div>` : ''}
    ${settings.store_phone ? `<div>Telp: ${settings.store_phone}</div>` : ''}
  </div>
  <div class="divider"></div>
  <div>No: #${tx.id || '—'} &nbsp;|&nbsp; ${date}</div>
  ${tx.user_name ? `<div>Kasir: ${tx.user_name}</div>` : ''}
  ${tx.customer_name ? `<div>Pelanggan: ${tx.customer_name}</div>` : ''}
  <div class="divider"></div>

  <table>
    ${rows}
    ${discountRow}
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td class="amount">${fmt(tx.total)}</td>
    </tr>
    ${buildPaymentRows(tx, fmt)}
  </table>

  <div class="divider"></div>
  ${footerLines.length > 0 ? `<div class="note">${footerLines.join('<br/>')}</div>` : ''}
</body>
</html>`
}

ipcMain.handle('print:receipt', async (_, tx) => {
  const settings    = settingsRepository.getAll()
  const html        = buildReceiptHTML(tx, settings)
  const printerName = settings.thermal_printer_name || ''
  const silent      = settings.print_silent === '1' && !!printerName

  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

    win.webContents.once('did-finish-load', () => {
      const printOpts = { silent, printBackground: false }
      if (printerName) printOpts.deviceName = printerName
      win.webContents.print(printOpts, (success) => {
        win.destroy()
        resolve({ success })
      })
    })
  })
})

ipcMain.handle('print:preview', (_, tx, settingsOverride) => {
  const settings = settingsOverride || settingsRepository.getAll()
  return buildReceiptHTML(tx, settings)
})
