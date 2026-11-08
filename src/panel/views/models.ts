import type { EndpointInfo, ModelSummary } from '../../shared/api-types.ts';
import { bestPercentile } from '../../shared/normalize.ts';
import { formatContext, formatLatencyMs, formatPricePerMillion, formatThroughput, NA } from '../../shared/format.ts';
import type { BrowserState, Store } from '../state.ts';
import { badge, button, el, emptyState, field, selectBox, switchBox, textInput } from '../dom.ts';
import { card, pageHeader, skeletonRows, toolbar } from '../components.ts';

export type EndpointMap = Readonly<Record<string, readonly EndpointInfo[] | undefined>>;

function numeric(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function providerSlugs(endpoints: readonly EndpointInfo[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const endpoint of endpoints ?? []) set.add(endpoint.tag.split('/')[0] ?? endpoint.tag);
  return set;
}

/** Pure so the search, filters, and sorting rules are testable without a DOM. */
export function filterAndSortModels(
  models: readonly ModelSummary[],
  endpoints: EndpointMap,
  browser: BrowserState,
): ModelSummary[] {
  const query = browser.query.trim().toLowerCase();
  const minContext = numeric(browser.minContext);
  const maxInput = numeric(browser.maxInput);
  const maxOutput = numeric(browser.maxOutput);

  const filtered = models.filter((model) => {
    if (query && !`${model.name} ${model.id} ${model.author}`.toLowerCase().includes(query)) return false;
    if (minContext !== null && (model.contextLength === null || model.contextLength < minContext)) return false;
    if (maxInput !== null && (model.inputPerMillion === null || model.inputPerMillion > maxInput)) return false;
    if (maxOutput !== null && (model.outputPerMillion === null || model.outputPerMillion > maxOutput)) return false;
    if (browser.provider && !providerSlugs(endpoints[model.id]).has(browser.provider)) return false;
    if (browser.availableOnly && !(endpoints[model.id] ?? []).some((endpoint) => endpoint.available)) return false;
    return true;
  });

  const value = (model: ModelSummary): number | null => {
    switch (browser.sort) {
      case 'input':
        return model.inputPerMillion;
      case 'output':
        return model.outputPerMillion;
      case 'context':
        return model.contextLength;
      case 'providers': {
        const list = endpoints[model.id];
        return list ? list.length : null;
      }
      case 'latency':
        return bestPercentile(endpoints[model.id] ?? [], 'latencyMs', 'p50');
      case 'throughput':
        return bestPercentile(endpoints[model.id] ?? [], 'throughputTps', 'p50');
      case 'name':
      default:
        return null;
    }
  };

  const direction = browser.direction === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    if (browser.sort === 'name') {
      return a.name.localeCompare(b.name) * direction || a.id.localeCompare(b.id);
    }
    const left = value(a);
    const right = value(b);
    if (left === null && right === null) return a.name.localeCompare(b.name);
    if (left === null) return 1;
    if (right === null) return -1;
    return (left - right) * direction || a.name.localeCompare(b.name);
  });
  return filtered;
}

export const PAGE_SIZE = 25;

const CONTEXT_PRESETS = [
  { value: '', label: 'Any size' },
  { value: '32000', label: 'At least 32K' },
  { value: '128000', label: 'At least 128K' },
  { value: '200000', label: 'At least 200K' },
  { value: '1000000', label: 'At least 1M' },
];

const PRICE_PRESETS = [
  { value: '', label: 'Any price' },
  { value: '0.5', label: 'Up to $0.50 / M' },
  { value: '1', label: 'Up to $1 / M' },
  { value: '3', label: 'Up to $3 / M' },
  { value: '10', label: 'Up to $10 / M' },
];

type SortKey = BrowserState['sort'];

const COLUMNS: Array<{ key: SortKey | null; label: string; numeric?: boolean; hint?: string }> = [
  { key: 'name', label: 'Model' },
  { key: 'context', label: 'Context', numeric: true },
  { key: 'input', label: 'Input', numeric: true, hint: 'Published price per million input tokens' },
  { key: 'output', label: 'Output', numeric: true, hint: 'Published price per million output tokens' },
  { key: 'providers', label: 'Providers', numeric: true, hint: 'Providers with data loaded so far' },
  { key: 'latency', label: 'Fastest start', numeric: true, hint: 'Shortest median wait before the first token, among loaded providers' },
  { key: 'throughput', label: 'Fastest output', numeric: true, hint: 'Highest median tokens per second, among loaded providers' },
  { key: null, label: 'Routing' },
];

export class ModelsView {
  readonly element = el('div', { className: 'orm-view' });
  private resultsHost = el('div');
  private countHost = el('span', { className: 'orm-muted orm-small' });
  private pagerHost = el('div', { className: 'orm-pager' });
  private filterPanel = el('div', { className: 'orm-filter-panel' });
  private filterToggle!: HTMLButtonElement;
  private filtersOpen = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private providerSelect: HTMLElement | null = null;

