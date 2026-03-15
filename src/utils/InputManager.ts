/**
 * Advanced Input Manager for Virtual Browser
 * Handles touch, mouse, and gesture events with low latency
 */

import { Socket } from 'socket.io-client';

interface TouchState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isScrolling: boolean;
  scrollThreshold: number;
  gestureStartTime: number;
  lastTapTime: number;
  tapCount: number;
}

interface MouseState {
  isDown: boolean;
  lastX: number;
  lastY: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface PinchState {
  initialDistance: number;
  center: { x: number; y: number };
}

class InputManager {
  private socket: Socket;
  private roomId: string;
  private canControl: boolean;
  private lastEmitTime: number;
  private touchState: TouchState;
  private mouseState: MouseState;
  private viewport: Viewport;
  private containerRect: DOMRect | null;
  private lastContainerUpdate: number;
  private pinchState: PinchState | null = null;

  constructor(socket: Socket, roomId: string, canControl: boolean) {
    this.socket = socket;
    this.roomId = roomId;
    this.canControl = canControl;
    this.lastEmitTime = 0;
    this.touchState = {
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      isScrolling: false,
      scrollThreshold: 10,
      gestureStartTime: 0,
      lastTapTime: 0,
      tapCount: 0
    };
    this.mouseState = {
      isDown: false,
      lastX: 0,
      lastY: 0
    };

    // Performance optimization: cache viewport and container rect
    this.viewport = { width: 1920, height: 1080 };
    this.containerRect = null;
    this.lastContainerUpdate = 0;
  }

  /**
   * Update viewport dimensions
   */
  updateViewport(width: number, height: number) {
    this.viewport = { width, height };
  }

  /**
   * Update container rectangle (cached for performance)
   */
  updateContainerRect(rect: DOMRect) {
    this.containerRect = rect;
    this.lastContainerUpdate = Date.now();
  }

  /**
   * Get normalized coordinates with aspect ratio correction
   */
  getCoordinates(clientX: number, clientY: number, videoElement: HTMLVideoElement) {
    // Get the container rect (the touch target)
    const rect = videoElement.getBoundingClientRect();

    // Raw coordinates relative to container
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    // For object-contain, we need to account for letterboxing/pillarboxing
    const containerRatio = rect.width / rect.height;
    const browserRatio = this.viewport.width / this.viewport.height;

    let renderWidth = rect.width;
    let renderHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (containerRatio > browserRatio) {
      // Container is wider -> Pillarboxing (black bars on L/R)
      renderWidth = rect.height * browserRatio;
      offsetX = (rect.width - renderWidth) / 2;
    } else {
      // Container is taller -> Letterboxing (black bars on T/B)
      renderHeight = rect.width / browserRatio;
      offsetY = (rect.height - renderHeight) / 2;
    }

    // Only map coordinates within the actual video area
    const x = Math.max(0, Math.min(1, (rawX - offsetX) / renderWidth));
    const y = Math.max(0, Math.min(1, (rawY - offsetY) / renderHeight));

    return { x, y };
  }

  /**
   * Handle touch start events
   */
  handleTouchStart(event: TouchEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    // Touch scrolling should be blocked via CSS (touch-action: none) on the container.

    const touch = event.touches[0];
    if (!touch) return;

    const coords = this.getCoordinates(touch.clientX, touch.clientY, videoElement);

    // Update touch state
    this.touchState.startX = coords.x * this.viewport.width;
    this.touchState.startY = coords.y * this.viewport.height;
    this.touchState.lastX = this.touchState.startX;
    this.touchState.lastY = this.touchState.startY;
    this.touchState.isScrolling = false;
    this.touchState.gestureStartTime = Date.now();

    // Handle multi-touch gestures
    if (event.touches.length === 2) {
      this.handlePinchStart(event, videoElement);
      return;
    }

    // Single touch - send mousedown
    this.sendInput('mousedown', coords.x, coords.y, 'touch');
  }

  /**
   * Handle touch move events with gesture detection
   */
  handleTouchMove(event: TouchEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    // Touch scrolling should be blocked via CSS (touch-action: none) on the container.

    const touch = event.touches[0];
    if (!touch) return;

    const coords = this.getCoordinates(touch.clientX, touch.clientY, videoElement);
    const currentX = coords.x * this.viewport.width;
    const currentY = coords.y * this.viewport.height;

    // Handle multi-touch gestures
    if (event.touches.length === 2) {
      this.handlePinchMove(event, videoElement);
      return;
    }

    // Single touch - detect scrolling vs dragging
    const dx = Math.abs(currentX - this.touchState.startX);
    const dy = Math.abs(currentY - this.touchState.startY);

    if (!this.touchState.isScrolling && (dx > this.touchState.scrollThreshold || dy > this.touchState.scrollThreshold)) {
      this.touchState.isScrolling = true;
    }

    if (this.touchState.isScrolling) {
      // Send scroll events for scrolling gestures
      // Negate deltas because finger move UP (negative delta) should scroll DOWN (positive wheel delta)
      const deltaX = this.touchState.lastX - currentX;
      const deltaY = this.touchState.lastY - currentY;
      this.sendInput('wheel', coords.x, coords.y, 'touch', { deltaX: deltaX * 1.5, deltaY: deltaY * 1.5 });
    } else {
      // Send mousemove for dragging
      this.sendInput('mousemove', coords.x, coords.y, 'touch');
    }

    this.touchState.lastX = currentX;
    this.touchState.lastY = currentY;
  }

