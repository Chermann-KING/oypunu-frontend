import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import * as io from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface Activity {
  id: string;
  userId: string;
  username: string;
  activityType: string;
  entityType: string;
  entityId: string;
  metadata: {
    wordName?: string;
    languageCode?: string;
    languageName?: string;
    languageFlag?: string;
    translatedWord?: string;
    targetLanguageCode?: string;
    synonymsCount?: number;
    postTitle?: string;
    communityName?: string;
  };
  languageRegion?: string;
  userRegion?: string;
  createdAt: string;
  timeAgo: string;
  message: string;
  flag: string;
  isPublic: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private socket: any;
  private activitiesSubject = new BehaviorSubject<Activity[]>([]);
  private connectedClientsSubject = new BehaviorSubject<number>(0);
  
  public activities$ = this.activitiesSubject.asObservable();
  public connectedClients$ = this.connectedClientsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    // Se connecter au namespace des activités
    this.socket = io.connect(`${environment.websocketUrl}/activities`, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // Écouter les nouvelles activités
    this.socket.on('activities:new', (data: { activity: Activity; timestamp: string }) => {
      console.log('🔴 Nouvelle activité reçue:', data.activity);
      this.addNewActivity(data.activity);
    });

    // Écouter les activités récentes
    this.socket.on('activities:recent', (activities: Activity[]) => {
      console.log('📋 Activités récentes reçues:', activities.length);
      this.activitiesSubject.next(activities);
    });

    // Écouter le nombre de clients connectés
    this.socket.on('activities:clients_count', (count: number) => {
      this.connectedClientsSubject.next(count);
    });

    // Écouter les erreurs
    this.socket.on('activities:error', (error: any) => {
      console.error('❌ Erreur WebSocket activités:', error);
    });

    // Écouter les événements de connexion/déconnexion
    this.socket.on('connect', () => {
      console.log('✅ WebSocket activités connecté');
      // Demander les activités récentes dès la connexion
      setTimeout(() => {
        this.requestRecentActivities(10, true);
      }, 100);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket activités déconnecté');
    });

    // Se connecter automatiquement
    this.connect();
  }

  connect(): void {
    if (!this.socket.connected) {
      console.log('🔌 Connexion au WebSocket des activités...');
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      console.log('🔌 Déconnexion du WebSocket des activités...');
      this.socket.disconnect();
    }
  }

  // Ajouter une nouvelle activité au début de la liste
  private addNewActivity(newActivity: Activity): void {
    const currentActivities = this.activitiesSubject.value;
    const updatedActivities = [newActivity, ...currentActivities.slice(0, 9)]; // Garder les 10 plus récentes
    this.activitiesSubject.next(updatedActivities);
  }

  // Demander les activités récentes
  requestRecentActivities(limit: number = 10, prioritizeAfrican: boolean = true): void {
    this.socket.emit('activities:request_recent', { limit, prioritizeAfrican });
  }

  // Demander les activités par type
  requestActivitiesByType(activityType: string, limit: number = 5): void {
    this.socket.emit('activities:request_by_type', { activityType, limit });
  }

  // API REST pour les activités (fallback si WebSocket n'est pas disponible)
  getRecentActivities(limit: number = 10, prioritizeAfrican: boolean = true): Observable<{
    activities: Activity[];
    count: number;
    timestamp: string;
  }> {
    return this.http.get<{
      activities: Activity[];
      count: number;
      timestamp: string;
    }>(`${environment.apiUrl}/activities/recent?limit=${limit}&prioritizeAfrican=${prioritizeAfrican}`);
  }

  getActivitiesByType(activityType: string, limit: number = 5): Observable<{
    activityType: string;
    activities: Activity[];
    count: number;
    timestamp: string;
  }> {
    return this.http.get<{
      activityType: string;
      activities: Activity[];
      count: number;
      timestamp: string;
    }>(`${environment.apiUrl}/activities/by-type?type=${activityType}&limit=${limit}`);
  }

  getActivityStats(): Observable<{
    stats: {
      totalRecentActivities: number;
      wordCreatedCount: number;
      translationCount: number;
      connectedClients: number;
    };
    recentActivities: Activity[];
    timestamp: string;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/activities/stats`);
  }

  // Méthodes de test
  createTestActivity(testData: {
    activityType?: string;
    wordName?: string;
    languageCode?: string;
    username?: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/activities/test`, testData);
  }

  testBroadcast(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/activities/test-broadcast`, {});
  }

  // Utilitaires
  isConnected(): boolean {
    return this.socket && this.socket.connected;
  }

  getConnectionStatus(): string {
    if (!this.socket) return 'non-initialisé';
    return this.socket.connected ? 'connecté' : 'déconnecté';
  }

  // Formater le type d'activité pour l'affichage
  formatActivityType(activityType: string): string {
    const typeMap: { [key: string]: string } = {
      'word_created': 'Mot ajouté',
      'translation_added': 'Traduction ajoutée',
      'synonym_added': 'Synonymes ajoutés',
      'word_approved': 'Mot approuvé',
      'word_verified': 'Traduction vérifiée',
      'community_post_created': 'Publication créée',
      'comment_added': 'Commentaire ajouté',
      'user_registered': 'Inscription',
      'user_logged_in': 'Connexion',
      'community_joined': 'Communauté rejointe',
      'community_created': 'Communauté créée'
    };

    return typeMap[activityType] || activityType;
  }

  // Obtenir la couleur du type d'activité
  getActivityTypeColor(activityType: string): string {
    const colorMap: { [key: string]: string } = {
      'word_created': 'text-green-400',
      'translation_added': 'text-blue-400',
      'synonym_added': 'text-yellow-400',
      'word_approved': 'text-purple-400',
      'word_verified': 'text-emerald-400',
      'community_post_created': 'text-orange-400',
      'comment_added': 'text-cyan-400',
      'user_registered': 'text-pink-400',
      'user_logged_in': 'text-indigo-400',
      'community_joined': 'text-teal-400',
      'community_created': 'text-amber-400'
    };

    return colorMap[activityType] || 'text-gray-400';
  }

  // Nettoyer les ressources
  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}