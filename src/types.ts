export interface VideoStreamItem {
  id: string
  title: string
  sourceUrl: string
  posterUrl?: string
  duration?: string
  quality?: string
}

export interface DownloadItem {
  id: string
  title: string
  quality: string
  totalSize: string
  downloadedBytes: number
  totalBytes: number
  speed: string
  status: 'downloading' | 'paused' | 'completed'
  progress: number
  sourceUrl: string
  posterUrl: string
  duration: string
}

export interface PortalItem {
  id: string
  name: string
  url: string
  tagline: string
  category: 'movies' | 'anime' | 'embeds' | 'live'
  rating?: string
  features?: string[]
  badge?: string
  accentColor: string
}

export type AppTab = 'browser' | 'portals' | 'downloads' | 'cinema'
