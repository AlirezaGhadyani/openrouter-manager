import { formatCount, formatRelativeTime } from '../../shared/format.ts';
import { EXTENSION_VERSION } from '../../shared/version.ts';
import type { Store } from '../state.ts';
import { badge, banner, button, el, emptyState } from '../dom.ts';
import { card, pageHeader, statCard } from '../components.ts';

interface Attention {
  tone: 'error' | 'warning' | 'info';
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}

export class OverviewView {
  readonly element = el('div', { className: 'orm-view' });
  private body = el('div', { className: 'orm-view-body' });

  constructor(private readonly store: Store) {
    this.element.append(this.body);
    this.update();
  }

  private attention(): Attention[] {
    const state = this.store.getState();
    const items: Attention[] = [];
    const config = state.config?.config;
    const status = state.status;

    if (state.connection && !state.connection.connected) {
      items.push({
        tone: 'info',
        title: 'Connect OpenRouter',
        body: 'Routing still works without a key, but latency and throughput appear only with one.',
        action: { label: 'Open settings', onClick: () => this.store.navigate({ view: 'settings' }) },
      });
    }
    if (state.configError) {
      items.push({
        tone: 'error',
        title: 'Your saved routing could not be read',
        body: state.configError.message,
        action: { label: 'Fix in settings', onClick: () => this.store.navigate({ view: 'settings' }) },
      });
    }
    if (state.conflict) {
      items.push({
        tone: 'warning',
        title: 'Routing was changed elsewhere',
        body: 'Reload before saving so nothing is overwritten.',
        action: { label: 'Reload', onClick: () => void this.store.reloadConfig() },
      });
    }
    if (state.catalog?.stale) {
      items.push({
        tone: 'warning',
        title: 'Showing saved model data',
        body: state.catalog.error ?? 'The latest refresh failed.',
        action: { label: 'Try again', onClick: () => void this.store.refreshCatalog(true) },
      });
    }
    if (status && status.pluginVersion !== EXTENSION_VERSION) {
      items.push({
        tone: 'warning',
        title: 'Restart OpenCode to finish the update',
        body: `Running plugin v${status.pluginVersion}; this extension is v${EXTENSION_VERSION}.`,
      });
    }
    if (config && status && (status.configRevision ?? -1) < config.revision) {
      items.push({
        tone: 'info',
        title: 'Latest routing applies to the next request',
        body: 'Your most recent change has been saved and will be used the next time a model runs.',
      });
    }
    if (!status && config && Object.keys(config.models).length > 0) {
      items.push({
        tone: 'info',
        title: 'Routing is saved but not confirmed yet',
        body: 'Send one request to a model with routing to confirm it is in use.',
      });
    }
    return items;
  }

  update(): void {
    const state = this.store.getState();
    const config = state.config?.config;
    const stats = this.store.stats();
    const connected = state.connection?.connected ?? null;
    this.body.replaceChildren();

    this.body.append(
      pageHeader({
        title: 'Overview',
        subtitle: 'Set how OpenRouter picks providers for each model.',
        actions: [
          button('Refresh', () => void this.store.refreshCatalog(true), 'secondary'),
          button('Browse models', () => this.store.navigate({ view: 'models' }), 'primary'),
        ],
      }),
    );

    const attention = this.attention();
    if (attention.length > 0) {
      this.body.append(
        el('div', { className: 'orm-stack' }, attention.map((item) =>
          banner({
            tone: item.tone === 'error' ? 'error' : item.tone === 'warning' ? 'warning' : 'info',
            title: item.title,
            body: item.body,
            ...(item.action ? { action: item.action } : {}),
          }),
        )),
      );
    }

    const customCount = stats?.custom ?? 0;
    this.body.append(
      el('div', { className: 'orm-stats' }, [
        statCard('Models', stats ? formatCount(stats.models) : '—', state.catalog ? `Updated ${formatRelativeTime(state.catalog.fetchedAt)}` : 'Loading…'),
        statCard('With custom routing', stats ? formatCount(customCount) : '—', customCount === 0 ? 'None yet. Others use OpenRouter defaults.' : 'The rest use OpenRouter defaults.', customCount > 0 ? 'success' : 'neutral'),
        statCard('Excluded providers', stats ? formatCount(stats.excluded) : '—', stats && stats.excluded > 0 ? 'Across your routing rules' : 'None', stats && stats.excluded > 0 ? 'warning' : 'neutral'),
        statCard('OpenRouter', connected === null ? '—' : connected ? 'Connected' : 'Not connected', connected ? 'Latency and throughput are available' : 'Connect a key in settings', connected ? 'success' : 'warning'),
      ]),
    );

    this.body.append(
      el('div', { className: 'orm-grid orm-grid-main' }, [
        this.recentCard(),
        this.runtimeCard(),
      ]),
    );

  }

  private recentCard(): HTMLElement {
    const config = this.store.getState().config?.config;
    const entries = config ? Object.entries(config.models) : [];
    entries.sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt));
    const recent = entries.slice(0, 5);

    if (recent.length === 0) {
      return card('Recently changed', emptyState(
        'No model has custom routing yet',
        'Pick a model to choose providers, price limits, or speed preferences.',
        { label: 'Choose a model', onClick: () => this.store.navigate({ view: 'models' }) },
      ), { subtitle: 'Models you change routing for appear here' });
    }

    const list = el('ul', { className: 'orm-list-plain' });
    for (const [id, entry] of recent) {
      const model = this.store.getModel(id);
      const profile = this.store.getProfile(entry.profileId);
      const label = profile ? profile.name : 'Custom';
      list.append(
        el('li', { className: 'orm-row-item' }, [
          el('button', {
            className: 'orm-row-button',
            attrs: { type: 'button' },
            onClick: () => this.store.navigate({ view: 'model', modelId: id, tab: 'routing' }),
          }, [
            el('span', { className: 'orm-row-main' }, [
              el('span', { className: 'orm-row-title', text: model?.name ?? id }),
              el('span', { className: 'orm-row-meta', text: `${label} · ${formatRelativeTime(entry.updatedAt)}` }),
            ]),
            el('span', { className: 'orm-row-end', text: 'Edit' }),
          ]),
        ]),
      );
    }
    return card('Recently changed', list, {
      actions: [button('All profiles', () => this.store.navigate({ view: 'profiles' }), 'ghost', { small: true })],
    });
  }

  private runtimeCard(): HTMLElement {
    const status = this.store.getState().status;
    const body = el('div', { className: 'orm-stack-tight' });
    if (!status) {
      body.append(
        el('p', { className: 'orm-body', text: 'Not active yet.' }),
        el('p', { className: 'orm-muted orm-small', text: 'Routing starts when OpenCode loads the plugin. Restart OpenCode if it has been enabled recently.' }),
      );
    } else {
      body.append(
        el('div', { className: 'orm-row-between' }, [
          el('span', { className: 'orm-body', text: 'Active' }),
          badge('Running', 'success'),
        ]),
      );
      if (status.lastApplied) {
        body.append(
          el('p', { className: 'orm-muted orm-small', text: `Last routed request: ${status.lastApplied.modelID}` }),
          el('p', { className: 'orm-muted orm-small', text: formatRelativeTime(status.lastApplied.at) }),
        );
      } else {
        body.append(el('p', { className: 'orm-muted orm-small', text: 'No routed request yet since OpenCode started.' }));
      }
    }
    return card('Runtime', body, {
      actions: [button('Check', () => void this.store.refreshStatus(), 'ghost', { small: true })],
    });
  }
}
