import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessagingService } from '../../../../core/services/messaging.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import {
  Conversation,
  Message,
  MessagesResponse,
} from '../../../../core/models/message';
import { Subscription, fromEvent, debounceTime } from 'rxjs';

@Component({
  selector: 'app-chat-window',
  standalone: false,
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent
  implements OnInit, OnDestroy, AfterViewChecked, OnChanges
{
  @Input() conversation: Conversation | null = null;
  @ViewChild('messagesContainer', { static: false })
  messagesContainer!: ElementRef;

  messageForm: FormGroup;
  messages: Message[] = [];
  loading = false;
  loadingMessages = false;
  sendingMessage = false;
  error: string | null = null;
  currentUserId: string | null = null;
  isTyping: { [userId: string]: boolean } = {};
  typingUsers: string[] = [];

  private subscriptions: Subscription = new Subscription();
  private typingTimer: any;

  constructor(
    private fb: FormBuilder,
    private messagingService: MessagingService,
    private authService: AuthService,
    private webSocketService: WebSocketService
  ) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(1000)]],
    });
  }

  ngOnInit(): void {
    // Récupérer l'utilisateur connecté
    this.currentUserId = this.authService.getCurrentUserId();

    this.setupWebSocketListeners();
    this.setupTypingDetection();

    if (this.conversation) {
      this.loadMessages();
      this.joinConversation();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation']) {
      if (
        changes['conversation'].previousValue &&
        changes['conversation'].previousValue._id
      ) {
        // Quitter l'ancienne conversation
        this.webSocketService.leaveConversation(
          changes['conversation'].previousValue._id
        );
      }

      if (this.conversation) {
        this.loadMessages();
        this.joinConversation();
      }
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (this.conversation && this.conversation._id) {
      this.webSocketService.leaveConversation(this.conversation._id);
      this.webSocketService.stopTyping(this.conversation._id);
    }
    this.subscriptions.unsubscribe();
  }

  /**
   * Configurer les écouteurs WebSocket
   */
  private setupWebSocketListeners(): void {
    // Écouter les nouveaux messages
    const newMessageSub = this.webSocketService.newMessage$.subscribe({
      next: (message: Message) => {
        if (
          this.conversation &&
          (message.conversationId === this.conversation._id ||
            this.isMessageForCurrentConversation(message))
        ) {
          this.messages.push(message);
          this.scrollToBottom();
        }
      },
    });

    // Écouter les indicateurs de frappe
    const typingSub = this.webSocketService.typingStatus$.subscribe({
      next: (status) => {
        if (
          this.conversation &&
          status.conversationId === this.conversation._id
        ) {
          if (status.isTyping && status.userId !== this.currentUserId) {
            this.isTyping[status.userId] = true;
            if (!this.typingUsers.includes(status.username)) {
              this.typingUsers.push(status.username);
            }
          } else {
            delete this.isTyping[status.userId];
            this.typingUsers = this.typingUsers.filter(
              (u) => u !== status.username
            );
          }
        }
      },
    });

    // Écouter les erreurs WebSocket
    const errorSub = this.webSocketService.error$.subscribe({
      next: (error) => {
        this.error = error;
        console.error('Erreur WebSocket:', error);
      },
    });

    this.subscriptions.add(newMessageSub);
    this.subscriptions.add(typingSub);
    this.subscriptions.add(errorSub);
  }

  /**
   * Configurer la détection de frappe
   */
  private setupTypingDetection(): void {
    const contentControl = this.messageForm.get('content');
    if (contentControl) {
      // Écouter les changements de valeur avec debounce pour arrêter de taper
      const valueChangesSub = contentControl.valueChanges
        .pipe(debounceTime(1000))
        .subscribe(() => {
          if (this.conversation && this.conversation._id) {
            this.webSocketService.stopTyping(this.conversation._id);
          }
        });

      // Écouter les changements pour démarrer l'indicateur de frappe
      const typingStartSub = contentControl.valueChanges.subscribe(
        (value: string) => {
          if (
            this.conversation &&
            this.conversation._id &&
            value &&
            value.trim()
          ) {
            this.webSocketService.startTyping(this.conversation._id);

            // Arrêter de taper automatiquement après 3 secondes
            clearTimeout(this.typingTimer);
            this.typingTimer = setTimeout(() => {
              if (this.conversation && this.conversation._id) {
                this.webSocketService.stopTyping(this.conversation._id);
              }
            }, 3000);
          }
        }
      );

      this.subscriptions.add(valueChangesSub);
      this.subscriptions.add(typingStartSub);
    }
  }

  /**
   * Rejoindre une conversation WebSocket
   */
  private joinConversation(): void {
    if (this.conversation && this.conversation._id) {
      this.webSocketService.joinConversation(this.conversation._id);
    }
  }

  /**
   * Vérifier si un message appartient à la conversation actuelle
   */
  private isMessageForCurrentConversation(message: Message): boolean {
    if (!this.conversation) return false;

    return (
      this.conversation.participants.some(
        (p) => p.id === message.senderId.id
      ) &&
      this.conversation.participants.some((p) => p.id === message.receiverId.id)
    );
  }

  /**
   * Charger les messages de la conversation
   */
  loadMessages(): void {
    if (!this.conversation || !this.conversation._id) {
      // Pour les nouvelles conversations sans ID, ne pas charger de messages
      this.messages = [];
      this.loadingMessages = false;
      return;
    }

    this.loadingMessages = true;
    this.error = null;

    const sub = this.messagingService
      .getMessages(this.conversation._id, 1, 50)
      .subscribe({
        next: (response: MessagesResponse) => {
          this.messages = response.messages;
          this.loadingMessages = false;
          this.markMessagesAsRead();
        },
        error: (error) => {
          this.error = error.message;
          this.loadingMessages = false;
          console.error('Erreur lors du chargement des messages:', error);
        },
      });

    this.subscriptions.add(sub);
  }

  /**
   * Envoyer un message
   */
  sendMessage(): void {
    if (!this.conversation || this.messageForm.invalid || this.sendingMessage) {
      return;
    }

    const content = this.messageForm.get('content')?.value?.trim();
    if (!content) return;

    const otherParticipant = this.getOtherParticipant();
    if (!otherParticipant) return;

    this.sendingMessage = true;
    this.error = null;

    // Arrêter l'indicateur de frappe
    if (this.conversation._id) {
      this.webSocketService.stopTyping(this.conversation._id);
    }

    // Pour les nouvelles conversations ou si WebSocket n'est pas connecté, utiliser HTTP
    if (!this.conversation._id || !this.webSocketService.isConnected()) {
      const messageData = {
        receiverId: otherParticipant.id,
        content: content,
        messageType: 'text' as const,
      };

      const sub = this.messagingService.sendMessage(messageData).subscribe({
        next: (response) => {
          this.messages.push(response.data);

          // Si c'était une nouvelle conversation, mettre à jour l'ID
          if (!this.conversation!._id && response.data.conversationId) {
            this.conversation!._id = response.data.conversationId;
            this.joinConversation(); // Rejoindre maintenant que nous avons un ID
          }

          this.messageForm.reset();
          this.sendingMessage = false;
          this.scrollToBottom();
        },
        error: (error) => {
          this.error = error.message;
          this.sendingMessage = false;
          console.error("Erreur lors de l'envoi du message:", error);
        },
      });

      this.subscriptions.add(sub);
    } else {
      // Essayer d'envoyer via WebSocket si disponible et conversation existante
      this.webSocketService.sendMessage({
        receiverId: otherParticipant.id,
        content: content,
        messageType: 'text' as const,
      });

      this.messageForm.reset();
      this.sendingMessage = false;
    }
  }

  /**
   * Marquer les messages comme lus
   */
  markMessagesAsRead(): void {
    if (!this.conversation || !this.conversation._id) return;

    const sub = this.messagingService
      .markMessagesAsRead(this.conversation._id)
      .subscribe({
        next: () => {
          // Messages marqués comme lus
        },
        error: (error) => {
          console.error('Erreur lors du marquage des messages:', error);
        },
      });

    this.subscriptions.add(sub);
  }

  /**
   * Défiler vers le bas de la conversation
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Erreur lors du défilement:', err);
    }
  }

  /**
   * Obtenir l'autre participant de la conversation
   */
  getOtherParticipant(): any {
    if (!this.conversation || !this.currentUserId) return null;

    return this.conversation.participants.find(
      (participant) => participant.id !== this.currentUserId
    );
  }

  /**
   * Vérifier si le message a été envoyé par l'utilisateur connecté
   */
  isMyMessage(message: Message): boolean {
    return message.senderId.id === this.currentUserId;
  }

  /**
   * Formater la date du message
   */
  formatMessageDate(date: Date): string {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtenir le texte de l'indicateur de frappe
   */
  getTypingText(): string {
    if (this.typingUsers.length === 0) return '';
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} tape...`;
    if (this.typingUsers.length === 2)
      return `${this.typingUsers[0]} et ${this.typingUsers[1]} tapent...`;
    return `${this.typingUsers[0]} et ${
      this.typingUsers.length - 1
    } autres tapent...`;
  }

  /**
   * Gérer la soumission du formulaire
   */
  onSubmit(): void {
    this.sendMessage();
  }

  /**
   * Gérer la touche Entrée dans le textarea
   */
  onEnterKeydown(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
