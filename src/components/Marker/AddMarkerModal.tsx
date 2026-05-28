import { useState } from 'react'
import { useMarkers } from '../../contexts/MarkerContext'
import { useCategories } from '../../contexts/CategoryContext'
import { useAuth } from '../../contexts/AuthContext'

interface AddMarkerModalProps {
  position: { x: number; y: number }
  onClose: () => void
}

export function AddMarkerModal({ position, onClose }: AddMarkerModalProps) {
  const { addMarker } = useMarkers()
  const { categories } = useCategories()
  const { isAdmin } = useAuth()
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [categoryKey, setCategoryKey] = useState(categories[0]?.key ?? 'custom')
  const [isShared, setIsShared] = useState(isAdmin)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addMarker({
      position_x: position.x,
      position_y: position.y,
      title,
      memo,
      category_key: categoryKey,
      is_shared: isShared,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-80 rounded-xl border border-[#2a2d3a] bg-[#161822] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-bold text-white">ピンを追加</h3>
        <p className="mb-4 font-mono text-xs text-gray-600">X: {position.x} | Y: {position.y}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-[#2a2d3a] bg-[#1e2130] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
            placeholder="タイトル"
            autoFocus
          />
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="rounded border border-[#2a2d3a] bg-[#1e2130] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
            rows={3}
            placeholder="メモ"
          />
          <select
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value)}
            className="rounded border border-[#2a2d3a] bg-[#1e2130] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
            ))}
          </select>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="rounded"
              />
              全員に共有する
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
              追加
            </button>
            <button type="button" onClick={onClose} className="flex-1 rounded bg-[#1e2130] px-4 py-2 text-sm text-gray-400 hover:bg-[#252838]">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
