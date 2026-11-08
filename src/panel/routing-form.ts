import { clonePolicy } from '../shared/policy.ts';
import type { RoutingPolicy, ProviderMode } from '../shared/types.ts';
import { badge, button, el, field, selectBox, switchBox, textInput } from './dom.ts';
import { disclosure } from './components.ts';

export interface ProviderSuggestion {
  slug: string;
  name: string;
  tags: string[];
}

const PROVIDER_SLUG = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;

function numberValue(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A labelled number with an optional unit and short helper. Typing never re-renders the form. */
function numberField(
  labelText: string,
  value: number | undefined,
  onChange: (value: number | undefined) => void,
  options: { placeholder?: string; unit?: string; helper?: string } = {},
): HTMLElement {
  const input = textInput(value === undefined ? '' : String(value), (raw) => onChange(numberValue(raw)), {
    type: 'number',
    min: '0',
    step: 'any',
    placeholder: options.placeholder ?? 'No limit',
  });
  const control = el('div', { className: 'orm-input-unit' }, [
    input,
    options.unit ? el('span', { className: 'orm-unit', text: options.unit }) : null,
  ]);
  return field(labelText, control, options.helper);
}

function chipsEditor(
  title: string,
  values: string[],
  onChange: (values: string[]) => void,
  suggestions: string[],
  options: { placeholder: string; helper?: string; pattern?: RegExp },
  rerender: () => void,
): HTMLElement {
  const listId = `orm-suggest-${Math.random().toString(36).slice(2)}`;
  const wrapper = el('div', { className: 'orm-chips' });
  values.forEach((value, index) => {
    wrapper.append(
      el('span', { className: 'orm-chip orm-chip-removable' }, [
        el('span', { text: value }),
        el('button', {
          className: 'orm-chip-x',
          text: '×',
          attrs: { type: 'button', 'aria-label': `Remove ${value}` },
          onClick: () => {
            const next = [...values];
            next.splice(index, 1);
            onChange(next);
            rerender();
          },
        }),
      ]),
    );
  });
  const input = el('input', {
    className: 'orm-input orm-chip-input',
    attrs: { placeholder: options.placeholder, list: listId, 'aria-label': title },
  });
  const datalist = el('datalist', { attrs: { id: listId } });
  for (const suggestion of suggestions) datalist.append(el('option', { attrs: { value: suggestion } }));

  const add = () => {
    const raw = input.value.trim().toLowerCase();
    if (!raw) return;
    const pattern = options.pattern ?? PROVIDER_SLUG;
    if (!pattern.test(raw)) return;
    input.value = '';
    if (values.includes(raw)) return;
    onChange([...values, raw]);
    rerender();
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  });
  wrapper.append(el('div', { className: 'orm-chip-entry' }, [input, datalist, button('Add', add, 'outline', { small: true })]));
  return field(title, wrapper, options.helper);
}

export interface PolicyEditorOptions {
  policy: RoutingPolicy;
  suggestions: ProviderSuggestion[];
  onChange: (policy: RoutingPolicy) => void;
}

const MODE_LABELS: Record<ProviderMode, string> = {
  all: 'Any provider',
  only: 'Only these providers',
  exclude: 'Any except these providers',
};

/**
 * Grouped routing editor. Groups are native disclosures, so keyboard and
 * screen-reader behaviour comes for free and open state survives re-renders.
 */
export class PolicyEditor {
  private policy: RoutingPolicy;
  private readonly root: HTMLElement;
  private readonly options: PolicyEditorOptions;
  private openGroups = new Set<string>(['providers', 'price', 'speed']);

  constructor(root: HTMLElement, options: PolicyEditorOptions) {
    this.root = root;
    this.options = options;
    this.policy = clonePolicy(options.policy);
    this.render();
  }

  value(): RoutingPolicy {
    return clonePolicy(this.policy);
  }

  setPolicy(policy: RoutingPolicy): void {
    this.policy = clonePolicy(policy);
    this.render();
  }