  /**
   * Handle touch end events
   */
  handleTouchEnd(event: TouchEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    // Touch scrolling should be blocked via CSS (touch-action: none) on the container.

    // Handle multi-touch end
    if (event.changedTouches.length === 2) {
      this.handlePinchEnd(event, videoElement);
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) return;

    const coords = this.getCoordinates(touch.clientX, touch.clientY, videoElement);

    // Detect tap gestures
    const now = Date.now();
    const timeSinceStart = now - this.touchState.gestureStartTime;
    const dx = Math.abs(coords.x * this.viewport.width - this.touchState.startX);
    const dy = Math.abs(coords.y * this.viewport.height - this.touchState.startY);

    if (timeSinceStart < 300 && dx < 10 && dy < 10) {
      // It's a tap
      this.handleTap(coords);
    } else {
      // Send mouseup for drag end
      this.sendInput('mouseup', coords.x, coords.y, 'touch');
    }
  }

  /**
   * Handle tap gestures (single, double, etc.)
   */
  handleTap(coords: { x: number; y: number }) {
    const now = Date.now();
    const timeSinceLastTap = now - this.touchState.lastTapTime;

    if (timeSinceLastTap < 300) {
      this.touchState.tapCount++;
    } else {
      this.touchState.tapCount = 1;
    }

    this.touchState.lastTapTime = now;

    // Handle double tap
    if (this.touchState.tapCount === 2) {
      this.sendInput('dblclick', coords.x, coords.y, 'touch');
      this.touchState.tapCount = 0;
    } else {
      // Single tap - send click after a short delay to detect double tap
      setTimeout(() => {
        if (this.touchState.tapCount === 1) {
          this.sendInput('click', coords.x, coords.y, 'touch');
          this.touchState.tapCount = 0;
        }
      }, 300);
    }
  }

  /**
   * Handle pinch gestures for zoom
   */
  handlePinchStart(event: TouchEvent, videoElement: HTMLVideoElement) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;

    this.pinchState = {
      initialDistance: this.getTouchDistance(touch1, touch2),
      center: this.getCoordinates(centerX, centerY, videoElement)
    };
  }

  handlePinchMove(event: TouchEvent, _videoElement: HTMLVideoElement) {
    if (!this.pinchState) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentDistance = this.getTouchDistance(touch1, touch2);
    const scale = currentDistance / this.pinchState.initialDistance;

    // Send zoom command
    this.sendInput('zoom', this.pinchState.center.x, this.pinchState.center.y, 'touch', { scale });
  }

  handlePinchEnd(_event: TouchEvent, _videoElement: HTMLVideoElement) {
    this.pinchState = null;
  }

  /**
   * Handle mouse events
   */
  handleMouseDown(event: MouseEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    const coords = this.getCoordinates(event.clientX, event.clientY, videoElement);
    this.mouseState.isDown = true;
    this.sendInput('mousedown', coords.x, coords.y, 'mouse');
  }

  handleMouseMove(event: MouseEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    // Throttle mouse moves to 60fps for better performance
    const now = Date.now();
    if (now - this.lastEmitTime < 16) return; // ~60fps
    this.lastEmitTime = now;

    const coords = this.getCoordinates(event.clientX, event.clientY, videoElement);
    this.mouseState.lastX = coords.x;
    this.mouseState.lastY = coords.y;
    this.sendInput('mousemove', coords.x, coords.y, 'mouse');
  }

  handleMouseUp(event: MouseEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    const coords = this.getCoordinates(event.clientX, event.clientY, videoElement);
    this.mouseState.isDown = false;
    this.sendInput('mouseup', coords.x, coords.y, 'mouse');
  }

  handleWheel(event: WheelEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    // Wheel input should be handled natively; preventDefault not relied on here.
    const coords = this.getCoordinates(event.clientX, event.clientY, videoElement);
    this.sendInput('wheel', coords.x, coords.y, 'mouse', {
      deltaX: event.deltaX,
      deltaY: event.deltaY
    });
  }

  handleDoubleClick(event: MouseEvent, videoElement: HTMLVideoElement) {
    if (!this.canControl || !this.socket) return;

    const coords = this.getCoordinates(event.clientX, event.clientY, videoElement);
    this.sendInput('dblclick', coords.x, coords.y, 'mouse');
  }

  /**
   * Send input to server with optimized batching
   */
  sendInput(type: string, x: number, y: number, pointerType: string, extra = {}) {
    if (!this.socket) return;

    this.socket.emit('browser-input', {
      roomId: this.roomId,
      input: {
        type,
        x,
        y,
        pointerType,
        timestamp: Date.now(),
        ...extra
      }
    });
  }

  /**
   * Utility function to get distance between two touches
   */
  getTouchDistance(touch1: Touch, touch2: Touch) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export default InputManager;
