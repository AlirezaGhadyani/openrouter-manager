import { formatContext, formatPricePerMillion } from '../../shared/format.ts';
import type { Store } from '../state.ts';
import { badge, button, el, emptyState } from '../dom.ts';
import { pageHeader, skeletonRows } from '../components.ts';
import { ProvidersPanel } from './model-providers.ts';
import { RoutingPanel } from './model-routing.ts';

type Tab = 'providers' | 'routing';

export class ModelDetailView {
  readonly element = el('div', { className: 'orm-view' });
  private headerHost = el('div');
  private tabsHost = el('div', { className: 'orm-tabs', attrs: { role: 'tablist' } });
  private contentHost = el('div');
  private tab: Tab;
  private providers: ProvidersPanel | null = null;
  private routing: RoutingPanel | null = null;

  constructor(
    private readonly store: Store,
    private readonly modelId: string,
    initialTab: Tab,
  ) {
    this.tab = initialTab;
    this.element.append(this.headerHost, this.tabsHost, this.contentHost);
    this.update();
  }

  update(): void {
    const state = this.store.getState();
    const model = this.store.getModel(this.modelId);

    if (!model) {
      this.tabsHost.replaceChildren();
      this.headerHost.replaceChildren(pageHeader({ title: state.catalog ? 'Model not found' : 'Loading…', subtitle: this.modelId }));
      this.contentHost.replaceChildren(
        state.catalog
          ? emptyState('This model is no longer listed', 'OpenRouter may have removed it. Saved routing for it stays in your settings but is not used.', {
              label: 'Back to models',
              onClick: () => this.store.navigate({ view: 'models' }),
            })
          : skeletonRows(3),
      );
      return;
    }

    const entry = state.config?.config.models[model.id];
    const profile = state.config ? this.store.getProfile(entry?.profileId ?? null) : null;
    const status = entry
      ? badge(profile ? `Uses ${profile.name}` : 'Custom routing', 'info')
      : badge('OpenRouter default', 'neutral');
    const modalities = [...model.inputModalities].join(', ') || 'text';

    this.headerHost.replaceChildren(
      pageHeader({
        title: model.name,
        subtitle: model.id,
        actions: [
          button('Copy ID', () => void this.store.copy(model.id, 'Model ID copied'), 'outline', { small: true }),
          button('Back', () => this.store.navigate({ view: 'models' }), 'ghost', { small: true }),
        ],
      }),
      el('div', { className: 'orm-facts' }, [
        this.fact('Context', formatContext(model.contextLength)),
        this.fact('Input', formatPricePerMillion(model.inputPerMillion), '/ M tokens'),
        this.fact('Output', formatPricePerMillion(model.outputPerMillion), '/ M tokens'),
        this.fact('Accepts', modalities),
        el('div', { className: 'orm-fact' }, [el('span', { className: 'orm-fact-label', text: 'Routing' }), status]),
      ]),
    );

    this.tabsHost.replaceChildren(
      this.tabButton('providers', 'Providers'),
      this.tabButton('routing', 'Routing'),
    );

    if (this.tab === 'providers') {
      if (!this.providers) this.providers = new ProvidersPanel(this.store, model.id, model.canonicalSlug);
      else this.providers.update();
      this.contentHost.replaceChildren(this.providers.element);
    } else {
      if (!this.routing) this.routing = new RoutingPanel(this.store, model.id, model.canonicalSlug);
      else this.routing.update();
      this.contentHost.replaceChildren(this.routing.element);
    }
  }

  private fact(label: string, value: string, unit?: string): HTMLElement {
    return el('div', { className: 'orm-fact' }, [
      el('span', { className: 'orm-fact-label', text: label }),
      el('span', { className: 'orm-fact-value' }, [
        el('span', { text: value }),
        unit ? el('span', { className: 'orm-fact-unit', text: ` ${unit}` }) : null,
      ]),
    ]);
  }

  private tabButton(id: Tab, label: string): HTMLElement {
    const active = this.tab === id;
    return el('button', {
      className: `orm-tab${active ? ' orm-tab-active' : ''}`,
      text: label,
      attrs: { type: 'button', role: 'tab', 'aria-selected': String(active) },
      onClick: () => {
        if (this.tab === id) return;
        this.tab = id;
        this.update();
      },
    });
  }
}
