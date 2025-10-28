/**
 * Timelapse Player for animated overlay sequences
 * Handles playback, speed control, timeline scrubbing, and frame caching
 */

import { CONFIG } from "../config.js";

export class TimelapsePlayer {
  constructor(overlayController) {
    this.controller = overlayController;
    this.isPlaying = false;
    this.currentIndex = 0;
    this.dates = [];
    this.speed = 1.0; // frames per second
    this.loop = true;
    this.lastFrameTime = 0;
    this.frameCache = new Map(); // LRU cache for preloaded frames
    this.cacheSize = CONFIG.TIMELAPSE_CACHE_SIZE;
    
    this.ui = null;
    this.frameInterval = null;
  }

  /**
   * Initialize timelapse for a specific overlay
   */
  setOverlay(overlayId, dates) {
    this.stop();
    this.dates = [...dates].sort();
    this.currentIndex = 0;
    
    if (this.ui) {
      this.updateUI();
    }
    
    // Preload first few frames
    this.preloadFrames(0, Math.min(this.cacheSize, this.dates.length));
  }

  /**
   * Create and mount timelapse UI controls
   */
  createUI(mountElement) {
    const container = document.createElement('div');
    container.className = 'timelapse-controls';
    container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 16px 20px;
      color: white;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      min-width: 500px;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <button id="tl-play" title="Play/Pause (Space)" style="
          background: #4CAF50;
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">▶</button>
        
        <button id="tl-prev" title="Previous frame (←)" style="
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">⏮</button>
        
        <button id="tl-next" title="Next frame (→)" style="
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">⏭</button>
        
        <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
          <input type="range" id="tl-timeline" min="0" max="100" value="0" style="
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: linear-gradient(to right, #4CAF50 0%, rgba(255,255,255,0.2) 0%);
            outline: none;
            -webkit-appearance: none;
          ">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.7);">
            <span id="tl-date">--</span>
            <span id="tl-position">0 / 0</span>
          </div>
        </div>
        
        <select id="tl-speed" title="Playback speed" style="
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
        ">
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1" selected>1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
        
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <input type="checkbox" id="tl-loop" checked style="cursor: pointer;">
          <span style="font-size: 12px;">Loop</span>
        </label>
      </div>
    `;

    mountElement.appendChild(container);
    this.ui = {
      container,
      playBtn: container.querySelector('#tl-play'),
      prevBtn: container.querySelector('#tl-prev'),
      nextBtn: container.querySelector('#tl-next'),
      timeline: container.querySelector('#tl-timeline'),
      dateDisplay: container.querySelector('#tl-date'),
      positionDisplay: container.querySelector('#tl-position'),
      speedSelect: container.querySelector('#tl-speed'),
      loopCheckbox: container.querySelector('#tl-loop')
    };

    this.bindEvents();
    this.updateUI();
  }

  /**
   * Bind UI event handlers
   */
  bindEvents() {
    const { playBtn, prevBtn, nextBtn, timeline, speedSelect, loopCheckbox } = this.ui;

    playBtn.addEventListener('click', () => this.toggle());
    prevBtn.addEventListener('click', () => this.previousFrame());
    nextBtn.addEventListener('click', () => this.nextFrame());
    
    timeline.addEventListener('input', (e) => {
      this.seek(parseInt(e.target.value));
    });
    
    speedSelect.addEventListener('change', (e) => {
      this.setSpeed(parseFloat(e.target.value));
    });
    
    loopCheckbox.addEventListener('change', (e) => {
      this.loop = e.target.checked;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          this.toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.previousFrame();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextFrame();
          break;
        case 'Home':
          e.preventDefault();
          this.seek(0);
          break;
        case 'End':
          e.preventDefault();
          this.seek(this.dates.length - 1);
          break;
      }
    });
  }

  /**
   * Update UI to reflect current state
   */
  updateUI() {
    if (!this.ui) return;

    const { playBtn, timeline, dateDisplay, positionDisplay } = this.ui;
    
    // Play button
    playBtn.textContent = this.isPlaying ? '⏸' : '▶';
    playBtn.style.background = this.isPlaying ? '#FF9800' : '#4CAF50';
    
    // Timeline
    timeline.max = Math.max(0, this.dates.length - 1);
    timeline.value = this.currentIndex;
    const progress = this.dates.length > 1 
      ? (this.currentIndex / (this.dates.length - 1)) * 100 
      : 0;
    timeline.style.background = `linear-gradient(to right, #4CAF50 ${progress}%, rgba(255,255,255,0.2) ${progress}%)`;
    
    // Date and position
    if (this.dates.length > 0) {
      dateDisplay.textContent = this.dates[this.currentIndex];
      positionDisplay.textContent = `${this.currentIndex + 1} / ${this.dates.length}`;
    } else {
      dateDisplay.textContent = '--';
      positionDisplay.textContent = '0 / 0';
    }
  }

  /**
   * Play/pause toggle
   */
  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Start playback
   */
  play() {
    if (this.dates.length === 0) return;
    
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.updateUI();
    
    this.frameInterval = setInterval(() => {
      this.nextFrame();
      
      // Stop if we hit the end and not looping
      if (!this.loop && this.currentIndex === this.dates.length - 1) {
        this.pause();
      }
    }, 1000 / this.speed);
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    this.updateUI();
  }

  /**
   * Stop playback and reset to start
   */
  stop() {
    this.pause();
    this.seek(0);
  }

  /**
   * Go to next frame
   */
  nextFrame() {
    if (this.dates.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.dates.length;
    this.loadFrame(this.currentIndex);
    this.preloadFrames(this.currentIndex + 1, this.currentIndex + this.cacheSize);
    this.updateUI();
  }

  /**
   * Go to previous frame
   */
  previousFrame() {
    if (this.dates.length === 0) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.dates.length) % this.dates.length;
    this.loadFrame(this.currentIndex);
    this.preloadFrames(Math.max(0, this.currentIndex - 2), this.currentIndex);
    this.updateUI();
  }

  /**
   * Seek to specific frame index
   */
  seek(index) {
    if (this.dates.length === 0) return;
    
    this.currentIndex = Math.max(0, Math.min(index, this.dates.length - 1));
    this.loadFrame(this.currentIndex);
    this.preloadFrames(this.currentIndex, this.currentIndex + this.cacheSize);
    this.updateUI();
  }

  /**
   * Set playback speed (fps)
   */
  setSpeed(fps) {
    this.speed = fps;
    if (this.isPlaying) {
      this.pause();
      this.play(); // Restart with new speed
    }
  }

  /**
   * Load frame at index
   */
  async loadFrame(index) {
    if (index < 0 || index >= this.dates.length) return;
    
    const date = this.dates[index];
    const overlayId = this.controller.currentOverlay?.id;
    if (!overlayId) return;
    
    await this.controller.loadOverlay(overlayId, date);
  }

  /**
   * Preload frames for smooth playback
   */
  preloadFrames(startIdx, endIdx) {
    // Simple cache strategy - could be improved with background worker
    // For now, just ensure next few frames are ready in controller
    // Real implementation would pre-fetch textures
  }

  /**
   * Show/hide timelapse controls
   */
  setVisible(visible) {
    if (this.ui) {
      this.ui.container.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.pause();
    if (this.ui) {
      this.ui.container.remove();
      this.ui = null;
    }
    this.frameCache.clear();
  }
}


