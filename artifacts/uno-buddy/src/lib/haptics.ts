import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Lightweight haptics wrapper.
 * - Uses the Capacitor Haptics plugin when available (web and native).
 * - Falls back to navigator.vibrate when Capacitor is not installed/initialized.
 * - Silently no-ops on devices without haptics support (e.g. desktop browsers).
 */
async function impact(style: ImpactStyle, fallbackMs: number) {
  try {
    await Haptics.impact({ style });
  } catch {
    try {
      navigator.vibrate?.(fallbackMs);
    } catch {
      /* ignore */
    }
  }
}

export const haptics = {
  light: () => impact(ImpactStyle.Light, 8),
  medium: () => impact(ImpactStyle.Medium, 18),
  heavy: () => impact(ImpactStyle.Heavy, 30),
  selection: () => {
    try {
      Haptics.selectionStart();
      setTimeout(() => {
        try { Haptics.selectionEnd(); } catch { /* ignore */ }
      }, 30);
    } catch {
      try { navigator.vibrate?.(5); } catch { /* ignore */ }
    }
  },
};
