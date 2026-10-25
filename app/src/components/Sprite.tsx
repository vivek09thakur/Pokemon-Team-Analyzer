"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { spriteSources } from "@/lib/calculation";
import { attachSpriteFit, handleSpriteError, type FitOptions } from "@/lib/sprites";
import type { Pokemon } from "@/lib/types";

interface Props {
  pokemon: Pick<Pokemon, "id" | "name" | "showdownId">;
  className?: string;
  style?: React.CSSProperties;
  // When given, the visible pixels are measured and scaled to fit (see lib/sprites)
  fit?: FitOptions;
}

// <img> with the sprite fallback chain and optional pixel-accurate fitting
const Sprite = forwardRef<HTMLImageElement, Props>(function Sprite(
  { pokemon, className = "", style, fit },
  ref
) {
  const imgRef = useRef<HTMLImageElement>(null);
  useImperativeHandle(ref, () => imgRef.current as HTMLImageElement);
  const [primary, ...fallbacks] = spriteSources(pokemon);

  // Latest options without re-attaching on every render
  const fitRef = useRef(fit);
  fitRef.current = fit;

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !fitRef.current) return;
    return attachSpriteFit(img, {
      height: fitRef.current.height,
      maxWidth: () => {
        const mw = fitRef.current?.maxWidth;
        return typeof mw === "function" ? mw() : mw ?? 0;
      },
      onFit: () => fitRef.current?.onFit?.(),
    });
    // Re-attach only when the sprite identity changes
  }, [pokemon.id, pokemon.showdownId]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      key={`${pokemon.id}:${pokemon.showdownId}`}
      src={primary}
      alt={pokemon.name}
      className={`sprite-3d ${className}`}
      style={style}
      data-id={pokemon.id}
      data-fallbacks={fallbacks.join("|")}
      onError={handleSpriteError}
      draggable={false}
    />
  );
});

export default Sprite;
