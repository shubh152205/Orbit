package com.streamnest.app.adblock

import android.content.Context
import android.net.Uri
import android.util.Log
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * High-performance Brave & AdGuard Native Ad-Blocking Engine with JNI Bridge
 */
object BraveNativeEngine {
    private const val TAG = "BraveNativeEngine"

    private var nativeHandle: Long = 0L
    private val isJniLoaded = AtomicBoolean(false)
    private val isInitialized = AtomicBoolean(false)
    private val shieldsEnabled = AtomicBoolean(true)
    private val totalBlockedCount = AtomicInteger(0)
    private val totalRulesCount = AtomicInteger(0)

    // Kotlin in-memory fast matching structures (guarantees zero-failure fallback)
    private val blockedDomainSet = ConcurrentHashMap.newKeySet<String>()
    private val exceptionDomainSet = ConcurrentHashMap.newKeySet<String>()
    private val pathPatterns = CopyOnWriteArrayList<String>()
    private val cosmeticGenericRules = CopyOnWriteArrayList<String>()
    private val cosmeticDomainRules = ConcurrentHashMap<String, MutableList<String>>()

    init {
        try {
            System.loadLibrary("brave_shields_jni")
            isJniLoaded.set(true)
            nativeHandle = nativeInit()
            Log.i(TAG, "Brave Shields JNI engine loaded successfully, handle: $nativeHandle")
        } catch (t: Throwable) {
            Log.w(TAG, "Native JNI library not loaded, running with high-speed Kotlin engine: ${t.message}")
            isJniLoaded.set(false)
        }
    }

    // JNI Native Declarations
    private external fun nativeInit(): Long
    private external fun nativeAddRule(handle: Long, rule: String): Boolean
    private external fun nativeCompileRules(handle: Long): Boolean
    private external fun nativeShouldBlockUrl(
        handle: Long,
        url: String,
        host: String,
        firstPartyHost: String,
        resourceType: String,
        isThirdParty: Boolean
    ): Boolean
    private external fun nativeGetCosmeticRules(handle: Long, host: String): Array<String>?
    private external fun nativeDestroy(handle: Long)

    /**
     * Initializes the engine and loads bundled AdGuard / EasyList rules from assets
     */
    fun init(context: Context) {
        if (isInitialized.getAndSet(true)) return

        Thread {
            try {
                // Load bundled rules from assets
                val assetManager = context.assets
                val files = assetManager.list("filters") ?: emptyArray()
                for (file in files) {
                    if (file.endsWith(".txt")) {
                        loadRulesFromAsset(context, "filters/$file")
                    }
                }
                compileRules()
                Log.i(TAG, "Brave Shields Engine initialized with ${totalRulesCount.get()} rules.")
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing BraveNativeEngine", e)
            }
        }.start()
    }

    fun isShieldsEnabled(): Boolean = shieldsEnabled.get()

    fun setShieldsEnabled(enabled: Boolean) {
        shieldsEnabled.set(enabled)
    }

    fun getBlockedCount(): Int = totalBlockedCount.get()

    fun incrementBlockedCount(): Int = totalBlockedCount.incrementAndGet()

    fun resetBlockedCount() {
        totalBlockedCount.set(0)
    }

    fun getRulesCount(): Int = totalRulesCount.get()

