import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'

const SAMPLE_TX = {
  id: 1,
  created_at: new Date().toISOString(),
  subtotal: 75000,
  discount: 5000,
  total: 70000,
  payment: 100000,
  change: 30000,
  items: [
    { product_name: 'Contoh Produk A', quantity: 2, price: 15000, subtotal: 30000 },
    { product_name: 'Contoh Produk B', quantity: 1, price: 45000, subtotal: 45000 },
  ],
}

function ReceiptPreviewModal({ html, onClose }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-4 flex flex-col items-center gap-3 max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center w-full">
          <h3 className="font-semibold text-gray-800 text-sm">Preview Struk</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-inner">
          <iframe srcDoc={html} title="Preview Struk"
            style={{ width: '320px', height: '480px', border: 'none', display: 'block' }} />
        </div>
        <p className="text-xs text-gray-400">Tampilan menggunakan data contoh</p>
      </div>
    </div>,
    document.body
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      <div className="pt-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

function UserManager() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', pin: '', role: 'kasir' })

  const loadUsers = () => window.electronAPI.getUsers().then(setUsers)
  useEffect(() => { loadUsers() }, [])

  const resetForm = () => { setForm({ name: '', pin: '', role: 'kasir' }); setShowAdd(false); setEditTarget(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editTarget) {
      await window.electronAPI.updateUser(editTarget.id, {
        name: form.name, pin: form.pin || undefined, role: form.role, active: 1
      })
    } else {
      if (!form.pin || form.pin.length < 4) return alert('PIN minimal 4 digit.')
      await window.electronAPI.createUser({ name: form.name, pin: form.pin, role: form.role })
    }
    resetForm()
    loadUsers()
  }

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return alert('Tidak bisa hapus user yang sedang login.')
    if (!confirm('Hapus pengguna ini?')) return
    await window.electronAPI.deleteUser(id)
    loadUsers()
  }

  const openEdit = (user) => {
    setEditTarget(user)
    setForm({ name: user.name, pin: '', role: user.role })
    setShowAdd(true)
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500">Kelola siapa yang bisa masuk ke aplikasi</p>
        <button onClick={() => { resetForm(); setShowAdd(true) }}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Tambah User
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                PIN {editTarget ? '(kosongkan untuk tidak ubah)' : '(min. 4 digit)'}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} className={inp}
                value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                required={!editTarget} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <div className="flex gap-2">
              {[['owner','Pemilik (akses penuh)'],['kasir','Kasir (hanya kasir & dashboard)']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, role: val }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.role === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">Batal</button>
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
              {editTarget ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${user.role === 'owner' ? 'bg-blue-600' : 'bg-gray-500'}`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-800">{user.name}
                {user.id === currentUser?.id && <span className="ml-2 text-xs text-blue-500">(Anda)</span>}
              </p>
              <p className="text-xs text-gray-400">{user.role === 'owner' ? 'Pemilik' : 'Kasir'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(user)} className="text-xs text-blue-600 hover:underline">Edit</button>
              {user.id !== 1 && (
                <button onClick={() => handleDelete(user.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const [form, setForm] = useState({
    store_name: '', store_tagline: '', store_address: '', store_phone: '',
    receipt_note: '', tax_percent: '0', daily_target: '0',
    thermal_printer_name: '', thermal_paper_width: '58', print_silent: '0',
  })
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [previewHtml, setPreviewHtml] = useState(null)
  const [autoBackup, setAutoBackup] = useState({ enabled: false, folder: '' })
  const [autoBackupMsg, setAutoBackupMsg] = useState('')
  const [printers, setPrinters] = useState([])
  const [printersLoading, setPrintersLoading] = useState(false)

  useEffect(() => {
    window.electronAPI.getSettings().then(s => {
      setForm({
        store_name:           s.store_name           ?? '',
        store_tagline:        s.store_tagline        ?? '',
        store_address:        s.store_address        ?? '',
        store_phone:          s.store_phone          ?? '',
        receipt_note:         s.receipt_note         ?? '',
        tax_percent:          s.tax_percent          ?? '0',
        daily_target:         s.daily_target         ?? '0',
        thermal_printer_name: s.thermal_printer_name ?? '',
        thermal_paper_width:  s.thermal_paper_width  ?? '58',
        print_silent:         s.print_silent         ?? '0',
      })
      setAutoBackup({
        enabled: s.auto_backup_enabled === '1' || s.auto_backup_enabled === 1,
        folder:  s.auto_backup_folder ?? '',
      })
    })
    loadPrinters()
  }, [])

  const loadPrinters = async () => {
    setPrintersLoading(true)
    try {
      const list = await window.electronAPI.getInstalledPrinters()
      setPrinters(list)
    } catch {}
    setPrintersLoading(false)
  }

  const handlePreview = async () => {
    const html = await window.electronAPI.previewReceipt(SAMPLE_TX, form)
    setPreviewHtml(html)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    await window.electronAPI.saveSettings({
      ...form,
      auto_backup_enabled:  autoBackup.enabled ? '1' : '0',
      auto_backup_folder:   autoBackup.folder,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handlePickFolder = async () => {
    const folder = await window.electronAPI.pickBackupFolder()
    if (folder) setAutoBackup(a => ({ ...a, folder }))
  }

  const handleAutoBackupNow = async () => {
    if (!autoBackup.folder) return setAutoBackupMsg('Pilih folder dulu.')
    await window.electronAPI.saveSettings({
      ...form,
      auto_backup_enabled: autoBackup.enabled ? '1' : '0',
      auto_backup_folder:  autoBackup.folder,
    })
    const result = await window.electronAPI.backupDatabase()
    setAutoBackupMsg(result.success ? 'Backup otomatis berhasil disimpan.' : 'Backup dibatalkan.')
    setTimeout(() => setAutoBackupMsg(''), 3000)
  }

  const handleBackup = async () => {
    const result = await window.electronAPI.backupDatabase()
    setBackupMsg(result.success ? `Backup berhasil disimpan.` : 'Backup dibatalkan.')
    setTimeout(() => setBackupMsg(''), 3000)
  }

  const handleRestore = async () => {
    if (!confirm('Restore akan menggantikan SEMUA data saat ini dengan data backup. Lanjutkan?')) return
    const result = await window.electronAPI.restoreDatabase()
    if (result.success) {
      alert('Restore berhasil. Aplikasi akan restart.')
      window.location.reload()
    } else {
      setBackupMsg('Restore dibatalkan.')
      setTimeout(() => setBackupMsg(''), 3000)
    }
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Pengaturan</h1>

      {previewHtml && <ReceiptPreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />}

      <form onSubmit={handleSave}>
        <Section title="Informasi Toko">
          <Field label="Nama Toko" hint="Tampil tebal di header struk">
            <input className={input} value={form.store_name}
              onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} />
          </Field>
          <Field label="Tagline / Slogan" hint="Baris kecil di bawah nama toko (opsional)">
            <input className={input} value={form.store_tagline}
              onChange={e => setForm(f => ({ ...f, store_tagline: e.target.value }))}
              placeholder="Contoh: Melayani dengan sepenuh hati" />
          </Field>
          <Field label="Alamat" hint="Opsional">
            <input className={input} value={form.store_address}
              onChange={e => setForm(f => ({ ...f, store_address: e.target.value }))} />
          </Field>
          <Field label="No. Telepon" hint="Opsional">
            <input className={input} value={form.store_phone}
              onChange={e => setForm(f => ({ ...f, store_phone: e.target.value }))} />
          </Field>
        </Section>

        <Section title="Pengaturan Struk">
          <Field label="Catatan Footer" hint="Tampil di bawah struk, bisa multi-baris (Enter untuk baris baru)">
            <textarea rows={4} className={input} value={form.receipt_note}
              onChange={e => setForm(f => ({ ...f, receipt_note: e.target.value }))}
              placeholder={'Terima kasih atas kunjungan Anda!\nSampai jumpa kembali :)'} />
          </Field>
          <Field label="Pajak (%)" hint="0 = tanpa pajak">
            <input type="number" min="0" max="100" className={input} value={form.tax_percent}
              onChange={e => setForm(f => ({ ...f, tax_percent: e.target.value }))} />
          </Field>
          <Field label="Target Omzet Harian (Rp)" hint="Tampil sebagai progress bar di Dashboard, 0 = nonaktif">
            <input type="number" min="0" className={input} value={form.daily_target}
              onChange={e => setForm(f => ({ ...f, daily_target: e.target.value }))}
              placeholder="Contoh: 1000000" />
          </Field>
        </Section>

        <Section title="Printer Thermal (Struk)">
          <Field label="Pilih Printer" hint="Kosongkan untuk print via dialog (default)">
            <div className="flex gap-2">
              <select className={`${input} flex-1`} value={form.thermal_printer_name}
                onChange={e => setForm(f => ({ ...f, thermal_printer_name: e.target.value }))}>
                <option value="">— Print via Dialog (default) —</option>
                {printers.map(p => (
                  <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' ★' : ''}</option>
                ))}
              </select>
              <button type="button" onClick={loadPrinters} disabled={printersLoading}
                className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap">
                {printersLoading ? '...' : '↻ Refresh'}
              </button>
            </div>
          </Field>
          <Field label="Lebar Kertas" hint="Sesuaikan dengan ukuran roll printer thermal">
            <div className="flex gap-4">
              {[['58', '58 mm (default)'], ['80', '80 mm']].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paper_width" value={val}
                    checked={form.thermal_paper_width === val}
                    onChange={() => setForm(f => ({ ...f, thermal_paper_width: val }))} />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Mode Print" hint="Silent: langsung cetak tanpa dialog (harus pilih printer dulu)">
            <div className="flex items-center gap-3">
              <button type="button"
                disabled={!form.thermal_printer_name}
                onClick={() => setForm(f => ({ ...f, print_silent: f.print_silent === '1' ? '0' : '1' }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${form.print_silent === '1' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.print_silent === '1' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-600">
                {form.print_silent === '1' ? 'Silent — langsung cetak' : 'Dialog — muncul preview print'}
              </span>
            </div>
          </Field>
          <Field label="Test Print">
            <button type="button" onClick={() => window.electronAPI.printReceipt(SAMPLE_TX)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium border border-gray-200">
              🖨 Test Print Struk
            </button>
          </Field>
        </Section>

        <div className="flex items-center gap-3">
          <button type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Simpan Pengaturan
          </button>
          <button type="button" onClick={handlePreview}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm border border-gray-200">
            Preview Struk
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✓ Tersimpan</span>}
        </div>
      </form>

      {/* Manajemen User */}
      <div className="mt-8">
        <Section title="Manajemen Pengguna">
          <UserManager />
        </Section>
      </div>

      {/* Auto Backup */}
      <div className="mt-8">
        <Section title="Backup Otomatis">
          <Field label="Aktifkan" hint="Backup otomatis dijalankan setiap kali aplikasi dibuka (1x per hari)">
            <button type="button"
              onClick={() => setAutoBackup(a => ({ ...a, enabled: !a.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoBackup.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoBackup.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </Field>
          <Field label="Folder Tujuan" hint="Folder tempat file backup disimpan otomatis">
            <div className="flex items-center gap-2">
              <input readOnly value={autoBackup.folder || 'Belum dipilih'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500 truncate" />
              <button type="button" onClick={handlePickFolder}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 border border-gray-200 whitespace-nowrap">
                Pilih Folder…
              </button>
            </div>
          </Field>
          <Field label="">
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleAutoBackupNow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Backup ke Folder Ini Sekarang
              </button>
              {autoBackupMsg && <span className="text-sm text-gray-600">{autoBackupMsg}</span>}
            </div>
          </Field>
        </Section>
      </div>

      {/* Backup & Restore */}
      <div className="mt-8">
        <Section title="Backup & Restore Data">
          <Field label="Backup Database" hint="Simpan salinan data ke file .db">
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleBackup}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                Backup Sekarang
              </button>
              {backupMsg && <span className="text-sm text-gray-600">{backupMsg}</span>}
            </div>
          </Field>
          <Field label="Restore Database" hint="Kembalikan data dari file backup">
            <button type="button" onClick={handleRestore}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium">
              Pilih File Backup…
            </button>
            <p className="text-xs text-red-500 mt-1">Hati-hati: data saat ini akan digantikan.</p>
          </Field>
        </Section>
      </div>
    </div>
  )
}
