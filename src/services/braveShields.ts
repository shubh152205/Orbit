/**
 * Brave-Style Shields Privacy & Ad-Blocking Engine
 * 
 * Provides:
 * 1. Network-layer request blocking (120+ ad/tracker/popunder domains)
 * 2. Anti-popup & anti-redirect scriptlets (intercepts window.open, fake click captures)
 * 3. Cosmetic element hiding & procedural CSS rules
 * 4. Anti-adblock detection defusing
 * 5. Real-time blocked element counter reporting to React Native
 */

// Known aggressive ad networks, popunder brokers, and tracking telemetry domains
export const BLOCKED_DOMAINS = [
  'doubleclick.net',
  'google-analytics.com',
  'googlesyndication.com',
  'adnxs.com',
  'adtrue.com',
  'popcash.net',
  'propellerads.com',
  'bet365.com',
  '1xbet.com',
  'adsterra.com',
  'exoclick.com',
  'monetag.com',
  'onclickalgo.com',
  'adroll.com',
  'scorecardresearch.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'mgid.com',
  'revcontent.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'smartadserver.com',
  'yieldmo.com',
  'clicksor.com',
  'infolinks.com',
  'bidvertiser.com',
  'zergnet.com',
  'contentabc.com',
  'trafficjunky.com',
  'juicyads.com',
  'ero-advertising.com',
  'hilltopads.com',
  'evadav.com',
  'clickadu.com',
  'richpush.co',
  'rollerads.com',
  'popads.net',
  'adcash.com',
  'yadro.ru',
  'begun.ru',
  'clck.ru',
  'marketgid.com',
  'reporo.net',
  'trafficstars.com',
  'yllix.com',
  'adsupply.com',
  'media.net',
  'amazon-adsystem.com',
  'serving-sys.com',
  'zedo.com',
  'chitika.net',
  'sovrn.com',
  'spotxchange.com',
  'casalemedia.com',
  'contextweb.com',
  'tremorhub.com',
  'applovin.com',
  'unityads.unity3d.com',
  'vungle.com',
  'chartboost.com',
  'ironsrc.com',
  'inmobi.com',
  'adcolony.com',
  'flurry.com',
  'adjust.com',
  'appsflyer.com',
  'branch.io',
  'kochava.com',
  'singular.net',
  'hotjar.com',
  'crazyegg.com',
  'fullstory.com',
  'loggly.com',
  'sentry.io',
  'mixpanel.com',
  'segment.io',
  'quantserve.com',
  'adblade.com',
  'adform.net',
  'adtech.de',
  'advertising.com',
  'bluekai.com',
  'mathtag.com',
  'turn.com',
  'liveramp.com',
  'krxd.net',
  'neustar.biz',
  'rlcdn.com',
  'demdex.net',
  'agkn.com',
  'wtp101.com',
  'imrworldwide.com',
  'comscore.com',
  'chartbeat.com',
  'parsely.com',
  'newrelic.com',
  'bugsnag.com',
  'trackersim.com',
  'adsystem.org',
  'popunder.net',
  'directrev.com',
  'adk2x.com',
  'traffichaus.com',
  'plugrush.com',
  'adxpansion.com',
  'exosrv.com',
  'tsyndicate.com',
  'syndication.exoclick.com',
  'rtb-demand.com',
  'rtb-supply.com',
  'adclickpress.com',
  'pushame.com',
  'notix.co',
  'pushwoosh.com',
  'onesignal.com',
  'wonderpush.com',
]

// Rogue schemes that should never be opened
export const BLOCKED_SCHEMES = [
  'intent://',
  'market://',
  'itms-apps://',
  'itms://',
  'tg://',
  'viber://',
  'whatsapp://',
  'tel:',
  'sms:',
  'mailto:',
]

/**
 * Checks if a network request URL is an ad, tracker, or rogue intent
 */
export function shouldBlockRequest(url: string, shieldsEnabled: boolean = true): boolean {
  if (!shieldsEnabled || !url || typeof url !== 'string') return false

  const lower = url.toLowerCase()

  // Always allow genuine media streams and YouTube endpoints to avoid player error loops
  if (lower.includes('googlevideo.com') || lower.includes('youtube.com')) {
    return false
  }

  // Block third-party ad networks
  if (
    lower.includes('googleads.g.doubleclick.net') ||
    lower.includes('s0.2mdn.net') ||
    lower.includes('static.doubleclick.net')
  ) {
    return true
  }

  // Block mobile app stores and intent protocol takeovers
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return true
  }

  // Block known ad and tracking domains
  for (const domain of BLOCKED_DOMAINS) {
    if (lower.includes(domain)) return true
  }

  // Block common ad path patterns
  if (
    lower.includes('/ad/') ||
    lower.includes('/ads/') ||
    lower.includes('/banner/') ||
    lower.includes('/popunder/') ||
    lower.includes('/popup/') ||
    lower.includes('ad_click') ||
    lower.includes('banner_click') ||
    lower.includes('traffic_source')
  ) {
    return true
  }

  return false
}

