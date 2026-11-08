import type { Store, Route } from './state.ts';
import { badge, banner, el } from './dom.ts';
import { OverviewView } from './views/overview.ts';
import { ModelsView } from './views/models.ts';
import { ModelDetailView } from './views/model-detail.ts';
import { ProfilesView } from './views/profiles.ts';
import { AnalyticsView } from './views/analytics.ts';
import { SettingsView } from './views/settings.ts';
import { EXTENSION_NAME, EXTENSION_VERSION } from '../shared/version.ts';

interface ViewInstance {
  element: HTMLElement;
  update(): void;
}

const ICONS: Record<string, string> = {
  overview:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  models:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3 21 7.5v9L12 21 3 16.5v-9L12 3Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>',
  profiles:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  analytics:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>',
};

function icon(name: string): HTMLElement {
  return el('span', { className: 'orm-nav-icon', html: ICONS[name] ?? '' });
}

function routeKey(route: Route): string {
  if (route.view === 'model') return `model:${route.modelId}:${route.tab}`;
  if (route.view === 'profiles') return `profiles:${route.profileId ?? ''}`;
  return route.view;
}

export class App {
  private element = el('div', { className: 'orm-shell' });
  private navHost = el('nav', { className: 'orm-nav', attrs: { 'aria-label': 'Sections' } });
  private viewHost = el('main', { className: 'orm-main' });
  private bannerHost = el('div', { className: 'orm-global-banners' });
  private connectionHost = el('div', { className: 'orm-nav-foot' });
  private navButtons = new Map<string, { node: HTMLButtonElement; badgeHost: HTMLElement }>();
  private currentKey = '';
  private current: ViewInstance | null = null;
  private updating = false;

  constructor(private readonly store: Store) {
    this.buildShell();
    this.store.subscribe(() => this.update());
    window.addEventListener('focus', () => {
      void this.store.checkExternalChange();
    });
    this.update();
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(this.element);
  }

  private buildShell(): void {
    const brand = el('div', { className: 'orm-brand' }, [
      el('div', { className: 'orm-brand-mark', attrs: { 'aria-hidden': 'true' }, html: ICONS.analytics }),
      el('div', {}, [
        el('div', { className: 'orm-brand-name', text: EXTENSION_NAME }),
        el('div', { className: 'orm-brand-version', text: `v${EXTENSION_VERSION}` }),
      ]),
    ]);

    const items: Array<{ key: Route['view']; label: string; disabled?: boolean }> = [
      { key: 'overview', label: 'Overview' },
      { key: 'models', label: 'Models' },
      { key: 'profiles', label: 'Profiles' },
      { key: 'analytics', label: 'Analytics' },
      { key: 'settings', label: 'Settings' },
    ];
    for (const item of items) {
      const badgeHost = el('span', { className: 'orm-nav-count' });
      const node = el('button', {
        className: 'orm-nav-item',
        attrs: { type: 'button' },
        onClick: () => {
          if (item.key === 'profiles') this.store.navigate({ view: 'profiles' });
          else this.store.navigate({ view: item.key } as Route);
        },
      }, [icon(item.key), el('span', { text: item.label }), badgeHost]);
      this.navButtons.set(item.key, { node, badgeHost });
      this.navHost.append(node);
    }

    const aside = el('aside', { className: 'orm-sidebar' }, [brand, this.navHost, this.connectionHost]);
    this.viewHost.append(this.bannerHost);
    this.element.append(aside, this.viewHost);
  }

  private update(): void {
    if (this.updating) return;
    this.updating = true;
    try {
      this.paint();
    } finally {
      this.updating = false;
    }
  }

  private paint(): void {
    const state = this.store.getState();
    const route = state.route;
    const key = routeKey(route);

    for (const [name, entry] of this.navButtons) {
      const active =
        name === route.view || (route.view === 'model' && name === 'models');
      entry.node.classList.toggle('orm-nav-active', active);
      entry.node.setAttribute('aria-current', active ? 'page' : 'false');
      let count = '';
      if (name === 'models' && state.catalog) count = String(state.catalog.models.length);
      if (name === 'profiles' && state.config) count = String(state.config.config.profiles.length);
      entry.badgeHost.textContent = count;
    }

    this.connectionHost.replaceChildren(
      el('div', { className: 'orm-nav-connection' }, [
        el('span', { className: `orm-dot ${state.connection?.connected ? 'orm-dot-ok' : 'orm-dot-off'}` }),
        el('span', { text: state.connection?.connected ? 'Connected to OpenRouter' : 'Not connected' }),
      ]),
    );

    this.renderBanners(state);
    this.renderRoute(key, route);
  }

  private renderBanners(state: ReturnType<Store['getState']>): void {
    this.bannerHost.replaceChildren();
    if (state.conflict) {
      this.bannerHost.append(
        banner({
          tone: 'warning',
          title: 'Configuration changed on disk',
          body: 'This panel has unsaved assumptions about the file. Reload it before saving anything.',
          action: { label: 'Reload', onClick: () => void this.store.reloadConfig() },
        }),
      );
    }
    if (state.configError && state.config) {
      this.bannerHost.append(
        banner({
          tone: 'error',
          title: 'Configuration could not be re-read',
          body: state.configError.message,
          action: { label: 'Settings', onClick: () => this.store.navigate({ view: 'settings' }) },
        }),
      );
    }
    if (this.store.getState().catalogLoading) {
      this.bannerHost.append(
        el('div', { className: 'orm-loading-line' }, [
          el('span', { className: 'orm-spinner-ring orm-spinner-inline' }),
          el('span', { className: 'orm-muted orm-small', text: 'Syncing with OpenRouter…' }),
        ]),
      );
    }
  }

  private renderRoute(key: string, route: Route): void {
    if (key !== this.currentKey) {
      this.current?.element.remove();
      this.current = this.createView(route);
      this.currentKey = key;
      this.viewHost.append(this.current.element);
      window.scrollTo({ top: 0 });
      return;
    }
    this.current?.update();
  }

  private createView(route: Route): ViewInstance {
    const state = this.store.getState();
    if (state.configError && !state.config && route.view !== 'settings') {
      return {
        element: el('div', { className: 'orm-view orm-recovery' }, [
          el('h1', { text: 'OpenRouter Manager needs attention' }),
          el('p', { className: 'orm-muted', text: state.configError.message }),
          el('p', {
            className: 'orm-muted',
            text: state.configError.readOnly
              ? 'The configuration was written by a newer version. Update the extension; resetting would destroy data this version does not understand.'
              : 'The file can be repaired in Settings: reload it or reset with a timestamped backup.',
          }),
          badge('Configuration not loaded', 'error'),
          el('div', { className: 'orm-actions' }, [
            el('button', {
              className: 'orm-btn orm-btn-primary',
              attrs: { type: 'button' },
              text: 'Open settings',
              onClick: () => this.store.navigate({ view: 'settings' }),
            }),
          ]),
        ]),
        update: () => {},
      };
    }

    switch (route.view) {
      case 'overview':
        return new OverviewView(this.store);
      case 'models':
        return new ModelsView(this.store);
      case 'model':
        return new ModelDetailView(this.store, route.modelId, route.tab);
      case 'profiles':
        return new ProfilesView(this.store);
      case 'analytics':
        return new AnalyticsView(this.store);
      case 'settings':
        return new SettingsView(this.store);
      default:
        return new OverviewView(this.store);
    }
  }
}
