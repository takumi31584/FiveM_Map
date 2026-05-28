import { useEffect } from 'react'

interface LightboxProps {
  url: string
  mimeType: string
  onClose: () => void
}

export function Lightbox({ url, mimeType, onClose }: LightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded bg-black/50 px-3 py-1 text-lg text-white hover:bg-black/70"
      >
        ✕
      </button>
      <div className="max-h-[90vh] max-w-[90vw]">
        {mimeType.startsWith('image/') ? (
          <img src={url} onClick={onClose} className="max-h-[90vh] max-w-[90vw] cursor-pointer rounded object-contain" />
        ) : (
          <video src={url} controls autoPlay onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded" />
        )}
      </div>
    </div>
  )
}
