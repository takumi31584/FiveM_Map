import { useState } from 'react'
import { useMapEvents } from 'react-leaflet'
import { leafletToGta } from '../../utils/coordinates'

export function CoordinateDisplay() {
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  useMapEvents({
    mousemove(e) {
      setCoords(leafletToGta(e.latlng))
    },
  })

  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded bg-[#161822]/90 px-3 py-1.5 font-mono text-xs text-gray-400">
      X: {coords.x.toFixed(1)} | Y: {coords.y.toFixed(1)}
    </div>
  )
}
