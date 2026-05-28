import L from 'leaflet'

// CRS.Simple: lat=0 is top, lat=-256 is bottom of tile grid
// GTA V: Y increases northward (upward on screen)
// So: leaflet_lat = gta_y * scale - offset (positive GTA Y → less negative lat → higher on screen)
const CENTER_X = 117.3
const CENTER_Y = 172.8
const SCALE_X = 0.02072
const SCALE_Y = 0.0205

export function gtaToLeaflet(x: number, y: number): L.LatLng {
  const leafletLat = y * SCALE_Y - CENTER_Y
  const leafletLng = x * SCALE_X + CENTER_X
  return L.latLng(leafletLat, leafletLng)
}

export function leafletToGta(latlng: L.LatLng): { x: number; y: number } {
  const x = (latlng.lng - CENTER_X) / SCALE_X
  const y = (latlng.lat + CENTER_Y) / SCALE_Y
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
}

export const MAP_CENTER = gtaToLeaflet(0, 0)
export const MAP_BOUNDS = L.latLngBounds(
  L.latLng(-270, -10),
  L.latLng(10, 270),
)