  constructor(private readonly store: Store) {
    const browser = store.getState().browser;
    const search = textInput(
      browser.query,
      (value) => {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.store.setBrowser({ query: value, page: 0 }), 150);
      },
      { placeholder: 'Search models, e.g. “claude” or “deepseek”' },
    );
    search.setAttribute('aria-label', 'Search models');
    search.type = 'search';

    this.filterToggle = button('Filters', () => this.toggleFilters(), 'outline');
    this.filterToggle.setAttribute('aria-expanded', 'false');

    this.element.append(
      pageHeader({
        title: 'Models',
        subtitle: 'Compare what each model costs and how quickly providers serve it.',
        actions: [button('Refresh', () => void this.store.refreshCatalog(true), 'secondary')],
      }),
      card(null, [
        toolbar([el('div', { className: 'orm-grow' }, [search]), this.filterToggle]),
        this.filterPanel,
        el('div', { className: 'orm-results-meta' }, [this.countHost]),
        this.resultsHost,
        this.pagerHost,
      ]),
    );
    this.buildFilters();
    this.update();
  }

  private toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
    this.filterPanel.hidden = !this.filtersOpen;
    this.filterToggle.setAttribute('aria-expanded', String(this.filtersOpen));
  }

  private activeFilterCount(browser: BrowserState): number {
    return [browser.provider, browser.minContext, browser.maxInput, browser.availableOnly ? 'y' : '']
      .filter(Boolean).length;
  }

  /** Built once; the controls keep focus while the results update. */
  private buildFilters(): void {
    const browser = this.store.getState().browser;
    const context = selectBox(browser.minContext, CONTEXT_PRESETS, (value) =>
      this.store.setBrowser({ minContext: value, page: 0 }),
    );
    const price = selectBox(browser.maxInput, PRICE_PRESETS, (value) =>
      this.store.setBrowser({ maxInput: value, page: 0 }),
    );
    const available = switchBox(
      browser.availableOnly,
      (checked) => this.store.setBrowser({ availableOnly: checked, page: 0 }),
      'Only models with an available provider',
      'Uses loaded provider data.',
    );
    this.providerSelect = el('div', { className: 'orm-provider-select' });
    this.filterPanel.hidden = true;
    this.filterPanel.replaceChildren(
      el('div', { className: 'orm-grid orm-grid-3' }, [
        field('Context window', context),
        field('Input price', price),
        this.providerSelect,
      ]),
      el('div', { className: 'orm-row-between' }, [
        available,
        button('Clear filters', () => this.clearFilters(), 'ghost', { small: true }),
      ]),
    );
  }

  private clearFilters(): void {
    this.store.setBrowser({
      query: '',
      provider: '',
      minContext: '',
      maxInput: '',
      maxOutput: '',
      availableOnly: false,
      page: 0,
    });
    this.buildFilters();
    this.update();
  }

  private renderProviderSelect(): void {
    if (!this.providerSelect) return;
    const suggestions = this.store.providerSuggestions();
    const current = this.store.getState().browser.provider;
    this.providerSelect.replaceChildren(
      suggestions.length === 0
        ? field('Provider', el('span', { className: 'orm-muted orm-small', text: 'Open a model or wait for data to load' }))
        : field(
            'Provider',
            selectBox(
              current,
              [{ value: '', label: 'Any provider' }, ...suggestions.map((entry) => ({ value: entry.slug, label: entry.name }))],
              (value) => this.store.setBrowser({ provider: value, page: 0 }),
            ),
          ),
    );
  }

  update(): void {
    const state = this.store.getState();
    const browser = state.browser;
    this.renderProviderSelect();

    const active = this.activeFilterCount(browser);
    this.filterToggle.textContent = active > 0 ? `Filters (${active})` : 'Filters';

    if (!state.catalog) {
      this.countHost.textContent = '';
      this.pagerHost.replaceChildren();
      this.resultsHost.replaceChildren(
        state.catalogLoading
          ? skeletonRows(8)
          : emptyState('Models could not be loaded', state.catalogError ?? 'Check your connection, then try again.', {
              label: 'Try again',
              onClick: () => void this.store.refreshCatalog(true),
            }),
      );
      return;
    }

    const models = state.catalog.models;
    const endpoints: Record<string, readonly EndpointInfo[]> = {};
    for (const [id, result] of Object.entries(state.endpoints)) {
      if (result) endpoints[id] = result.endpoints;
    }
    const filtered = filterAndSortModels(models, endpoints, browser);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(browser.page, pages - 1);
    const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    this.countHost.textContent = active > 0 || browser.query
      ? `${filtered.length} of ${models.length} models`
      : `${models.length} models`;

    if (visible.length === 0) {
      this.resultsHost.replaceChildren(
        emptyState('No models match', 'Try a shorter search or clear the filters.', {
          label: 'Clear filters',
          onClick: () => this.clearFilters(),
        }),
      );
      this.pagerHost.replaceChildren();
      return;
    }

    this.resultsHost.replaceChildren(this.table(visible, endpoints, browser));
    this.store.queueEndpoints(visible.map((model) => model.id));
    this.renderPager(page, pages, filtered.length);
  }

  private table(visible: ModelSummary[], endpoints: Record<string, readonly EndpointInfo[]>, browser: BrowserState): HTMLElement {
    const state = this.store.getState();
    const headRow = el('tr');
    for (const column of COLUMNS) {
      const th = el('th', { className: column.numeric ? 'orm-num' : undefined, attrs: { scope: 'col' } });
      if (column.key) {
        const active = browser.sort === column.key;
        const arrow = active ? (browser.direction === 'asc' ? ' ↑' : ' ↓') : '';
        th.setAttribute('aria-sort', active ? (browser.direction === 'asc' ? 'ascending' : 'descending') : 'none');
        th.append(
          el('button', {
            className: `orm-sort${active ? ' orm-sort-active' : ''}`,
            text: `${column.label}${arrow}`,
            attrs: { type: 'button', title: column.hint ?? '' },
            onClick: () => {
              const key = column.key as SortKey;
              if (browser.sort === key) {
                this.store.setBrowser({ direction: browser.direction === 'asc' ? 'desc' : 'asc' });
              } else {
                this.store.setBrowser({ sort: key, direction: key === 'name' ? 'asc' : 'desc', page: 0 });
              }
            },
          }),
        );
      } else {
        th.textContent = column.label;
      }
      headRow.append(th);
    }

    const body = el('tbody');
    for (const model of visible) {
      const loaded = endpoints[model.id];
      const loading = state.endpointsLoading[model.id];
      const entry = state.config?.config.models[model.id];
      const profile = this.store.getProfile(entry?.profileId ?? null);
      const routing = !entry
        ? badge('Default', 'neutral')
        : badge(profile ? profile.name : 'Custom', 'info');
      const providerCount = loaded ? String(loaded.length) : loading ? '…' : NA;
      const fastestStart = loaded ? bestPercentile(loaded, 'latencyMs', 'p50') : null;
      const fastestOutput = loaded ? bestPercentile(loaded, 'throughputTps', 'p50') : null;

      body.append(
        el('tr', {}, [
          el('td', {}, [
            el('button', {
              className: 'orm-link-strong',
              text: model.name,
              attrs: { type: 'button', 'aria-label': `Open ${model.name}` },
              onClick: () => this.store.navigate({ view: 'model', modelId: model.id, tab: 'providers' }),
            }),
            el('div', { className: 'orm-mono orm-small orm-muted', text: model.id }),
          ]),
          el('td', { className: 'orm-num', text: formatContext(model.contextLength) }),
          el('td', { className: 'orm-num', text: formatPricePerMillion(model.inputPerMillion) }),
          el('td', { className: 'orm-num', text: formatPricePerMillion(model.outputPerMillion) }),
          el('td', { className: 'orm-num', text: providerCount }),
          el('td', { className: 'orm-num', text: formatLatencyMs(fastestStart) }),
          el('td', { className: 'orm-num', text: formatThroughput(fastestOutput) }),
          el('td', {}, [routing]),
        ]),
      );
    }

    const table = el('table', { className: 'orm-table orm-table-models', attrs: { 'aria-label': 'Models' } });
    table.append(el('thead', {}, [headRow]), body);
    return el('div', { className: 'orm-table-wrap' }, [table]);
  }

  private renderPager(page: number, pages: number, total: number): void {
    if (pages <= 1) {
      this.pagerHost.replaceChildren();
      return;
    }
    const from = page * PAGE_SIZE + 1;
    const to = Math.min(total, (page + 1) * PAGE_SIZE);
    this.pagerHost.replaceChildren(
      el('span', { className: 'orm-muted orm-small', text: `${from}–${to} of ${total}` }),
      el('div', { className: 'orm-actions' }, [
        button('Previous', () => {
          this.store.setBrowser({ page: Math.max(0, page - 1) });
          window.scrollTo({ top: 0 });
        }, 'secondary', { small: true, disabled: page === 0 }),
        button('Next', () => {
          this.store.setBrowser({ page: Math.min(pages - 1, page + 1) });
          window.scrollTo({ top: 0 });
        }, 'secondary', { small: true, disabled: page >= pages - 1 }),
      ]),
    );
  }
}
