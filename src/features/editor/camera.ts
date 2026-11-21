/**
 * The view of the canvas: zoom (screen px per drawing unit) and the drawing
 * point at the top-left corner. Separate from the document state: panning
 * and zooming are not steps of the history.
 */
import { useSyncExternalStore } from 'react'

export interface Camera {
  zoom: number
  x: number
  y: number
  /** Viewport size in px. */
  w: number
  h: number
}

export const ZOOM_MIN = 2
export const ZOOM_MAX = 400

let cam: Camera = { zoom: 20, x: -8, y: -4, w: 800, h: 600 }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const camera = {
  get: () => cam,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

const SERVER: Camera = { ...cam }
export const useCamera = () => useSyncExternalStore(camera.subscribe, camera.get, () => SERVER)

export function setCamera(next: Partial<Camera>) {
  cam = { ...cam, ...next }
  emit()
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

/** Zooms keeping the drawing point under (px, py) of the viewport still. */
export function zoomAt(factor: number, px = cam.w / 2, py = cam.h / 2) {
  const zoom = clampZoom(cam.zoom * factor)
  const dx = px / cam.zoom - px / zoom
  const dy = py / cam.zoom - py / zoom
  setCamera({ zoom, x: cam.x + dx, y: cam.y + dy })
}

export function setZoom(zoom: number) {
  zoomAt(clampZoom(zoom) / cam.zoom)
}

/** Fits a square artboard of `box` units in the viewport, with margin. */
export function fitArtboard(box: number) {
  const margin = cam.w < 600 ? 32 : 72
  const zoom = clampZoom(Math.min(cam.w - margin * 2, cam.h - margin * 2) / box)
  setCamera({ zoom, x: box / 2 - cam.w / 2 / zoom, y: box / 2 - cam.h / 2 / zoom })
}

export const panBy = (dxPx: number, dyPx: number) => setCamera({ x: cam.x - dxPx / cam.zoom, y: cam.y - dyPx / cam.zoom })
