import { NoiseSuppressionProcessor } from '@shiguredo/noise-suppression';

class NoiseProcessor {
    private processor: NoiseSuppressionProcessor | null = null;
    isActive: boolean = false;

    async init(stream: MediaStream): Promise<MediaStream> {
        if (this.isActive && this.processor) return stream;

        try {
            // Constructor takes 0 arguments (assets likely inlined or default)
            this.processor = new NoiseSuppressionProcessor(); 
            
            // No load() method exists based on TS check.
            // await this.processor.load();

            const track = stream.getAudioTracks()[0];
            if (!track) return stream;

            // Start processing (Async)
            const processedTrack = await this.processor.startProcessing(track);
            
            this.isActive = true;
            // Shiguredo Noise suppression enabled.

            // Create new stream with processed audio and original video
            const processedStream = new MediaStream();
            processedStream.addTrack(processedTrack);
            stream.getVideoTracks().forEach(t => processedStream.addTrack(t));

            return processedStream;

        } catch (_) {
            // Silent failure
            return stream;
        }
    }

    stop() {
        if (!this.isActive) return;

        this.isActive = false;
        try {
            if (this.processor) {
                this.processor.stopProcessing();
                // keeping the instance loaded might be better for toggle speed, 
                // but strictly following stop():
                // this.processor = null; // Maybe keep it?
            }
        } catch (_) {
            // monitor errors silently or via telemetry
        }
    }
}

export default new NoiseProcessor();