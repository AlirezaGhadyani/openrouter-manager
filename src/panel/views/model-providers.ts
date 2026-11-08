import type { EndpointInfo } from '../../shared/api-types.ts';
import { bestPercentile, bestPrice } from '../../shared/normalize.ts';
import {
  formatContext,
  formatLatencyMs,
  formatPricePerMillion,
  formatRelativeTime,
  formatThroughput,
  formatUptime,
  formatUsd,
  NA,
  percentDifference,
} from '../../shared/format.ts';
import type { Store } from '../state.ts';
import { badge, banner, button, checkbox, confirmDialog, el, emptyState, field, selectBox, switchBox } from '../dom.ts';
import { card, skeletonRows, toolbar } from '../components.ts';

type SortKey =
  | 'provider'
  | 'input'
  | 'output'
  | 'cacheRead'
  | 'cacheWrite'
  | 'latencyP50'
  | 'latencyP90'
  | 'throughputP50'
  | 'throughputP90'
  | 'context'
  | 'maxCompletion'
  | 'image'
  | 'request';

interface Column {
  key: SortKey | null;
  label: string;
  numeric?: boolean;
  hint?: string;
  advanced?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'provider', label: 'Provider' },
  { key: 'input', label: 'Input', numeric: true, hint: 'Price per million input tokens' },
  { key: 'output', label: 'Output', numeric: true, hint: 'Price per million output tokens' },
  { key: 'cacheRead', label: 'Cached input', numeric: true, hint: 'Price per million cached input tokens' },
  { key: 'latencyP50', label: 'First token', numeric: true, hint: 'Median wait before the first token (P50), last 30 minutes' },
  { key: 'throughputP50', label: 'Speed', numeric: true, hint: 'Median output tokens per second (P50), last 30 minutes' },
  { key: null, label: 'Status' },
  { key: null, label: '' },
  { key: 'latencyP90', label: 'First token P90', numeric: true, hint: 'Slower end: 90% of requests start faster than this', advanced: true },
  { key: 'throughputP90', label: 'Speed P90', numeric: true, hint: '90% of requests run at least this fast', advanced: true },
  { key: 'cacheWrite', label: 'Cache write', numeric: true, hint: 'Price per million tokens written to cache, when published', advanced: true },
  { key: 'image', label: 'Image', numeric: true, hint: 'Price per image, when published', advanced: true },
  { key: 'request', label: 'Request', numeric: true, hint: 'Price per request, when published', advanced: true },
  { key: 'context', label: 'Context', numeric: true, advanced: true },
  { key: 'maxCompletion', label: 'Max output', numeric: true, advanced: true },
  { key: null, label: 'Quantization', advanced: true },
];

function sortValue(endpoint: EndpointInfo, key: SortKey): number | string | null {
  switch (key) {
    case 'provider':
      return endpoint.providerName;
    case 'input':
      return endpoint.inputPerMillion;
    case 'output':
      return endpoint.outputPerMillion;
    case 'cacheRead':
      return endpoint.cacheReadPerMillion;
    case 'cacheWrite':
      return endpoint.cacheWritePerMillion;
    case 'latencyP50':
      return endpoint.latencyMs?.p50 ?? null;
    case 'latencyP90':
      return endpoint.latencyMs?.p90 ?? null;
    case 'throughputP50':
      return endpoint.throughputTps?.p50 ?? null;
    case 'throughputP90':
      return endpoint.throughputTps?.p90 ?? null;
    case 'context':
      return endpoint.contextLength;
    case 'maxCompletion':
      return endpoint.maxCompletionTokens;
    case 'image':
      return endpoint.imagePrice;
    case 'request':
      return endpoint.requestPrice;
  }
}

const MAX_INPUT_PRESETS = [
  { value: '', label: 'Any price' },
  { value: '0.5', label: 'Up to $0.50 / M' },
  { value: '1', label: 'Up to $1 / M' },
  { value: '3', label: 'Up to $3 / M' },
  { value: '10', label: 'Up to $10 / M' },
];
const MIN_SPEED_PRESETS = [
  { value: '', label: 'Any speed' },
  { value: '30', label: 'At least 30 tok/s' },
  { value: '60', label: 'At least 60 tok/s' },
  { value: '100', label: 'At least 100 tok/s' },
];
const MAX_WAIT_PRESETS = [
  { value: '', label: 'Any wait' },
  { value: '1000', label: 'Under 1 s' },
  { value: '2000', label: 'Under 2 s' },
  { value: '5000', label: 'Under 5 s' },
];