/**
 * Brave Shields Injected Scriptlet
 * 
 * - Neutralizes window.open (popup block)
 * - Removes overlay hijackers
 * - Injects cosmetic CSS hiding rules
 * - Neutralizes anti-adblock traps
 * - Sniffs HTML5 video elements for the Soul video engine
 * - Reports blocked ad counts to React Native
 */
export const BRAVE_SHIELDS_INJECTED_JS = `
(function() {
  var blockedCount = 0;

  function reportBlock(delta) {
    blockedCount += (delta || 1);
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SHIELDS_ADS_BLOCKED',
          count: blockedCount
        }));
      }
    } catch(e) {}
  }

  // 0. VIEWPORT ALIGNMENT: Ensure pages scale precisely to screen without clipping
  try {
    var existingMeta = document.querySelector('meta[name="viewport"]');
    if (!existingMeta) {
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      (document.head || document.documentElement).appendChild(meta);
    }
  } catch(e) {}

  // 1. BRAVE SCRIPTLET: Neutralize window.open popups
  var originalOpen = window.open;
  window.open = function(url, target, features) {
    // Check if this looks like an ad/popunder
    if (!url || url === 'about:blank' || url.includes('ad') || url.includes('pop') || url.includes('bet')) {
      reportBlock(1);
      return {
        closed: true,
        focus: function() {},
        blur: function() {},
        close: function() {}
      };
    }
    reportBlock(1);
    return null;
  };

  // 2. BRAVE SCRIPTLET: Defuse Anti-Adblock Detection Traps
  window.adsbygoogle = window.adsbygoogle || [];
  window.canRunAds = true;
  window.isAdBlockActive = false;
  window._adblock = false;

  // 3. BRAVE COSMETIC FILTERING: Inject high-specificity procedural CSS
  var cosmeticCSS = [
    'iframe[src*="ad"]',
    'iframe[src*="banner"]',
    'iframe[src*="pop"]',
    'iframe[id*="google_ads"]',
    '.ad-banner',
    '.ads-container',
    '.ad-box',
    '.popup-overlay',
    '.disclaimer-overlay',
    '#overlay-popup',
    '#interstitial',
    'div[class*="Sponsored"]',
    'div[id*="sponsored"]',
    'a[target="_blank"][href*="bet"]',
    'a[target="_blank"][href*="click"]',
    'a[target="_blank"][href*="pop"]',
    'div[class*="player-ad-overlay"]',
    'div[class*="video-overlay-ad"]',
    '.banner-wrapper',
    '#ad-content',
    '.ad-placeholder',
    '.floating-banner',
    '#player-ads',
    '.ytp-ad-overlay-container',
    '.ytp-ad-message-container',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytm-promoted-sparkles-web-renderer',
    'ytm-companion-ad-renderer',
    'ytm-promoted-video-renderer',
    '#masthead-ad',
    '.ytd-merch-shelf-renderer',
    'ytd-ad-slot-renderer',
    'yt-mealbar-promo-renderer'
  ].join(', ') + ' { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; }';

  var styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.appendChild(document.createTextNode(cosmeticCSS));
  (document.head || document.documentElement).appendChild(styleEl);

  // 4. BRAVE PROCEDURAL FILTER: Remove intrusive click-jackers & invisible layers
  function cleanseDOM() {
    var suspectedElements = document.querySelectorAll('div[style*="z-index: 2147483647"], div[style*="z-index: 9999999"], .modal-backdrop, .ad-banner');
    var removedNow = 0;
    for (var i = 0; i < suspectedElements.length; i++) {
      var el = suspectedElements[i];
      // Don't remove legit video player wrappers
      if (el.querySelector('video')) continue;
      if (el.id === 'root' || el.id === '__next' || el.tagName === 'BODY') continue;

      var text = (el.innerText || '').toLowerCase();
      var html = (el.innerHTML || '').toLowerCase();
      if (
        html.includes('sponsored') ||
        html.includes('advertisement') ||
        html.includes('bet365') ||
        html.includes('1xbet') ||
        html.includes('popunder') ||
        text.includes('disable adblock')
      ) {
        el.remove();
        removedNow++;
      }
    }
    if (removedNow > 0) reportBlock(removedNow);
  }

  // 5. SOUL BROWSER VIDEO SNIFFER ENGINE & ACTIVE STREAM DETECTOR
  var lastReportedSrc = '';
  var lastReportedStreamingStatus = null;
  function sniffSoulVideo() {
    var vids = document.getElementsByTagName('video');
    var isAnyVideoPlaying = false;
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      // A video is only playing if it is actively not paused, not ended, and has progressed
      if (v && !v.paused && !v.ended && v.currentTime > 0) {
        isAnyVideoPlaying = true;
      }
      var src = v.currentSrc || v.src;
      if (src && src.startsWith('http') && !src.includes('blob:') && src !== lastReportedSrc) {
        lastReportedSrc = src;
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STREAM_SNIFFED',
            sourceUrl: src,
            title: document.title || 'Soul Cinema Stream',
            duration: v.duration || 0
          }));
        }
      }
    }
    if (isAnyVideoPlaying !== lastReportedStreamingStatus) {
      lastReportedStreamingStatus = isAnyVideoPlaying;
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'VIDEO_STREAM_STATUS',
          isStreaming: isAnyVideoPlaying
        }));
      }
    }
  }

  // 5.5 YOUTUBE PRECISION AD SKIPPER & SPEED RESTORER
  var wasAdActive = false;
  var prevMutedState = false;

  function handleYouTubeVideoAds() {
    try {
      if (window.location.hostname.indexOf('youtube.com') === -1) return;

      var player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      var isAdActive = false;

      // Strictly detect active ad states on the YouTube player container
      if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
        isAdActive = true;
      }
      var adOverlay = document.querySelector('.ytp-ad-player-overlay');
      if (adOverlay && adOverlay.offsetParent !== null) {
        isAdActive = true;
      }

      var video = document.querySelector('video');

      if (isAdActive && video) {
        if (!wasAdActive) {
          wasAdActive = true;
          prevMutedState = video.muted;
        }

        // Mute and fast-forward ONLY the advertisement
        video.muted = true;
        video.playbackRate = 16.0;

        // Advance ONLY if it's an ad (duration is short, <= 65s). Never jump the main video!
        if (isFinite(video.duration) && video.duration > 0 && video.duration < 65) {
          video.currentTime = video.duration;
        }

        // Auto-click any available skip button
        var skipBtn = document.querySelector(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button, button.ytp-ad-skip-button-text'
        );
        if (skipBtn) {
          try {
            skipBtn.click();
            reportBlock(1);
          } catch(e) {}
        }
      } else if (wasAdActive) {
        // Ad has finished: IMMEDIATELY RESTORE NORMAL SPEED AND UNMUTE
        wasAdActive = false;
        if (video) {
          video.playbackRate = 1.0;
          video.muted = prevMutedState;
        }
        reportBlock(1);
      }
    } catch(e) {}
  }

  // Periodic DOM scrub, YouTube ad skip, and video check
  setInterval(cleanseDOM, 3000);
  setInterval(sniffSoulVideo, 1500);
  setInterval(handleYouTubeVideoAds, 100);

  // 6. SOUL & BRAVE BACKGROUND PLAY ENGINE (Continuous Audio/Video in Background)
  try {
    var defProp = function(target, prop, val) {
      try {
        Object.defineProperty(target, prop, {
          get: function() { return val; },
          set: function() {},
          configurable: true,
          enumerable: true
        });
      } catch(e) {}
    };

    defProp(Document.prototype, 'hidden', false);
    defProp(Document.prototype, 'visibilityState', 'visible');
    defProp(Document.prototype, 'webkitHidden', false);
    defProp(Document.prototype, 'webkitVisibilityState', 'visible');

    defProp(document, 'hidden', false);
    defProp(document, 'visibilityState', 'visible');
    defProp(document, 'webkitHidden', false);
    defProp(document, 'webkitVisibilityState', 'visible');

    // Drop auto-pause event listeners so web players don't pause on minimize/lock
    var blockedEventNames = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout', 'pagehide'];
    var origAEL = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (typeof type === 'string' && blockedEventNames.indexOf(type.toLowerCase()) !== -1) {
        if (this === window || this === document) {
          return;
        }
      }
      return origAEL.call(this, type, listener, options);
    };

    try {
      Object.defineProperty(window, 'onblur', { get: function() { return null; }, set: function() {}, configurable: true });
      Object.defineProperty(window, 'onpagehide', { get: function() { return null; }, set: function() {}, configurable: true });
      Object.defineProperty(document, 'onvisibilitychange', { get: function() { return null; }, set: function() {}, configurable: true });
      Object.defineProperty(document, 'onwebkitvisibilitychange', { get: function() { return null; }, set: function() {}, configurable: true });
    } catch(e) {}

    // Track user touch interactions to distinguish user pauses from OS background pauses
    var lastUserGestureTimestamp = Date.now();
    ['click', 'touchstart', 'touchend', 'mousedown', 'keydown', 'pointerdown'].forEach(function(evt) {
      window.addEventListener(evt, function() {
        lastUserGestureTimestamp = Date.now();
      }, { capture: true, passive: true });
    });

    // Intercept auto-pauses triggered by OS app minimization/blur
    var origMediaPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function() {
      var timeSinceGesture = Date.now() - lastUserGestureTimestamp;
      if (timeSinceGesture > 800 && !this.ended && this.currentTime > 0) {
        // Prevent background pause
        return Promise.resolve();
      }
      return origMediaPause.apply(this, arguments);
    };

    // Reinforce playsinline attributes on HTML5 media elements
    function keepMediaActive() {
      var medias = document.querySelectorAll('video, audio');
      for (var i = 0; i < medias.length; i++) {
        var m = medias[i];
        if (!m.hasAttribute('playsinline')) m.setAttribute('playsinline', '');
        if (!m.hasAttribute('webkit-playsinline')) m.setAttribute('webkit-playsinline', '');
      }
    }
    setInterval(keepMediaActive, 2000);
  } catch(e) {}

  document.addEventListener('DOMContentLoaded', function() {
    cleanseDOM();
    sniffSoulVideo();
  });

  document.addEventListener('play', sniffSoulVideo, true);
  document.addEventListener('playing', sniffSoulVideo, true);
  document.addEventListener('pause', sniffSoulVideo, true);
  document.addEventListener('ended', sniffSoulVideo, true);
  document.addEventListener('emptied', sniffSoulVideo, true);
  document.addEventListener('abort', sniffSoulVideo, true);
  window.addEventListener('beforeunload', function() {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'VIDEO_STREAM_STATUS',
        isStreaming: false
      }));
    }
  });
})();
true;
`

