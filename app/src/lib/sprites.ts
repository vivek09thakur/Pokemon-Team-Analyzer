import { fetchWithTimeout } from "@/common/lib/http";
import { animatedSources } from "./calculation";
import { SHOWDOWN_SPRITES } from "./constants";

const HEAD_TIMEOUT_MS = 10_000;
const ANIMATED_TIMEOUT_MS = 30_000;

export interface Bounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
  w: number;
  h: number;
}

const boundsCache = new Map<string, Promise<Bounds | null>>();

export function spriteBounds(src: string): Promise<Bounds | null> {
  if (!allowsCors(src)) return Promise.resolve(null);
  const hit = boundsCache.get(src);
  if (hit) return hit;
  const promise = new Promise<Bounds | null>((resolve) => {
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      try {
        const SCAN = 128;
        const w = SCAN;
        const h = SCAN;
        const k = probe.naturalWidth / SCAN;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(probe, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const rows = new Uint16Array(h);
        let left = w,
          right = -1,
          widest = 0;
        for (let y = 0; y < h; y++) {
          let count = 0;
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 40) {
              count++;
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }
          rows[y] = count;
          if (count > widest) widest = count;
        }
        if (widest === 0) return resolve(null);
        let top = 0,
          bottom = h - 1;
        while (top < h && rows[top] === 0) top++;
        while (bottom > top && rows[bottom] === 0) bottom--;
        const span = bottom - top;
        const topLimit = top + span * 0.15;
        const bottomLimit = bottom - span * 0.05;
        while (top < topLimit && rows[top] < widest * 0.18) top++;
        while (bottom > bottomLimit && rows[bottom] < widest * 0.06) bottom--;
        resolve({
          top: top * k,
          bottom: (bottom + 1) * k,
          left: left * k,
          right: (right + 1) * k,
          w: probe.naturalWidth,
          h: probe.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    probe.onerror = () => {
      boundsCache.delete(src);
      resolve(null);
    };
    probe.src = src;
  });
  boundsCache.set(src, promise);
  return promise;
}

export interface FitOptions {
  height?: number | null;
  maxWidth?: number | (() => number);
  onFit?: () => void;
}

export function attachSpriteFit(img: HTMLImageElement, opts: FitOptions): () => void {
  let disposed = false;
  const apply = async () => {
    const src = img.currentSrc || img.src;
    if (!img.dataset.fitTarget) {
      img.dataset.fitTarget = String(opts.height ?? img.getBoundingClientRect().height);
    }
    const target = parseFloat(img.dataset.fitTarget);
    const b = await spriteBounds(src);
    if (disposed || !b || (img.currentSrc || img.src) !== src || !target) return;
    let s = target / (b.bottom - b.top);
    const limit = typeof opts.maxWidth === "function" ? opts.maxWidth() : opts.maxWidth;
    if (limit && (b.right - b.left) * s > limit) s = limit / (b.right - b.left);
    img.style.height = `${b.h * s}px`;
    img.style.maxHeight = "none";
    img.style.maxWidth = "none";
    img.style.marginTop = `${-b.top * s}px`;
    img.style.marginBottom = `${-(b.h - b.bottom) * s}px`;
    img.style.marginLeft = `${-b.left * s}px`;
    img.style.marginRight = `${-(b.w - b.right) * s}px`;
    opts.onFit?.();
  };
  if (img.complete && img.naturalWidth) apply();
  img.addEventListener("load", apply);
  return () => {
    disposed = true;
    img.removeEventListener("load", apply);
  };
}

export const allowsCors = (src: string) => !src.startsWith(SHOWDOWN_SPRITES);

const dead = new Set<string>();

export function handleSpriteError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  dead.add(img.src);
  const [next, ...rest] = (img.dataset.fallbacks || "").split("|").filter((s) => s && !dead.has(s));
  img.dataset.fallbacks = rest.join("|");
  if (!next) return;
  if (!allowsCors(next)) img.removeAttribute("crossorigin");
  img.src = next;
}

export function liveSources(sources: string[]) {
  const alive = sources.filter((s) => !dead.has(s));
  return alive.length ? alive : sources.slice(-1);
}

const animated = new Map<string, Promise<string | null>>();
const animatedSettled = new Map<string, string | null>();
export const settledAnimatedSprite = (id: number, shiny = false) =>
  animatedSettled.get(`${id}:${shiny}`);

export function loadAnimatedSprite(id: number, shiny = false): Promise<string | null> {
  const key = `${id}:${shiny}`;
  const hit = animated.get(key);
  if (hit) return hit;
  const urls = animatedSources(id, shiny);
  const exists = urls.map((u) =>
    fetchWithTimeout(u, { method: "HEAD" }, HEAD_TIMEOUT_MS).then((r) => r.ok, () => false)
  );
  const promise = (async () => {
    for (let i = 0; i < urls.length; i++) {
      if (!(await exists[i])) continue;
      const src = urls[i];
      return new Promise<string | null>((resolve) => {
        const probe = new Image();
        const timer = window.setTimeout(() => resolve(null), ANIMATED_TIMEOUT_MS);
        probe.crossOrigin = "anonymous";
        probe.onload = () =>
          spriteBounds(src).then(() => {
            window.clearTimeout(timer);
            resolve(src);
          });
        probe.onerror = () => {
          window.clearTimeout(timer);
          resolve(null);
        };
        probe.src = src;
      });
    }
    return null;
  })().then((src) => {
    animatedSettled.set(key, src);
    return src;
  });
  animated.set(key, promise);
  return promise;
}