  private changed(): void {
    this.options.onChange(clonePolicy(this.policy));
  }

  private group(id: string, title: string, hint: string, body: HTMLElement[]): HTMLElement {
    const details = disclosure(title, body, { open: this.openGroups.has(id), hint });
    details.dataset.group = id;
    details.addEventListener('toggle', () => {
      if (details.open) this.openGroups.add(id);
      else this.openGroups.delete(id);
    });
    return details;
  }

  private render(): void {
    const root = this.root;
    root.replaceChildren();
    const suggestions = this.options.suggestions.flatMap((entry) => [entry.slug, ...entry.tags]);
    const rerender = () => this.render();

    const modeSelect = selectBox(
      this.policy.mode,
      (Object.keys(MODE_LABELS) as ProviderMode[]).map((mode) => ({ value: mode, label: MODE_LABELS[mode] })),
      (value) => {
        this.policy.mode = value as ProviderMode;
        this.changed();
        rerender();
      },
      { 'aria-describedby': 'orm-mode-help' },
    );

    const providerBody: HTMLElement[] = [
      field('Which providers', modeSelect, this.policy.mode === 'all' ? 'OpenRouter picks from all providers.' : undefined),
    ];
    if (this.policy.mode !== 'all') {
      providerBody.push(
        chipsEditor(
          this.policy.mode === 'only' ? 'Allowed providers' : 'Providers to avoid',
          this.policy.providers,
          (values) => {
            this.policy.providers = values;
            this.changed();
          },
          suggestions,
          {
            placeholder: 'Type a provider, e.g. deepinfra',
            helper: 'Use a base name for all its endpoints, or a full endpoint such as deepinfra/fp8.',
          },
          rerender,
        ),
      );
    }
    providerBody.push(
      switchBox(
        this.policy.allowFallbacks,
        (checked) => {
          this.policy.allowFallbacks = checked;
          this.changed();
          rerender();
        },
        'Fall back to other providers',
        this.policy.allowFallbacks ? 'If a chosen provider fails, another one can take over.' : 'Requests fail rather than use a provider outside this list.',
      ),
      chipsEditor(
        'Try these first',
        this.policy.order,
        (values) => {
          this.policy.order = values;
          this.changed();
        },
        suggestions,
        { placeholder: 'Optional, in order', helper: 'Listed providers are tried first, in this order.' },
        rerender,
      ),
    );

    const priceBody: HTMLElement[] = [
      el('div', { className: 'orm-grid orm-grid-2' }, [
        numberField(
          'Input price limit',
          this.policy.maxPromptPerMillion,
          (value) => this.setOptional('maxPromptPerMillion', value),
          { unit: '$ / M tokens', helper: 'Skip providers charging more for input.' },
        ),
        numberField(
          'Output price limit',
          this.policy.maxCompletionPerMillion,
          (value) => this.setOptional('maxCompletionPerMillion', value),
          { unit: '$ / M tokens', helper: 'Skip providers charging more for output.' },
        ),
      ]),
    ];

    const speedBody: HTMLElement[] = [
      field(
        'Choose providers by',
        selectBox(
          this.policy.sort ?? '',
          [
            { value: '', label: 'Balanced (OpenRouter default)' },
            { value: 'price', label: 'Lowest price' },
            { value: 'throughput', label: 'Fastest output' },
            { value: 'latency', label: 'Shortest first-token wait' },
          ],
          (value) => {
            if (value) this.policy.sort = value as RoutingPolicy['sort'];
            else delete this.policy.sort;
            if (!this.policy.sort) delete this.policy.partition;
            this.changed();
            rerender();
          },
        ),
        this.policy.sort ? undefined : 'OpenRouter balances price, speed and reliability.',
      ),
      el('div', { className: 'orm-grid orm-grid-2' }, [
        el('div', { className: 'orm-stack-tight' }, [
          numberField(
            'Preferred first-token wait',
            this.policy.maxLatencySeconds,
            (value) => {
              this.setOptional('maxLatencySeconds', value);
              if (value !== undefined && !this.policy.maxLatencyPercentile) this.policy.maxLatencyPercentile = 'p50';
            },
            { unit: 'seconds', helper: 'Preference only. Never blocks a request.' },
          ),
          this.policy.maxLatencySeconds !== undefined
            ? field('Measured as', percentileSelect(this.policy.maxLatencyPercentile ?? 'p50', (v) => {
                this.policy.maxLatencyPercentile = v;
                this.changed();
              }))
            : null,
        ]),
        el('div', { className: 'orm-stack-tight' }, [
          numberField(
            'Preferred output speed',
            this.policy.minThroughputTps,
            (value) => {
              this.setOptional('minThroughputTps', value);
              if (value !== undefined && !this.policy.minThroughputPercentile) this.policy.minThroughputPercentile = 'p50';
            },
            { unit: 'tokens / s', helper: 'Preference only. Never blocks a request.' },
          ),
          this.policy.minThroughputTps !== undefined
            ? field('Measured as', percentileSelect(this.policy.minThroughputPercentile ?? 'p50', (v) => {
                this.policy.minThroughputPercentile = v;
                this.changed();
              }))
            : null,
        ]),
      ]),
    ];

    const moreBody: HTMLElement[] = [
      el('div', { className: 'orm-grid orm-grid-2' }, [
        numberField('Image price limit', this.policy.maxImagePrice, (value) => this.setOptional('maxImagePrice', value), { unit: '$ / image' }),
        numberField('Request price limit', this.policy.maxRequestPrice, (value) => this.setOptional('maxRequestPrice', value), { unit: '$ / request' }),
      ]),
      chipsEditor(
        'Quantizations',
        this.policy.quantizations ?? [],
        (values) => {
          this.policy.quantizations = values;
          this.changed();
        },
        ['fp16', 'bf16', 'fp8', 'fp4', 'int8', 'int4'],
        { placeholder: 'Any unless you add one', pattern: /^[a-z0-9._-]+$/, helper: 'Only providers serving these precisions.' },
        rerender,
      ),
      el('div', { className: 'orm-grid orm-grid-2' }, [
        field(
          'Data retention',
          selectBox(
            this.policy.dataCollection ?? '',
            [
              { value: '', label: 'OpenRouter default' },
              { value: 'allow', label: 'Allow providers that may store data' },
              { value: 'deny', label: 'Avoid providers that may store data' },
            ],
            (value) => {
              if (value) this.policy.dataCollection = value as 'allow' | 'deny';
              else delete this.policy.dataCollection;
              this.changed();
            },
          ),
        ),
        field(
          'Routing when sorting',
          selectBox(
            this.policy.partition ?? 'model',
            [
              { value: 'model', label: 'Within each model (default)' },
              { value: 'none', label: 'Across models' },
            ],
            (value) => {
              this.policy.partition = value as RoutingPolicy['partition'];
              this.changed();
            },
            { disabled: !this.policy.sort },
          ),
          this.policy.sort ? undefined : 'Applies only when “Choose providers by” is set.',
        ),
      ]),
      switchBox(this.policy.zdr === true, (checked) => {
        if (checked) this.policy.zdr = true;
        else delete this.policy.zdr;
        this.changed();
      }, 'Zero data retention only', 'Only providers that do not keep your prompts.'),
      switchBox(this.policy.requireParameters === true, (checked) => {
        if (checked) this.policy.requireParameters = true;
        else delete this.policy.requireParameters;
        this.changed();
      }, 'Only providers that support every option in the request', 'Useful for tool calls or structured output.'),
      switchBox(this.policy.enforceDistillableText === true, (checked) => {
        if (checked) this.policy.enforceDistillableText = true;
        else delete this.policy.enforceDistillableText;
        this.changed();
      }, 'Only models that allow text distillation'),
      el('div', { className: 'orm-note-box' }, [
        el('div', { className: 'orm-row-between' }, [
          el('span', { className: 'orm-note-title', text: 'Cached-input price limit' }),
          badge('Not sent to OpenRouter', 'warning'),
        ]),
        el('p', {
          className: 'orm-small orm-muted',
          text: 'OpenRouter cannot enforce a cached-input limit. This is kept as a note for comparisons only.',
        }),
        numberField('Cached-input price limit', this.policy.localMaxCacheReadPerMillion, (value) => this.setOptional('localMaxCacheReadPerMillion', value), { unit: '$ / M tokens' }),
      ]),
    ];

    const modeHelp = el('span', { className: 'orm-hidden', attrs: { id: 'orm-mode-help' }, text: 'Choose how providers are selected for this model.' });
    root.append(
      modeHelp,
      this.group('providers', 'Providers', summarizeProviders(this.policy), providerBody),
      this.group('price', 'Price limits', summarizePrice(this.policy), priceBody),
      this.group('speed', 'Speed and first-token wait', summarizeSpeed(this.policy), speedBody),
      this.group('more', 'More options', 'Data, quantization, and fine-tuning', moreBody),
    );
  }

