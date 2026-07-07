// lib/push.js
// Registers the device for push notifications when running as a native
// app (iOS/Android via Capacitor). No-ops silently on the plain web build.
//
// Requires: npm install @capacitor/push-notifications
// iOS: needs an APNs key configured in your Apple Developer account.
// Android: needs a Firebase project + google-services.json.

let PushNotifications = null;
try {
  // eslint-disable-next-line global-require
  PushNotifications = require("@capacitor/push-notifications").PushNotifications;
} catch (e) {
  PushNotifications = null;
}

export async function registerPush(supabase) {
  if (!PushNotifications) return; // running on web — nothing to do

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      if (!accessToken) return;
      await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token: token.value, platform: /iPhone|iPad/.test(navigator.userAgent) ? "ios" : "android" }),
      });
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration failed", err);
    });
  } catch (e) {
    // Non-fatal — push is an enhancement, not core functionality
  }
}