export class ProvidersPanel {
  readonly element = el('div', { className: 'orm-providers' });
  private statusHost = el('div');
  private tableHost = el('div');
  private compareHost = el('div');
  private selected = new Set<string>();
  private sortKey: SortKey = 'input';
  private direction: 'asc' | 'desc' = 'asc';
  private maxInput = '';
  private minSpeed = '';
  private maxWait = '';
  private availableOnly = false;
  private showAdvanced = false;

  constructor(
    private readonly store: Store,
    private readonly modelId: string,
    private readonly canonicalSlug: string,
  ) {
    this.element.append(this.statusHost, this.filtersHost(), this.tableHost, this.compareHost);
    this.update();
  }

  private filtersHost(): HTMLElement {
    const price = selectBox(this.maxInput, MAX_INPUT_PRESETS, (value) => {
      this.maxInput = value;
      this.update();
    });
    const speed = selectBox(this.minSpeed, MIN_SPEED_PRESETS, (value) => {
      this.minSpeed = value;
      this.update();
    });
    const wait = selectBox(this.maxWait, MAX_WAIT_PRESETS, (value) => {
      this.maxWait = value;
      this.update();
    });
    const available = switchBox(this.availableOnly, (checked) => {
      this.availableOnly = checked;
      this.update();
    }, 'Available only');
    const advanced = switchBox(this.showAdvanced, (checked) => {
      this.showAdvanced = checked;
      this.update();
    }, 'More columns');

    return card(null, toolbar([
      field('Input price', price),
      field('Speed', speed),
      field('First token', wait),
      el('div', { className: 'orm-toolbar-switches' }, [available, advanced]),
    ]));
  }

