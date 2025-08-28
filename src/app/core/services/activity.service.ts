import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
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
    categoryName?: string;
    translatedWord?: string;
    targetLanguageCode?: string;
    synonymsCount?: number;
    postTitle?: string;
    communityName?: string;
    voteType?: 'like' | 'dislike' | 'helpful' | 'accurate';
  };
  languageRegion?: string;
  userRegion?: string;
  createdAt: string;
  timeAgo: string;
  message: string;
  flag: string;
  isPublic: boolean;
  // Champs d'affichage enrichis
  displayLabel?: string;
  displayIcon?: string;
  typeColor?: string;
}

@Injectable({
  providedIn: 'root',
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
      transports: ['websocket', 'polling'],
    });

    // Écouter les nouvelles activités
    this.socket.on(
      'activities:new',
      (data: { activity: Activity; timestamp: string }) => {
        const enriched = this.enrichActivity(data.activity);
        console.log('🔴 Nouvelle activité reçue:', enriched);
        this.addNewActivity(enriched);
      }
    );

    // Écouter les activités récentes
    this.socket.on('activities:recent', (activities: Activity[]) => {
      const enriched = activities.map((a) => this.enrichActivity(a));
      console.log('📋 Activités récentes reçues:', enriched.length);
      this.activitiesSubject.next(enriched);
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
  requestRecentActivities(
    limit: number = 10,
    prioritizeAfrican: boolean = true
  ): void {
    this.socket.emit('activities:request_recent', { limit, prioritizeAfrican });
  }

  // Demander les activités par type
  requestActivitiesByType(activityType: string, limit: number = 5): void {
    this.socket.emit('activities:request_by_type', { activityType, limit });
  }

  // API REST pour les activités (fallback si WebSocket n'est pas disponible)
  getRecentActivities(
    limit: number = 10,
    prioritizeAfrican: boolean = true
  ): Observable<{
    activities: Activity[];
    count: number;
    timestamp: string;
  }> {
    return this.http
      .get<{
        activities: Activity[];
        count: number;
        timestamp: string;
      }>(
        `${environment.apiUrl}/activities/recent?limit=${limit}&prioritizeAfrican=${prioritizeAfrican}`
      )
      .pipe(
        map((res) => ({
          ...res,
          activities: (res.activities || []).map((a) => this.enrichActivity(a)),
        }))
      );
  }

  getActivitiesByType(
    activityType: string,
    limit: number = 5
  ): Observable<{
    activityType: string;
    activities: Activity[];
    count: number;
    timestamp: string;
  }> {
    return this.http
      .get<{
        activityType: string;
        activities: Activity[];
        count: number;
        timestamp: string;
      }>(
        `${environment.apiUrl}/activities/by-type?type=${activityType}&limit=${limit}`
      )
      .pipe(
        map((res) => ({
          ...res,
          activities: (res.activities || []).map((a) => this.enrichActivity(a)),
        }))
      );
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
    return this.http.post(
      `${environment.apiUrl}/activities/test-broadcast`,
      {}
    );
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
      word_created: 'Mot ajouté',
      translation_added: 'Traduction ajoutée',
      synonym_added: 'Synonymes ajoutés',
      word_approved: 'Mot approuvé',
      word_verified: 'Traduction vérifiée',
      community_post_created: 'Publication créée',
      comment_added: 'Commentaire ajouté',
      user_registered: 'Inscription',
      user_logged_in: 'Connexion',
      user_logged_out: 'Déconnexion',
      community_joined: 'Communauté rejointe',
      community_created: 'Communauté créée',
      // Audio & favoris
      audio_added: 'Audio ajouté',
      audio_deleted: 'Audio supprimé',
      audio_bulk_updated: 'Audios mis à jour',
      word_favorited: 'Ajouté aux favoris',
      word_unfavorited: 'Retiré des favoris',
      vote_action: 'Vote',
      word_updated: 'Mot mis à jour',
      word_deleted: 'Mot supprimé',
      achievement_unlocked: 'Succès débloqué',
      xp_gained: 'XP gagné',
      // Contenu
      language_created: 'Langue créée',
      category_created: 'Catégorie créée',
    };

    return typeMap[activityType] || activityType;
  }

  // Obtenir la couleur du type d'activité
  getActivityTypeColor(activityType: string): string {
    const colorMap: { [key: string]: string } = {
      word_created: 'text-green-400',
      translation_added: 'text-blue-400',
      synonym_added: 'text-yellow-400',
      word_approved: 'text-purple-400',
      word_verified: 'text-emerald-400',
      community_post_created: 'text-orange-400',
      comment_added: 'text-cyan-400',
      user_registered: 'text-pink-400',
      user_logged_in: 'text-indigo-400',
      user_logged_out: 'text-indigo-300',
      community_joined: 'text-teal-400',
      community_created: 'text-amber-400',
      audio_added: 'text-sky-400',
      audio_deleted: 'text-red-400',
      audio_bulk_updated: 'text-sky-300',
      word_favorited: 'text-yellow-300',
      word_unfavorited: 'text-yellow-500',
      vote_action: 'text-blue-300',
      word_updated: 'text-orange-300',
      word_deleted: 'text-red-500',
      achievement_unlocked: 'text-fuchsia-400',
      xp_gained: 'text-lime-400',
      language_created: 'text-green-300',
      category_created: 'text-emerald-300',
    };

    return colorMap[activityType] || 'text-gray-400';
  }

  // Nettoyer les ressources
  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // ===== Enrichissement d'activité pour affichage =====
  private enrichActivity(activity: Activity): Activity {
    const a = { ...activity } as Activity;

    // Icône par type
    const iconMap: Record<string, string> = {
      word_created: '📗',
      translation_added: '🔤',
      synonym_added: '🧩',
      word_approved: '✅',
      word_verified: '🛡️',
      community_post_created: '🗣️',
      comment_added: '💬',
      user_registered: '📝',
      user_logged_in: '🔐',
      user_logged_out: '�',
      community_joined: '👥',
      community_created: '🌐',
      audio_added: '🎧',
      audio_deleted: '🗑️',
      audio_bulk_updated: '🎛️',
      word_favorited: '⭐',
      word_unfavorited: '☆',
      vote_action: '👍',
      word_updated: '✏️',
      word_deleted: '🗑️',
      xp_gained: '🏅',
      achievement_unlocked: '🎉',
      language_created: '🈳',
      category_created: '🏷️',
    };

    const type = a.activityType;
    const label = this.formatActivityType(type);
    const color = this.getActivityTypeColor(type);
    const username = a.username || 'Utilisateur';
    const m = a.metadata || {};

    // Drapeau/langue
    a.flag =
      a.flag ||
      m.languageFlag ||
      this.languageCodeToFlag(m.languageCode) ||
      '🌐';

    // Construire un message si absent
    if (!a.message || a.message.trim().length === 0) {
      a.message = this.buildMessage(type, m);
      if (!a.message) {
        // Fallback générique
        a.message = `a effectué une action: ${label.toLowerCase()}`;
      }
    }

    a.displayIcon = iconMap[type] || '⚡';
    a.displayLabel = label;
    a.typeColor = color;

    // timeAgo fallback si manquant
    if (!a.timeAgo && a.createdAt) {
      a.timeAgo = this.timeAgoFrom(new Date(a.createdAt));
    }

    // Assurer un username non vide côté affichage
    a.username = username;
    return a;
  }

  private buildMessage(type: string, m: Activity['metadata']): string {
    switch (type) {
      case 'word_created':
        return m.wordName
          ? `a ajouté le mot « ${m.wordName} »`
          : 'a ajouté un mot';
      case 'translation_added': {
        const target = m.targetLanguageCode
          ? m.targetLanguageCode.toUpperCase()
          : 'une autre langue';
        return m.wordName
          ? `a traduit « ${m.wordName} » vers ${target}`
          : `a ajouté une traduction vers ${target}`;
      }
      case 'audio_added':
        return m.wordName
          ? `a ajouté un audio à « ${m.wordName} »`
          : 'a ajouté un audio';
      case 'audio_deleted':
        return m.wordName
          ? `a supprimé un audio de « ${m.wordName} »`
          : 'a supprimé un audio';
      case 'word_favorited':
        return m.wordName
          ? `a ajouté « ${m.wordName} » aux favoris`
          : 'a ajouté un mot aux favoris';
      case 'word_unfavorited':
        return m.wordName
          ? `a retiré « ${m.wordName} » des favoris`
          : 'a retiré un favori';
      case 'vote_action': {
        const vt = m.voteType || 'like';
        const verb =
          vt === 'dislike'
            ? 'a désapprouvé'
            : vt === 'helpful'
            ? 'a jugé utile'
            : vt === 'accurate'
            ? 'a validé'
            : 'a aimé';
        return m.wordName ? `${verb} « ${m.wordName} »` : `${verb} un contenu`;
      }
      case 'word_updated':
        return m.wordName
          ? `a mis à jour « ${m.wordName} »`
          : 'a mis à jour un mot';
      case 'word_deleted':
        return m.wordName
          ? `a supprimé « ${m.wordName} »`
          : 'a supprimé un mot';
      case 'achievement_unlocked':
        return 'a débloqué un succès';
      case 'xp_gained':
        return 'a gagné de l’XP';
      case 'user_logged_in':
        return "s'est connecté";
      case 'user_logged_out':
        return "s'est déconnecté";
      case 'user_registered':
        return "s'est inscrit";
      case 'community_post_created':
      case 'community_post':
        return m.postTitle
          ? `a posté « ${m.postTitle} »`
          : 'a posté dans la communauté';
      case 'community_created':
        return m.communityName
          ? `a créé la communauté « ${m.communityName} »`
          : 'a créé une communauté';
      case 'language_created':
        return m.languageName
          ? `a ajouté la langue « ${m.languageName} »`
          : 'a ajouté une langue';
      case 'category_created':
        return m.categoryName
          ? `a créé la catégorie « ${m.categoryName} »`
          : 'a créé une catégorie';
      default:
        return '';
    }
  }

  private languageCodeToFlag(code?: string): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      fr: '🇫🇷',
      en: '🇬🇧',
      en_us: '🇺🇸',
      es: '🇪🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      pt_br: '🇧🇷',
      zu: '🇿🇦',
      xh: '🇿🇦',
      st: '🇿🇦',
      tw: '🇬🇭',
      ak: '🇬🇭',
      yo: '🇳🇬',
      ig: '🇳🇬',
      ha: '🇳🇬',
      sw: '🇰🇪',
      am: '🇪🇹',
      ar: '🇲🇦',
    };
    const key = code.toLowerCase();
    return map[key] || undefined;
  }

  private timeAgoFrom(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const intervals: [number, string][] = [
      [60, 's'],
      [60, 'min'],
      [24, 'h'],
      [7, 'j'],
      [4.345, 'sem'],
      [12, 'mois'],
      [Number.MAX_SAFE_INTEGER, 'an'],
    ];
    let count = seconds;
    let unit = 's';
    for (const [step, u] of intervals) {
      if (count < step) {
        unit = u;
        break;
      }
      count = Math.floor(count / step);
      unit = u;
    }
    return `il y a ${count} ${unit}`;
  }
}
