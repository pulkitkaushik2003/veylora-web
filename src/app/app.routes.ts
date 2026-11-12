import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then(m => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell').then(m => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard').then(m => m.DashboardPage) },
      { path: 'devices', loadComponent: () => import('./pages/devices').then(m => m.DevicesPage) },
      { path: 'campaigns', loadComponent: () => import('./pages/campaigns').then(m => m.CampaignsPage) },
      { path: 'campaigns/:id', loadComponent: () => import('./pages/campaign-detail').then(m => m.CampaignDetailPage) },
      { path: 'templates', loadComponent: () => import('./pages/templates').then(m => m.TemplatesPage) },
      { path: 'audio', loadComponent: () => import('./pages/audio').then(m => m.AudioPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings').then(m => m.SettingsPage) },
      { path: 'logs', loadComponent: () => import('./pages/logs').then(m => m.LogsPage) }
    ]
  },
  { path: '**', redirectTo: '' }
];