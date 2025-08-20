import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  private openDropdownsSubject = new BehaviorSubject<Set<string>>(new Set());
  public openDropdowns$ = this.openDropdownsSubject.asObservable();

  public toggleDropdown(id: string): void {
    const currentDropdowns = new Set(this.openDropdownsSubject.value);
    if (currentDropdowns.has(id)) {
      currentDropdowns.delete(id);
    } else {
      currentDropdowns.clear(); // Ferme les autres dropdowns
      currentDropdowns.add(id);
    }
    this.openDropdownsSubject.next(currentDropdowns);
  }

  public closeDropdown(id: string): void {
    const currentDropdowns = new Set(this.openDropdownsSubject.value);
    currentDropdowns.delete(id);
    this.openDropdownsSubject.next(currentDropdowns);
  }

  public closeAllDropdowns(): void {
    this.openDropdownsSubject.next(new Set());
  }

  public isDropdownOpen(id: string): boolean {
    return this.openDropdownsSubject.value.has(id);
  }
}
