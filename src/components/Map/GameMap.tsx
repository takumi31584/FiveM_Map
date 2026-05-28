import { useEffect } from 'react'
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_CENTER, MAP_BOUNDS, leafletToGta } from '../../utils/coordinates'
import { MapMarkers } from '../Marker/MapMarkers'
import { CoordinateDisplay } from './CoordinateDisplay'
import { PostalOverlay } from './PostalOverlay'
const TILE_URL =
  'https://raw.githubusercontent.com/meesvrh/GTAV-Map-Tiles/main/tiles/atlas/{z}/{x}/{y}.jpg'

interface GameMapProps {
  onMapClick: (position: { x: number; y: number }) => void
  showPostals: boolean
  visibleCategories: Set<string>
  showMarkerLabels: boolean
}

function MapClickHandler({ onMapClick }: { onMapClick: (pos: { x: number; y: number }) => void }) {
  useMapEvents({
    contextmenu(e) {
      L.DomEvent.preventDefault(e.originalEvent)
      onMapClick(leafletToGta(e.latlng))
    },
  })
  return null
}

function MapSetup() {
  const map = useMap()

  useEffect(() => {
    map.setMaxBounds(MAP_BOUNDS)
  }, [map])

  return null
}

export function GameMap({ onMapClick, showPostals, visibleCategories, showMarkerLabels }: GameMapProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={3}
      minZoom={2}
      maxZoom={5}
      crs={L.CRS.Simple}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <MapSetup />
      <TileLayer
        url={TILE_URL}
        minZoom={0}
        maxZoom={5}
        tileSize={256}
        noWrap
      />
      <MapClickHandler onMapClick={onMapClick} />
      <MapMarkers visibleCategories={visibleCategories} showLabels={showMarkerLabels} />
      <PostalOverlay visible={showPostals} />
      <CoordinateDisplay />
    </MapContainer>
  )
}
