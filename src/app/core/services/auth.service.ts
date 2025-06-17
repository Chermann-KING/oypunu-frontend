import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { RegisterResponse } from '../models/auth-response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _API_URL = `${environment.apiUrl}/auth`;
  private _currentUserSubject = new BehaviorSubject<User | null>(null);

  currentUser$ = this._currentUserSubject.asObservable();

  constructor(private _http: HttpClient, private _router: Router) {
    this._loadUserFromStorage();
  }

  private _loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      this._currentUserSubject.next(JSON.parse(user));
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this._http
      .post<AuthResponse>(`${this._API_URL}/login`, { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem('token', response.tokens.access_token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this._currentUserSubject.next(response.user);
        }),
        catchError((error) => {
          console.error('Login error:', error);
          return throwError(
            () => new Error(error.error?.message || 'Identification échouée')
          );
        })
      );
  }

  register(
    username: string,
    email: string,
    password: string,
    nativeLanguage?: string
  ): Observable<RegisterResponse> {
    return this._http
      .post<RegisterResponse>(`${this._API_URL}/register`, {
        username,
        email,
        password,
        nativeLanguage,
      })
      .pipe(
        tap((response) => {
          // Si l'inscription ne nécessite pas de vérification email (cas des réseaux sociaux)
          // ou si les tokens sont présents, on connecte l'utilisateur
          if (
            !response.needsEmailVerification &&
            response.tokens &&
            response.user
          ) {
            localStorage.setItem('token', response.tokens.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            this._currentUserSubject.next(response.user);
          }
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  "Une erreur est survenue lors de l'inscription"
              )
          );
        })
      );
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this._http
      .get<{ message: string }>(`${this._API_URL}/verify-email/${token}`)
      .pipe(
        catchError((error) => {
          console.error('Email verification error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || "Erreur de vérification d'email"
              )
          );
        })
      );
  }

  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/resend-verification`, {
        email,
      })
      .pipe(
        catchError((error) => {
          console.error('Resend verification error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  "Erreur lors de l'envoi du mail de vérification"
              )
          );
        })
      );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/forgot-password`, {
        email,
      })
      .pipe(
        catchError((error) => {
          console.error('Forgot password error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  'Erreur lors de la demande de réinitialisation'
              )
          );
        })
      );
  }

  resetPassword(
    token: string,
    password: string
  ): Observable<{ message: string }> {
    return this._http
      .post<{ message: string }>(`${this._API_URL}/reset-password`, {
        token,
        password,
      })
      .pipe(
        catchError((error) => {
          console.error('Reset password error:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message ||
                  'Erreur lors de la réinitialisation du mot de passe'
              )
          );
        })
      );
  }

  // Méthodes d'authentification sociale
  loginWithGoogle(): Observable<AuthResponse> {
    // Ouvrir une nouvelle fenêtre pour l'authentification Google
    const authWindow = window.open(
      `${this._API_URL}/google`,
      '_blank',
      'width=500,height=600'
    );

    if (!authWindow) {
      return throwError(
        () =>
          new Error(
            'Blocage de fenêtre popup détecté. Veuillez autoriser les popups pour ce site.'
          )
      );
    }

    return this._handleSocialAuthWindow(authWindow);
  }

  loginWithFacebook(): Observable<AuthResponse> {
    // Ouvrir une nouvelle fenêtre pour l'authentification Facebook
    const authWindow = window.open(
      `${this._API_URL}/facebook`,
      '_blank',
      'width=500,height=600'
    );

    if (!authWindow) {
      return throwError(
        () =>
          new Error(
            'Blocage de fenêtre popup détecté. Veuillez autoriser les popups pour ce site.'
          )
      );
    }

    return this._handleSocialAuthWindow(authWindow);
  }

  loginWithTwitter(): Observable<AuthResponse> {
    // Ouvrir une nouvelle fenêtre pour l'authentification Twitter
    const authWindow = window.open(
      `${this._API_URL}/twitter`,
      '_blank',
      'width=500,height=600'
    );

    if (!authWindow) {
      return throwError(
        () =>
          new Error(
            'Blocage de fenêtre popup détecté. Veuillez autoriser les popups pour ce site.'
          )
      );
    }

    return this._handleSocialAuthWindow(authWindow);
  }

  private _handleSocialAuthWindow(
    authWindow: Window
  ): Observable<AuthResponse> {
    return new Observable<AuthResponse>((observer) => {
      // Fonction pour vérifier si la fenêtre est fermée
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);

          // Vérifier si l'utilisateur a été authentifié
          const token = localStorage.getItem('social_auth_token');
          if (token) {
            // Supprimer le token temporaire
            localStorage.removeItem('social_auth_token');

            // Obtenir les informations de l'utilisateur
            this._http
              .get<AuthResponse>(
                `${this._API_URL}/social-auth-callback?token=${token}`
              )
              .pipe(
                tap((response) => {
                  localStorage.setItem('token', response.tokens.access_token);
                  localStorage.setItem('user', JSON.stringify(response.user));
                  this._currentUserSubject.next(response.user);
                })
              )
              .subscribe({
                next: (response) => observer.next(response),
                error: (error) => observer.error(error),
                complete: () => observer.complete(),
              });
          } else {
            observer.error(
              new Error("L'authentification sociale a échoué ou a été annulée")
            );
            observer.complete();
          }
        }
      }, 500);

      // Fonction pour nettoyer l'intervalle si l'utilisateur annule l'observation
      return {
        unsubscribe: () => {
          clearInterval(checkClosed);
          if (!authWindow.closed) {
            authWindow.close();
          }
        },
      };
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._currentUserSubject.next(null);
    this._router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!token && !!user && !!this._currentUserSubject.value;
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    // Vérifier si le token est expiré
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        this.logout();
        return null;
      }
      return token;
    } catch {
      this.logout();
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this._currentUserSubject.value;
  }

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this._currentUserSubject.next(user);
  }
}
