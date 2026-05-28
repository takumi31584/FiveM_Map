import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const result = await authApi.signup(username, password)
      setSuccess(result.message)
      setUsername('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '申請に失敗しました')
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#0f1117]">
      <div className="w-80 rounded-xl border border-[#2a2d3a] bg-[#161822] p-6">
        {/* Tabs */}
        <div className="mb-6 flex border-b border-[#2a2d3a]">
          <button
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            className={`flex-1 pb-2 text-center text-sm font-medium transition ${
              mode === 'login' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            ログイン
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
            className={`flex-1 pb-2 text-center text-sm font-medium transition ${
              mode === 'signup' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            アカウント申請
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded bg-green-900/30 px-3 py-2 text-sm text-green-400">{success}</div>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名"
            className="rounded border border-[#2a2d3a] bg-[#1e2130] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="rounded border border-[#2a2d3a] bg-[#1e2130] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50"
          />
          <button
            type="submit"
            className="rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            {mode === 'login' ? 'ログイン' : '申請する'}
          </button>
        </form>

        {mode === 'signup' && (
          <p className="mt-4 text-center text-xs text-gray-600">
            パスワードは8文字以上。申請後、管理者が承認するとログインできます
          </p>
        )}
      </div>
    </div>
  )
}