export const BACKGROUND_PLAY_EARLY_JS = `
(function() {
  try {
    var def = function(target, prop, val) {
      try {
        Object.defineProperty(target, prop, {
          get: function() { return val; },
          set: function() {},
          configurable: true,
          enumerable: true
        });
      } catch(e) {}
    };

    // 1. Spoof Page Visibility API across Document prototype and document instance
    def(Document.prototype, 'hidden', false);
    def(Document.prototype, 'visibilityState', 'visible');
    def(Document.prototype, 'webkitHidden', false);
    def(Document.prototype, 'webkitVisibilityState', 'visible');

    def(document, 'hidden', false);
    def(document, 'visibilityState', 'visible');
    def(document, 'webkitHidden', false);
    def(document, 'webkitVisibilityState', 'visible');

    // 2. Drop auto-pause event listeners
    var blockedList = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout', 'pagehide'];
    var originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (typeof type === 'string' && blockedList.indexOf(type.toLowerCase()) !== -1) {
        if (this === window || this === document) {
          return;
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    try {
      Object.defineProperty(window, 'onblur', { get: function() { return null; }, set: function() {}, configurable: true });
      Object.defineProperty(window, 'onpagehide', { get: function() { return null; }, set: function() {}, configurable: true });
      Object.defineProperty(document, 'onvisibilitychange', { get: function() { return null; }, set: function() {}, configurable: true });
      Object.defineProperty(document, 'onwebkitvisibilitychange', { get: function() { return null; }, set: function() {}, configurable: true });
    } catch(e) {}

    // 3. User interaction tracker
    var lastInteraction = Date.now();
    ['click', 'touchstart', 'touchend', 'mousedown', 'keydown', 'pointerdown'].forEach(function(evt) {
      window.addEventListener(evt, function() {
        lastInteraction = Date.now();
      }, { capture: true, passive: true });
    });

    // 4. Intercept programmatic pause caused by window blur or screen off
    var origHTMLMediaPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function() {
      var diff = Date.now() - lastInteraction;
      if (diff > 800 && !this.ended && this.currentTime > 0) {
        return Promise.resolve();
      }
      return origHTMLMediaPause.apply(this, arguments);
    };
  } catch (err) {}
})();
true;
`

