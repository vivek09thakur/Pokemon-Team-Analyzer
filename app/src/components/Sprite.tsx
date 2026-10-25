"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { spriteSources, thumbSources } from "@/lib/calculation";
import {
  attachSpriteFit,
  handleSpriteError,
  orderSources,
  rememberSprite,
  type FitOptions,
} from "@/lib/sprites";
import type { Pokemon } from "@/lib/types";

interface Props {
  pokemon: Pick<Pokemon, "id" | "name" | "showdownId">;
  className?: string;
  style?: React.CSSProperties;
  // When given, the visible pixels are measured and scaled to fit (see lib/sprites)
  fit?: FitOptions;
  // Small preview: HOME render first, no game-sprite fallback walk
  thumb?: boolean;
}

// <img> with the sprite fallback chain and optional pixel-accurate fitting
const Sprite = forwardRef<HTMLImageElement, Props>(function Sprite(
  { pokemon, className = "", style, fit, thumb = false },
  ref
) {
  const imgRef = useRef<HTMLImageElement>(null);
  useImperativeHandle(ref, () => imgRef.current as HTMLImageElement);
  const memoKey = `${thumb ? "thumb" : "full"}:${pokemon.id}`;
  const [primary, ...fallbacks] = orderSources(
    memoKey,
    thumb ? thumbSources(pokemon) : spriteSources(pokemon)
  );

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
      onLoad={(e) => rememberSprite(memoKey, e.currentTarget.currentSrc)}
      draggable={false}
    />
  );
});

export default Sprite;
