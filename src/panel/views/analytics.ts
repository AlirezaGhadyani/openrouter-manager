import { formatCount, formatPricePerMillion, formatUptime, NA } from '../../shared/format.ts';
import type { AnalyticsSummary, ProviderStat } from '../../shared/analytics.ts';
import type { Store } from '../state.ts';
import { button, el, emptyState, field, selectBox, textInput } from '../dom.ts';
import { card, disclosure, pageHeader, skeletonRows, statCard } from '../components.ts';

const LEADERS_PREVIEW = 10;

function sparkline(values: Array<number | null>, label: string): HTMLElement {
  const width = 240;
  const height = 48;
  const points = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => point.value !== null && Number.isFinite(point.value));
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'orm-spark');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  if (points.length >= 2) {
    const min = Math.min(...points.map((point) => point.value));
    const max = Math.max(...points.map((point) => point.value));
    const span = max - min || 1;
    const coords = points
      .map((point) => {
        const x = (point.index / Math.max(1, values.length - 1)) * width;
        const y = height - 6 - ((point.value - min) / span) * (height - 12);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const line = document.createElementNS(svgNs, 'polyline');
    line.setAttribute('points', coords);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    svg.append(line);
  }
  return el('div', { className: 'orm-spark-box' }, [el('div', { className: 'orm-small orm-muted', text: label }), svg]);
}

export class AnalyticsView {
  readonly element = el('div', { className: 'orm-view' });
  private body = el('div', { className: 'orm-view-body' });
  private providerFilter = '';
  private modelQuery = '';
  private showAllLeaders = false;
  private leaderTableHost = el('div');
  private lastAnalytics: AnalyticsSummary | null = null;

  constructor(private readonly store: Store) {
    this.element.append(this.body);
    this.update();
  }

  update(): void {
    // Never rebuild under a control the user is typing in or choosing from.
    const active = document.activeElement;
    if (active && this.body.contains(active) && ['INPUT', 'SELECT'].includes(active.tagName)) return;
    const state = this.store.getState();
    this.body.replaceChildren();
    const loaded = Object.values(state.endpoints).filter(Boolean).length;
    const total = state.catalog?.models.length ?? 0;
    const progress = state.bulk ? `Loading ${state.bulk.done} of ${state.bulk.total}…` : null;

    this.body.append(
      pageHeader({
        title: 'Analytics',
        subtitle: 'How providers compare across the models you have looked at.',
        actions: [
          state.bulk
            ? el('span', { className: 'orm-muted orm-small', text: progress ?? '' })
            : button(`Load more models`, () => void this.store.loadMissingEndpoints(30), 'secondary', { disabled: total === 0 || loaded >= total }),
        ],
      }),
    );

    if (!state.catalog) {
      this.body.append(skeletonRows(4));
      return;
    }

    const analytics = this.store.analytics();
    this.lastAnalytics = analytics;
    if (!analytics || analytics.providerCount === 0) {
      this.body.append(emptyState(
        'No provider data yet',
        'Open a model, or load a batch of models to compare providers here.',
        { label: 'Load 30 models', onClick: () => void this.store.loadMissingEndpoints(30) },
      ));
      return;
    }

    const custom = this.store.stats()?.custom ?? 0;
    this.body.append(
      el('div', { className: 'orm-stats' }, [
        statCard('Providers', formatCount(analytics.providerCount), `${formatCount(analytics.endpointCount)} endpoints`),
        statCard('Models with data', `${analytics.modelsWithEndpoints} of ${analytics.modelCount}`, analytics.modelsWithEndpoints < analytics.modelCount ? 'Load more for a full picture' : 'All loaded'),
        statCard('Custom routing', formatCount(custom), 'Models with your own settings', custom > 0 ? 'success' : 'neutral'),
      ]),
      card('Providers', [
        this.providerTable(analytics.providers),
        el('p', { className: 'orm-small orm-muted', text: 'Medians across loaded endpoints. “Lowest price” counts models where this provider is cheapest for input.' }),
      ]),
      this.leadersCard(analytics),
    );

    if (state.history && state.history.points.length >= 2) {
      const points = state.history.points;
      this.body.append(
        disclosure('Local history on this device', [
          el('p', { className: 'orm-small orm-muted', text: 'Recorded by this extension at each catalog refresh. OpenRouter does not provide this history.' }),
          el('div', { className: 'orm-spark-grid' }, [
            sparkline(points.map((point) => point.medianInputPerMillion), 'Median input price'),
            sparkline(points.map((point) => point.medianOutputPerMillion), 'Median output price'),
          ]),
        ]),
      );
    }
  }

  private providerTable(providers: ProviderStat[]): HTMLElement {
    const filtered = this.providerFilter ? providers.filter((provider) => provider.slug === this.providerFilter) : providers;
    const table = el('table', { className: 'orm-table', attrs: { 'aria-label': 'Providers' } });
    table.append(
      el('thead', {}, [
        el('tr', {}, [
          el('th', { text: 'Provider', attrs: { scope: 'col' } }),
          el('th', { className: 'orm-num', text: 'Models', attrs: { scope: 'col' } }),
          el('th', { className: 'orm-num', text: 'Median input', attrs: { scope: 'col' } }),
          el('th', { className: 'orm-num', text: 'Median output', attrs: { scope: 'col' } }),
          el('th', { className: 'orm-num', text: 'Lowest price', attrs: { scope: 'col' } }),
          el('th', { className: 'orm-num', text: 'Fastest', attrs: { scope: 'col' } }),
          el('th', { className: 'orm-num', text: 'Uptime (30 min)', attrs: { scope: 'col' } }),
        ]),
      ]),
    );
    const body = el('tbody');
    for (const provider of filtered) {
      body.append(el('tr', {}, [
        el('td', {}, [el('div', { text: provider.name }), el('div', { className: 'orm-mono orm-small orm-muted', text: provider.slug })]),
        el('td', { className: 'orm-num', text: formatCount(provider.models) }),
        el('td', { className: 'orm-num', text: formatPricePerMillion(provider.medianInputPerMillion) }),
        el('td', { className: 'orm-num', text: formatPricePerMillion(provider.medianOutputPerMillion) }),
        el('td', { className: 'orm-num', text: formatCount(provider.cheapestInputWins) }),
        el('td', { className: 'orm-num', text: formatCount(provider.fastestWins) }),
        el('td', { className: 'orm-num', text: formatUptime(provider.medianUptime30m) }),
      ]));
    }
    table.append(body);
    return el('div', { className: 'orm-table-wrap' }, [table]);
  }

  private leadersCard(analytics: AnalyticsSummary): HTMLElement {
    this.renderLeaderTable();
    const search = textInput(this.modelQuery, (value) => {
      this.modelQuery = value;
      this.renderLeaderTable();
    }, { placeholder: 'Search models' });
    search.type = 'search';
    search.setAttribute('aria-label', 'Search models');

    const providerSelect = selectBox(
      this.providerFilter,
      [{ value: '', label: 'All providers' }, ...analytics.providers.map((provider) => ({ value: provider.slug, label: provider.name }))],
      (value) => {
        this.providerFilter = value;
        this.renderLeaderTable();
      },
    );

    return card('Best provider per model', [
      el('div', { className: 'orm-grid orm-grid-2' }, [field('Search', search), field('Provider', providerSelect)]),
      this.leaderTableHost,
    ]);
  }

  /** Re-renders only the table, so filters never disturb the controls. */
  private renderLeaderTable(): void {
    const analytics = this.lastAnalytics;
    const state = this.store.getState();
    if (!analytics) return;
    const query = this.modelQuery.trim().toLowerCase();
    const rows: Array<{ id: string; name: string; leader: AnalyticsSummary['leaders'][string] }> = [];
    for (const model of state.catalog?.models ?? []) {
      const leader = analytics.leaders[model.id];
      if (!leader) continue;
      const endpoints = state.endpoints[model.id]?.endpoints ?? [];
      if (this.providerFilter && !endpoints.some((endpoint) => (endpoint.tag.split('/')[0] ?? endpoint.tag) === this.providerFilter)) continue;
      if (query && !`${model.name} ${model.id}`.toLowerCase().includes(query)) continue;
      rows.push({ id: model.id, name: model.name, leader });
    }
    const visible = this.showAllLeaders ? rows : rows.slice(0, LEADERS_PREVIEW);
    const nameOf = (id: string, tag: string | null): string => {
      if (!tag) return NA;
      const endpoint = (state.endpoints[id]?.endpoints ?? []).find((entry) => entry.tag === tag);
      return endpoint?.providerName ?? tag;
    };

    const table = el('table', { className: 'orm-table', attrs: { 'aria-label': 'Best provider per model' } });
    table.append(
      el('thead', {}, [el('tr', {}, [
        el('th', { text: 'Model', attrs: { scope: 'col' } }),
        el('th', { text: 'Lowest price', attrs: { scope: 'col' } }),
        el('th', { text: 'Fastest output', attrs: { scope: 'col' } }),
        el('th', { text: 'Quickest start', attrs: { scope: 'col' } }),
      ])]),
    );
    const body = el('tbody');
    for (const row of visible) {
      body.append(el('tr', {}, [
        el('td', {}, [
          el('button', {
            className: 'orm-link-strong',
            text: row.name,
            attrs: { type: 'button' },
            onClick: () => this.store.navigate({ view: 'model', modelId: row.id, tab: 'providers' }),
          }),
        ]),
        el('td', { text: nameOf(row.id, row.leader.cheapestInput) }),
        el('td', { text: nameOf(row.id, row.leader.fastestThroughput) }),
        el('td', { text: nameOf(row.id, row.leader.lowestLatency) }),
      ]));
    }
    table.append(body);

    const toggle: HTMLElement[] = rows.length > LEADERS_PREVIEW
      ? [button(this.showAllLeaders ? 'Show fewer' : `Show all ${rows.length}`, () => {
          this.showAllLeaders = !this.showAllLeaders;
          this.renderLeaderTable();
        }, 'ghost', { small: true })]
      : [];
    this.leaderTableHost.replaceChildren(
      rows.length === 0
        ? el('p', { className: 'orm-muted', text: 'No loaded model matches.' })
        : el('div', { className: 'orm-table-wrap' }, [table]),
      ...toggle,
    );
  }
}
