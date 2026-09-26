import { NativeModules, Platform } from 'react-native'

const { PipModule } = NativeModules

/**
 * Programmatically triggers native system-level Picture-in-Picture mode on Android.
 * Allows the video or browser stream to float above all applications and the device home screen.
 */
export async function enterSystemPictureInPicture(): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  if (PipModule && typeof PipModule.enterPip === 'function') {
    try {
      const result = await PipModule.enterPip()
      return !!result
    } catch (err) {
      console.warn('Failed to enter system Picture-in-Picture:', err)
      return false
    }
  }
  return false
}

/**
 * Checks if the current Android device and OS version support Picture-in-Picture.
 */
export async function isSystemPipSupported(): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  if (PipModule && typeof PipModule.isPipSupported === 'function') {
    try {
      return await PipModule.isPipSupported()
    } catch {
      return false
    }
  }
  return false
}

/**
 * Synchronizes video playback and auto-PiP preference with Android native layer.
 * When isPlaying is false, system Picture-in-Picture on swipe-home is strictly disabled.
 */
export async function setSystemPipVideoPlaybackState(
  isPlaying: boolean,
  autoPipEnabled: boolean = true,
  rect?: { x: number; y: number; width: number; height: number }
): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  if (PipModule) {
    try {
      if (rect && typeof PipModule.setVideoPlaybackStateWithRect === 'function') {
        await PipModule.setVideoPlaybackStateWithRect(isPlaying, autoPipEnabled, rect)
        return true
      } else if (typeof PipModule.setVideoPlaybackState === 'function') {
        await PipModule.setVideoPlaybackState(isPlaying, autoPipEnabled)
        return true
      }
    } catch (err) {
      console.warn('Failed to update PiP video playback state:', err)
      return false
    }
  }
  return false
}
