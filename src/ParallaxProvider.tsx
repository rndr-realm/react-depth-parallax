import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { compileShader, createTextureFromImage } from "./gl";
import { FRAG, VERT } from "./shaders";
import type { CardEntry, ParallaxCtx, ParallaxProviderProps, TextureResult } from "./types";

export const ParallaxContext = createContext<ParallaxCtx | null>(null);

export function useParallaxContext(): ParallaxCtx | null {
  return useContext(ParallaxContext);
}

/**
 * Mount once at the app root (or around the section that uses depth cards).
 * Manages a single shared WebGL canvas — one GL context, one RAF loop,
 * regardless of how many `DepthCard` components are on screen.
 *
 * The shared canvas sits at `z-index: -1`. Any container passed to `DepthCard`
 * must have a transparent background, otherwise the effect will be hidden.
 */
export function ParallaxProvider({ children, onError }: ParallaxProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<ParallaxCtx | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      onErrorRef.current?.(new Error("WebGL is not supported in this browser."));
      return;
    }

    let program: WebGLProgram | null = null;
    let buf: WebGLBuffer | null = null;

    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "program link error");
      }
      gl.useProgram(program);

      const quad = new Float32Array([
        -1, -1, 1, -1, -1, 1,
         1, -1, 1,  1, -1, 1,
      ]);
      buf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTexture   = gl.getUniformLocation(program, "uTexture");
      const uDepth     = gl.getUniformLocation(program, "uDepthTexture");
      const uMouse     = gl.getUniformLocation(program, "uMousePosition");
      const uCard      = gl.getUniformLocation(program, "uCardSize");
      const uImage     = gl.getUniformLocation(program, "uImageSize");
      const uDepthScale = gl.getUniformLocation(program, "uDepthScale");

      gl.uniform1i(uTexture, 0);
      gl.uniform1i(uDepth, 1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const onResize = () => {
        const dpr = window.devicePixelRatio;
        canvas.width  = window.innerWidth  * dpr;
        canvas.height = window.innerHeight * dpr;
      };
      onResize();
      window.addEventListener("resize", onResize);

      // Same URL → same texture promise (never uploads twice)
      const cache = new Map<string, Promise<TextureResult>>();

      const loadTexture = (url: string): Promise<TextureResult> => {
        if (cache.has(url)) return cache.get(url)!;
        const p = new Promise<TextureResult>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              resolve({
                texture: createTextureFromImage(gl, img),
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            } catch (e) {
              reject(e);
            }
          };
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });
        cache.set(url, p);
        return p;
      };

      const cards = new Set<CardEntry>();
      let rafId = 0;
      let running = false;
      let last = performance.now();

      const render = () => {
        if (!running) return;
        rafId = requestAnimationFrame(render);
        const now   = performance.now();
        const delta = Math.min((now - last) / 1000, 0.1);
        last = now;

        const dpr = window.devicePixelRatio;
        const vw  = window.innerWidth;
        const vh  = window.innerHeight;

        gl.disable(gl.SCISSOR_TEST);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.SCISSOR_TEST);

        cards.forEach((card) => {
          const rect = card.el.getBoundingClientRect();
          if (
            rect.width === 0 ||
            rect.height === 0 ||
            rect.right <= 0 ||
            rect.bottom <= 0 ||
            rect.left >= vw ||
            rect.top >= vh
          ) return;

          const t = 1 - Math.exp(-card.smoothingRef.current * delta);
          card.currentX += (card.mouseX - card.currentX) * t;
          card.currentY += (card.mouseY - card.currentY) * t;

          const x = Math.round(rect.left * dpr);
          const y = Math.round((vh - rect.top - rect.height) * dpr);
          const w = Math.round(rect.width * dpr);
          const h = Math.round(rect.height * dpr);

          gl.viewport(x, y, w, h);
          gl.scissor(x, y, w, h);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, card.colorTex);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, card.depthTex);

          gl.uniform2f(uMouse, card.currentX, card.currentY);
          gl.uniform2f(uCard, rect.width, rect.height);
          gl.uniform2f(uImage, card.imgW, card.imgH);
          gl.uniform1f(uDepthScale, card.depthScaleRef.current);

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
      };

      const startLoop = () => {
        if (running) return;
        running = true;
        last = performance.now();
        render();
      };

      const stopLoop = () => {
        running = false;
        cancelAnimationFrame(rafId);
        rafId = 0;
      };

      setCtx({
        register: (entry) => {
          cards.add(entry);
          startLoop();
        },
        unregister: (entry) => {
          cards.delete(entry);
          if (cards.size === 0) stopLoop();
        },
        loadTexture,
      });

      return () => {
        stopLoop();
        window.removeEventListener("resize", onResize);
        cache.forEach((p) => p.then(({ texture }) => gl.deleteTexture(texture)));
        if (program) gl.deleteProgram(program);
        if (buf) gl.deleteBuffer(buf);
      };
    } catch (e) {
      if (program) gl.deleteProgram(program);
      onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  return (
    <ParallaxContext.Provider value={ctx}>
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
    </ParallaxContext.Provider>
  );
}
