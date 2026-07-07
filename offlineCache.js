// lib/offlineCache.js
// Lets the app show the last-fetched feed even with no network — this is
// one of the concrete things that separates a "real app" from a wrapped
// website in Apple/Google's review criteria (Apple Guideline 4.2).
//
// Uses Capacitor's Preferences plugin when running as a native app
// (npm install @capacitor/preferences), and falls back to localStorage
// when running as a plain website. Both are safe here because this is a
// real deployed app, not a Claude.ai artifact preview.

const KEY = "signal_offline_feed";

let Preferences = null;
try {
  // Only resolves inside a Capacitor native build; harmless no-op on web.
  // eslint-disable-next-line global-require
  Preferences = require("@capacitor/preferences").Preferences;
} catch (e) {
  Preferences = null;
}

export async function saveOfflineFeed(items) {
  const payload = JSON.stringify({ items, savedAt: new Date().toISOString() });
  try {
    if (Preferences) {
      await Preferences.set({ key: KEY, value: payload });
    } else if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, payload);
    }
  } catch (e) {
    // Non-fatal — offline cache is a nice-to-have, not core functionality
  }
}

export async function loadOfflineFeed() {
  try {
    let raw = null;
    if (Preferences) {
      const res = await Preferences.get({ key: KEY });
      raw = res?.value;
    } else if (typeof window !== "undefined") {
      raw = window.localStorage.getItem(KEY);
    }
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
