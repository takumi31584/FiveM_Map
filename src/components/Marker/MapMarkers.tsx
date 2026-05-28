import { Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useMarkers } from '../../contexts/MarkerContext'
import { useCategories } from '../../contexts/CategoryContext'
import { gtaToLeaflet } from '../../utils/coordinates'
import { MarkerPopup } from './MarkerPopup'

function createIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 24px; height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
  })
}

interface MapMarkersProps {
  visibleCategories: Set<string>
  showLabels: boolean
}

export function MapMarkers({ visibleCategories, showLabels }: MapMarkersProps) {
  const { markers } = useMarkers()
  const { categoryMap } = useCategories()

  return (
    <>
      {markers
        .filter((m) => visibleCategories.has(m.category_key))
        .map((marker) => {
          const pos = gtaToLeaflet(marker.position_x, marker.position_y)
          const cat = categoryMap.get(marker.category_key)
          const color = cat?.color ?? '#6b7280'
          const label = marker.title || '無題'
          return (
            <Marker
              key={marker.id}
              position={pos}
              icon={createIcon(color)}
              eventHandlers={{
                mouseover: (e) => {
                  const target = e.target
                  ;(target as unknown as { _hoverTimer?: ReturnType<typeof setTimeout> })._hoverTimer = setTimeout(() => {
                    target.openPopup()
                  }, 300)
                },
                mouseout: (e) => {
                  const target = e.target as unknown as { _hoverTimer?: ReturnType<typeof setTimeout> }
                  if (target._hoverTimer) {
                    clearTimeout(target._hoverTimer)
                    target._hoverTimer = undefined
                  }
                },
              }}
            >
              <Popup minWidth={280} maxWidth={400}>
                <MarkerPopup marker={marker} />
              </Popup>
              {showLabels && (
                <Tooltip
                  direction="top"
                  offset={[0, -18]}
                  permanent
                  className="marker-label"
                >
                  {label}
                </Tooltip>
              )}
            </Marker>
          )
        })}
    </>
  )
}
