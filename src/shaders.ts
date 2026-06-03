export const VERT = /* glsl */ `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const FRAG = /* glsl */ `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform sampler2D uDepthTexture;
  uniform vec2 uMousePosition;
  uniform vec2 uCardSize;
  uniform vec2 uImageSize;
  uniform float uDepthScale;

  varying vec2 vUv;

  vec2 CoverUV(vec2 u, vec2 s, vec2 i) {
    float rs = s.x / s.y;
    float ri = i.x / i.y;
    vec2 st = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    vec2 o = (rs < ri ? vec2((st.x - s.x) / 2.0, 0.0) : vec2(0.0, (st.y - s.y) / 2.0)) / st;
    return u * s / st + o;
  }

  void main() {
    float inset = 0.03 * uDepthScale;
    vec2 uv = vUv * (1.0 - inset) + inset * 0.5;
    vec4 depth = texture2D(uDepthTexture, uv);
    vec2 mp = uMousePosition * 0.5;
    vec2 coverUv = CoverUV(uv + mp * (depth.r - 0.5) * 0.3 * uDepthScale, uCardSize, uImageSize);
    vec4 color = texture2D(uTexture, coverUv);
    gl_FragColor = vec4(color.rgb, color.a);
  }
`;