    /**
     * Loads rules line by line from an asset file
     */
    private fun loadRulesFromAsset(context: Context, path: String) {
        try {
            context.assets.open(path).use { inputStream ->
                BufferedReader(InputStreamReader(inputStream)).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        val trimmed = line!!.trim()
                        if (trimmed.isNotEmpty() && !trimmed.startsWith("!") && !trimmed.startsWith("[")) {
                            addRule(trimmed)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed reading asset rule: $path", e)
        }
    }

    /**
     * Adds an AdGuard/EasyList rule to both JNI and Kotlin fallbacks
     */
    fun addRule(rule: String) {
        totalRulesCount.incrementAndGet()

        if (isJniLoaded.get() && nativeHandle != 0L) {
            try {
                nativeAddRule(nativeHandle, rule)
            } catch (e: Throwable) {
                Log.w(TAG, "JNI addRule error: ${e.message}")
            }
        }

        // Parse into Kotlin fast structures
        try {
            if (rule.contains("##")) {
                val parts = rule.split("##", limit = 2)
                val domain = parts[0].trim()
                val selector = parts[1].trim()
                if (selector.isNotEmpty()) {
                    if (domain.isEmpty()) {
                        cosmeticGenericRules.add(selector)
                    } else {
                        val list = cosmeticDomainRules.getOrPut(domain) { CopyOnWriteArrayList() }
                        list.add(selector)
                    }
                }
                return
            }

            var cleanRule = rule
            val isException = cleanRule.startsWith("@@")
            if (isException) {
                cleanRule = cleanRule.substring(2)
            }

            val optIdx = cleanRule.indexOf('$')
            if (optIdx != -1) {
                cleanRule = cleanRule.substring(0, optIdx)
            }

            if (cleanRule.startsWith("||")) {
                var domain = cleanRule.substring(2)
                if (domain.endsWith("^")) {
                    domain = domain.substring(0, domain.length - 1)
                }
                if (domain.contains("/")) {
                    pathPatterns.add(domain)
                } else {
                    if (isException) {
                        exceptionDomainSet.add(domain)
                    } else {
                        blockedDomainSet.add(domain)
                    }
                }
            } else if (cleanRule.isNotEmpty()) {
                pathPatterns.add(cleanRule)
            }
        } catch (e: Exception) {
            // Skip invalid syntax
        }
    }

    fun compileRules() {
        if (isJniLoaded.get() && nativeHandle != 0L) {
            try {
                nativeCompileRules(nativeHandle)
            } catch (e: Throwable) {
                Log.w(TAG, "JNI compileRules error: ${e.message}")
            }
        }
    }

    /**
     * Core matching logic: evaluates URL against JNI native engine or Kotlin engine
     */
    fun shouldBlockUrl(
        url: String,
        host: String,
        firstPartyHost: String,
        resourceType: String,
        isThirdParty: Boolean
    ): Boolean {
        if (!shieldsEnabled.get() || url.isEmpty()) return false

        // Never block actual video delivery streams or internal YouTube endpoints (prevents player error loops)
        val lowerUrl = url.lowercase()
        val cleanHost = host.lowercase()
        if (cleanHost.contains("googlevideo.com") || cleanHost.contains("youtube.com") ||
            lowerUrl.contains("googlevideo.com") || lowerUrl.contains("youtube.com")
        ) {
            return false
        }

        // Fast match known third-party ad networks
        if (lowerUrl.contains("googleads.g.doubleclick.net") ||
            lowerUrl.contains("s0.2mdn.net") ||
            lowerUrl.contains("static.doubleclick.net")
        ) {
            return true
        }

        // Block rogue app-takeover schemes immediately
        if (lowerUrl.startsWith("intent://") ||
            lowerUrl.startsWith("market://") ||
            lowerUrl.startsWith("itms-apps://") ||
            lowerUrl.startsWith("tg://") ||
            lowerUrl.startsWith("whatsapp://")
        ) {
            return true
        }

        // Try JNI engine first
        if (isJniLoaded.get() && nativeHandle != 0L) {
            try {
                val blocked = nativeShouldBlockUrl(
                    nativeHandle,
                    url,
                    host,
                    firstPartyHost,
                    resourceType,
                    isThirdParty
                )
                if (blocked) return true
            } catch (e: Throwable) {
                Log.w(TAG, "JNI matching error, using Kotlin fallback", e)
            }
        }

        // Fast Kotlin fallback
        return shouldBlockUrlKotlin(url, host, firstPartyHost, isThirdParty)
    }

    private fun shouldBlockUrlKotlin(
        url: String,
        host: String,
        firstPartyHost: String,
        isThirdParty: Boolean
    ): Boolean {
        val cleanHost = host.lowercase()

        // 1. Fast Domain Set Check
        var currHost = cleanHost
        while (currHost.isNotEmpty()) {
            if (exceptionDomainSet.contains(currHost)) {
                return false
            }
            if (blockedDomainSet.contains(currHost)) {
                return true
            }
            val dotIdx = currHost.indexOf('.')
            currHost = if (dotIdx != -1) currHost.substring(dotIdx + 1) else ""
        }

        // 2. Common ad / tracker path check
        val lowerUrl = url.lowercase()
        for (pattern in pathPatterns) {
            if (pattern.isNotEmpty() && lowerUrl.contains(pattern)) {
                return true
            }
        }

        return false
    }

    /**
     * Retrieves cosmetic CSS rules for a given host
     */
    fun getCosmeticRulesForHost(host: String): List<String> {
        val results = mutableListOf<String>()

        // JNI
        if (isJniLoaded.get() && nativeHandle != 0L) {
            try {
                val nativeRules = nativeGetCosmeticRules(nativeHandle, host)
                if (nativeRules != null && nativeRules.isNotEmpty()) {
                    results.addAll(nativeRules)
                    return results
                }
            } catch (e: Throwable) {
                Log.w(TAG, "JNI getCosmeticRules error", e)
            }
        }

        // Kotlin fallback
        results.addAll(cosmeticGenericRules)
        var curr = host.lowercase()
        while (curr.isNotEmpty()) {
            val list = cosmeticDomainRules[curr]
            if (list != null) {
                results.addAll(list)
            }
            val dotIdx = curr.indexOf('.')
            curr = if (dotIdx != -1) curr.substring(dotIdx + 1) else ""
        }

        return results
    }

    /**
     * Returns executable JS string injecting high-specificity CSS rules
     */
    fun getCosmeticInjectionJs(host: String): String {
        val rules = getCosmeticRulesForHost(host)
        if (rules.isEmpty()) return ""

        val selectors = rules.joinToString(", ")
        val css = "$selectors { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; }"

        return """
            (function() {
                try {
                    var styleId = '__brave_shields_cosmetic_rules';
                    var style = document.getElementById(styleId);
                    if (!style) {
                        style = document.createElement('style');
                        style.id = styleId;
                        style.type = 'text/css';
                        (document.head || document.documentElement).appendChild(style);
                    }
                    style.textContent = ${quoteJsString(css)};
                } catch(e) {}
            })();
        """.trimIndent()
    }

    private fun quoteJsString(str: String): String {
        return "\"" + str.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r") + "\""
    }
}
