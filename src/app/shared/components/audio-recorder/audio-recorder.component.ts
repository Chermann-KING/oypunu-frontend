import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { DictionaryService } from '../../../core/services/dictionary.service';

interface AudioRecorderState {
  isRecording: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isUploading: boolean;
  hasRecording: boolean;
  duration: number;
  currentTime: number;
}

@Component({
  selector: 'app-audio-recorder',
  standalone: false,
  templateUrl: './audio-recorder.component.html',
  styleUrl: './audio-recorder.component.scss',
})
export class AudioRecorderComponent implements OnDestroy {
  @Input() wordId!: string;
  @Input() accent: string = 'fr-fr';
  @Input() existingAudioUrl?: string;

  @Output() audioUploaded = new EventEmitter<any>();
  @Output() audioDeleted = new EventEmitter<void>();

  @ViewChild('waveformCanvas', { static: false })
  waveformCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('existingAudioPlayer', { static: false })
  existingAudioPlayer!: ElementRef<HTMLAudioElement>;

  // État du composant
  state: AudioRecorderState = {
    isRecording: false,
    isPlaying: false,
    isPaused: false,
    isUploading: false,
    hasRecording: false,
    duration: 0,
    currentTime: 0,
  };

  // Messages
  errorMessage = '';
  successMessage = '';

  // Recorder et MediaStream
  private _mediaRecorder: MediaRecorder | null = null;
  private _mediaStream: MediaStream | null = null;
  private _audioChunks: Blob[] = [];
  private _recordedBlob: Blob | null = null;
  private _audioContext: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _dataArray: Uint8Array | null = null;
  private _animationId: number | null = null;

  // État du recorder
  isRecorderReady = false;
  selectedFile: File | null = null;

  // Timers
  private _recordingTimer: any = null;
  private _playbackTimer: any = null;

  constructor(private dictionaryService: DictionaryService) {}

  async ngOnInit(): Promise<void> {
    await this._initializeRecorder();
  }

  ngOnDestroy(): void {
    this._cleanup();
  }

