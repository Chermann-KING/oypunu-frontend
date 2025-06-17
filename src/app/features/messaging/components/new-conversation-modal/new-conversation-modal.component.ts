import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { User } from '../../../../core/models/user';
import { UsersService } from '../../../users/services/users.service';

@Component({
  selector: 'app-new-conversation-modal',
  standalone: false,
  templateUrl: './new-conversation-modal.component.html',
  styleUrl: './new-conversation-modal.component.scss',
})
export class NewConversationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() userSelected = new EventEmitter<User>();

  searchControl = new FormControl('');
  searchResults: User[] = [];
  loading = false;
  error: string | null = null;

  constructor(private _usersService: UsersService) {}

  ngOnInit() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.trim().length < 2) {
            return of([]);
          }
          this.loading = true;
          this.error = null;
          return this._usersService.searchUsers(query.trim());
        })
      )
      .subscribe({
        next: (users) => {
          console.log('Utilisateurs trouvés:', users);
          this.searchResults = users;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur recherche utilisateurs:', error);
          this.error = "Erreur lors de la recherche d'utilisateurs";
          this.loading = false;
        },
      });
  }

  onClose() {
    this.close.emit();
    this.searchControl.setValue('');
    this.searchResults = [];
    this.error = null;
  }

  selectUser(user: User) {
    console.log('selectUser appelé avec:', user);
    this.userSelected.emit(user);
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
