import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AdminPanel } from '../components/Admin/AdminPanel'

const MAPS = [
  {
    id: 'fivem',
    title: 'FiveM Map',
    subtitle: 'Los Santos & Blaine County',
    description: 'GTA5 FiveMマップ上にピンを打ちメモを残せます',
    path: '/map',
    gradient: 'from-blue-600 to-purple-700',
  },
]

export function HomePage() {
  const { user, logout, isAdmin } = useAuth()
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <div className="flex h-full flex-col bg-[#0f1117]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2d3a] bg-[#161822] px-6">
        <span className="text-lg font-bold text-white">FiveM Map Memo</span>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-gray-500">{user.username}</span>
              {isAdmin && (
                <button
                  onClick={() => setAdminOpen(true)}
                  className="rounded bg-[#1e2130] px-3 py-1 text-xs text-gray-400 hover:bg-[#252838] hover:text-gray-200"
                >
                  管理パネル
                </button>
              )}
              <button
                onClick={logout}
                className="rounded bg-[#1e2130] px-3 py-1 text-xs text-gray-400 hover:bg-[#252838] hover:text-gray-200"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link to="/login" className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">
              ログイン
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <h2 className="mb-2 text-3xl font-bold text-white">Maps</h2>
          <p className="mb-8 text-sm text-gray-500">マップを選択してください</p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MAPS.map((map) => (
              <Link
                key={map.id}
                to={map.path}
                className="group overflow-hidden rounded-xl border border-[#2a2d3a] bg-[#161822] transition hover:border-[#3b3f51]"
              >
                <div className={`h-36 bg-gradient-to-br ${map.gradient} flex items-center justify-center`}>
                  <span className="text-5xl">🗺️</span>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400">
                    {map.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">{map.subtitle}</p>
                  <p className="mt-2 text-sm text-gray-400">{map.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} defaultTab="users" />}
    </div>
  )
}
