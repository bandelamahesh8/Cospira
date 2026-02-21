// Audio Debugging Script for Virtual Browser
// This script helps diagnose audio issues

console.log('=== AUDIO DEBUG SCRIPT ===');
console.log('Checking audio setup...');

// Check if audio context exists
if (window.__audioContext) {
    console.log('✅ AudioContext exists');
    console.log('   State:', window.__audioContext.state);
    console.log('   Sample Rate:', window.__audioContext.sampleRate);
} else {
    console.log('❌ AudioContext NOT found');
}

// Check if destination exists
if (window.__audioDestination) {
    console.log('✅ MediaStreamDestination exists');
    const stream = window.__audioDestination.stream;
    const tracks = stream.getAudioTracks();
    console.log('   Audio tracks:', tracks.length);
    tracks.forEach((track, i) => {
        console.log(`   Track ${i}:`, track.label, 'Enabled:', track.enabled, 'Muted:', track.muted);
    });
} else {
    console.log('❌ MediaStreamDestination NOT found');
}

// Check if MediaRecorder exists
if (window.__mediaRecorder) {
    console.log('✅ MediaRecorder exists');
    console.log('   State:', window.__mediaRecorder.state);
    console.log('   MIME Type:', window.__mediaRecorder.mimeType);
} else {
    console.log('❌ MediaRecorder NOT found');
}

// Check audio sources
if (window.__audioSources) {
    console.log('✅ Audio sources:', window.__audioSources.size);
} else {
    console.log('❌ Audio sources NOT found');
}

// Check for media elements
const videos = document.querySelectorAll('video');
const audios = document.querySelectorAll('audio');
console.log('Media elements on page:');
console.log('   Videos:', videos.length);
console.log('   Audio:', audios.length);

// Check if sendAudioChunk binding exists
if (window.__sendAudioChunk) {
    console.log('✅ Audio chunk sender exists');
} else {
    console.log('❌ Audio chunk sender NOT found');
}

console.log('=== END DEBUG ===');
