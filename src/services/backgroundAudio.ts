import { Audio } from 'expo-av'
import { Platform } from 'react-native'

class BackgroundAudioService {
  private static instance: BackgroundAudioService
  private sound: Audio.Sound | null = null
  private isInitialized = false
  private isKeepAliveActive = false

  private constructor() {}

  static getInstance(): BackgroundAudioService {
    if (!BackgroundAudioService.instance) {
      BackgroundAudioService.instance = new BackgroundAudioService()
    }
    return BackgroundAudioService.instance
  }

  async setupAudioMode(): Promise<void> {
    if (this.isInitialized) return
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
        interruptionModeIOS: 1, // INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS
      })
      this.isInitialized = true
    } catch (e) {
      console.warn('Failed to setup Audio mode for background playback:', e)
    }
  }

  /**
   * Starts an inaudible background audio keepalive track.
   * This signals to the OS (Android MediaSession and iOS AVAudioSession)
   * that the app is actively playing audio, preventing the operating system
   * from killing or freezing WebView media playback when the user minimizes
   * the app, switches to other apps, or locks the device.
   */
  async startKeepAlive(): Promise<void> {
    if (this.isKeepAliveActive) return
    this.isKeepAliveActive = true

    try {
      await this.setupAudioMode()

      if (!this.sound) {
        // Base64 silent WAV header + PCM 0 data (1 second loop)
        const silentWavBase64 =
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP//'
        const { sound } = await Audio.Sound.createAsync(
          { uri: silentWavBase64 },
          {
            isLooping: true,
            volume: 0.01,
            shouldPlay: true,
          }
        )
        this.sound = sound
      } else {
        await this.sound.playAsync()
      }
    } catch (err) {
      console.warn('Background audio keepalive notice:', err)
    }
  }

  async stopKeepAlive(): Promise<void> {
    if (!this.isKeepAliveActive) return
    this.isKeepAliveActive = false
    try {
      if (this.sound) {
        await this.sound.stopAsync()
      }
    } catch (e) {
      console.warn('Failed to stop audio keepalive:', e)
    }
  }
}

export const backgroundAudio = BackgroundAudioService.getInstance()
