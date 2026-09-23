import { NativeModules, Platform } from 'react-native'

const { BraveMediaModule } = NativeModules

class BackgroundAudioService {
  private static instance: BackgroundAudioService
  private isKeepAliveActive = false

  private constructor() {}

  static getInstance(): BackgroundAudioService {
    if (!BackgroundAudioService.instance) {
      BackgroundAudioService.instance = new BackgroundAudioService()
    }
    return BackgroundAudioService.instance
  }

  /**
   * Starts native Brave background media playback service.
   * Acquires a PARTIAL_WAKE_LOCK and starts a Foreground Service with mediaPlayback type,
   * keeping the CPU awake and Chromium's audio decoder alive when screen is off or app is backgrounded.
   */
  async startKeepAlive(
    title: string = 'StreamNest Media Playback',
    subtitle: string = 'Streaming in background'
  ): Promise<void> {
    if (this.isKeepAliveActive) return
    this.isKeepAliveActive = true

    if (Platform.OS === 'android' && BraveMediaModule) {
      try {
        await BraveMediaModule.startBackgroundPlayback(title, subtitle)
      } catch (err) {
        console.warn('Failed to start Brave native background media service:', err)
      }
    }
  }

  async stopKeepAlive(): Promise<void> {
    if (!this.isKeepAliveActive) return
    this.isKeepAliveActive = false

    if (Platform.OS === 'android' && BraveMediaModule) {
      try {
        await BraveMediaModule.stopBackgroundPlayback()
      } catch (e) {
        console.warn('Failed to stop Brave native background media service:', e)
      }
    }
  }

  async setBackgroundPlayEnabled(enabled: boolean): Promise<void> {
    if (Platform.OS === 'android' && BraveMediaModule) {
      try {
        await BraveMediaModule.setBackgroundPlayEnabled(enabled)
      } catch (e) {}
    }
  }

  async updatePlaybackState(
    isPlaying: boolean,
    title?: string,
    subtitle?: string
  ): Promise<void> {
    if (Platform.OS === 'android' && BraveMediaModule?.updatePlaybackState) {
      try {
        await BraveMediaModule.updatePlaybackState(isPlaying, title, subtitle)
      } catch (e) {}
    }
  }
}

export const backgroundAudio = BackgroundAudioService.getInstance()
