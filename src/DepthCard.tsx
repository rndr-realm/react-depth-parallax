import React, { useEffect, useRef } from "react";
import { useParallaxContext } from "./ParallaxProvider";
import type { CardEntry, DepthCardProps } from "./types";

/**
 * Drop-in card component. Renders a `<div>` whose background is drawn by the
 * shared WebGL canvas; the image parallaxes with mouse movement based on the
 * depth map.
 *
 * Must be a descendant of `<ParallaxProvider>`.
 * The container div must have **no opaque background** — any background colour
 * will hide the WebGL layer underneath.
 */
export function DepthCard({
  src,
  depthSrc,
  strength = 1,
  invert = false,
  smoothing = 10,
  depthScale = 1,
  onLoad,
  style,
  ...divProps
}: DepthCardProps) {
  const ctx = useParallaxContext();
  const divRef = useRef<HTMLDivElement>(null);

  // Keep latest prop values accessible inside the RAF loop without re-registering
  const strengthRef  = useRef(strength);
  strengthRef.current = strength;
  const invertRef    = useRef(invert);
  invertRef.current  = invert;
  const smoothingRef = useRef(smoothing);
  smoothingRef.current = smoothing;
  const depthScaleRef = useRef(depthScale);
  depthScaleRef.current = depthScale;
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (!ctx) {
      console.error(
        "[react-depth-parallax] DepthCard must be wrapped in <ParallaxProvider>.",
      );
      return;
    }
    if (!divRef.current) return;

    const el = divRef.current;
    let entry: CardEntry | null = null;
    let destroyed = false;

    Promise.all([ctx.loadTexture(src), ctx.loadTexture(depthSrc)])
      .then(([color, depth]) => {
        if (destroyed) return;
        entry = {
          el,
          colorTex: color.texture,
          depthTex: depth.texture,
          imgW: color.width,
          imgH: color.height,
          mouseX: 0,
          mouseY: 0,
          currentX: 0,
          currentY: 0,
          strengthRef,
          invertRef,
          smoothingRef,
          depthScaleRef,
        };
        ctx.register(entry);
        onLoadRef.current?.();
      })
      .catch((e: unknown) => {
        console.error("[react-depth-parallax] Failed to load textures —", e);
      });

    const onMove = (e: PointerEvent) => {
      if (!entry) return;
      const r    = el.getBoundingClientRect();
      const sign = invertRef.current ? -1 : 1;
      entry.mouseX = sign * ((e.clientX - r.left) / r.width  - 0.5) * 0.1 * strengthRef.current;
      entry.mouseY = sign * -((e.clientY - r.top)  / r.height - 0.5) * 0.1 * strengthRef.current;
    };

    const onOut = () => {
      if (!entry) return;
      entry.mouseX = 0;
      entry.mouseY = 0;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onOut);

    return () => {
      destroyed = true;
      if (entry) ctx.unregister(entry);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onOut);
    };
  }, [ctx, src, depthSrc]);

  return (
    <div
      {...divProps}
      ref={divRef}
      style={{ width: "100%", height: "100%", touchAction: "none", ...style }}
    />
  );
}
