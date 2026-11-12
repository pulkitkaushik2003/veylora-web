import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    header { position: sticky; top: 0; z-index: 10; background: rgb(255 247 237 / 94%); backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); padding: 12px max(16px, calc((100vw - 1200px) / 2)); display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .brand { font-weight: 800; color: var(--brand); font-size: 1.2rem; letter-spacing: -0.04em; }
    nav { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
    nav a { padding: 7px 12px; border-radius: 9px; color: var(--muted); text-decoration: none; font-size: .92rem; font-weight: 550; transition: background-color 140ms ease, color 140ms ease; }
    nav a:hover { background: #fff0df; color: var(--brand); }
    nav a.active { background: rgb(194 65 12 / 10%); color: var(--brand-dark); font-weight: 700; }
    main { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }
    @media (max-width: 640px) {
      header { gap: 10px; padding: 10px 14px; }
      nav { order: 3; flex-basis: 100%; }
      nav a { padding: 6px 9px; font-size: .84rem; }
      main { padding: 20px 14px; }
    }
  `],
  template: `
    <header>
      <span class="brand">Veylora</span>
      <nav>
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/devices" routerLinkActive="active">Devices</a>
        <a routerLink="/campaigns" routerLinkActive="active">Campaigns</a>
        <a routerLink="/templates" routerLinkActive="active">Templates</a>
        <a routerLink="/audio" routerLinkActive="active">Audio</a>
        <a routerLink="/logs" routerLinkActive="active">Logs</a>
        <a routerLink="/settings" routerLinkActive="active">Settings</a>
      </nav>
      <span class="muted">{{ auth.user()?.name }}</span>
      <button class="ghost" (click)="auth.logout()">Log out</button>
    </header>
    <main><router-outlet /></main>`
})
export class Shell {
  auth = inject(AuthService);
}