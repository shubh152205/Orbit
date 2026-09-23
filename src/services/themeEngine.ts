export type ThemeMode = 'dark' | 'light' | 'auto'

export const STORAGE_THEME_MODE_KEY = '@streamnest_web_theme_mode'

/**
 * Generates client JavaScript to tell websites which theme to apply naturally.
 * - In Dark mode: Sets standard meta color-scheme, overrides window.matchMedia for
 *   prefers-color-scheme: dark, sets standard root dark attributes, and applies official
 *   dark theme configurations (cookies & native CSS custom properties) for major platforms
 *   like YouTube (PREF=f6=400, --yt-spec-*), Wikipedia, Reddit, and Twitter without forced invert filters.
 * - In Light mode: Reverts color-scheme to light, overrides matchMedia for prefers-color-scheme: light,
 *   removes dark classes/attributes, and updates platform cookies to restore official daylight themes.
 */
export function generateWebsiteThemeJS(mode: ThemeMode, systemIsDark: boolean = true): string {
  const effectiveMode: 'dark' | 'light' = mode === 'auto' ? (systemIsDark ? 'dark' : 'light') : mode
  const isDark = effectiveMode === 'dark'

  return `
(function() {
  try {
    var isDark = ${isDark};
    var targetMode = isDark ? "dark" : "light";
    var hostname = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : "";

    // 1. Remove any legacy forced invert style elements if they exist
    var legacyStyle = document.getElementById("__streamnest_theme_engine_style");
    if (legacyStyle) {
      legacyStyle.remove();
    }

    // 2. Set or update standard W3C <meta name="color-scheme">
    var meta = document.querySelector("meta[name=\x27color-scheme\x27]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "color-scheme";
      var metaParent = document.head || document.documentElement;
      if (metaParent) metaParent.appendChild(meta);
    }
    if (meta) {
      meta.content = targetMode;
    }

    // 3. Set standard colorScheme on documentElement and body
    if (document.documentElement) {
      document.documentElement.style.colorScheme = targetMode;
      document.documentElement.style.filter = "";
      document.documentElement.style.backgroundColor = isDark ? "#0e1117" : "";

      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.setAttribute("theme", "dark");
        document.documentElement.setAttribute("dark", "true");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.setAttribute("theme", "light");
        document.documentElement.removeAttribute("dark");
      }
    }
    if (document.body) {
      document.body.style.colorScheme = targetMode;
      document.body.style.filter = "";
      document.body.style.backgroundColor = isDark ? "#0e1117" : "";
    }

    // 3.5 Global smart dark mode stylesheet for websites without built-in dark CSS
    var GLOBAL_DARK_STYLE_ID = "__streamnest_global_dark_theme";
    var existingGlobalDark = document.getElementById(GLOBAL_DARK_STYLE_ID);
    if (isDark) {
      if (!existingGlobalDark && hostname.indexOf("youtube.com") === -1) {
        existingGlobalDark = document.createElement("style");
        existingGlobalDark.id = GLOBAL_DARK_STYLE_ID;
        existingGlobalDark.type = "text/css";
        var globalDarkCSS = 
          "html, body { background-color: #0e1117 !important; color: #e2e8f0 !important; } " +
          "input:not([type='range']):not([type='checkbox']):not([type='radio']), textarea, select { " +
          "  background-color: #1a1f2c !important; color: #f8fafc !important; border-color: #334155 !important; " +
          "} " +
          "a { color: #60a5fa !important; } " +
          "img, video, canvas, svg, picture, iframe { filter: none !important; }";
        existingGlobalDark.appendChild(document.createTextNode(globalDarkCSS));
        var targetParent = document.head || document.documentElement;
        if (targetParent) targetParent.appendChild(existingGlobalDark);
      }
    } else {
      // In Light Mode: Immediately remove the global dark stylesheet and clear dark attributes
      if (existingGlobalDark) {
        existingGlobalDark.remove();
      }
      var darkElements = document.querySelectorAll("[dark], [data-theme='dark']");
      for (var d = 0; d < darkElements.length; d++) {
        darkElements[d].removeAttribute("dark");
        if (darkElements[d].getAttribute("data-theme") === "dark") {
          darkElements[d].setAttribute("data-theme", "light");
        }
      }
    }

    // 4. Override window.matchMedia so websites with built-in dark/light themes react naturally
    try {
      if (!window.__streamnest_orig_matchMedia) {
        window.__streamnest_orig_matchMedia = window.matchMedia;
      }
      var origMatchMedia = window.__streamnest_orig_matchMedia;

      window.matchMedia = function(query) {
        if (typeof query === "string" && query.indexOf("prefers-color-scheme") !== -1) {
          var isDarkQuery = query.indexOf("dark") !== -1;
          var matches = isDark ? isDarkQuery : !isDarkQuery;

          var mql = {
            matches: matches,
            media: query,
            onchange: null,
            _listeners: [],
            addListener: function(fn) {
              if (typeof fn === "function") this._listeners.push(fn);
            },
            removeListener: function(fn) {
              this._listeners = this._listeners.filter(function(l) { return l !== fn; });
            },
            addEventListener: function(type, fn) {
              if (type === "change" && typeof fn === "function") this._listeners.push(fn);
            },
            removeEventListener: function(type, fn) {
              if (type === "change") this._listeners = this._listeners.filter(function(l) { return l !== fn; });
            },
            dispatchEvent: function() { return false; }
          };
          return mql;
        }
        return origMatchMedia ? origMatchMedia.apply(window, arguments) : null;
      };

      try {
        window.dispatchEvent(new Event("streamnest-theme-change"));
      } catch(e) {}
    } catch(e) {}

    // 5. Platform-specific official dark mode adapters (YouTube, Wikipedia, Reddit, Twitter)
    function applyPlatformTheme() {
      // --- A. YOUTUBE (m.youtube.com & youtube.com) ---
      if (hostname.indexOf("youtube.com") !== -1) {
        var YT_STYLE_ID = "__streamnest_youtube_theme";
        var existingYtStyle = document.getElementById(YT_STYLE_ID);

        // Update PREF cookie: f6=400 enables official YouTube dark theme; f6=800 enables light theme
        try {
          var currentCookies = document.cookie || "";
          var prefMatch = currentCookies.match(/PREF=([^;]+)/);
          var prefVal = prefMatch ? prefMatch[1] : "";
          var targetF6 = isDark ? "f6=400" : "f6=800";
          var newPref = "";
          if (prefVal.indexOf("f6=") !== -1) {
            newPref = prefVal.replace(/f6=[0-9]+/, targetF6);
          } else {
            newPref = prefVal ? (prefVal + "&" + targetF6) : targetF6;
          }
          document.cookie = "PREF=" + newPref + "; domain=.youtube.com; path=/; max-age=31536000";
        } catch(e) {}

        // Set or remove dark attribute on custom elements
        if (isDark) {
          if (document.documentElement) {
            document.documentElement.setAttribute("dark", "true");
          }
          var ytmApp = document.querySelector("ytm-app");
          if (ytmApp) ytmApp.setAttribute("dark", "true");

          if (window.ytcfg && typeof window.ytcfg.set === "function") {
            try { window.ytcfg.set("IS_DARK_THEME", true); } catch(e) {}
          }

          // Inject YouTube's official native dark CSS variables
          // This immediately themes headers, chips, titles, bottom bar, and background
          // WITHOUT touch or distortion of video elements, thumbnails, or images
          if (!existingYtStyle) {
            existingYtStyle = document.createElement("style");
            existingYtStyle.id = YT_STYLE_ID;
            var targetParent = document.head || document.documentElement;
            if (targetParent) targetParent.appendChild(existingYtStyle);
          }
          if (existingYtStyle) {
            existingYtStyle.textContent = 
              "html, html[dark], html[dark=\x27true\x27], ytm-app, ytm-app[dark], ytm-app[dark=\x27true\x27], ytm-browse, ytm-mobile-topbar-renderer, ytm-pivot-bar-renderer, [dark] { " +
              "  --yt-spec-base-background: #0f0f0f !important; " +
              "  --yt-spec-raised-background: #212121 !important; " +
              "  --yt-spec-menu-background: #282828 !important; " +
              "  --yt-spec-inverted-background: #f1f1f1 !important; " +
              "  --yt-spec-additive-background: rgba(255, 255, 255, 0.1) !important; " +
              "  --yt-spec-outline: rgba(255, 255, 255, 0.2) !important; " +
              "  --yt-spec-shadow-1: rgba(0, 0, 0, 0.3) !important; " +
              "  --yt-spec-shadow-2: rgba(0, 0, 0, 0.5) !important; " +
              "  --yt-spec-text-primary: #f1f1f1 !important; " +
              "  --yt-spec-text-secondary: #aaaaaa !important; " +
              "  --yt-spec-text-disabled: #717171 !important; " +
              "  --yt-spec-call-to-action: #3ea6ff !important; " +
              "  --yt-spec-icon-active-other: #ffffff !important; " +
              "  --yt-spec-icon-inactive: #909090 !important; " +
              "  --yt-spec-icon-disabled: #606060 !important; " +
              "  --yt-spec-badge-chip-background: rgba(255, 255, 255, 0.1) !important; " +
              "  --yt-spec-suggested-action: #252a3a !important; " +
              "  --yt-spec-touch-response: #ffffff !important; " +
              "  --yt-spec-brand-icon-active: #ffffff !important; " +
              "  --yt-spec-brand-icon-inactive: #909090 !important; " +
              "  --yt-spec-wordmark-text: #ffffff !important; " +
              "  --yt-spec-10-percent-layer: rgba(255, 255, 255, 0.1) !important; " +
              "  --yt-spec-snackbar-background: #0f0f0f !important; " +
              "  --yt-spec-snackbar-background-updated: #212121 !important; " +
              "  --yt-spec-static-brand-white: #ffffff !important; " +
              "  --yt-spec-general-background-a: #181818 !important; " +
              "  --yt-spec-general-background-b: #0f0f0f !important; " +
              "  background-color: #0f0f0f !important; " +
              "  color: #f1f1f1 !important; " +
              "} " +
              "ytm-app, ytm-mobile-topbar-renderer, ytm-pivot-bar-renderer, .mobile-topbar-header, ytm-browse, .watch-below-the-player { " +
              "  background-color: #0f0f0f !important; " +
              "  color: #f1f1f1 !important; " +
              "} " +
              "ytm-chip-cloud-chip-renderer { " +
              "  background-color: rgba(255, 255, 255, 0.1) !important; " +
              "  color: #f1f1f1 !important; " +
              "} " +
              "ytm-chip-cloud-chip-renderer[aria-selected=\x27true\x27], " +
              "ytm-chip-cloud-chip-renderer.selected, " +
              "ytm-chip-cloud-chip-renderer[chip-style=\x27STYLE_ACTIVE\x27] { " +
              "  background-color: #f1f1f1 !important; " +
              "  color: #0f0f0f !important; " +
              "} " +
              ".compact-media-item-headline, .media-item-headline, .compact-media-item-metadata, .ytm-pivot-bar-item-title, .yt-core-attributed-string { " +
              "  color: #f1f1f1 !important; " +
              "} " +
              ".compact-media-item-byline, .media-item-byline, .yt-core-attributed-string--link-inherit-color { " +
              "  color: #aaaaaa !important; " +
              "}";
          }
        } else {
          // Revert YouTube to Light Mode
          if (existingYtStyle) {
            existingYtStyle.remove();
          }
          if (document.documentElement) {
            document.documentElement.removeAttribute("dark");
          }
          var ytmAppLight = document.querySelector("ytm-app");
          if (ytmAppLight) ytmAppLight.removeAttribute("dark");
          if (window.ytcfg && typeof window.ytcfg.set === "function") {
            try { window.ytcfg.set("IS_DARK_THEME", false); } catch(e) {}
          }
          var ytDarkEls = document.querySelectorAll("[dark], [dark=\x27true\x27]");
          for (var yi = 0; yi < ytDarkEls.length; yi++) {
            ytDarkEls[yi].removeAttribute("dark");
          }
        }
      }

      // --- B. WIKIPEDIA ---
      if (hostname.indexOf("wikipedia.org") !== -1) {
        if (isDark) {
          if (document.documentElement) {
            document.documentElement.classList.add("skin-theme-clientpref-night");
            document.documentElement.classList.remove("skin-theme-clientpref-day");
          }
          document.cookie = "skin-theme=night; domain=.wikipedia.org; path=/; max-age=31536000";
        } else {
          if (document.documentElement) {
            document.documentElement.classList.remove("skin-theme-clientpref-night");
            document.documentElement.classList.add("skin-theme-clientpref-day");
          }
          document.cookie = "skin-theme=day; domain=.wikipedia.org; path=/; max-age=31536000";
        }
      }

      // --- C. REDDIT ---
      if (hostname.indexOf("reddit.com") !== -1) {
        if (isDark) {
          if (document.documentElement) {
            document.documentElement.setAttribute("theme", "dark");
            document.documentElement.classList.add("theme-dark");
          }
        } else {
          if (document.documentElement) {
            document.documentElement.setAttribute("theme", "light");
            document.documentElement.classList.remove("theme-dark");
          }
        }
      }

      // --- D. TWITTER / X ---
      if (hostname.indexOf("twitter.com") !== -1 || hostname.indexOf("x.com") !== -1) {
        var nightModeVal = isDark ? "1" : "0";
        document.cookie = "night_mode=" + nightModeVal + "; path=/; max-age=31536000";
      }
    }

    applyPlatformTheme();
    setTimeout(applyPlatformTheme, 150);
    setTimeout(applyPlatformTheme, 500);
    setTimeout(applyPlatformTheme, 1500);

    // Maintain theme across dynamic single-page application router navigations
    if (!window.__streamnest_platform_observer && window.MutationObserver) {
      try {
        var obs = new MutationObserver(function() {
          applyPlatformTheme();
        });
        obs.observe(document.documentElement || document.body, { childList: true, attributes: false });
        window.__streamnest_platform_observer = obs;
      } catch(e) {}
    }

  } catch(err) {}
})();
true;
`
}
