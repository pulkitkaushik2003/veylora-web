import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly user = signal<User | null>(this.stored());

  private stored(): User | null {
    try { return JSON.parse(localStorage.getItem('veylora.user') || 'null'); } catch { return null; }
  }

  private remember(user: User | null) {
    this.user.set(user);
    try {
      if (user) localStorage.setItem('veylora.user', JSON.stringify(user));
      else localStorage.removeItem('veylora.user');
    } catch { /* storage may be blocked; the session cookie still works */ }
  }

  /** Makes the backend set the XSRF cookie, then logs in. */
  async login(email: string, password: string) {
    await firstValueFrom(this.api.csrf());
    this.remember(await firstValueFrom(this.api.login(email, password)));
    await firstValueFrom(this.api.csrf()); // refresh the token after the session changed
  }

  async register(name: string, email: string, password: string) {
    await firstValueFrom(this.api.csrf());
    await firstValueFrom(this.api.register(name, email, password));
  }

  /** True when the saved login is still valid on the server. Also makes sure the XSRF cookie exists. */
  async checkSession(): Promise<boolean> {
    if (!this.user()) return false;
    try {
      await firstValueFrom(this.api.csrf());
      await firstValueFrom(this.api.devices());
      return true;
    } catch {
      this.remember(null);
      return false;
    }
  }

  async logout() {
    try {
      await firstValueFrom(this.api.csrf());
      await firstValueFrom(this.api.logout());
    } catch { /* clear locally anyway */ }
    this.remember(null);
    this.router.navigateByUrl('/login');
  }

  expired() {
    this.remember(null);
    this.router.navigateByUrl('/login');
  }
}
