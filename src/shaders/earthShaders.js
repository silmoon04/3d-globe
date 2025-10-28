/**
 * GLSL Shaders for Earth Rendering
 * Separated for better organization and reusability
 */

// ===== EARTH SHADERS =====

/**
 * Earth Vertex Shader
 * Handles topographic vertex displacement
 */
export const EARTH_VERTEX_SHADER = /* glsl */`
  uniform sampler2D topographyTexture;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vElevation;

  void main() {
    vUv = uv;
    
    // Sample topography for vertex displacement
    float elevation = texture2D(topographyTexture, uv).r;
    vElevation = elevation;
    
    // Displace vertices based on elevation
    vec3 displacedPosition = position + normal * elevation * 0.1;
    
    vec4 modelPosition = modelMatrix * vec4(displacedPosition, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    vec3 modelNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    vNormal = modelNormal;
    vPosition = modelPosition.xyz;
  }
`;

/**
 * Earth Fragment Shader
 * Handles day/night transition, city lights, and terrain effects
 */
export const EARTH_FRAGMENT_SHADER = /* glsl */`
  // ===== UNIFORMS =====
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D topographyTexture;
  uniform float time;

  // ===== VARYINGS =====
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vElevation;

  // ===== HELPER FUNCTIONS =====
  
  // Calculate day/night transition based on sun position
  float calculateDayNightTransition(vec3 normal) {
    vec3 sunDirection = normalize(vec3(-1.0, 0.0, 0.0)); // Fixed sun position
    float sunAngle = dot(sunDirection, normal);
    return (sunAngle + 1.0) * 0.5; // Convert [-1,1] to [0,1]
  }
  
  // Create blurred terminator line
  float createTerminatorLine(vec3 normal) {
    vec3 sunDirection = normalize(vec3(-1.0, 0.0, 0.0));
    float sunAngle = dot(sunDirection, normal);
    float terminatorDistance = abs(sunAngle);
    return 1.0 - smoothstep(0.0, 0.3, terminatorDistance);
  }
  
  // Apply elevation-based lighting and shadows
  vec3 applyElevationEffects(vec3 color, vec3 normal, float elevation) {
    // Simple lighting direction
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.5));
    float lightIntensity = max(0.0, dot(normal, lightDir));
    
    // Add subtle elevation color variation
    color += vec3(elevation * 0.1);
    
    // Apply elevation-based shadows
    float shadowFactor = 1.0 - (elevation * 0.2 * (1.0 - lightIntensity));
    return color * shadowFactor;
  }

  // ===== MAIN FUNCTION =====
  void main() {
    vec3 normal = normalize(vNormal);
    
    // 1. Calculate day/night transition
    float dayMix = calculateDayNightTransition(normal);
    
    // 2. Sample textures
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightLights = texture2D(nightTexture, vUv).rgb;
    float elevation = texture2D(topographyTexture, vUv).r;
    
    // 3. Create base color (day or night)
    vec3 color;
    if (dayMix > 0.5) {
      // Day side
      color = dayColor;
    } else {
      // Night side - black with city lights
      color = vec3(0.0);
      color += nightLights * 2.0;
    }
    
    // 4. Add terminator line
    float terminatorBlur = createTerminatorLine(normal);
    color = mix(color, vec3(0.0), terminatorBlur);
    
    // 5. Apply elevation effects
    color = applyElevationEffects(color, normal, elevation);
    
    // 6. Output final color
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ===== CLOUD SHADERS =====

/**
 * Cloud Vertex Shader
 * Simple pass-through for cloud layer
 */
export const CLOUD_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
    vec3 modelNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    vNormal = modelNormal;
  }
`;

/**
 * Cloud Fragment Shader
 * Handles cloud transparency and day/night visibility
 */
export const CLOUD_FRAGMENT_SHADER = /* glsl */`
  // ===== UNIFORMS =====
  uniform sampler2D cloudsTexture;
  uniform float time;

  // ===== VARYINGS =====
  varying vec2 vUv;
  varying vec3 vNormal;

  // ===== HELPER FUNCTIONS =====
  
  // Calculate day/night transition for cloud visibility
  float calculateDayNightTransition(vec3 normal) {
    vec3 sunDirection = normalize(vec3(-1.0, 0.0, 0.0));
    float sunAngle = dot(sunDirection, normal);
    return (sunAngle + 1.0) * 0.5; // Convert [-1,1] to [0,1]
  }
  
  // Calculate cloud opacity based on texture and day/night
  float calculateCloudOpacity(vec3 cloudColor, float dayMix) {
    float baseOpacity = cloudColor.r * 0.6;
    
    // More visible during day
    if (dayMix > 0.5) {
      baseOpacity *= 1.2;
    }
    
    return baseOpacity;
  }

  // ===== MAIN FUNCTION =====
  void main() {
    vec3 normal = normalize(vNormal);
    
    // 1. Calculate day/night transition
    float dayMix = calculateDayNightTransition(normal);
    
    // 2. Sample cloud texture
    vec3 cloudColor = texture2D(cloudsTexture, vUv).rgb;
    
    // 3. Calculate opacity
    float opacity = calculateCloudOpacity(cloudColor, dayMix);
    
    // 4. Skip rendering if too transparent
    if (opacity < 0.1) {
      discard;
    }
    
    // 5. Output cloud color (white with slight blue tint)
    gl_FragColor = vec4(0.9, 0.9, 1.0, opacity);
  }
`;

// ===== ATMOSPHERE SHADERS =====

/**
 * Atmosphere Vertex Shader
 * Pass-through for atmosphere glow effect
 */
export const ATMOSPHERE_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;
    vec3 modelNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    vNormal = modelNormal;
    vPosition = modelPosition.xyz;
  }
`;

/**
 * Atmosphere Fragment Shader
 * Creates Fresnel-based edge glow effect
 */
export const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */`
  // ===== UNIFORMS =====
  uniform float time;

  // ===== VARYINGS =====
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // ===== HELPER FUNCTIONS =====
  
  // Calculate Fresnel effect for edge glow
  float calculateFresnel(vec3 normal, vec3 viewDirection) {
    float fresnel = 1.0 - abs(dot(normal, viewDirection));
    return pow(fresnel, 2.0); // Moderate falloff
  }
  
  // Create atmosphere color with edge effect
  vec3 createAtmosphereColor(float fresnel) {
    // Base atmosphere color (blue)
    vec3 baseColor = vec3(0.15, 0.3, 0.6);
    
    // Edge glow effect
    float edgeEffect = fresnel * 0.8;
    vec3 edgeColor = vec3(0.2, 0.4, 0.8) * edgeEffect;
    
    return baseColor + edgeColor;
  }
  
  // Add subtle breathing animation
  float addBreathingAnimation(vec3 color, float time) {
    float pulse = sin(time * 0.2) * 0.1 + 0.9;
    return pulse;
  }

  // ===== MAIN FUNCTION =====
  void main() {
    vec3 normal = normalize(vNormal);
    
    // 1. Calculate view direction and Fresnel effect
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    float fresnel = calculateFresnel(normal, viewDirection);
    
    // 2. Create atmosphere color
    vec3 atmosphereColor = createAtmosphereColor(fresnel);
    
    // 3. Add breathing animation
    float animationFactor = addBreathingAnimation(atmosphereColor, time);
    atmosphereColor *= animationFactor;
    
    // 4. Calculate final intensity
    float finalIntensity = 0.4 + fresnel * 0.3;
    
    // 5. Output atmosphere color
    gl_FragColor = vec4(atmosphereColor, finalIntensity * 0.5);
  }
`;

