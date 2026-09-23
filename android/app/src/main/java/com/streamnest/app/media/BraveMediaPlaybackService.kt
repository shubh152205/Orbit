package com.streamnest.app.media

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import com.facebook.react.ReactApplication
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.streamnest.app.MainActivity
import com.streamnest.app.R
import com.streamnest.app.adblock.BraveWebView

/**
 * BraveMediaPlaybackService
 * Native Android Media Playback Foreground Service with MediaSessionCompat and MediaStyle notifications.
 * Features:
 * 1. Lock screen and Notification Shade media player with Play/Pause, Rewind, and Fast Forward.
 * 2. Directly executes media actions on BraveWebView and sends events to React Native.
 * 3. PARTIAL_WAKE_LOCK and WifiLock to prevent CPU sleeping or Wi-Fi throttling when screen turns off.
 */
class BraveMediaPlaybackService : Service() {

    companion object {
        const val CHANNEL_ID = "streamnest_media_playback_channel"
        const val NOTIFICATION_ID = 2001

        const val ACTION_START = "com.streamnest.app.media.ACTION_START"
        const val ACTION_STOP = "com.streamnest.app.media.ACTION_STOP"
        const val ACTION_PLAY = "com.streamnest.app.media.ACTION_PLAY"
        const val ACTION_PAUSE = "com.streamnest.app.media.ACTION_PAUSE"
        const val ACTION_FORWARD = "com.streamnest.app.media.ACTION_FORWARD"
        const val ACTION_REWIND = "com.streamnest.app.media.ACTION_REWIND"
        const val ACTION_UPDATE_STATE = "com.streamnest.app.media.ACTION_UPDATE_STATE"

        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_SUBTITLE = "extra_subtitle"
        const val EXTRA_IS_PLAYING = "extra_is_playing"
        const val EXTRA_POSITION = "extra_position"
        const val EXTRA_DURATION = "extra_duration"

        @Volatile
        var isServiceRunning: Boolean = false

        fun start(context: Context, title: String? = null, subtitle: String? = null) {
            val intent = Intent(context, BraveMediaPlaybackService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_SUBTITLE, subtitle)
                putExtra(EXTRA_IS_PLAYING, true)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun updateState(
            context: Context,
            isPlaying: Boolean,
            title: String? = null,
            subtitle: String? = null,
            positionMs: Long = 0L,
            durationMs: Long = 0L
        ) {
            if (!isServiceRunning && isPlaying) {
                start(context, title, subtitle)
                return
            }
            if (!isServiceRunning) return

            val intent = Intent(context, BraveMediaPlaybackService::class.java).apply {
                action = ACTION_UPDATE_STATE
                putExtra(EXTRA_IS_PLAYING, isPlaying)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_SUBTITLE, subtitle)
                putExtra(EXTRA_POSITION, positionMs)
                putExtra(EXTRA_DURATION, durationMs)
            }
            context.startService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, BraveMediaPlaybackService::class.java).apply {
                action = ACTION_STOP
            }
            context.stopService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var mediaSession: MediaSessionCompat? = null

    private var currentTitle: String = "StreamNest Media"
    private var currentSubtitle: String = "Streaming in background"
    private var isPlaying: Boolean = true

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setupMediaSession()
        acquireLocks()
        isServiceRunning = true
    }

    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "StreamNestMediaSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    handlePlayAction()
                }

                override fun onPause() {
                    handlePauseAction()
                }

                override fun onFastForward() {
                    handleForwardAction()
                }

                override fun onRewind() {
                    handleRewindAction()
                }

                override fun onStop() {
                    stopPlaybackService()
                }
            })
            isActive = true
        }
        updatePlaybackState(isPlaying)
    }

    private fun updatePlaybackState(playing: Boolean) {
        val state = if (playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val actions = PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_FAST_FORWARD or
                PlaybackStateCompat.ACTION_REWIND or
                PlaybackStateCompat.ACTION_STOP

        mediaSession?.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                .build()
        )

        mediaSession?.setMetadata(
            MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentSubtitle)
                .build()
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        when (action) {
            ACTION_STOP -> {
                stopPlaybackService()
                return START_NOT_STICKY
            }
            ACTION_PLAY -> {
                handlePlayAction()
                return START_STICKY
            }
            ACTION_PAUSE -> {
                handlePauseAction()
                return START_STICKY
            }
            ACTION_FORWARD -> {
                handleForwardAction()
                return START_STICKY
            }
            ACTION_REWIND -> {
                handleRewindAction()
                return START_STICKY
            }
            ACTION_UPDATE_STATE -> {
                val newPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, isPlaying)
                val newTitle = intent.getStringExtra(EXTRA_TITLE)
                val newSubtitle = intent.getStringExtra(EXTRA_SUBTITLE)
                if (!newTitle.isNullOrEmpty()) currentTitle = newTitle
                if (!newSubtitle.isNullOrEmpty()) currentSubtitle = newSubtitle
                isPlaying = newPlaying

                updatePlaybackState(isPlaying)
                val notification = buildNotification(currentTitle, currentSubtitle, isPlaying)
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.notify(NOTIFICATION_ID, notification)
                return START_STICKY
            }
        }

        val title = intent?.getStringExtra(EXTRA_TITLE)
        val subtitle = intent?.getStringExtra(EXTRA_SUBTITLE)
        if (!title.isNullOrEmpty()) currentTitle = title
        if (!subtitle.isNullOrEmpty()) currentSubtitle = subtitle
        isPlaying = intent?.getBooleanExtra(EXTRA_IS_PLAYING, true) ?: true

        updatePlaybackState(isPlaying)
        val notification = buildNotification(currentTitle, currentSubtitle, isPlaying)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        return START_STICKY
    }

    private fun handlePlayAction() {
        isPlaying = true
        updatePlaybackState(true)
        dispatchMediaAction("play")
        refreshNotification()
    }

    private fun handlePauseAction() {
        isPlaying = false
        updatePlaybackState(false)
        dispatchMediaAction("pause")
        refreshNotification()
    }

    private fun handleForwardAction() {
        dispatchMediaAction("forward")
    }

    private fun handleRewindAction() {
        dispatchMediaAction("backward")
    }

    private fun refreshNotification() {
        val notification = buildNotification(currentTitle, currentSubtitle, isPlaying)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun dispatchMediaAction(actionName: String) {
        // 1. Direct native evaluation on active BraveWebView instance
        BraveWebView.activeWebView?.get()?.let { wv ->
            wv.post {
                when (actionName) {
                    "play" -> wv.evaluateJavascript(
                        "(function(){ var v=document.querySelector('video'); if(v) v.play(); var btn=document.querySelector('.ytp-play-button'); if(btn && btn.getAttribute('data-title-no-tooltip')==='Play') btn.click(); })();",
                        null
                    )
                    "pause" -> wv.evaluateJavascript(
                        "(function(){ var v=document.querySelector('video'); if(v) v.pause(); var btn=document.querySelector('.ytp-play-button'); if(btn && btn.getAttribute('data-title-no-tooltip')==='Pause') btn.click(); })();",
                        null
                    )
                    "forward" -> wv.evaluateJavascript(
                        "(function(){ var v=document.querySelector('video'); if(v) v.currentTime += 10; })();",
                        null
                    )
                    "backward" -> wv.evaluateJavascript(
                        "(function(){ var v=document.querySelector('video'); if(v) v.currentTime = Math.max(0, v.currentTime - 10); })();",
                        null
                    )
                }
            }
        }

        // 2. Notify React Native layer so Cinema / Soul players can sync
        try {
            val reactApp = application as? ReactApplication
            val reactContext = reactApp?.reactNativeHost?.reactInstanceManager?.currentReactContext
            reactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onNotificationMediaAction", actionName)
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "StreamNest Media Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Controls and maintains media audio in the background and when screen is off"
                setShowBadge(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, subtitle: String, playing: Boolean): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val contentPendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags)

        // Action PendingIntents
        val rewindIntent = Intent(this, BraveMediaPlaybackService::class.java).apply { action = ACTION_REWIND }
        val rewindPending = PendingIntent.getService(this, 1, rewindIntent, flags)

        val playPauseIntent = Intent(this, BraveMediaPlaybackService::class.java).apply {
            action = if (playing) ACTION_PAUSE else ACTION_PLAY
        }
        val playPausePending = PendingIntent.getService(this, 2, playPauseIntent, flags)

        val forwardIntent = Intent(this, BraveMediaPlaybackService::class.java).apply { action = ACTION_FORWARD }
        val forwardPending = PendingIntent.getService(this, 3, forwardIntent, flags)

        val stopIntent = Intent(this, BraveMediaPlaybackService::class.java).apply { action = ACTION_STOP }
        val stopPending = PendingIntent.getService(this, 4, stopIntent, flags)

        val playPauseIcon = if (playing) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playPauseText = if (playing) "Pause" else "Play"

        val mediaStyle = MediaStyle()
            .setMediaSession(mediaSession?.sessionToken)
            .setShowActionsInCompactView(0, 1, 2)
            .setShowCancelButton(true)
            .setCancelButtonIntent(stopPending)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(subtitle)
            .setSubText("StreamNest Browser")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(contentPendingIntent)
            .setDeleteIntent(stopPending)
            .setOngoing(playing)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setStyle(mediaStyle)
            .addAction(android.R.drawable.ic_media_rew, "-10s", rewindPending)
            .addAction(playPauseIcon, playPauseText, playPausePending)
            .addAction(android.R.drawable.ic_media_ff, "+10s", forwardPending)
            .build()
    }

    private fun acquireLocks() {
        try {
            if (wakeLock == null) {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "StreamNest:MediaPlaybackWakeLock"
                ).apply {
                    setReferenceCounted(false)
                    acquire(6 * 60 * 60 * 1000L) // 6 hours
                }
            }
        } catch (e: Exception) {
            // Ignore
        }

        try {
            if (wifiLock == null) {
                val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                val wifiMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    WifiManager.WIFI_MODE_FULL_HIGH_PERF
                } else {
                    @Suppress("DEPRECATION")
                    WifiManager.WIFI_MODE_FULL
                }
                wifiLock = wifiManager.createWifiLock(wifiMode, "StreamNest:MediaWifiLock").apply {
                    setReferenceCounted(false)
                    acquire()
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun releaseLocks() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (e: Exception) {}

        try {
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
            wifiLock = null
        } catch (e: Exception) {}
    }

    private fun stopPlaybackService() {
        isServiceRunning = false
        releaseLocks()
        try {
            mediaSession?.isActive = false
            mediaSession?.release()
            mediaSession = null
        } catch (e: Exception) {}

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        stopPlaybackService()
        super.onDestroy()
    }
}
