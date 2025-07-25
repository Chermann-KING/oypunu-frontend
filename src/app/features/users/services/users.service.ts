import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { User } from '../../../core/models/user';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  searchUsers(query: string): Observable<User[]> {
    console.log(
      "[UsersService] Recherche d'utilisateurs avec la requête:",
      query
    );
    console.log("[UsersService] URL de l'API:", `${this.apiUrl}/search`);

    const params = new HttpParams().set('search', query);

    return this.http.get<User[]>(`${this.apiUrl}/search`, { params }).pipe(
      tap((users) => {
        console.log('[UsersService] Utilisateurs trouvés:', users);
        console.log("[UsersService] Nombre d'utilisateurs:", users.length);
      }),
      catchError((error) => {
        console.error('[UsersService] Erreur lors de la recherche:', error);
        console.error("[UsersService] Statut de l'erreur:", error.status);
        console.error("[UsersService] Message d'erreur:", error.message);
        console.error("[UsersService] Corps de l'erreur:", error.error);
        return of([]); // Retourner un tableau vide en cas d'erreur
      })
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }
}
