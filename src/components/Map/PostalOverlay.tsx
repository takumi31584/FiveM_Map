import { ImageOverlay } from 'react-leaflet'
import L from 'leaflet'

interface PostalOverlayProps {
  visible: boolean
}

// Image covers the full tile grid: lat 0 (top) to -256 (bottom), lng 0 (left) to 256 (right)
const BOUNDS = L.latLngBounds(
  L.latLng(0, 0),
  L.latLng(-256, 256),
)

export function PostalOverlay({ visible }: PostalOverlayProps) {
  if (!visible) return null

  return (
    <ImageOverlay
      url="/maps/postal-overlay.png"
      bounds={BOUNDS}
      opacity={0.9}
      zIndex={500}
    />
  )
}
