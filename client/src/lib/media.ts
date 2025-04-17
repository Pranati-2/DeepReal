// This file contains functions for handling media (audio, video) in the application

// Record audio from the user's microphone
export async function recordAudio(): Promise<{ start: () => void, stop: () => Promise<Blob> }> {
  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Create a MediaRecorder instance
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks: Blob[] = [];
  
  // Handle data available event
  mediaRecorder.addEventListener('dataavailable', (event) => {
    audioChunks.push(event.data);
  });
  
  // Return an object with start and stop methods
  return {
    start: () => {
      audioChunks.length = 0; // Reset audio chunks
      mediaRecorder.start();
    },
    stop: () => {
      return new Promise<Blob>((resolve) => {
        mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
          
          resolve(audioBlob);
        });
        
        mediaRecorder.stop();
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

// Simple lip sync simulation (for development purposes)
// In production, this would use a more sophisticated model like Wav2Lip or SadTalker
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
    
    // Start audio and animation
    audioElement.play();
    
    // Simple animation loop - in a real app, this would use ML for lip sync
    const animate = () => {
      if (audioElement.ended || audioElement.paused) {
        mediaRecorder.stop();
        return;
      }
      
      // Draw the current video frame to the canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
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
