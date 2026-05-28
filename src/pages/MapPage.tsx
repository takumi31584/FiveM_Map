import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GameMap } from '../components/Map/GameMap'
import { AddMarkerModal } from '../components/Marker/AddMarkerModal'
import { MarkerProvider } from '../contexts/MarkerContext'
import { MapSidebar } from '../components/Sidebar/MapSidebar'
import { AdminPanel } from '../components/Admin/AdminPanel'
import { useCategories } from '../contexts/CategoryContext'
import { useAuth } from '../contexts/AuthContext'

export function MapPage() {
  const { categories } = useCategories()
  const { user, logout } = useAuth()
  const [showPostals, setShowPostals] = useState(true)
  const [showMarkerLabels, setShowMarkerLabels] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null)

  const allKeys = useMemo(() => categories.map((c) => c.key), [categories])
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(allKeys))

  // Keep visible categories in sync when categories load
  const effectiveVisible = useMemo(() => {
    if (visibleCategories.size === 0 && allKeys.length > 0) return new Set(allKeys)
    return visibleCategories
  }, [visibleCategories, allKeys])

  const toggleCategory = (key: string) => {
    setVisibleCategories((prev) => {
      const s = new Set(prev.size === 0 ? allKeys : prev)
      if (s.has(key)) s.delete(key); else s.add(key)
      return s
    })
  }

  const toggleAll = () => {
    setVisibleCategories(effectiveVisible.size === allKeys.length ? new Set() : new Set(allKeys))
  }

  return (
    <MarkerProvider>
      <div className="flex h-full flex-col bg-[#0f1117]">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#2a2d3a] bg-[#161822] px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-bold text-gray-400 hover:text-white">FiveM Map Memo</Link>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-semibold text-white">Los Santos & Blaine County</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{user?.username}</span>
            <button
              onClick={logout}
              className="rounded bg-[#1e2130] px-3 py-1 text-xs text-gray-400 hover:bg-[#252838] hover:text-gray-200"
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <MapSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            visibleCategories={effectiveVisible}
            onToggleCategory={toggleCategory}
            showPostals={showPostals}
            onTogglePostals={() => setShowPostals((v) => !v)}
            showMarkerLabels={showMarkerLabels}
            onToggleMarkerLabels={() => setShowMarkerLabels((v) => !v)}
            onToggleAll={toggleAll}
            onOpenAdmin={() => setAdminOpen(true)}
          />
          <div className="relative flex-1">
            <GameMap
              onMapClick={setPendingPosition}
              showPostals={showPostals}
              visibleCategories={effectiveVisible}
              showMarkerLabels={showMarkerLabels}
            />
          </div>
        </div>

        {pendingPosition && (
          <AddMarkerModal position={pendingPosition} onClose={() => setPendingPosition(null)} />
        )}
        {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      </div>
    </MarkerProvider>
  )
}