  private setOptional<K extends keyof RoutingPolicy>(key: K, value: RoutingPolicy[K] | undefined): void {
    if (value === undefined) delete this.policy[key];
    else this.policy[key] = value;
    this.changed();
  }
}

function percentileSelect(value: string, onChange: (value: 'p50' | 'p75' | 'p90' | 'p99') => void): HTMLElement {
  return selectBox(
    value,
    [
      { value: 'p50', label: 'Typical (median)' },
      { value: 'p75', label: 'Most requests (P75)' },
      { value: 'p90', label: 'Nearly all requests (P90)' },
      { value: 'p99', label: 'Almost all requests (P99)' },
    ],
    (next) => onChange(next as 'p50' | 'p75' | 'p90' | 'p99'),
  );
}

function summarizeProviders(policy: RoutingPolicy): string {
  if (policy.mode === 'all') return policy.allowFallbacks ? 'Any provider' : 'Any provider, no fallback';
  const count = policy.providers.length;
  return `${policy.mode === 'only' ? 'Only' : 'Avoiding'} ${count} provider${count === 1 ? '' : 's'}`;
}

function summarizePrice(policy: RoutingPolicy): string {
  const parts: string[] = [];
  if (policy.maxPromptPerMillion !== undefined) parts.push(`input ≤ $${policy.maxPromptPerMillion}`);
  if (policy.maxCompletionPerMillion !== undefined) parts.push(`output ≤ $${policy.maxCompletionPerMillion}`);
  return parts.length > 0 ? parts.join(', ') : 'No limits';
}

