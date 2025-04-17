// This file contains functions for handling media (audio, video) in the application
import RecordRTC from 'recordrtc';

// Record audio from the user's microphone using RecordRTC
export async function recordAudio(): Promise<{ start: () => void, stop: () => Promise<Blob> }> {
  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Create a RecordRTC instance
  let recorder: RecordRTC | null = null;
  
  // Return an object with start and stop methods
  return {
    start: () => {
      // Initialize a new recorder each time
      recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000, // Better for speech recognition
      });
      
      recorder.startRecording();
    },
    stop: () => {
      return new Promise<Blob>((resolve, reject) => {
        if (!recorder) {
          reject(new Error('Recorder not initialized'));
          return;
        }
        
        recorder.stopRecording(() => {
          const blob = recorder?.getBlob();
          if (!blob) {
            reject(new Error('Failed to get recording blob'));
            return;
          }
          
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
          
          resolve(blob);
        });
      });
    }
  };
}

// Process a video file to extract the first frame as a thumbnail
export async function extractThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a video element to load the video
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Set up event handlers
    video.onloadedmetadata = () => {
      // Seek to the first frame
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      // Create a canvas to draw the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the frame on the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get the data URL of the frame
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Clean up
      URL.revokeObjectURL(video.src);
      
      resolve(dataUrl);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    // Load the video
    video.src = URL.createObjectURL(videoFile);
  });
}

// Create a video source URL from a File or Blob
export function createVideoSource(videoFile: File | Blob): string {
  return URL.createObjectURL(videoFile);
}

// Load a video from a URL and play it
export function playVideo(videoElement: HTMLVideoElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    videoElement.src = src;
    
    videoElement.onloadeddata = () => {
      videoElement.play()
        .then(() => resolve())
        .catch(error => reject(error));
    };
    
    videoElement.onerror = () => {
      reject(new Error('Failed to load video'));
    };
  });
}

// Lip sync simulation that mimics SadTalker or Wav2Lip behavior
// In a production app, you would implement WebAssembly for these models
export async function simulateLipSync(
  videoElement: HTMLVideoElement,
  audioBlob: Blob
): Promise<Blob> {
  // Create a canvas to draw the video frames
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Set canvas dimensions to match video
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  // Create a MediaRecorder to capture the output
  const outputStream = canvas.captureStream(30); // 30 FPS
  
  // Create an audio element for the response audio
  const audioElement = new Audio();
  audioElement.src = URL.createObjectURL(audioBlob);
  
  // Add the audio track to the output stream
  const audioContext = new AudioContext();
  const audioSource = audioContext.createMediaElementSource(audioElement);
  const audioDestination = audioContext.createMediaStreamDestination();
  audioSource.connect(audioDestination);
  
  // Analyze audio for lip sync
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  audioSource.connect(analyser);
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // Combine video and audio tracks
  outputStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
  
  // Create a MediaRecorder to record the combined stream
  const mediaRecorder = new MediaRecorder(outputStream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  
  // Define mouth positions based on audio amplitude
  const mouthPositions = [
    { name: 'closed', y: 0 },       // Mouth closed
    { name: 'slightly', y: 2 },     // Slightly open
    { name: 'medium', y: 4 },       // Medium open
    { name: 'wide', y: 6 }          // Wide open
  ];
  
  // Start recording and playing
  return new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      const outputBlob = new Blob(chunks, { type: 'video/webm' });
      
      // Clean up
      URL.revokeObjectURL(audioElement.src);
      
      resolve(outputBlob);
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Start audio
    audioElement.play();
    
    // Face detection coordinates (simplified)
    // In a real implementation, this would use face-api.js or similar
    const faceWidth = videoElement.videoWidth * 0.5;
    const faceHeight = videoElement.videoHeight * 0.6;
    const faceX = (videoElement.videoWidth - faceWidth) / 2;
    const faceY = (videoElement.videoHeight - faceHeight) / 2;
    
    // Mouth area within the face
    const mouthX = faceX + faceWidth * 0.3;
    const mouthY = faceY + faceHeight * 0.7;
    const mouthWidth = faceWidth * 0.4;
    const mouthHeight = faceHeight * 0.15;
    
    // Lip sync animation loop
    const animate = () => {
      if (audioElement.ended || audioElement.paused) {
        mediaRecorder.stop();
        return;
      }
      
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average amplitude in voice frequency range (human speech: 300-3000 Hz)
      const voiceRange = dataArray.slice(2, 20); // Approximate frequencies for speech
      const amplitude = voiceRange.reduce((sum, value) => sum + value, 0) / voiceRange.length;
      
      // Map amplitude to mouth position
      let mouthPosition;
      if (amplitude < 40) {
        mouthPosition = mouthPositions[0]; // Closed
      } else if (amplitude < 100) {
        mouthPosition = mouthPositions[1]; // Slightly open
      } else if (amplitude < 160) {
        mouthPosition = mouthPositions[2]; // Medium open
      } else {
        mouthPosition = mouthPositions[3]; // Wide open
      }
      
      // Draw the current video frame to the canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Modify the mouth area based on the calculated position
      // This is a very simplified approach - in reality you'd use a much more sophisticated model
      if (mouthPosition.name !== 'closed') {
        // Draw modified mouth
        // We're just drawing a simple shape here for demonstration
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.ellipse(
          mouthX + mouthWidth / 2,
          mouthY + mouthPosition.y,
          mouthWidth / 2,
          mouthHeight / 2 + mouthPosition.y,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      
      // Request the next animation frame
      requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    animate();
  });
}

// Download a blob as a file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
