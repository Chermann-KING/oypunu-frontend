import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessagingService } from '../../../../core/services/messaging.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { Conversation } from '../../../../core/models/message';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user';

@Component({
  selector: 'app-conversations-list',
  standalone: false,
  templateUrl: './conversations-list.component.html',
  styleUrls: ['./conversations-list.component.scss'],
})
export class ConversationsListComponent implements OnInit {
  @Output() conversationSelected = new EventEmitter<Conversation>();

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  loading = false;
  error: string | null = null;
  currentUserId: string | null = null;
  onlineUsers: Set<string> = new Set();
  isWebSocketConnected = false;

  // Propriétés pour les filtres et la recherche
  searchControl = new FormControl('');
  showFiltersMenu = false;
  currentFilter: 'all' | 'unread' | 'favorites' | 'contacts' | 'groups' = 'all';

  // Propriétés pour le modal de nouvelle conversation
  showNewConversationModal = false;

  constructor(
    private messagingService: MessagingService,
    private webSocketService: WebSocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadConversations();
    this.setupWebSocketListeners();
    this.setupSearchListener();
  }

  /**
   * Charger les conversations de l'utilisateur
   */
  loadConversations(): void {
    this.loading = true;
    this.error = null;

    this.messagingService.getUserConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.filterConversations();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Erreur lors du chargement des conversations:', error);
      },
    });
  }

  /**
   * Filtrer les conversations selon le filtre actuel et la recherche
   */
  filterConversations(): void {
    let filtered = [...this.conversations];
    const searchTerm = this.searchControl.value?.toLowerCase() || '';

    // Filtrage par recherche
    if (searchTerm) {
      filtered = filtered.filter((conversation) => {
        const otherParticipant = this.getOtherParticipant(conversation);
        return (
          otherParticipant?.username?.toLowerCase().includes(searchTerm) ||
          conversation.lastMessage?.content?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Filtrage par type
    switch (this.currentFilter) {
      case 'unread':
        filtered = filtered.filter(
          (conv) => conv.lastMessage && !conv.lastMessage.isRead
        );
        break;
      case 'favorites':
        // TODO: Implémenter la logique des favoris
        break;
      case 'contacts':
        // TODO: Implémenter la logique des contacts
        break;
      case 'groups':
        // TODO: Implémenter la logique des groupes
        break;
      case 'all':
      default:
        // Afficher toutes les conversations
        break;
    }

    this.filteredConversations = filtered;
  }

  /**
   * Basculer l'affichage du menu des filtres
   */
  toggleFiltersMenu(): void {
    this.showFiltersMenu = !this.showFiltersMenu;
  }

  /**
   * Appliquer un filtre
   */
  applyFilter(
    filter: 'all' | 'unread' | 'favorites' | 'contacts' | 'groups'
  ): void {
    this.currentFilter = filter;
    this.filterConversations();
    this.showFiltersMenu = false;
  }

  /**
   * Sélectionner une conversation
   */
  selectConversation(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  /**
   * Obtenir l'autre participant de la conversation
   */
  getOtherParticipant(conversation: Conversation): any {
    if (!this.currentUserId) {
      // Si on n'a pas l'ID de l'utilisateur connecté, prendre le premier participant
      return conversation.participants[0];
    }

    // Retourner le participant qui n'est pas l'utilisateur connecté
    return (
      conversation.participants.find(
        (participant) => participant.id !== this.currentUserId
      ) || conversation.participants[0]
    );
  }

  /**
   * Vérifier si un utilisateur est en ligne
   */
  isUserOnline(userId: string): boolean {
    console.log(
      'Checking online status for user:',
      userId,
      'Online users:',
      this.onlineUsers
    );
    return this.onlineUsers.has(userId);
  }

  /**
   * Formater la date du dernier message
   */
  formatLastMessageDate(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMs = now.getTime() - messageDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // Moins d'une minute
    if (diffInMinutes < 1) {
      return 'maintenant';
    }

    // Moins d'une heure
    if (diffInMinutes < 60) {
      return `${diffInMinutes}min`;
    }

    // Aujourd'hui (moins de 24h)
    if (diffInHours < 24 && messageDate.getDate() === now.getDate()) {
      return messageDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Hier
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'hier';
    }

    // Cette semaine (moins de 7 jours)
    if (diffInDays < 7) {
      return messageDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
      });
    }

    // Plus d'une semaine
    return messageDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  /**
   * Tronquer le contenu du message
   */
  truncateMessage(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  openNewConversationModal() {
    this.showNewConversationModal = true;
  }

  closeNewConversationModal() {
    this.showNewConversationModal = false;
  }

  onUserSelected(user: User) {
    console.log('onUserSelected appelé avec:', user);

    // Fermer le modal immédiatement
    this.closeNewConversationModal();

    // Vérifier s'il existe déjà une conversation avec cet utilisateur
    this.messagingService.findConversationWithUser(user.id).subscribe({
      next: (existingConversation) => {
        console.log('Conversation existante trouvée:', existingConversation);

        if (existingConversation) {
          // Si une conversation existe, la sélectionner
          this.selectConversation(existingConversation);
        } else {
          console.log("Création d'une nouvelle conversation temporaire");
          // Obtenir les informations de l'utilisateur actuel
          const currentUser = this.authService.getCurrentUser();

          // Sinon, créer une nouvelle conversation temporaire
          const newConversation: Conversation = {
            _id: '', // Sera créé lors du premier message
            participants: currentUser ? [currentUser, user] : [user],
            lastMessage: undefined,
            lastActivity: new Date(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Ajouter immédiatement à la liste locale
          this.conversations.unshift(newConversation);
          this.filterConversations();

          this.selectConversation(newConversation);
        }
      },
      error: (error) => {
        console.error('Erreur lors de la recherche de conversation:', error);
        this.error = 'Erreur lors de la recherche de conversation';
      },
    });
  }

  /**
   * Configurer les écouteurs WebSocket pour le statut des utilisateurs
   */
  private setupWebSocketListeners(): void {
    console.log('🔌 Configuring WebSocket listeners for user status...');

    // Écouter les changements de statut des utilisateurs
    this.webSocketService.userStatus$.subscribe({
      next: (status) => {
        console.log('👤 User status received:', status);
        if (status.isOnline) {
          this.onlineUsers.add(status.userId);
          console.log(
            '✅ User added to online list:',
            status.userId,
            'Total online:',
            this.onlineUsers.size
          );
        } else {
          this.onlineUsers.delete(status.userId);
          console.log(
            '❌ User removed from online list:',
            status.userId,
            'Total online:',
            this.onlineUsers.size
          );
        }
      },
      error: (error) => {
        console.error('❌ Error in user status subscription:', error);
      },
    });

    // Écouter aussi le statut de connexion WebSocket
    this.webSocketService.connectionStatus$.subscribe({
      next: (connected) => {
        console.log(
          '🔗 WebSocket connection status:',
          connected ? 'Connected' : 'Disconnected'
        );
        this.isWebSocketConnected = connected;
      },
    });
  }

  /**
   * Configurer l'écouteur de recherche
   */
  private setupSearchListener(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.filterConversations();
      });
  }
}
