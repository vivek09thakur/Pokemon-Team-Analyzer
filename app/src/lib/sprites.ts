// Sprite measuring/fitting. Game renders are centred on a 512² canvas with transparent padding;
// we measure the opaque bounds once per URL and scale/offset the <img> so the visible pixels are
// exactly the requested height and sit on the baseline.

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
  const hit = boundsCache.get(src);
  if (hit) return hit;
  const promise = new Promise<Bounds | null>((resolve) => {
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      try {
        // Scan a 128px downsample (16× fewer pixels); bounds are scaled back to source units
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
        // Shave thin extremities, but never more than a slice of the full box (wide fliers like
        // Swellow have a narrow body vs. wingspan and would otherwise collapse to the wing band)
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
        resolve(null); // no CORS: leave the sprite untrimmed
      }
    };
    probe.onerror = () => resolve(null);
    probe.src = src;
  });
  boundsCache.set(src, promise);
  return promise;
}

export interface FitOptions {
  // Visible height target in px; when omitted the img's current rendered height is used once
  height?: number | null;
  // Visible width cap in px (or a getter evaluated at fit time)
  maxWidth?: number | (() => number);
  onFit?: () => void;
}

// Apply the fit to an <img>. Returns a cleanup that detaches the load listener.
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

// Step an <img> through its data-fallbacks list when a source 404s
export function handleSpriteError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const [next, ...rest] = (img.dataset.fallbacks || "").split("|").filter(Boolean);
  img.dataset.fallbacks = rest.join("|");
  if (next) img.src = next;
}

// Which URL in the chain actually loaded for an id, so later <img>s for the same Pokémon
// (lineup, member card) skip straight to it instead of re-walking the 404s
const resolved = new Map<string, string>();
export const rememberSprite = (key: string, src: string) => resolved.set(key, src);
export function orderSources(key: string, sources: string[]) {
  const hit = resolved.get(key);
  if (!hit || !sources.includes(hit)) return sources;
  return [hit, ...sources.filter((s) => s !== hit)];
}
