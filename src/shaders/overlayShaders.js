/**
 * GLSL Shaders for Overlay System
 * Handles blending of NASA satellite data overlays with Earth surface
 * 
 * @module overlayShaders
 */

/**
 * Overlay Vertex Shader
 * Applies topographic displacement and passes data to fragment shader
 */
export const OVERLAY_VERTEX_SHADER = /* glsl */`
  uniform sampler2D topographyTexture;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;

  void main() {
    vUv = uv;
    
    // Sample elevation for vertex displacement
    float elev = texture2D(topographyTexture, uv).r;
    vec3 displaced = position + normal * elev * 0.1;
    
    // Calculate world position
    vec4 wp = modelMatrix * vec4(displaced, 1.0);
    vPos = wp.xyz;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * Overlay Fragment Shader
 * Blends Earth textures with overlay data
 * Supports day/night cycle, terminator line, and lens reveal effect
 */
export const OVERLAY_FRAGMENT_SHADER = /* glsl */`
  // ===== UNIFORMS =====
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D overlayTex;
  uniform sampler2D topographyTexture;
  uniform vec3 sunDir;
  uniform float overlayMix;
  uniform vec2 lensCenter;
  uniform float lensRadius;
  uniform float lensEnabled;
  uniform float time;

  // ===== VARYINGS =====
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;

  // ===== HELPER FUNCTIONS =====

  /**
   * Calculate smooth day/night transition based on sun direction
   * @param N Surface normal
   * @param L Light (sun) direction
   * @return Transition value [0=night, 1=day]
   */
  float terminator(vec3 N, vec3 L) {
    float d = dot(normalize(N), normalize(L));
    return smoothstep(-0.2, 0.2, d);
  }

  // ===== MAIN FUNCTION =====
  void main() {
    vec3 N = normalize(vNormal);
    
    // 1. Calculate day/night transition
    float dayT = terminator(N, sunDir);
    
    // 2. Sample base textures
    vec3 dayCol = texture2D(dayTexture, vUv).rgb;
    vec3 nightCol = texture2D(nightTexture, vUv).rgb * 2.0;
    vec3 base = mix(nightCol, dayCol, dayT);
    
    // 3. Sample overlay texture
    vec4 o = texture2D(overlayTex, vUv);
    
    // 4. Calculate lens reveal effect
    float d = distance(vUv, lensCenter);
    float inside = 1.0 - smoothstep(lensRadius * 0.95, lensRadius, d);
    float lensFactor = mix(1.0, inside, lensEnabled);
    
    // 5. Blend overlay with base Earth
    vec3 blended = mix(base, o.rgb, o.a * overlayMix * lensFactor);
    
    gl_FragColor = vec4(blended, 1.0);
  }
`;

