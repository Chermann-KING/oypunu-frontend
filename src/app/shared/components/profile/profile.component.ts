import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user';
import { UserRole } from '../../../core/models/admin';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  isDropdownOpen = false;
  currentUser: User | null = null;
  userRole: UserRole = UserRole.USER;

  private subscription = new Subscription();

  // Référence pour l'enum dans le template
  UserRole = UserRole;

  constructor(
    private _authService: AuthService,
    private _elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this._authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        this.userRole = (user?.role as UserRole) || UserRole.USER;

        // 🔍 DEBUG: Afficher les informations d'accès admin
        console.log('🔍 ProfileComponent - Utilisateur actuel:', user);
        console.log('🔍 ProfileComponent - Rôle détecté:', this.userRole);
        console.log(
          '🔍 ProfileComponent - Peut accéder admin:',
          this.canAccessAdmin
        );
        console.log(
          '🔍 ProfileComponent - UserRole.CONTRIBUTOR:',
          UserRole.CONTRIBUTOR
        );
        console.log('🔍 ProfileComponent - UserRole.ADMIN:', UserRole.ADMIN);
        console.log(
          '🔍 ProfileComponent - UserRole.SUPERADMIN:',
          UserRole.SUPERADMIN
        );
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout(): void {
    this._authService.logout();
    this.isDropdownOpen = false;
  }

  // Vérifie si l'utilisateur peut accéder au dashboard admin
  get canAccessAdmin(): boolean {
    return (
      this.userRole === UserRole.CONTRIBUTOR ||
      this.userRole === UserRole.ADMIN ||
      this.userRole === UserRole.SUPERADMIN
    );
  }

  // Détecter un clic en dehors de la dropdown pour la fermer
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this._elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}
