import { useState, useCallback } from 'react'

export function usePurchases() {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (filters = {}) => {
    setLoading(true)
    const data = await window.electronAPI.getPurchases(filters)
    setPurchases(data)
    setLoading(false)
  }, [])

  const createPurchase = async (data) => {
    const purchase = await window.electronAPI.createPurchase(data)
    setPurchases(prev => [purchase, ...prev])
    return purchase
  }

  return { purchases, loading, createPurchase, reload: load }
}
