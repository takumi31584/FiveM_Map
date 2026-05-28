import { useState } from 'react'
import { useMarkers } from '../../contexts/MarkerContext'
import { useCategories } from '../../contexts/CategoryContext'
import { useAuth } from '../../contexts/AuthContext'

interface MapSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  visibleCategories: Set<string>
  onToggleCategory: (key: string) => void
  onToggleAll: () => void
  onOpenAdmin: () => void
  showPostals: boolean
  onTogglePostals: () => void
  showMarkerLabels: boolean
  onToggleMarkerLabels: () => void
}

export function MapSidebar({
  collapsed,
  onToggleCollapse,
  visibleCategories,
  onToggleCategory,
  onToggleAll,
  onOpenAdmin,
  showPostals,
  onTogglePostals,
  showMarkerLabels,
  onToggleMarkerLabels,
}: MapSidebarProps) {
  const { markers } = useMarkers()
  const { categories } = useCategories()
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')

  const allVisible = visibleCategories.size === categories.length

  const filteredMarkers = markers.filter((m) => {
    if (!visibleCategories.has(m.category_key)) return false
    if (search) {
      const q = search.toLowerCase()
      return m.title.toLowerCase().includes(q) || m.memo.toLowerCase().includes(q)
    }
    return true
  })

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-[#2a2d3a] bg-[#161822] pt-3">
        <button onClick={onToggleCollapse} className="text-gray-500 hover:text-white" title="開く">
          ▶
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-[#2a2d3a] bg-[#161822]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2d3a] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filters</span>
        <button onClick={onToggleCollapse} className="text-xs text-gray-600 hover:text-gray-300">◀</button>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-1 border-b border-[#2a2d3a] px-5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">番地表示</span>
          <button
            onClick={onTogglePostals}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              showPostals ? 'bg-green-500' : 'bg-[#3b3f51]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                showPostals ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">マーカー名</span>
          <button
            onClick={onToggleMarkerLabels}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              showMarkerLabels ? 'bg-green-500' : 'bg-[#3b3f51]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                showMarkerLabels ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-[#2a2d3a] p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="マーカーを検索..."
          className="w-full rounded bg-[#1e2130] px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>

      {/* Categories */}
      <div className="border-b border-[#2a2d3a] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Categories</span>
          <button onClick={onToggleAll} className="text-xs text-blue-400 hover:text-blue-300">
            {allVisible ? 'Hide All' : 'Show All'}
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {categories.map((cat) => {
            const active = visibleCategories.has(cat.key)
            const count = markers.filter((m) => m.category_key === cat.key).length
            return (
              <li key={cat.key}>
                <button
                  onClick={() => onToggleCategory(cat.key)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                    active ? 'text-gray-200' : 'text-gray-600'
                  } hover:bg-[#1e2130]`}
                >
                  <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: active ? cat.color : '#3b3f51' }} />
                  <span className="flex-1">{cat.icon} {cat.label}</span>
                  {count > 0 && <span className="text-xs text-gray-600">{count}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Marker list */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Markers ({filteredMarkers.length})
        </div>
        {filteredMarkers.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">マーカーなし</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {filteredMarkers.map((m) => {
              const cat = categories.find((c) => c.key === m.category_key)
              return (
                <li key={m.id} className="rounded border border-[#2a2d3a] bg-[#1a1d27] p-2 hover:border-[#3b3f51]">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: cat?.color ?? '#6b7280' }} />
                    <span className="flex-1 truncate font-medium text-gray-200">{m.title || '無題'}</span>
                    {m.is_shared ? (
                      <span className="text-[10px] text-blue-400">共有</span>
                    ) : (
                      <span className="text-[10px] text-gray-600">個人</span>
                    )}
                  </div>
                  {m.memo && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{m.memo}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#2a2d3a] p-3">
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full rounded bg-[#1e2130] px-2 py-1.5 text-xs text-gray-400 hover:bg-[#252838] hover:text-gray-200"
          >
            管理パネル
          </button>
        )}
      </div>
    </div>
  )
}
