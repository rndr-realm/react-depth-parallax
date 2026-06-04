# react-depth-parallax

A WebGL-powered depth-map parallax effect for React.  
One shared GPU context, one RAF loop — no matter how many cards are on screen.

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/rndr-realm/react-depth-parallax/main/media/demo.gif" width="250" /></td>
    <td><img src="https://raw.githubusercontent.com/rndr-realm/react-depth-parallax/main/media/gojo.gif" width="250" /></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/rndr-realm/react-depth-parallax/main/media/sampha.gif" width="250" /></td>
    <td><img src="https://raw.githubusercontent.com/rndr-realm/react-depth-parallax/main/media/weeknd.gif" width="250" /></td>
  </tr>
</table>

---

> **AI agents:** Read [`AGENTS.md`](AGENTS.md) before integrating this library. It contains hard rules, anti-patterns, and copy-paste examples designed to prevent common mistakes.

---

## Installation

```bash
npm install react-depth-parallax
# or
pnpm add react-depth-parallax
# or
yarn add react-depth-parallax
```

---

## How it works

You provide two images: a **color image** and a [**depth map**](#making-depth-maps) (grayscale, brighter = closer to the camera).  
The shader displaces each pixel laterally based on its depth value as the mouse moves across the card.  
All cards share a single hidden `<canvas>` and a single WebGL program, keeping GPU overhead minimal.

---

## Quick start

> You'll need two images: a regular photo and a [depth map](#making-depth-maps) of it.

```tsx
import { ParallaxProvider, DepthCard } from "react-depth-parallax";

export default function App() {
  return (
    <ParallaxProvider>
      <div style={{ width: 400, height: 500 }}>
        <DepthCard
          src="/images/photo.jpg"
          depthSrc="/images/photo-depth.png"
        />
      </div>
    </ParallaxProvider>
  );
}
```

> **CRITICAL: no background colour on the container.** The WebGL effect renders *behind* the div via a fixed canvas. Any `background`, `backgroundColor`, or Tailwind `bg-*` class will completely hide the parallax effect.

**WRONG** — effect is invisible:

```tsx
<div className="bg-black" style={{ width: 400, height: 500 }}>
  <DepthCard src="/photo.jpg" depthSrc="/photo-depth.png" />
</div>
```

**CORRECT** — no background:

```tsx
<div style={{ width: 400, height: 500 }}>
  <DepthCard src="/photo.jpg" depthSrc="/photo-depth.png" />
</div>
```

---

## Framework setup

### Next.js (App Router)

> You'll need two images: a regular photo and a [depth map](#making-depth-maps) of it.

The package ships with `"use client"` already in its bundle, so you can import directly from Server Components without a wrapper:

```tsx
// app/page.tsx  ← a Server Component is fine
import { ParallaxProvider, DepthCard } from "react-depth-parallax";

export default function Page() {
  return (
    <ParallaxProvider>
      <section style={{ width: 480, height: 600 }}>
        <DepthCard src="/hero.jpg" depthSrc="/hero-depth.png" strength={1.4} />
      </section>
    </ParallaxProvider>
  );
}
```

If you see a Next.js error about a missing `"use client"` boundary, wrap the import in your own client component:

```tsx
// components/DepthScene.tsx
"use client";
export { ParallaxProvider, DepthCard } from "react-depth-parallax";
```

For the `<canvas>` to render correctly behind page content, make sure your root layout does not set `overflow: hidden` on `<body>` or `<html>`.

#### Images in `/public`

Place your images inside `/public` and reference them with an absolute path:

```
/public/images/hero.jpg
/public/images/hero-depth.png
```

```tsx
<DepthCard src="/images/hero.jpg" depthSrc="/images/hero-depth.png" />
```

If you serve images from an external domain (e.g. a CDN), add the domain to `next.config.js`:

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [{ hostname: "cdn.example.com" }],
  },
};
```

And make sure the server returns the `Access-Control-Allow-Origin: *` header so WebGL can load the texture cross-origin.

---

### Vite (React)

No special configuration needed. Place images in `/public` and reference them from the root:

```tsx
// src/App.tsx
import { ParallaxProvider, DepthCard } from "react-depth-parallax";

