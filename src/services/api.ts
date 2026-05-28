const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}

// Auth
export interface User {
  id: number
  username: string
  role: string
  status?: string
}

export const authApi = {
  signup: (username: string, password: string) =>
    request<{ message: string }>('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User | null }>('/auth/me'),
  getUsers: () => request<User[]>('/auth/users'),
  createUser: (username: string, password: string, role: string) =>
    request<User>('/auth/users', { method: 'POST', body: JSON.stringify({ username, password, role }) }),
  updateRole: (id: number, role: string) =>
    request('/auth/users/' + id + '/role', { method: 'PUT', body: JSON.stringify({ role }) }),
  approveUser: (id: number) => request('/auth/users/' + id + '/approve', { method: 'PUT' }),
  rejectUser: (id: number) => request('/auth/users/' + id + '/reject', { method: 'PUT' }),
  deleteUser: (id: number) => request('/auth/users/' + id, { method: 'DELETE' }),
}

// Categories
export interface Category {
  id: number
  key: string
  label: string
  color: string
  icon: string
  sort_order: number
}

export const categoryApi = {
  list: () => request<Category[]>('/categories'),
  create: (data: Omit<Category, 'id' | 'sort_order'> & { sort_order?: number }) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Category>) =>
    request<Category>('/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request('/categories/' + id, { method: 'DELETE' }),
}

// Markers
export interface ApiMarker {
  id: number
  user_id: number
  position_x: number
  position_y: number
  title: string
  memo: string
  category_key: string
  is_shared: number
  author: string
  created_at: string
  updated_at: string
}

export const markerApi = {
  list: () => request<ApiMarker[]>('/markers'),
  create: (data: {
    position_x: number
    position_y: number
    title: string
    memo: string
    category_key: string
    is_shared?: boolean
  }) => request<ApiMarker>('/markers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Omit<ApiMarker, 'is_shared'> & { is_shared: boolean }>) =>
    request<ApiMarker>('/markers/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request('/markers/' + id, { method: 'DELETE' }),
}

// Attachments
export interface Attachment {
  id: number
  filename: string
  original_name: string
  mime_type: string
  url: string
  created_at: string
}

export const attachmentApi = {
  list: (markerId: number) => request<Attachment[]>('/uploads/' + markerId),
  upload: async (markerId: number, file: File): Promise<Attachment> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/uploads/${markerId}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error ?? res.statusText)
    }
    return res.json()
  },
  delete: (id: number) => request('/uploads/attachment/' + id, { method: 'DELETE' }),
}
