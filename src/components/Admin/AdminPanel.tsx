import { useState } from 'react'
import { CategoryManager } from './CategoryManager'
import { UserManager } from './UserManager'

type Tab = 'categories' | 'users'

interface AdminPanelProps {
  onClose: () => void
  defaultTab?: Tab
}

export function AdminPanel({ onClose, defaultTab = 'categories' }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>(defaultTab)

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex h-[80vh] w-[600px] max-w-[90vw] flex-col rounded-xl border border-[#2a2d3a] bg-[#161822] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2d3a] px-5 py-3">
          <h2 className="text-lg font-bold text-white">管理パネル</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2d3a]">
          <button
            onClick={() => setTab('categories')}
            className={`px-5 py-2 text-sm font-medium transition ${
              tab === 'categories' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            カテゴリ管理
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-5 py-2 text-sm font-medium transition ${
              tab === 'users' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            ユーザー管理
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'categories' && <CategoryManager />}
          {tab === 'users' && <UserManager />}
        </div>
      </div>
    </div>
  )
}
