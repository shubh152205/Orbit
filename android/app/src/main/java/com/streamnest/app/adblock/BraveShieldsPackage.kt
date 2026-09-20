package com.streamnest.app.adblock

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.reactnativecommunity.webview.RNCWebViewModule
import com.reactnativecommunity.webview.RNCWebViewModuleImpl
import com.reactnativecommunity.webview.RNCWebViewPackage

class BraveShieldsPackage : RNCWebViewPackage() {

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(BraveShieldsWebViewManager())
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val map = HashMap<String, ReactModuleInfo>()
            map[RNCWebViewModuleImpl.NAME] = ReactModuleInfo(
                RNCWebViewModuleImpl.NAME,
                RNCWebViewModuleImpl.NAME,
                false,
                false,
                true,
                false,
                false
            )
            map[BraveShieldsModule.NAME] = ReactModuleInfo(
                BraveShieldsModule.NAME,
                BraveShieldsModule.NAME,
                false,
                false,
                false,
                false,
                false
            )
            map
        }
    }

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            RNCWebViewModuleImpl.NAME -> RNCWebViewModule(reactContext)
            BraveShieldsModule.NAME -> BraveShieldsModule(reactContext)
            else -> null
        }
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            RNCWebViewModule(reactContext),
            BraveShieldsModule(reactContext)
        )
    }
}

