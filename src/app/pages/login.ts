import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorText } from '../core/api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  styles: [`
    .wrap { max-width: 420px; margin: clamp(48px, 11vh, 120px) auto; padding: 0 16px; }
    .wrap > h1 { margin-bottom: 18px; color: var(--brand); font-size: 2rem; text-align: center; }
    .wrap .card { padding: 26px; }
    .link { min-height: 40px; border: 0; background: none; color: var(--brand); padding: 4px; font-size: .9rem; }
    .link:hover:not(:disabled) { background: #fff0df; color: var(--brand-dark); }
    @media (max-width: 480px) { .wrap .card { padding: 20px; } }
  `],
  template: `
    <div class="wrap">
      <h1>Veylora</h1>
      <div class="card">
        <h2>{{ mode() === 'login' ? 'Log in' : 'Create account' }}</h2>
        @if (message()) { <div class="msg" [class.ok]="ok()" [class.err]="!ok()">{{ message() }}</div> }
        @if (mode() === 'register') {
          <label>Name</label>
          <input [(ngModel)]="name" autocomplete="name">
        }
        <label>Email</label>
        <input type="email" [(ngModel)]="email" autocomplete="email">
        <label>Password</label>
        <input type="password" [(ngModel)]="password" autocomplete="current-password" (keyup.enter)="submit()">
        <div class="row" style="margin-top:14px">
          <button (click)="submit()" [disabled]="busy()">{{ mode() === 'login' ? 'Log in' : 'Create account' }}</button>
          <button class="link" (click)="toggle()">{{ mode() === 'login' ? 'New here? Create account' : 'Have an account? Log in' }}</button>
        </div>
      </div>
    </div>`
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  mode = signal<'login' | 'register'>('login');
  busy = signal(false);
  message = signal('');
  ok = signal(false);
  name = ''; email = ''; password = '';

  toggle() { this.mode.update(m => (m === 'login' ? 'register' : 'login')); this.message.set(''); }

  async submit() {
    if (!this.email || !this.password) { this.say('Enter your email and password.', false); return; }
    this.busy.set(true);
    try {
      if (this.mode() === 'register') {
        if (!this.name || this.password.length < 8) { this.say('Enter a name and a password of at least 8 characters.', false); return; }
        await this.auth.register(this.name, this.email, this.password);
        this.mode.set('login');
        this.say('Account created. Now log in.', true);
      } else {
        await this.auth.login(this.email, this.password);
        this.router.navigateByUrl('/');
      }
    } catch (e) {
      this.say(errorText(e), false);
    } finally {
      this.busy.set(false);
    }
  }

  private say(text: string, ok: boolean) { this.message.set(text); this.ok.set(ok); }
}