  /**
   * Initialise l'enregistreur audio
   */
  private async _initializeRecorder(): Promise<void> {
    try {
      // Demander l'accès au microphone
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      // Initialiser le contexte audio pour la visualisation
      this._audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = 256;

      const source = this._audioContext.createMediaStreamSource(
        this._mediaStream
      );
      source.connect(this._analyser);

      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);

      this.isRecorderReady = true;
      this._clearMessages();
    } catch (error) {
      console.error("Erreur d'initialisation du microphone:", error);
      this.errorMessage =
        "Impossible d'accéder au microphone. Vérifiez les permissions.";
      this.isRecorderReady = false;
    }
  }

  /**
   * Démarre ou arrête l'enregistrement
   */
  async toggleRecording(): Promise<void> {
    if (this.state.isRecording) {
      this._stopRecording();
    } else {
      await this._startRecording();
    }
  }

  /**
   * Démarre l'enregistrement
   */
  private async _startRecording(): Promise<void> {
    if (!this._mediaStream || !this.isRecorderReady) {
      this.errorMessage = 'Microphone non disponible';
      return;
    }

    try {
      this._clearMessages();
      this._audioChunks = [];

      // Configurer MediaRecorder
      const options = {
        mimeType: 'audio/webm;codecs=opus',
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }

      this._mediaRecorder = new MediaRecorder(this._mediaStream, options);

      this._mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this._audioChunks.push(event.data);
        }
      };

      this._mediaRecorder.onstop = () => {
        this._recordedBlob = new Blob(this._audioChunks, {
          type: 'audio/webm',
        });
        this.state.hasRecording = true;
        this._stopWaveformVisualization();
      };

      // Démarrer l'enregistrement
      this._mediaRecorder.start(100); // Enregistrer par chunks de 100ms
      this.state.isRecording = true;
      this.state.duration = 0;

      // Démarrer la visualisation et le timer
      this._startWaveformVisualization();
      this._startRecordingTimer();
    } catch (error) {
      console.error("Erreur de démarrage d'enregistrement:", error);
      this.errorMessage = "Impossible de démarrer l'enregistrement";
    }
  }

  /**
   * Arrête l'enregistrement
   */
  private _stopRecording(): void {
    if (this._mediaRecorder && this.state.isRecording) {
      this._mediaRecorder.stop();
      this.state.isRecording = false;
      this._stopRecordingTimer();
    }
  }

  /**
   * Démarre/arrête la lecture de l'enregistrement
   */
  togglePlayback(): void {
    if (this.state.isPlaying) {
      this._pausePlayback();
    } else {
      this._startPlayback();
    }
  }

  /**
   * Démarre la lecture
   */
  private _startPlayback(): void {
    if (!this._recordedBlob) return;

    const audio = new Audio(URL.createObjectURL(this._recordedBlob));

    audio.onended = () => {
      this.state.isPlaying = false;
      this.state.currentTime = 0;
      this._stopPlaybackTimer();
    };

    audio.ontimeupdate = () => {
      this.state.currentTime = audio.currentTime;
    };

    audio.play();
    this.state.isPlaying = true;
    this._startPlaybackTimer();
  }

  /**
   * Met en pause la lecture
   */
  private _pausePlayback(): void {
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this._stopPlaybackTimer();
  }

  /**
   * Supprime l'enregistrement actuel
   */
  deleteRecording(): void {
    this._recordedBlob = null;
    this._audioChunks = [];
    this.state.hasRecording = false;
    this.state.duration = 0;
    this.state.currentTime = 0;
    this._clearMessages();
  }

  /**
   * Supprime l'audio existant
   */
  deleteExistingAudio(): void {
    // Émets l'événement de suppression
    this.audioDeleted.emit();
  }

  /**
   * Upload l'enregistrement
   */
  async uploadRecording(): Promise<void> {
    if (!this._recordedBlob) {
      this.errorMessage = 'Aucun enregistrement à téléverser';
      return;
    }

    await this._uploadAudioBlob(this._recordedBlob);
  }

  /**
   * Gestion de la sélection de fichier
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validation du type de fichier
      if (!file.type.startsWith('audio/')) {
        this.errorMessage = 'Veuillez sélectionner un fichier audio valide';
        return;
      }

      // Validation de la taille (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = 'Le fichier est trop volumineux (10MB maximum)';
        return;
      }

      this.selectedFile = file;
      this._clearMessages();
    }
  }

  /**
   * Upload du fichier sélectionné
   */
  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Aucun fichier sélectionné';
      return;
    }

    await this._uploadAudioBlob(this.selectedFile);
  }

  /**
   * Upload générique d'un blob audio
   */
  private async _uploadAudioBlob(blob: Blob): Promise<void> {
    this.state.isUploading = true;
    this._clearMessages();

    try {
      const result = await this.dictionaryService.uploadAudio(
        this.wordId,
        this.accent,
        new File([blob], `pronunciation_${this.accent}.webm`, {
          type: blob.type,
        })
      );

      if (result) {
        this.successMessage = 'Prononciation sauvegardée avec succès !';
        this.audioUploaded.emit(result);

        // Nettoyer après upload réussi
        this.deleteRecording();
        this.clearSelectedFile();
      } else {
        this.errorMessage = 'Erreur lors de la sauvegarde';
      }
    } catch (error: any) {
      console.error("Erreur d'upload:", error);
      this.errorMessage =
        error.error?.message || 'Erreur lors du téléversement';
    } finally {
      this.state.isUploading = false;
    }
  }

  /**
   * Effacer le fichier sélectionné
   */
  clearSelectedFile(): void {
    this.selectedFile = null;
  }

  /**
   * Visualisation de forme d'onde
   */
  private _startWaveformVisualization(): void {
    if (!this._analyser || !this._dataArray) return;

    const draw = () => {
      if (!this.state.isRecording) return;

      this._animationId = requestAnimationFrame(draw);

      if (this.waveformCanvas?.nativeElement) {
        const canvas = this.waveformCanvas.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        this._analyser!.getByteFrequencyData(this._dataArray!);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = canvas.width / this._dataArray!.length;
        let x = 0;

        for (let i = 0; i < this._dataArray!.length; i++) {
          const barHeight = (this._dataArray![i] / 255) * canvas.height;

          const gradient = ctx.createLinearGradient(
            0,
            canvas.height - barHeight,
            0,
            canvas.height
          );
          gradient.addColorStop(0, '#8b5cf6');
          gradient.addColorStop(1, '#a855f7');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      }
    };

    draw();
  }

  private _stopWaveformVisualization(): void {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  /**
   * Gestion des timers
   */
  private _startRecordingTimer(): void {
    this._recordingTimer = setInterval(() => {
      this.state.duration += 0.1;
    }, 100);
  }

  private _stopRecordingTimer(): void {
    if (this._recordingTimer) {
      clearInterval(this._recordingTimer);
      this._recordingTimer = null;
    }
  }

  private _startPlaybackTimer(): void {
    this._playbackTimer = setInterval(() => {
      // Le currentTime est mis à jour via l'événement ontimeupdate
    }, 100);
  }

  private _stopPlaybackTimer(): void {
    if (this._playbackTimer) {
      clearInterval(this._playbackTimer);
      this._playbackTimer = null;
    }
  }

  /**
   * Utilitaires
   */
  getRecordButtonClass(): string {
    if (this.state.isRecording) {
      return 'bg-red-600 hover:bg-red-700 text-white animate-pulse';
    }
    return 'bg-red-600 hover:bg-red-700 text-white';
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private _clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Nettoyage des ressources
   */
  private _cleanup(): void {
    this._stopRecordingTimer();
    this._stopPlaybackTimer();
    this._stopWaveformVisualization();

    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this._audioContext) {
      this._audioContext.close();
    }
  }
}