  update(): void {
    const state = this.store.getState();
    const result = state.endpoints[this.modelId];
    const loading = state.endpointsLoading[this.modelId];
    this.statusHost.replaceChildren();
    this.tableHost.replaceChildren();

    if (!result && loading) {
      this.tableHost.append(skeletonRows(4));
      return;
    }
    if (!result || (result.endpoints.length === 0 && result.error)) {
      this.tableHost.append(
        emptyState(
          'Providers could not be loaded',
          result?.error ?? 'Check your connection, then try again.',
          { label: 'Try again', onClick: () => void this.store.loadEndpoints(this.modelId, true) },
        ),
      );
      return;
    }

    const all = result.endpoints;
    const noSpeedData = all.every((endpoint) => endpoint.latencyMs === null && endpoint.throughputTps === null);
    this.statusHost.append(
      el('div', { className: 'orm-sync-line' }, [
        el('span', { className: 'orm-muted orm-small', text: `Updated ${formatRelativeTime(result.fetchedAt)}` }),
        button('Refresh', () => void this.store.loadEndpoints(this.modelId, true), 'ghost', { small: true }),
      ]),
    );
    if (noSpeedData && state.connection?.connected !== true) {
      this.statusHost.append(
        banner({
          tone: 'info',
          title: 'Speed appears after you connect OpenRouter',
          body: 'Prices are always shown. First-token and speed numbers need an OpenRouter key.',
          action: { label: 'Open settings', onClick: () => this.store.navigate({ view: 'settings' }) },
        }),
      );
    }

    const maxInput = this.maxInput ? Number(this.maxInput) : null;
    const minSpeed = this.minSpeed ? Number(this.minSpeed) : null;
    const maxWait = this.maxWait ? Number(this.maxWait) : null;
    const filtered = all.filter((endpoint) => {
      if (maxInput !== null && (endpoint.inputPerMillion === null || endpoint.inputPerMillion > maxInput)) return false;
      if (minSpeed !== null && (endpoint.throughputTps?.p50 === undefined || endpoint.throughputTps.p50 < minSpeed)) return false;
      if (maxWait !== null && (endpoint.latencyMs?.p50 === undefined || endpoint.latencyMs.p50 > maxWait)) return false;
      if (this.availableOnly && !endpoint.available) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const left = sortValue(a, this.sortKey);
      const right = sortValue(b, this.sortKey);
      if (left === null && right === null) return a.tag.localeCompare(b.tag);
      if (left === null) return 1;
      if (right === null) return -1;
      const dir = this.direction === 'asc' ? 1 : -1;
      if (typeof left === 'string' || typeof right === 'string') return String(left).localeCompare(String(right)) * dir;
      return (left - right) * dir;
    });

    if (filtered.length === 0) {
      this.tableHost.append(
        emptyState('No providers match', 'Loosen a filter above.', {
          label: 'Clear filters',
          onClick: () => {
            this.maxInput = '';
            this.minSpeed = '';
            this.maxWait = '';
            this.availableOnly = false;
            this.update();
          },
        }),
      );
      this.renderCompare(all);
      return;
    }

    const cheapestInput = bestPrice(all, 'inputPerMillion');
    const cheapestOutput = bestPrice(all, 'outputPerMillion');
    const fastest = bestPercentile(all, 'throughputTps', 'p50');
    const quickest = bestPercentile(all, 'latencyMs', 'p50');

    const columns = COLUMNS.filter((column) => this.showAdvanced || !column.advanced);
    const head = el('tr');
    for (const column of columns) {
      const th = el('th', { className: column.numeric ? 'orm-num' : undefined, attrs: { scope: 'col' } });
      if (column.key) {
        const active = this.sortKey === column.key;
        th.setAttribute('aria-sort', active ? (this.direction === 'asc' ? 'ascending' : 'descending') : 'none');
        th.append(
          el('button', {
            className: `orm-sort${active ? ' orm-sort-active' : ''}`,
            text: `${column.label}${active ? (this.direction === 'asc' ? ' ↑' : ' ↓') : ''}`,
            attrs: { type: 'button', title: column.hint ?? '' },
            onClick: () => {
              const key = column.key as SortKey;
              if (this.sortKey === key) this.direction = this.direction === 'asc' ? 'desc' : 'asc';
              else {
                this.sortKey = key;
                this.direction = 'asc';
              }
              this.update();
            },
          }),
        );
      } else {
        th.textContent = column.label;
      }
      head.append(th);
    }
    // Leading checkbox column is added before the header cells.
    head.prepend(el('th', { attrs: { scope: 'col', 'aria-label': 'Compare' } }));

    const body = el('tbody');
    for (const endpoint of filtered) {
      const selected = this.selected.has(endpoint.tag);
      const isCheapestInput = cheapestInput !== null && endpoint.inputPerMillion === cheapestInput;
      const isCheapestOutput = cheapestOutput !== null && endpoint.outputPerMillion === cheapestOutput;
      const isFastest = fastest !== null && endpoint.throughputTps?.p50 === fastest;
      const isQuickest = quickest !== null && endpoint.latencyMs?.p50 === quickest;
      const inputDelta = isCheapestInput ? null : percentDifference(endpoint.inputPerMillion, cheapestInput);
      const outputDelta = isCheapestOutput ? null : percentDifference(endpoint.outputPerMillion, cheapestOutput);

      const badges: HTMLElement[] = [];
      if (isCheapestInput) badges.push(badge('Lowest price', 'success'));
      if (isFastest) badges.push(badge('Fastest', 'info'));
      if (isQuickest) badges.push(badge('Quickest start', 'info'));

      const cells: HTMLElement[] = [
        el('td', { className: 'orm-cell-check' }, [
          checkbox(selected, (checked) => {
            if (checked && this.selected.size >= 4) {
              void this.store.toast('info', 'You can compare up to four providers.');
              this.update();
              return;
            }
            if (checked) this.selected.add(endpoint.tag);
            else this.selected.delete(endpoint.tag);
            this.update();
          }, `Compare ${endpoint.providerName}`),
        ]),
        el('td', {}, [
          el('div', { className: 'orm-provider-name', text: endpoint.providerName }),
          el('div', { className: 'orm-mono orm-small orm-muted', text: endpoint.tag }),
          badges.length > 0 ? el('div', { className: 'orm-chip-row' }, badges) : null,
        ]),
        this.priceCell(endpoint.inputPerMillion, inputDelta),
        this.priceCell(endpoint.outputPerMillion, outputDelta),
        el('td', { className: 'orm-num', text: formatPricePerMillion(endpoint.cacheReadPerMillion) }),
        el('td', { className: 'orm-num', text: formatLatencyMs(endpoint.latencyMs?.p50) }),
        el('td', { className: 'orm-num', text: formatThroughput(endpoint.throughputTps?.p50) }),
        el('td', {}, [
          endpoint.available
            ? badge('Available', 'success')
            : badge('Degraded', 'warning'),
          el('div', { className: 'orm-small orm-muted', text: `Uptime ${formatUptime(endpoint.uptime30m)}` }),
        ]),
        el('td', {}, [
          button('Exclude', () => void this.exclude(endpoint), 'ghost', { small: true }),
        ]),
      ];

      if (this.showAdvanced) {
        cells.push(
          el('td', { className: 'orm-num', text: formatLatencyMs(endpoint.latencyMs?.p90) }),
          el('td', { className: 'orm-num', text: formatThroughput(endpoint.throughputTps?.p90) }),
          el('td', { className: 'orm-num', text: formatPricePerMillion(endpoint.cacheWritePerMillion) }),
          el('td', { className: 'orm-num', text: formatUsd(endpoint.imagePrice) }),
          el('td', { className: 'orm-num', text: formatUsd(endpoint.requestPrice) }),
          el('td', { className: 'orm-num', text: formatContext(endpoint.contextLength) }),
          el('td', { className: 'orm-num', text: formatContext(endpoint.maxCompletionTokens) }),
          el('td', { text: endpoint.quantization ?? NA }),
        );
      }
      body.append(el('tr', { className: selected ? 'orm-row-selected' : undefined }, cells));
    }

    const table = el('table', { className: 'orm-table orm-table-providers', attrs: { 'aria-label': 'Provider comparison' } });
    table.append(el('thead', {}, [head]), body);
    this.tableHost.append(
      card(null, [
        el('div', { className: 'orm-table-wrap' }, [table]),
        el('p', {
          className: 'orm-small orm-muted',
          text: `${filtered.length} of ${all.length} providers. Percentages show how much more a provider costs than the lowest price.`,
        }),
      ]),
    );

    this.renderCompare(all);
  }

