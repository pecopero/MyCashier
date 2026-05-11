import { useState, useEffect, useCallback } from 'react'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.electronAPI.getProducts()
      setProducts(data || [])
    } catch (e) {
      setError(e.message || 'Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createProduct = async (data) => {
    const product = await window.electronAPI.createProduct(data)
    setProducts(prev => [...prev, product])
    return product
  }

  const updateProduct = async (id, data) => {
    const updated = await window.electronAPI.updateProduct(id, data)
    setProducts(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  const deleteProduct = async (id) => {
    await window.electronAPI.deleteProduct(id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return { products, loading, error, createProduct, updateProduct, deleteProduct, reload: load }
}