function App() {
  return (
    <ParallaxProvider>
      <div style={{ width: 400, height: 500 }}>
        <DepthCard src="/photo.jpg" depthSrc="/photo-depth.png" />
      </div>
    </ParallaxProvider>
  );
}
```

---

### Create React App

Same as Vite — no config needed. Images go in `public/` and are referenced from `/`:

```tsx
<DepthCard src="/photo.jpg" depthSrc="/photo-depth.png" />
```

---

## API

### `<ParallaxProvider>`

Mount **once** — at the app root or around the section that uses `DepthCard`.

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Your app tree. |
| `onError` | `(error: Error) => void` | Called if WebGL is unavailable or shaders fail to compile. Use to render a fallback. |

```tsx
<ParallaxProvider
  onError={(err) => console.warn("WebGL unavailable:", err.message)}
>
  {children}
</ParallaxProvider>
```

---

### `<DepthCard>`

Renders a `<div>` whose visual content is drawn by the shared WebGL canvas underneath.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | **required** | URL of the colour image. |
| `depthSrc` | `string` | **required** | URL of the depth map (grayscale). |
| `strength` | `number` | `1` | Overall parallax intensity multiplier. |
| `invert` | `boolean` | `false` | Invert the parallax tilt direction. |
| `smoothing` | `number` | `10` | Interpolation speed. Higher = snappier, lower = floatier. |
| `depthScale` | `number` | `1` | Scales depth displacement and the edge inset that prevents texture bleeding. |
| `onLoad` | `() => void` | `undefined` | Fires after both textures are uploaded to the GPU. |

All standard `<div>` props (`className`, `style`, `onClick`, etc.) are forwarded.

```tsx
<DepthCard
  src="/portrait.jpg"
  depthSrc="/portrait-depth.png"
  strength={1.5}
  smoothing={6}
  depthScale={0.8}
  onLoad={() => console.log("ready")}
  className="rounded-2xl overflow-hidden"
  style={{ width: 360, height: 480 }}
/>
```

---

## Making depth maps

You need an image where **white = close** and **black = far**.

> **The shader reads only the red channel (`depth.r`) of the depth map.** A standard greyscale PNG works perfectly since R = G = B. If you use a custom depth image, make sure the depth data is in the red channel.

[DepthPro Grayscale (Hugging Face)](https://huggingface.co/spaces/cubuvl/DepthPro-transformers-Grayscale) — drag-and-drop, outputs a greyscale depth map ready to use directly.

Depth maps don't need to be high resolution — 512×512 or 1024×1024 is usually plenty.

---

## Multiple cards

`ParallaxProvider` handles any number of `DepthCard` children automatically.  
All cards share one WebGL context and one animation frame.

```tsx
<ParallaxProvider>
  <div style={{ display: "flex", gap: 24 }}>
    {cards.map((c) => (
      <div key={c.id} style={{ width: 300, height: 400 }}>
        <DepthCard src={c.image} depthSrc={c.depth} />
      </div>
    ))}
  </div>
</ParallaxProvider>
```

---

## Handling WebGL fallback

On browsers without WebGL support (rare, but possible in some locked-down corporate environments), `onError` fires and the canvas is never shown. Add a fallback:

```tsx
const [webGLFailed, setWebGLFailed] = useState(false);

<ParallaxProvider onError={() => setWebGLFailed(true)}>
  {webGLFailed ? (
    <img src="/photo.jpg" alt="hero" />
  ) : (
    <div style={{ width: 400, height: 500 }}>
      <DepthCard src="/photo.jpg" depthSrc="/photo-depth.png" />
    </div>
  )}
</ParallaxProvider>
```

---

## TypeScript

Full types are included. Key exports:

```ts
import type {
  ParallaxProviderProps,
  DepthCardProps,
} from "react-depth-parallax";
```

---

## Browser support

Requires **WebGL 1** (not WebGL 2). Supported in all modern browsers:

| Browser | Support |
|---------|---------|
| Chrome / Edge | ✅ |
| Firefox | ✅ |
| Safari 15+ | ✅ |
| iOS Safari 15+ | ✅ |
| Android Chrome | ✅ |

Older browsers without WebGL will silently skip the effect (nothing renders). Use `onError` to provide a fallback image.

---

## Performance notes

- A single `<canvas>` element and one WebGL program are shared across all cards.
- The RAF loop pauses automatically when all `DepthCard` components unmount.
- Off-screen cards (outside the viewport) are skipped every frame.
- Textures for the same URL are cached — using the same image in two cards uploads it to the GPU only once.
- DPR-aware rendering — looks sharp on Retina/HiDPI displays.

---

## License

MIT
