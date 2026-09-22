'use client';

/**
 * Client notifications (03 §12) — the in-app half of the notification spec.
 *
 * Covers: a crop becoming ready, and an animal going hungry/sick, detected
 * while the app is open. The permission prompt + the service-worker plumbing
 * (sw.js listens for `push`) are in place so a later server-side web-push
 * sender can reuse them; that sender (VAPID keys + a subscribe endpoint) is the
 * remaining server work for true background push.
 */

const TOGGLE_KEY = 'molemisi_notif';

export type NotifKind = 'cropsReady' | 'animalsHungry';

export interface NotifPrefs {
  cropsReady: boolean;
  animalsHungry: boolean;
}

const DEFAULTS: NotifPrefs = { cropsReady: true, animalsHungry: true };

export function getNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(TOGGLE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setNotifPrefs(prefs: Partial<NotifPrefs>): NotifPrefs {
  const next = { ...getNotifPrefs(), ...prefs };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOGGLE_KEY, JSON.stringify(next));
  }
  return next;
}

/** Ask the browser for notification permission (must run from a user gesture). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Register the service worker so a future server push has a receiver. */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Registration is best-effort; the game must not depend on it.
  }
}

/** Fire a notification when the browser allows it and the kind is enabled. */
export function notifyIfEnabled(kind: NotifKind, title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  const prefs = getNotifPrefs();
  const enabled = kind === 'cropsReady' ? prefs.cropsReady : prefs.animalsHungry;
  if (!enabled || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {
    // Some browsers require the service-worker route; the SW handler covers it.
  }
}
