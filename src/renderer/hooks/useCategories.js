import { useState, useEffect, useCallback } from 'react'

export function useCategories() {
  const [categories, setCategories] = useState([])

  const load = useCallback(async () => {
    const data = await window.electronAPI.getCategories()
    setCategories(data)
  }, [])

  useEffect(() => { load() }, [load])

  const createCategory = async (name) => {
    const cat = await window.electronAPI.createCategory(name)
    setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
    return cat
  }

  const updateCategory = async (id, name) => {
    const updated = await window.electronAPI.updateCategory(id, name)
    setCategories(prev => prev.map(c => c.id === id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)))
    return updated
  }

  const deleteCategory = async (id) => {
    await window.electronAPI.deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return { categories, createCategory, updateCategory, deleteCategory, reload: load }
}
