import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GuestLimits {
  wordsViewed: number;
  communitiesViewed: number;
  lastResetDate: string;
  maxWordsPerDay: number;
  maxCommunitiesPerDay: number;
}

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  message: string;
  shouldShowSignupPrompt: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GuestLimitsService {
  private readonly STORAGE_KEY = 'oypunu_guest_limits';
  private readonly DEFAULT_LIMITS: GuestLimits = {
    wordsViewed: 0,
    communitiesViewed: 0,
    lastResetDate: new Date().toDateString(),
    maxWordsPerDay: 3,
    maxCommunitiesPerDay: 2
  };

  private limitsSubject = new BehaviorSubject<GuestLimits>(this.getStoredLimits());
  public limits$ = this.limitsSubject.asObservable();

  constructor() {
    this.checkAndResetDaily();
  }

  /**
   * Vérifier si un visiteur peut consulter un mot
   */
  canViewWord(): LimitResult {
    const limits = this.getCurrentLimits();
    const remaining = Math.max(0, limits.maxWordsPerDay - limits.wordsViewed);
    
    if (limits.wordsViewed >= limits.maxWordsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        message: `Limite atteinte ! Vous avez consulté ${limits.maxWordsPerDay} mots aujourd'hui.`,
        shouldShowSignupPrompt: true
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1, // -1 car on va consommer une consultation
      message: remaining === 1 
        ? 'Dernière consultation gratuite de la journée !' 
        : `${remaining - 1} consultations restantes aujourd'hui`,
      shouldShowSignupPrompt: remaining <= 1
    };
  }

  /**
   * Vérifier si un visiteur peut consulter les communautés
   */
  canViewCommunity(): LimitResult {
    const limits = this.getCurrentLimits();
    const remaining = Math.max(0, limits.maxCommunitiesPerDay - limits.communitiesViewed);
    
    if (limits.communitiesViewed >= limits.maxCommunitiesPerDay) {
      return {
        allowed: false,
        remaining: 0,
        message: `Limite atteinte ! Vous avez consulté ${limits.maxCommunitiesPerDay} communautés aujourd'hui.`,
        shouldShowSignupPrompt: true
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1,
      message: remaining === 1 
        ? 'Dernière consultation de communauté gratuite !' 
        : `${remaining - 1} consultations de communautés restantes`,
      shouldShowSignupPrompt: remaining <= 1
    };
  }

  /**
   * Enregistrer qu'un mot a été consulté
   */
  recordWordView(): boolean {
    const checkResult = this.canViewWord();
    if (!checkResult.allowed) {
      return false;
    }

    const limits = this.getCurrentLimits();
    limits.wordsViewed++;
    this.saveLimits(limits);
    
    console.log(`🔍 Visiteur: Mot consulté (${limits.wordsViewed}/${limits.maxWordsPerDay})`);
    return true;
  }

  /**
   * Enregistrer qu'une communauté a été consultée
   */
  recordCommunityView(): boolean {
    const checkResult = this.canViewCommunity();
    if (!checkResult.allowed) {
      return false;
    }

    const limits = this.getCurrentLimits();
    limits.communitiesViewed++;
    this.saveLimits(limits);
    
    console.log(`👥 Visiteur: Communauté consultée (${limits.communitiesViewed}/${limits.maxCommunitiesPerDay})`);
    return true;
  }

  /**
   * Obtenir les statistiques actuelles du visiteur
   */
  getCurrentStats(): {
    wordsRemaining: number;
    communitiesRemaining: number;
    totalWordsViewed: number;
    totalCommunitiesViewed: number;
  } {
    const limits = this.getCurrentLimits();
    return {
      wordsRemaining: Math.max(0, limits.maxWordsPerDay - limits.wordsViewed),
      communitiesRemaining: Math.max(0, limits.maxCommunitiesPerDay - limits.communitiesViewed),
      totalWordsViewed: limits.wordsViewed,
      totalCommunitiesViewed: limits.communitiesViewed
    };
  }

  /**
   * Vérifier si le visiteur a atteint toutes ses limites
   */
  hasReachedAllLimits(): boolean {
    const limits = this.getCurrentLimits();
    return limits.wordsViewed >= limits.maxWordsPerDay && 
           limits.communitiesViewed >= limits.maxCommunitiesPerDay;
  }

  /**
   * Reset manuel (pour testing)
   */
  resetLimits(): void {
    const resetLimits = {
      ...this.DEFAULT_LIMITS,
      lastResetDate: new Date().toDateString()
    };
    this.saveLimits(resetLimits);
    console.log('🔄 Limites visiteur réinitialisées');
  }

  // ============= MÉTHODES PRIVÉES =============

  getCurrentLimits(): GuestLimits {
    return this.limitsSubject.value;
  }

  private getStoredLimits(): GuestLimits {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const limits = JSON.parse(stored) as GuestLimits;
        // Validation basique des données
        if (limits.lastResetDate && limits.maxWordsPerDay) {
          return limits;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des limites visiteur:', error);
    }
    
    return { ...this.DEFAULT_LIMITS };
  }

  private saveLimits(limits: GuestLimits): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limits));
      this.limitsSubject.next(limits);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des limites visiteur:', error);
    }
  }

  private checkAndResetDaily(): void {
    const limits = this.getCurrentLimits();
    const today = new Date().toDateString();
    
    if (limits.lastResetDate !== today) {
      console.log('🌅 Nouveau jour - Réinitialisation des limites visiteur');
      const resetLimits = {
        ...this.DEFAULT_LIMITS,
        lastResetDate: today
      };
      this.saveLimits(resetLimits);
    }
  }
}