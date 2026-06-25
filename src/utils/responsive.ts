import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// ─── Design Baseline ──────────────────────────────────────────
// iPhone 12/13/14 standard size
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ─── Reactive Dimensions ──────────────────────────────────────
let currentWindow: ScaledSize = Dimensions.get('window');

// Listen for dimension changes (orientation, split screen, etc.)
Dimensions.addEventListener('change', ({ window }) => {
  currentWindow = window;
});

// ─── Core Scaling Functions ───────────────────────────────────
// These can be used in StyleSheet.create or inline styles,
// but will NOT update dynamically on orientation change.
// For dynamic updates, use the useResponsive() hook.

/**
 * Horizontal scale: proportional to screen width.
 * Use for widths, paddings, margins, element sizes.
 */
export function scale(size: number): number {
  return (currentWindow.width / BASE_WIDTH) * size;
}

/**
 * Vertical scale: proportional to screen height.
 * Use for heights, vertical paddings/margins, top/bottom positions.
 */
export function verticalScale(size: number): number {
  return (currentWindow.height / BASE_HEIGHT) * size;
}

/**
 * Moderate scale: applies a factor so very large sizes don't
 * scale as aggressively. Best for font sizes and icons.
 *
 * @param size       base design size
 * @param factor     how much to scale (0 = no scaling, 1 = full scaling). Default 0.5.
 */
export function moderateScale(size: number, factor: number = 0.5): number {
  const scaled = scale(size);
  return size + (scaled - size) * factor;
}

/**
 * Font size: uses moderateScale with pixel-ratio awareness
 * to prevent text from being too small on high-dpi screens.
 */
export function fontSize(size: number, factor: number = 0.4): number {
  const fontScale = PixelRatio.getFontScale();
  return moderateScale(size, factor) * Math.min(fontScale, 1.3); // cap at 1.3x
}

/**
 * Icon size: scales icons proportionally to screen width.
 */
export function iconSize(size: number): number {
  return Math.round(scale(size));
}

/**
 * Line height: ensures line-height scales proportionally with font size.
 */
export function lineHeight(fontSizeValue: number, multiplier: number = 1.4): number {
  return Math.round(fontSizeValue * multiplier);
}

// ─── Aliases for convenience ──────────────────────────────────
export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const fs = fontSize;

// ─── Responsive Hook ──────────────────────────────────────────
// Use this inside components that need to re-render on dimension changes.
// Returns the current scaled functions bound to the latest window dimensions.

export interface ResponsiveScale {
  s: (size: number) => number;
  vs: (size: number) => number;
  ms: (size: number, factor?: number) => number;
  fs: (size: number, factor?: number) => number;
  iconSize: (size: number) => number;
  windowWidth: number;
  windowHeight: number;
  isSmallDevice: boolean;
  isLargeDevice: boolean;
}

export function getResponsive(window?: ScaledSize): ResponsiveScale {
  const win = window || currentWindow;
  const w = win.width;
  const h = win.height;

  const hs = (size: number) => (w / BASE_WIDTH) * size;
  const vsFn = (size: number) => (h / BASE_HEIGHT) * size;
  const msFn = (size: number, factor: number = 0.5) => {
    const s = hs(size);
    return size + (s - size) * factor;
  };
  const fsFn = (size: number, factor: number = 0.4) => {
    const fontScale = PixelRatio.getFontScale();
    return msFn(size, factor) * Math.min(fontScale, 1.3);
  };

  return {
    s: hs,
    vs: vsFn,
    ms: msFn,
    fs: fsFn,
    iconSize: (size: number) => Math.round(hs(size)),
    windowWidth: w,
    windowHeight: h,
    isSmallDevice: w < 360,
    isLargeDevice: w >= 414,
  };
}