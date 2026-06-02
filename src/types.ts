import type React from "react";

export interface CardEntry {
  el: HTMLDivElement;
  colorTex: WebGLTexture;
  depthTex: WebGLTexture;
  imgW: number;
  imgH: number;
  mouseX: number;
  mouseY: number;
  currentX: number;
  currentY: number;
  strengthRef: React.MutableRefObject<number>;
  invertRef: React.MutableRefObject<boolean>;
  smoothingRef: React.MutableRefObject<number>;
  depthScaleRef: React.MutableRefObject<number>;
}

export interface TextureResult {
  texture: WebGLTexture;
  width: number;
  height: number;
}

export interface ParallaxCtx {
  register: (entry: CardEntry) => void;
  unregister: (entry: CardEntry) => void;
  loadTexture: (url: string) => Promise<TextureResult>;
}

export interface ParallaxProviderProps {
  children: React.ReactNode;
  /**
   * Called if WebGL is unavailable or shaders fail to compile.
   * Render a fallback UI inside this callback.
   */
  onError?: (error: Error) => void;
}

export interface DepthCardProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "width" | "height"> {
  /** URL of the source image. */
  src: string;
  /**
   * URL of the depth map.
   * Brighter pixels produce stronger parallax displacement.
   */
  depthSrc: string;
  /** Overall parallax intensity. @default 1 */
  strength?: number;
  /** Invert the parallax tilt direction. @default false */
  invert?: boolean;
  /**
   * Controls interpolation speed.
   * Higher values feel more responsive; lower values feel smoother.
   * @default 10
   */
  smoothing?: number;
  /**
   * Controls depth displacement strength.
   * Also scales the edge inset used to prevent texture bleeding.
   * @default 1
   */
  depthScale?: number;
  /**
   * Called after both textures have loaded and the effect has been registered.
   */
  onLoad?: () => void;
}
