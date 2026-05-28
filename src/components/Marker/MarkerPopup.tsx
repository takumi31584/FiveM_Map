import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ApiMarker } from '../../services/api'
import { attachmentApi, type Attachment } from '../../services/api'
import { useMarkers } from '../../contexts/MarkerContext'
import { useCategories } from '../../contexts/CategoryContext'
import { useAuth } from '../../contexts/AuthContext'
import { Lightbox } from '../Lightbox'

interface MarkerPopupProps {
  marker: ApiMarker
}

export function MarkerPopup({ marker }: MarkerPopupProps) {
  const { updateMarker, deleteMarker } = useMarkers()
  const { categories, categoryMap } = useCategories()
  const { user, isAdmin } = useAuth()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(marker.title)
  const [memo, setMemo] = useState(marker.memo)
  const [categoryKey, setCategoryKey] = useState(marker.category_key)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Attachment | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const cat = categoryMap.get(marker.category_key)
  const canEdit = isAdmin || marker.user_id === user?.id

  useEffect(() => {
    attachmentApi.list(marker.id).then(setAttachments).catch(() => {})
  }, [marker.id])

  const handleSave = async () => {
    await updateMarker(marker.id, { title, memo, category_key: categoryKey })
    setEditing(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const att = await attachmentApi.upload(marker.id, file)
      setAttachments((prev) => [...prev, att])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'アップロード失敗')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (id: number) => {
    await attachmentApi.delete(id)
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const renderMedia = (showDelete: boolean) =>
    attachments.length > 0 && (
      <div className="mt-2 flex flex-col gap-1.5">
        {attachments.map((att) => (
          <div key={att.id} className="relative">
            {att.mime_type.startsWith('image/') ? (
              <img
                src={att.url}
                alt={att.original_name}
                className="max-h-48 w-full cursor-pointer rounded object-cover hover:opacity-80"
                onClick={() => setLightbox(att)}
              />
            ) : (
              <div
                className="relative max-h-48 cursor-pointer overflow-hidden rounded bg-black"
                onClick={() => setLightbox(att)}
              >
                <video src={att.url} className="max-h-48 w-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/60 px-4 py-2 text-2xl text-white">▶</span>
                </div>
              </div>
            )}
            {showDelete && (
              <button
                onClick={() => handleDeleteAttachment(att.id)}
                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-red-400 hover:bg-black/90"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    )

  const lightboxPortal = lightbox && createPortal(
    <Lightbox url={lightbox.url} mimeType={lightbox.mime_type} onClose={() => setLightbox(null)} />,
    document.body,
  )

  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-[#3b3f51] bg-[#252838] px-2 py-1 text-sm text-gray-200 outline-none"
          placeholder="タイトル"
        />
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="rounded border border-[#3b3f51] bg-[#252838] px-2 py-1 text-sm text-gray-200 outline-none"
          rows={3}
          placeholder="メモ"
        />
        <select
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          className="rounded border border-[#3b3f51] bg-[#252838] px-2 py-1 text-sm text-gray-200 outline-none"
        >
          {categories.map((c) => (
            <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
          ))}
        </select>
        {renderMedia(true)}
        <label className="flex cursor-pointer items-center gap-1 rounded bg-[#252838] px-2 py-1 text-xs text-gray-400 hover:bg-[#3b3f51]">
          {uploading ? 'アップロード中...' : '+ 画像/動画を追加'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <div className="flex gap-2">
          <button onClick={handleSave} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500">保存</button>
          <button onClick={() => setEditing(false)} className="rounded bg-[#3b3f51] px-3 py-1 text-sm text-gray-300 hover:bg-[#4a4f63]">キャンセル</button>
        </div>
        {lightboxPortal}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="flex items-center gap-1.5 text-base font-bold text-gray-100">
        <span>{cat?.icon ?? '📌'}</span>
        <span>{marker.title || '無題'}</span>
      </div>
      {marker.memo && <p className="whitespace-pre-wrap text-sm text-gray-400">{marker.memo}</p>}
      {renderMedia(false)}
      <div className="flex items-center gap-2 font-mono text-xs text-gray-600">
        <span>X: {marker.position_x} | Y: {marker.position_y}</span>
        {marker.is_shared ? (
          <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-blue-400">共有</span>
        ) : (
          <span className="rounded bg-gray-700/30 px-1.5 py-0.5 text-gray-500">個人</span>
        )}
      </div>
      <div className="text-xs text-gray-600">by {marker.author}</div>
      {canEdit && (
        <div className="mt-1 flex gap-2">
          <button onClick={() => setEditing(true)} className="rounded bg-[#252838] px-2 py-0.5 text-xs text-gray-300 hover:bg-[#3b3f51]">編集</button>
          <button onClick={() => deleteMarker(marker.id)} className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/50">削除</button>
        </div>
      )}
      {lightboxPortal}
    </div>
  )
}
