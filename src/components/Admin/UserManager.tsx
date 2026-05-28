import { useEffect, useState } from 'react'
import { authApi, type User } from '../../services/api'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: 'bg-green-900/30', text: 'text-green-400', label: '承認済' },
  pending: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: '承認待ち' },
  rejected: { bg: 'bg-red-900/30', text: 'text-red-400', label: '拒否' },
}

export function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [adding, setAdding] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')

  const loadUsers = async () => {
    const data = await authApi.getUsers()
    setUsers(data)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await authApi.createUser(username, password, role)
    setUsername('')
    setPassword('')
    setRole('user')
    setAdding(false)
    await loadUsers()
  }

  const pendingUsers = users.filter((u) => u.status === 'pending')
  const otherUsers = users.filter((u) => u.status !== 'pending')

  return (
    <div>
      {/* Pending requests */}
      {pendingUsers.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-400">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            承認待ち ({pendingUsers.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {pendingUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded border border-yellow-500/30 bg-yellow-900/10 p-3">
                <div>
                  <span className="text-sm font-medium text-gray-200">{u.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => { await authApi.approveUser(u.id); await loadUsers() }}
                    className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-500"
                  >
                    承認
                  </button>
                  <button
                    onClick={async () => { await authApi.rejectUser(u.id); await loadUsers() }}
                    className="rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-red-500"
                  >
                    拒否
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User list */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">ユーザー一覧</h3>
        <button
          onClick={() => setAdding(true)}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
        >
          + 追加
        </button>
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="mb-3 rounded border border-blue-500/30 bg-[#1a1d27] p-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">ユーザー名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 text-sm text-gray-200 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 text-sm text-gray-200 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">ロール</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded border border-[#2a2d3a] bg-[#1e2130] px-2 py-1 text-sm text-gray-200 outline-none"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">作成</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded bg-[#3b3f51] px-3 py-1 text-xs text-gray-300 hover:bg-[#4a4f63]">キャンセル</button>
          </div>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {otherUsers.map((u) => {
          const s = STATUS_STYLES[u.status ?? 'approved']
          return (
            <li key={u.id} className="flex items-center justify-between rounded border border-[#2a2d3a] bg-[#1a1d27] p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">{u.username}</span>
                <select
                  value={u.role}
                  onChange={async (e) => { await authApi.updateRole(u.id, e.target.value); await loadUsers() }}
                  className="rounded border border-[#2a2d3a] bg-[#1e2130] px-1.5 py-0.5 text-xs text-gray-300 outline-none"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <span className={`rounded px-1.5 py-0.5 text-xs ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
              </div>
              <button
                onClick={async () => { await authApi.deleteUser(u.id); await loadUsers() }}
                className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/30"
              >
                削除
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
