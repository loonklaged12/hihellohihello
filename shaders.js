const PanoShader = {
  uniforms: {
    uTime:    { value: 0 },
    uTexture: { value: null },
    uGlitch:  { value: 0.02 },
    uRGB:     { value: 0.004 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uGlitch;
    uniform float uRGB;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      float jitter = (rand(vec2(floor(uv.y * 90.0), floor(uTime * 12.0))) - 0.5) * uGlitch;
      uv.x += jitter;

      float stretch = uGlitch * 2.5;
      float scanY = floor(uv.y * 800.0) / 800.0;
      float lineNoise = rand(vec2(scanY, uTime * 20.0));
      uv.y += (lineNoise - 0.5) * stretch * 0.03;

      float r = texture2D(uTexture, uv + vec2(uRGB, 0.0)).r;
      float g = texture2D(uTexture, uv).g;
      float b = texture2D(uTexture, uv - vec2(uRGB, 0.0)).b;
      vec3 color = vec3(r, g, b);

      float scan = sin(uv.y * 500.0 + uTime * 2.5) * 0.03;
      color -= scan;

      vec3 violetVeil = vec3(0.28, 0.06, 0.55);
      float d = distance(vUv, vec2(0.5));
      color = mix(color, violetVeil, d * 0.55);

      color *= 0.9 + uGlitch * 3.0;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};