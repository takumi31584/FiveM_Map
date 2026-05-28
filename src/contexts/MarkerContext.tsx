import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { markerApi, type ApiMarker } from '../services/api'

interface MarkerContextValue {
  markers: ApiMarker[]
  loaded: boolean
  addMarker: (data: {
    position_x: number
    position_y: number
    title: string
    memo: string
    category_key: string
    is_shared?: boolean
  }) => Promise<void>
  updateMarker: (id: number, updates: Partial<Omit<ApiMarker, 'is_shared'> & { is_shared: boolean }>) => Promise<void>
  deleteMarker: (id: number) => Promise<void>
  reload: () => Promise<void>
}

const MarkerContext = createContext<MarkerContextValue | null>(null)

export function MarkerProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState<ApiMarker[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    try {
      const data = await markerApi.list()
      setMarkers(data)
      setLoaded(true)
    } catch {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const addMarker = async (data: Parameters<typeof markerApi.create>[0]) => {
    const created = await markerApi.create(data)
    setMarkers((prev) => [created, ...prev])
  }

  const updateMarker = async (id: number, updates: Partial<Omit<ApiMarker, 'is_shared'> & { is_shared: boolean }>) => {
    const updated = await markerApi.update(id, updates)
    setMarkers((prev) => prev.map((m) => (m.id === id ? updated : m)))
  }

  const deleteMarker = async (id: number) => {
    await markerApi.delete(id)
    setMarkers((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <MarkerContext.Provider value={{ markers, loaded, addMarker, updateMarker, deleteMarker, reload }}>
      {children}
    </MarkerContext.Provider>
  )
}

export function useMarkers(): MarkerContextValue {
  const ctx = useContext(MarkerContext)
  if (!ctx) throw new Error('useMarkers must be used within MarkerProvider')
  return ctx
}
