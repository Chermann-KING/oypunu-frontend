import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent implements OnInit {
  now = new Date().getFullYear();
  isAuthenticated = false;

  constructor(private _authService: AuthService) {}

  ngOnInit(): void {
    // S'abonner aux changements d'état d'authentification
    this._authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
    });
  }
}
