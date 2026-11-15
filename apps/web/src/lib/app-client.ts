'use client';
import { useSyncExternalStore } from 'react';

export type AppClient = 'desktop' | 'android';
const STORAGE_KEY = 'jinsei-client';

/** Reads which Jinsei app opened the site (?client= on the first visit, then remembered). */
function detect(): AppClient | null {
  const param = new URLSearchParams(window.location.search).get('client');
  if (param === 'desktop' || param === 'android') {
    try {
      localStorage.setItem(STORAGE_KEY, param);
    } catch {
      // Storage can be unavailable; the user agent still identifies the Android app.
    }
    return param;
  }
  if (/JinseiAndroid\//.test(navigator.userAgent)) return 'android';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'desktop' || saved === 'android' ? saved : null;
  } catch {
    return null;
  }
}

const subscribe = () => () => undefined;

/** The Jinsei app in use, or null in a regular browser (always null on the server). */
export function useAppClient() {
  return useSyncExternalStore(subscribe, detect, () => null);
}
