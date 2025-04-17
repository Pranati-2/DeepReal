declare module 'recordrtc' {
  export default class RecordRTC {
    constructor(
      stream: MediaStream,
      options?: {
        type?: 'video' | 'audio' | 'gif' | 'canvas';
        mimeType?: string;
        recorderType?: any;
        disableLogs?: boolean;
        timeSlice?: number;
        onTimeStamp?: (timestamp: number) => void;
        bitsPerSecond?: number;
        audioBitsPerSecond?: number;
        videoBitsPerSecond?: number;
        frameInterval?: number;
        sampleRate?: number;
        desiredSampRate?: number;
        bufferSize?: number;
        numberOfAudioChannels?: number;
        frameRate?: number;
        video?: HTMLVideoElement;
      }
    );

    startRecording(): void;
    stopRecording(callback?: (arg0: string) => void): void;
    pauseRecording(): void;
    resumeRecording(): void;
    getBlob(): Blob;
    getDataURL(callback: (dataURL: string) => void): void;
    toURL(): string;
    save(fileName?: string): void;
    destroy(): void;
    
    static StereoAudioRecorder: any;
    static MediaStreamRecorder: any;
    static WebAssemblyRecorder: any;
  }
}