  private priceCell(value: number | null, delta: number | null): HTMLElement {
    return el('td', { className: 'orm-num' }, [
      el('span', { text: formatPricePerMillion(value) }),
      delta !== null
        ? el('span', {
            className: `orm-delta ${delta <= 0 ? 'orm-delta-good' : 'orm-delta-bad'}`,
            text: ` ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`,
          })
        : null,
    ]);
  }

  private renderCompare(all: readonly EndpointInfo[]): void {
    this.compareHost.replaceChildren();
    const selected = all.filter((endpoint) => this.selected.has(endpoint.tag));
    if (selected.length < 2) return;

    const cheapestInput = bestPrice(all, 'inputPerMillion');
    const cheapestOutput = bestPrice(all, 'outputPerMillion');

    const columns = selected.map((endpoint) =>
      el('div', { className: 'orm-compare-card' }, [
        el('div', { className: 'orm-row-between' }, [
          el('div', {}, [
            el('div', { className: 'orm-provider-name', text: endpoint.providerName }),
            el('div', { className: 'orm-mono orm-small orm-muted', text: endpoint.tag }),
          ]),
          button('Remove', () => {
            this.selected.delete(endpoint.tag);
            this.update();
          }, 'ghost', { small: true }),
        ]),
        el('dl', { className: 'orm-dl' }, [
          el('dt', { text: 'Input' }),
          el('dd', { text: `${formatPricePerMillion(endpoint.inputPerMillion)}${endpoint.inputPerMillion === cheapestInput ? ' · lowest' : ''}` }),
          el('dt', { text: 'Output' }),
          el('dd', { text: `${formatPricePerMillion(endpoint.outputPerMillion)}${endpoint.outputPerMillion === cheapestOutput ? ' · lowest' : ''}` }),
          el('dt', { text: 'Cached input' }),
          el('dd', { text: formatPricePerMillion(endpoint.cacheReadPerMillion) }),
          el('dt', { text: 'First token' }),
          el('dd', { text: formatLatencyMs(endpoint.latencyMs?.p50) }),
          el('dt', { text: 'Speed' }),
          el('dd', { text: formatThroughput(endpoint.throughputTps?.p50) }),
        ]),
      ]),
    );

    this.compareHost.append(
      card(`Comparing ${selected.length} providers`, [
        el('div', { className: 'orm-compare-grid' }, columns),
        el('div', { className: 'orm-row-between' }, [
          el('span', { className: 'orm-muted orm-small', text: 'Lower prices are better; faster is better for speed and first token.' }),
          button('Clear comparison', () => {
            this.selected.clear();
            this.update();
          }, 'ghost', { small: true }),
        ]),
      ]),
    );
  }

  private async exclude(endpoint: EndpointInfo): Promise<void> {
    const slug = endpoint.tag.split('/')[0] ?? endpoint.tag;
    const ok = await confirmDialog(
      `Exclude ${endpoint.providerName}?`,
      `Requests for this model will skip ${endpoint.providerName}. You can undo this in Routing.`,
      'Exclude',
    );
    if (!ok) return;
    const saved = await this.store.excludeProvider(this.modelId, this.canonicalSlug, slug);
    if (saved) this.update();
  }
}
