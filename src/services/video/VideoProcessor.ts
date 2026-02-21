import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

class VideoProcessor {
  private faceDetector: FaceDetector | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private video: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private isActive: boolean = false;
  
  // Smoothing variables
  private currentCrop = { x: 0, y: 0, width: 0, height: 0 };
  private targetCrop = { x: 0, y: 0, width: 0, height: 0 };
  private smoothingFactor = 0.1; // Lower = smoother but slower
  
  async init(inputStream: MediaStream): Promise<MediaStream> {
    if (this.isActive) return this.canvas!.captureStream(30);

    // 1. Initialize Video Element
    this.video = document.createElement('video');
    this.video.srcObject = inputStream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();

    // 2. Initialize Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280; // Standard HD
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d');
    
    // Set initial crop to full frame
    this.currentCrop = { x: 0, y: 0, width: this.video.videoWidth, height: this.video.videoHeight };
    this.targetCrop = { ...this.currentCrop };

    // 3. Initialize MediaPipe Face Detector
    if (!this.faceDetector) {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      this.faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
          delegate: "GPU"
        },
        runningMode: "VIDEO"
      });
    }

    this.isActive = true;
    this.processFrame();

    return this.canvas.captureStream(30);
  }

  private processFrame = () => {
    if (!this.isActive || !this.video || !this.ctx || !this.faceDetector) return;

    const startTimeMs = performance.now();
    
    // Detect Faces
    let detections: Detection[] = [];
    try {
        detections = this.faceDetector.detectForVideo(this.video, startTimeMs).detections;
    } catch (_) {
        // Silent failure for face detection to prevent log spam
    }

    // Calculate Target Crop
    if (detections.length > 0) {
      // Find bounding box that encompasses all faces (or just the first/largest one)
      // For simplicity, let's track the first detected face for now, or a union of all
      // Let's do the first face for typical webcam usage
      const detection = detections[0];
      const box = detection.boundingBox!; // has originX, originY, width, height

      // Add padding
      const faceCenterX = box.originX + box.width / 2;
      const faceCenterY = box.originY + box.height / 2;
      
      // Calculate desired width/height based on face size
      // We want the face to occupy maybe 1/3 or 1/2 of the screen? 
      // Let's say we want to show 2x or 3x the face width
      let targetW = box.width * 3; 
      let targetH = targetW * (this.canvas!.height / this.canvas!.width); // Maintain aspect ratio

      // Clamp to video bounds (cannot zoom out more than full video)
      if (targetW > this.video.videoWidth) {
          targetW = this.video.videoWidth;
          targetH = this.video.videoHeight;
      }
      
      // Calculate top-left based on center
      let targetX = faceCenterX - targetW / 2;
      let targetY = faceCenterY - targetH / 2;

      // Clamp to edges
      targetX = Math.max(0, Math.min(targetX, this.video.videoWidth - targetW));
      targetY = Math.max(0, Math.min(targetY, this.video.videoHeight - targetH));
      
      this.targetCrop = { x: targetX, y: targetY, width: targetW, height: targetH };

    } else {
       // Loop back to full framing if no face found for a while? 
       // Or stay at last known position?
       // Let's slowly revert to full frame if no face is seen
        this.targetCrop = { x: 0, y: 0, width: this.video.videoWidth, height: this.video.videoHeight };
    }

    // Smooth Transition
    this.currentCrop.x += (this.targetCrop.x - this.currentCrop.x) * this.smoothingFactor;
    this.currentCrop.y += (this.targetCrop.y - this.currentCrop.y) * this.smoothingFactor;
    this.currentCrop.width += (this.targetCrop.width - this.currentCrop.width) * this.smoothingFactor;
    this.currentCrop.height += (this.targetCrop.height - this.currentCrop.height) * this.smoothingFactor;

    // Draw to Canvas
    this.ctx.drawImage(
      this.video,
      this.currentCrop.x, this.currentCrop.y, this.currentCrop.width, this.currentCrop.height, // Source Rect
      0, 0, this.canvas!.width, this.canvas!.height // Destination Rect (Full Canvas)
    );

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.video) {
        this.video.pause();
        this.video.srcObject = null;
        this.video = null;
    }
    // Note: We generally don't destroy the faceDetector instance to allow quick restarting
  }
}

export default new VideoProcessor();
