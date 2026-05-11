import { useState, useEffect, useCallback } from 'react'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([])

  const load = useCallback(async () => {
    try {
      const data = await window.electronAPI.getSuppliers()
      setSuppliers(data || [])
    } catch (_) {}
  }, [])

  useEffect(() => { load() }, [load])

  const createSupplier = async (data) => {
    const s = await window.electronAPI.createSupplier(data)
    setSuppliers(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))
    return s
  }

  const updateSupplier = async (id, data) => {
    const updated = await window.electronAPI.updateSupplier(id, data)
    setSuppliers(prev => prev.map(s => s.id === id ? updated : s))
    return updated
  }

  const deleteSupplier = async (id) => {
    await window.electronAPI.deleteSupplier(id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
  }

  return { suppliers, createSupplier, updateSupplier, deleteSupplier, reload: load }
}
