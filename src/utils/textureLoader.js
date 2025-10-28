import * as THREE from "three";

/**
 * Utility class for loading textures with consistent settings
 * Reduces code duplication and provides retry logic for multiple paths
 */
export class TextureLoaderUtil {
  /**
   * Load a texture from one or more paths (tries each in order)
   * @param {string|string[]} paths - Single path or array of paths to try
   * @param {Object} options - Texture configuration options
   * @returns {Promise<THREE.Texture>} Loaded texture
   */
  static async load(paths, options = {}) {
    const {
      wrapS = THREE.RepeatWrapping,
      wrapT = THREE.ClampToEdgeWrapping,
      colorSpace = null,
      minFilter = null,
      magFilter = null,
      generateMipmaps = true
    } = options;
    
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    for (let i = 0; i < pathArray.length; i++) {
      const path = pathArray[i];
      
      try {
        console.log(`Loading texture: ${path}`);
        const texture = await this._loadSingle(path);
        
        // Apply texture settings
        texture.wrapS = wrapS;
        texture.wrapT = wrapT;
        texture.generateMipmaps = generateMipmaps;
        
        if (!generateMipmaps) {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
        }
        
        if (colorSpace) texture.colorSpace = colorSpace;
        if (minFilter) texture.minFilter = minFilter;
        if (magFilter) texture.magFilter = magFilter;
        
        console.log(`✓ Texture loaded: ${path}`);
        return texture;
        
      } catch (error) {
        console.warn(`Failed to load texture from ${path}:`, error);
        
        // If this was the last path, throw error
        if (i === pathArray.length - 1) {
          throw new Error(`All texture paths failed: ${pathArray.join(', ')}`);
        }
        // Otherwise continue to next path
      }
    }
  }
  
  /**
   * Load a single texture (internal helper)
   * @private
   */
  static _loadSingle(path) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        path,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Convenience method for loading overlay textures
   */
  static async loadOverlay(url, withMipmaps = true) {
    return await this.load(url, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      generateMipmaps: withMipmaps,
      colorSpace: THREE.SRGBColorSpace
    });
  }
}

