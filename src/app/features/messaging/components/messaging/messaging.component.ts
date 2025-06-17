import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessagingService } from '../../../../core/services/messaging.service';
import {
  WebSocketService,
  UserStatus,
} from '../../../../core/services/websocket.service';
import { Conversation } from '../../../../core/models/message';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-messaging',
  standalone: false,
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.scss'],
})
export class MessagingComponent implements OnInit, OnDestroy {
  selectedConversation: Conversation | null = null;
  unreadCount = 0;
  isWebSocketConnected = false;
  webSocketError: string | null = null;
  onlineUsers: Set<string> = new Set();

  private subscriptions: Subscription = new Subscription();

  constructor(
    private messagingService: MessagingService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadUnreadCount();
    this.setupWebSocketListeners();

    // Actualiser le nombre de messages non lus toutes les 30 secondes
    const unreadCountTimer = interval(30000).subscribe(() => {
      this.loadUnreadCount();
    });

    this.subscriptions.add(unreadCountTimer);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Configurer les écouteurs WebSocket
   */
  private setupWebSocketListeners(): void {
    // Écouter le statut de connexion WebSocket
    const connectionSub = this.webSocketService.connectionStatus$.subscribe({
      next: (connected) => {
        this.isWebSocketConnected = connected;
        console.log('Statut WebSocket:', connected ? 'Connecté' : 'Déconnecté');
      },
    });

    // Écouter les changements de statut des utilisateurs
    const userStatusSub = this.webSocketService.userStatus$.subscribe({
      next: (status: UserStatus) => {
        if (status.isOnline) {
          this.onlineUsers.add(status.userId);
        } else {
          this.onlineUsers.delete(status.userId);
        }
      },
    });

    // Écouter les nouveaux messages pour mettre à jour le compteur
    const newMessageSub = this.webSocketService.newMessage$.subscribe({
      next: () => {
        // Actualiser le compteur de messages non lus
        this.loadUnreadCount();
      },
    });

    // Écouter les erreurs WebSocket
    const errorSub = this.webSocketService.error$.subscribe({
      next: (error) => {
        console.error('Erreur WebSocket dans MessagingComponent:', error);
        this.webSocketError = error;
      },
    });

    this.subscriptions.add(connectionSub);
    this.subscriptions.add(userStatusSub);
    this.subscriptions.add(newMessageSub);
    this.subscriptions.add(errorSub);
  }

  /**
   * Gérer la sélection d'une conversation
   */
  onConversationSelected(conversation: Conversation): void {
    this.selectedConversation = conversation;

    // Marquer les messages comme lus et actualiser le compteur
    setTimeout(() => {
      this.loadUnreadCount();
    }, 1000);
  }

  /**
   * Vérifier si un utilisateur est en ligne
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Charger le nombre de messages non lus
   */
  private loadUnreadCount(): void {
    const sub = this.messagingService.getUnreadMessagesCount().subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
      error: (error) => {
        console.error(
          'Erreur lors du chargement du nombre de messages non lus:',
          error
        );
      },
    });

    this.subscriptions.add(sub);
  }
}
