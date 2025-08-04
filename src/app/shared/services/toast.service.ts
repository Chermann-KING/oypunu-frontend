import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  icon?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  private defaultDuration = 5000;
  private maxToasts = 5;

  constructor() {}

  /**
   * Affiche un toast de succès
   */
  success(title: string, message?: string, options?: Partial<Toast>): void {
    this.show({
      type: 'success',
      title,
      message,
      icon: '✅',
      ...options
    });
  }

  /**
   * Affiche un toast d'erreur
   */
  error(title: string, message?: string, options?: Partial<Toast>): void {
    this.show({
      type: 'error',
      title,
      message,
      icon: '❌',
      duration: 8000, // Plus long pour les erreurs
      ...options
    });
  }

  /**
   * Affiche un toast d'avertissement
   */
  warning(title: string, message?: string, options?: Partial<Toast>): void {
    this.show({
      type: 'warning',
      title,
      message,
      icon: '⚠️',
      ...options
    });
  }

  /**
   * Affiche un toast d'information
   */
  info(title: string, message?: string, options?: Partial<Toast>): void {
    this.show({
      type: 'info',
      title,
      message,
      icon: 'ℹ️',
      ...options
    });
  }

  /**
   * Affiche un toast personnalisé
   */
  show(toast: Partial<Toast>): void {
    const newToast: Toast = {
      id: this.generateId(),
      type: 'info',
      title: '',
      duration: this.defaultDuration,
      dismissible: true,
      position: 'top-right',
      ...toast
    };

    const currentToasts = this.toastsSubject.value;
    
    // Limiter le nombre de toasts affichés
    if (currentToasts.length >= this.maxToasts) {
      currentToasts.shift(); // Supprimer le plus ancien
    }

    const updatedToasts = [...currentToasts, newToast];
    this.toastsSubject.next(updatedToasts);

    // Auto-dismiss si une durée est spécifiée
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(newToast.id);
      }, newToast.duration);
    }
  }

  /**
   * Supprime un toast spécifique
   */
  dismiss(toastId: string): void {
    const currentToasts = this.toastsSubject.value;
    const updatedToasts = currentToasts.filter(toast => toast.id !== toastId);
    this.toastsSubject.next(updatedToasts);
  }

  /**
   * Supprime tous les toasts
   */
  dismissAll(): void {
    this.toastsSubject.next([]);
  }

  /**
   * Génère un ID unique pour chaque toast
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Raccourcis pour des cas d'usage fréquents
   */
  
  // Opérations CRUD
  itemCreated(itemName: string): void {
    this.success('Créé avec succès', `${itemName} a été créé`);
  }

  itemUpdated(itemName: string): void {
    this.success('Mis à jour', `${itemName} a été modifié`);
  }

  itemDeleted(itemName: string): void {
    this.success('Supprimé', `${itemName} a été supprimé`);
  }

  // Erreurs réseau
  networkError(): void {
    this.error('Erreur de connexion', 'Vérifiez votre connexion internet');
  }

  serverError(): void {
    this.error('Erreur serveur', 'Une erreur est survenue, veuillez réessayer');
  }

  // Messages d'authentification
  loginSuccess(username?: string): void {
    this.success('Connexion réussie', username ? `Bienvenue ${username} !` : 'Vous êtes connecté');
  }

  logoutSuccess(): void {
    this.info('Déconnexion', 'À bientôt !');
  }

  authRequired(): void {
    this.warning('Connexion requise', 'Vous devez être connecté pour accéder à cette page');
  }

  // Messages de validation
  formValidationError(): void {
    this.error('Formulaire invalide', 'Veuillez corriger les erreurs dans le formulaire');
  }

  // Messages de chargement avec Promise
  async withLoading<T>(
    promise: Promise<T>, 
    loadingMessage: string,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T> {
    const loadingToast = {
      id: this.generateId(),
      type: 'info' as const,
      title: loadingMessage,
      duration: 0, // Pas d'auto-dismiss
      dismissible: false,
      icon: '⏳'
    };

    this.show(loadingToast);

    try {
      const result = await promise;
      this.dismiss(loadingToast.id);
      
      if (successMessage) {
        this.success(successMessage);
      }
      
      return result;
    } catch (error) {
      this.dismiss(loadingToast.id);
      
      if (errorMessage) {
        this.error(errorMessage);
      }
      
      throw error;
    }
  }
}