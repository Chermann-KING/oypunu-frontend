import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import io from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';
import { Message } from '../models/message';

export interface UserStatus {
  userId: string;
  username: string;
  isOnline: boolean;
}

export interface TypingStatus {
  userId: string;
  username: string;
  conversationId: string;
  isTyping: boolean;
}

export interface TranslationNotification {
  type: 'translation_added' | 'translation_validated' | 'translation_voted';
  wordId: string;
  word: string;
  language: string;
  translatedWord: string;
  userId: string;
  username: string;
  confidence?: number;
  votes?: number;
  validationType?: string;
}

export interface MessageMetadata {
  wordId?: string;
  language?: string;
  translationRequested?: boolean;
  context?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: ReturnType<typeof io> | null = null;
  private connectionStatus = new BehaviorSubject<boolean>(false);

  // Observables pour les événements en temps réel
  private newMessageSubject = new Subject<Message>();
  private userStatusSubject = new Subject<UserStatus>();
  private typingStatusSubject = new Subject<TypingStatus>();
  private translationNotificationSubject = new Subject<TranslationNotification>();
  private errorSubject = new Subject<string>();

  // Observables publics
  public connectionStatus$ = this.connectionStatus.asObservable();
  public newMessage$ = this.newMessageSubject.asObservable();
  public userStatus$ = this.userStatusSubject.asObservable();
  public typingStatus$ = this.typingStatusSubject.asObservable();
  public translationNotification$ = this.translationNotificationSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private authService: AuthService,
    private logger: LoggerService
  ) {
    // Se connecter automatiquement si l'utilisateur est authentifié
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  /**
   * Se connecter au serveur WebSocket
   */
  connect(): void {
    if (this.socket?.connected) {
      this.logger.debug('WebSocket already connected');
      return; // Déjà connecté
    }

    const token = this.authService.getToken();
    if (!token) {
      this.logger.error("Pas de token d'authentification disponible");
      return;
    }

    this.logger.info(
      'Connecting to WebSocket',
      `${environment.apiUrl.replace('/api', '')}/messaging`
    );

    this.socket = io(`${environment.apiUrl.replace('/api', '')}/messaging`, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  /**
   * Se déconnecter du serveur WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus.next(false);
    }
  }

  /**
   * Configurer les écouteurs d'événements WebSocket
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Événements de connexion
    this.socket.on('connect', () => {
      this.logger.info('Connecté au serveur WebSocket');
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', () => {
      this.logger.info('Déconnecté du serveur WebSocket');
      this.connectionStatus.next(false);
    });

    // Événements de messagerie
    this.socket.on('new_message', (message: Message) => {
      this.newMessageSubject.next(message);
    });

    this.socket.on('message_sent', (message: Message) => {
      this.newMessageSubject.next(message);
    });

    // Événements de statut utilisateur
    this.socket.on(
      'user_online',
      (data: { userId: string; username: string }) => {
        this.userStatusSubject.next({
          userId: data.userId,
          username: data.username,
          isOnline: true,
        });
      }
    );

    this.socket.on(
      'user_offline',
      (data: { userId: string; username: string }) => {
        this.userStatusSubject.next({
          userId: data.userId,
          username: data.username,
          isOnline: false,
        });
      }
    );

    // Événements de frappe
    this.socket.on(
      'user_typing',
      (data: { userId: string; username: string; conversationId: string }) => {
        this.typingStatusSubject.next({
          userId: data.userId,
          username: data.username,
          conversationId: data.conversationId,
          isTyping: true,
        });
      }
    );

    this.socket.on(
      'user_stopped_typing',
      (data: { userId: string; username: string; conversationId: string }) => {
        this.typingStatusSubject.next({
          userId: data.userId,
          username: data.username,
          conversationId: data.conversationId,
          isTyping: false,
        });
      }
    );

    // Événements de traduction
    this.socket.on('translation_added', (data: TranslationNotification) => {
      this.translationNotificationSubject.next(data);
    });

    this.socket.on('translation_validated', (data: TranslationNotification) => {
      this.translationNotificationSubject.next(data);
    });

    this.socket.on('translation_voted', (data: TranslationNotification) => {
      this.translationNotificationSubject.next(data);
    });

    // Événements d'erreur
    this.socket.on('error', (data: { message: string }) => {
      this.errorSubject.next(data.message);
    });

    // Nouvelles erreurs d'authentification structurées
    this.socket.on('auth_error', (error: {
      code: string;
      message: string;
      timestamp: string;
      action: string;
    }) => {
      this.logger.error('Erreur d\'authentification WebSocket:', error);
      
      // Notifier l'erreur avec plus de contexte
      this.errorSubject.next(`Authentification: ${error.message}`);
      
      // Si l'action est disconnect, ne pas essayer de reconnecter
      if (error.action === 'disconnect') {
        this.connectionStatus.next(false);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      this.logger.error('Erreur de connexion WebSocket:', error);
      this.errorSubject.next('Erreur de connexion WebSocket');
    });
  }

  /**
   * Envoyer un message via WebSocket
   */
  sendMessage(data: {
    receiverId: string;
    content: string;
    messageType?: string;
    metadata?: MessageMetadata;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('send_message', data);
    } else {
      this.errorSubject.next('WebSocket non connecté');
    }
  }

  /**
   * Rejoindre une conversation
   */
  joinConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  /**
   * Quitter une conversation
   */
  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  /**
   * Indiquer que l'utilisateur commence à taper
   */
  startTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  /**
   * Indiquer que l'utilisateur arrête de taper
   */
  stopTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  /**
   * Vérifier si le WebSocket est connecté
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtenir le statut de connexion actuel
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$;
  }

  // ===== MÉTHODES POUR LES TRADUCTIONS =====

  /**
   * Notifier qu'une nouvelle traduction a été ajoutée
   */
  notifyTranslationAdded(data: {
    wordId: string;
    word: string;
    language: string;
    translatedWord: string;
    confidence: number;
    validationType: string;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('translation_added', data);
    }
  }

  /**
   * Notifier qu'une traduction a été validée
   */
  notifyTranslationValidated(data: {
    wordId: string;
    word: string;
    language: string;
    translatedWord: string;
    action: string;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('translation_validated', data);
    }
  }

  /**
   * Notifier qu'un vote a été effectué sur une traduction
   */
  notifyTranslationVoted(data: {
    wordId: string;
    word: string;
    language: string;
    translatedWord: string;
    votes: number;
    voteValue: number;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('translation_voted', data);
    }
  }

  /**
   * Rejoindre une room de mot pour recevoir les notifications de traduction
   */
  joinWordRoom(wordId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_word_room', { wordId });
    }
  }

  /**
   * Quitter une room de mot
   */
  leaveWordRoom(wordId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_word_room', { wordId });
    }
  }
}
