import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() {}

  private addToast(toast: Omit<Toast, 'id'>): void {
    const id = Date.now().toString();
    const newToast: Toast = { ...toast, id };
    
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeToast(id);
    }, toast.duration || 5000);
  }

  success(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number): void {
    this.addToast({ type: 'info', title, message, duration });
  }

  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }

  clear(): void {
    this.toastsSubject.next([]);
  }
}