function summarizeSpeed(policy: RoutingPolicy): string {
  if (!policy.sort && policy.maxLatencySeconds === undefined && policy.minThroughputTps === undefined) {
    return 'OpenRouter default';
  }
  return policy.sort ? `Sorted by ${policy.sort === 'throughput' ? 'speed' : policy.sort === 'latency' ? 'first-token wait' : 'price'}` : 'Preferences set';
}

export function policyChips(policy: RoutingPolicy): HTMLElement {
  const row = el('div', { className: 'orm-chips orm-chips-static' });
  if (policy.mode === 'only') row.append(badge(`Only ${policy.providers.length}`, 'info'));
  if (policy.mode === 'exclude') row.append(badge(`Avoid ${policy.providers.length}`, 'warning'));
  if (policy.sort) row.append(badge(`Sort: ${policy.sort}`, 'neutral'));
  if (policy.maxPromptPerMillion !== undefined) row.append(badge(`Input ≤ $${policy.maxPromptPerMillion}`, 'neutral'));
  if (policy.zdr) row.append(badge('Zero retention', 'info'));
  if (row.childElementCount === 0) row.append(badge('OpenRouter defaults', 'neutral'));
  return row;
}

export function blankPolicy(): RoutingPolicy {
  return clonePolicy({ mode: 'all', providers: [], order: [], allowFallbacks: true });
}
