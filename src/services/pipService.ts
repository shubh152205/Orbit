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
