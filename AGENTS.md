# react-depth-parallax

> WebGL-powered depth-map parallax effect for React. One shared GPU context, one RAF loop — no matter how many cards are on screen.

## Minimal working example

> You'll need two images: a regular photo and a depth map of it.

```tsx
import { ParallaxProvider, DepthCard } from "react-depth-parallax";

export default function Page() {
  return (
    <ParallaxProvider>
      {/* Wrapper must have explicit dimensions and NO background colour */}
      <div style={{ width: 400, height: 500 }}>
        <DepthCard
          src="/image.jpg"
          depthSrc="/image-depth.png"
          strength={1}
          smoothing={10}
          depthScale={1}
        />
      </div>
    </ParallaxProvider>
  );
}
```

## Hard rules — never violate these

- `<ParallaxProvider>` must wrap all `<DepthCard>` components. One provider covers any number of cards.
- The container `<div>` around `<DepthCard>` must have **no background colour** (`background`, `bg-*`, `backgroundColor`). Any opaque background hides the WebGL layer.
- The container must have **explicit width and height**. `width: 100%` with no parent height will render nothing.
- Both `src` and `depthSrc` are **required**. There is no default image.
- The shader reads **only the red channel** (`depth.r`) of the depth map. A standard greyscale PNG works. Do not pass an RGB image expecting all channels to contribute.
- This is a client-only library (WebGL). In Next.js App Router the `"use client"` directive is already bundled — no wrapper needed.
- Do **not** set `overflow: hidden` on `<body>` or `<html>` — it clips the fixed canvas.
- `touchAction: "none"` is set automatically on the card div. Do not override it or pointer events will break on mobile.

## Props at a glance

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | required | Color image URL |
| `depthSrc` | `string` | required | Depth map URL (red channel used) |
| `strength` | `number` | `1` | Parallax intensity |
| `invert` | `boolean` | `false` | Flip tilt direction |
| `smoothing` | `number` | `10` | Higher = snappier |
| `depthScale` | `number` | `1` | Displacement + edge inset scale |
| `onLoad` | `() => void` | `undefined` | Fires when textures are on GPU |

All standard `<div>` props (`className`, `style`, `onClick`, etc.) are forwarded to the container.

## Error handling pattern

```tsx
const [failed, setFailed] = useState(false);

<ParallaxProvider onError={() => setFailed(true)}>
  {failed ? (
    <img src="/image.jpg" alt="fallback" />
  ) : (
    <div style={{ width: 400, height: 500 }}>
      <DepthCard src="/image.jpg" depthSrc="/image-depth.png" />
    </div>
  )}
</ParallaxProvider>
```

## Depth maps

You need an image where **white = close** and **black = far**. The shader reads only the red channel (`depth.r`) of the depth map. A standard greyscale PNG works since R = G = B. Depth maps don't need to be high resolution — 512x512 or 1024x1024 is usually plenty.

Generate one at: https://huggingface.co/spaces/cubuvl/DepthPro-transformers-Grayscale

## ParallaxProvider props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Your app tree |
| `onError` | `(error: Error) => void` | Called if WebGL is unavailable or shaders fail to compile. Use to render a fallback. |

## TypeScript

Full types are included:

```ts
import type {
  ParallaxProviderProps,
  DepthCardProps,
} from "react-depth-parallax";
```
