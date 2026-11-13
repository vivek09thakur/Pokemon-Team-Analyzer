"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Spinner } from "@/common/components/Spinner";
import { spriteSources, thumbSources } from "@/lib/calculation";
import {
  allowsCors,
  attachSpriteFit,
  handleSpriteError,
  liveSources,
  loadAnimatedSprite,
  settledAnimatedSprite,
  type FitOptions,
} from "@/lib/sprites";
import type { Pokemon } from "@/lib/types";

interface Props {
  pokemon: Pick<Pokemon, "id" | "name" | "showdownId">;
  className?: string;
  style?: React.CSSProperties;
  fit?: FitOptions;
  thumb?: boolean;
  shiny?: boolean;
}

const Sprite = forwardRef<HTMLImageElement, Props>(function Sprite(
  { pokemon, className = "", style, fit, thumb = false, shiny = false },
  ref
) {
  const imgRef = useRef<HTMLImageElement>(null);
  useImperativeHandle(ref, () => imgRef.current as HTMLImageElement);
  const [, setTick] = useState(0);
  const animated = thumb ? null : settledAnimatedSprite(pokemon.id, shiny);
  const loading = animated === undefined;
  const [primary, ...fallbacks] = liveSources(
    thumb
      ? thumbSources(pokemon)
      : [...(animated ? [animated] : []), ...spriteSources(pokemon, shiny)]
  );

  useEffect(() => {
    if (!loading) return;
    let live = true;
    loadAnimatedSprite(pokemon.id, shiny).then(() => {
      if (live) setTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [loading, pokemon.id, shiny]);

  const fitRef = useRef(fit);
  fitRef.current = fit;

  useLayoutEffect(() => {
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
  }, [pokemon.id, pokemon.showdownId, loading]);

  if (loading) {
    return (
      <span
        className={`inline-flex items-center justify-center aspect-square max-w-full ${className}`}
        style={style}
        role="status"
        aria-label={`Loading ${pokemon.name}`}
      >
        <Spinner size={28} />
      </span>
    );
  }

  return (
    <img
      ref={imgRef}
      key={`${pokemon.id}:${pokemon.showdownId}`}
      src={primary}
      alt={pokemon.name}
      className={`sprite-3d ${className}`}
      style={style}
      crossOrigin={allowsCors(primary) ? "anonymous" : undefined}
      loading={thumb ? "lazy" : "eager"}
      decoding="async"
      data-id={pokemon.id}
      data-fallbacks={fallbacks.join("|")}
      onError={handleSpriteError}
      draggable={false}
    />
  );
});

export default Sprite;
