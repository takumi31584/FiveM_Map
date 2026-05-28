import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { categoryApi, type Category } from '../services/api'

interface CategoryContextValue {
  categories: Category[]
  loaded: boolean
  categoryMap: Map<string, Category>
  reload: () => Promise<void>
}

const CategoryContext = createContext<CategoryContextValue | null>(null)

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    try {
      const data = await categoryApi.list()
      setCategories(data)
      setLoaded(true)
    } catch {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const categoryMap = new Map(categories.map((c) => [c.key, c]))

  return (
    <CategoryContext.Provider value={{ categories, loaded, categoryMap, reload }}>
      {children}
    </CategoryContext.Provider>
  )
}

export function useCategories(): CategoryContextValue {
  const ctx = useContext(CategoryContext)
  if (!ctx) throw new Error('useCategories must be used within CategoryProvider')
  return ctx
}
