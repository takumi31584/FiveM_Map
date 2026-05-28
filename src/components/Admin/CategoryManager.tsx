import { useState } from 'react'
import { useCategories } from '../../contexts/CategoryContext'
import { categoryApi, type Category } from '../../services/api'

export function CategoryManager() {
  const { categories, reload } = useCategories()
  const [editing, setEditing] = useState<Category | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">カテゴリ一覧</h3>
        <button
          onClick={() => setAdding(true)}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
        >
          + 追加
        </button>
      </div>

      {adding && (
        <CategoryForm
          onSave={async (data) => {
            await categoryApi.create(data)
            await reload()
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <ul className="flex flex-col gap-2">
        {categories.map((cat) =>
          editing?.id === cat.id ? (
            <CategoryForm
              key={cat.id}
              initial={cat}
              onSave={async (data) => {
                await categoryApi.update(cat.id, data)
                await reload()
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <li key={cat.id} className="flex items-center gap-3 rounded border border-[#2a2d3a] bg-[#1a1d27] p-3">
              <span className="inline-block h-4 w-4 rounded" style={{ background: cat.color }} />
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-200">{cat.label}</div>
                <div className="text-xs text-gray-600">key: {cat.key}</div>
              </div>
              <button
                onClick={() => setEditing(cat)}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-[#252838] hover:text-gray-200"
              >
                編集
              </button>
              <button
                onClick={async () => {
                  await categoryApi.delete(cat.id)
                  await reload()
                }}
                className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/30"
              >
                削除
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Category
  onSave: (data: { key: string; label: string; color: string; icon: string }) => Promise<void>
  onCancel: () => void
}) {
  const [key, setKey] = useState(initial?.key ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6b7280')
  const [icon, setIcon] = useState(initial?.icon ?? '📌')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({ key, label, color, icon })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3 rounded border border-blue-500/30 bg-[#1a1d27] p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">キー (英数字)</label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={!!initial}
            className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 text-sm text-gray-200 outline-none disabled:opacity-50"
            placeholder="my_category"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">ラベル</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 text-sm text-gray-200 outline-none"
            placeholder="カテゴリ名"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 font-mono text-sm text-gray-200 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">アイコン (絵文字)</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 text-sm text-gray-200 outline-none"
            placeholder="📌"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">
          {initial ? '更新' : '作成'}
        </button>
        <button type="button" onClick={onCancel} className="rounded bg-[#3b3f51] px-3 py-1 text-xs text-gray-300 hover:bg-[#4a4f63]">
          キャンセル
        </button>
      </div>
    </form>
  )
}
