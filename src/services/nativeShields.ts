import { NativeModules, DeviceEventEmitter, Platform } from 'react-native'
import { shouldBlockRequest } from './braveShields'

export interface NativeAdBlockedEvent {
  url: string
  host: string
  resourceType: string
  totalBlocked: number
}

const { BraveShieldsModule } = NativeModules

/**
 * Native Brave & AdGuard JNI Shields Bridge
 * Connects React Native to the native C++/Rust rule engine running inside Android WebViewClient.
 */
class NativeShieldsService {
  private isAndroid: boolean = Platform.OS === 'android'
  private fallbackBlockedCount: number = 0
  private fallbackEnabled: boolean = true

  /**
   * Sets shields active state in the native JNI engine
   */
  async setShieldsEnabled(enabled: boolean): Promise<boolean> {
    if (this.isAndroid && BraveShieldsModule?.setShieldsEnabled) {
      try {
        return await BraveShieldsModule.setShieldsEnabled(enabled)
      } catch (err) {
        console.warn('[NativeShields] Error setting shields state:', err)
      }
    }
    this.fallbackEnabled = enabled
    return enabled
  }

  /**
   * Checks if shields are active in native engine
   */
  async isShieldsEnabled(): Promise<boolean> {
    if (this.isAndroid && BraveShieldsModule?.isShieldsEnabled) {
      try {
        return await BraveShieldsModule.isShieldsEnabled()
      } catch (err) {
        console.warn('[NativeShields] Error checking shields state:', err)
      }
    }
    return this.fallbackEnabled
  }

  /**
   * Gets total network-intercepted ads count
   */
  async getBlockedCount(): Promise<number> {
    if (this.isAndroid && BraveShieldsModule?.getBlockedCount) {
      try {
        return await BraveShieldsModule.getBlockedCount()
      } catch (err) {
        console.warn('[NativeShields] Error getting blocked count:', err)
      }
    }
    return this.fallbackBlockedCount
  }

  /**
   * Resets counter
   */
  async resetBlockedCount(): Promise<number> {
    if (this.isAndroid && BraveShieldsModule?.resetBlockedCount) {
      try {
        return await BraveShieldsModule.resetBlockedCount()
      } catch (err) {
        console.warn('[NativeShields] Error resetting blocked count:', err)
      }
    }
    this.fallbackBlockedCount = 0
    return 0
  }

  /**
   * Gets loaded rules count from compiled ruleset
   */
  async getRulesCount(): Promise<number> {
    if (this.isAndroid && BraveShieldsModule?.getRulesCount) {
      try {
        return await BraveShieldsModule.getRulesCount()
      } catch (err) {
        console.warn('[NativeShields] Error getting rules count:', err)
      }
    }
    return 52480 // Estimated bundled rules count
  }

  /**
   * Tests a URL against the native JNI engine
   */
  async testUrl(url: string, firstPartyHost: string = ''): Promise<boolean> {
    if (this.isAndroid && BraveShieldsModule?.testUrl) {
      try {
        const host = url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
        return await BraveShieldsModule.testUrl(url, host, firstPartyHost)
      } catch (err) {
        console.warn('[NativeShields] Error testing url with native engine:', err)
      }
    }
    return shouldBlockRequest(url, this.fallbackEnabled)
  }

  /**
   * Subscribes to real-time ad-blocked events emitted by shouldInterceptRequest
   */
  onAdBlocked(callback: (event: NativeAdBlockedEvent) => void): () => void {
    if (!this.isAndroid) {
      return () => {}
    }

    const subscription = DeviceEventEmitter.addListener(
      'onNativeAdBlocked',
      (event: NativeAdBlockedEvent) => {
        if (event && typeof event.totalBlocked === 'number') {
          this.fallbackBlockedCount = event.totalBlocked
        }
        callback(event)
      }
    )

    return () => {
      subscription.remove()
    }
  }
}

export const nativeShields = new NativeShieldsService()
