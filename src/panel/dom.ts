/** Minimal DOM helpers. The host supplies theme tokens; the kit supplies look CSS. */

type Child = Node | string | null | undefined | false;

export interface ElementProps {
  className?: string;
  text?: string;
  title?: string;
  html?: string;
  onClick?: (event: Event) => void;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.title) node.title = props.title;
  if (props.html !== undefined) node.innerHTML = props.html;
  if (props.onClick) node.addEventListener('click', props.onClick);
  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value === null || value === undefined || value === false) continue;
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  if (props.dataset) Object.assign(node.dataset, props.dataset);
  if (props.style) Object.assign(node.style, props.style);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export function button(
  label: string,
  onClick: () => void,
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'secondary',
  options: { disabled?: boolean; title?: string; small?: boolean } = {},
): HTMLButtonElement {
  return el('button', {
    className: `orm-btn orm-btn-${variant}${options.small ? ' orm-btn-sm' : ''}`,
    text: label,
    title: options.title,
    attrs: { type: 'button', disabled: options.disabled },
    onClick: (event) => {
      event.preventDefault();
      if (!options.disabled) onClick();
    },
  });
}

export function link(label: string, onClick: () => void): HTMLButtonElement {
  return el('button', { className: 'orm-link', text: label, attrs: { type: 'button' }, onClick });
}

export function badge(label: string, tone: 'neutral' | 'success' | 'warning' | 'error' | 'info' = 'neutral'): HTMLSpanElement {
  return el('span', { className: `orm-badge orm-badge-${tone}`, text: label });
}

export function spinner(label = 'Loading…'): HTMLElement {
  return el('div', { className: 'orm-spinner', attrs: { role: 'status' } }, [
    el('span', { className: 'orm-spinner-ring' }),
    el('span', { className: 'orm-muted', text: label }),
  ]);
}

export function emptyState(title: string, body?: string, action?: { label: string; onClick: () => void }): HTMLElement {
  return el('div', { className: 'orm-empty' }, [
    el('div', { className: 'orm-empty-title', text: title }),
    body ? el('div', { className: 'orm-muted', text: body }) : null,
    action ? button(action.label, action.onClick, 'primary') : null,
  ]);
}

export interface BannerOptions {
  tone: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}

export function banner(options: BannerOptions): HTMLElement {
  return el('div', { className: `orm-banner orm-banner-${options.tone}`, attrs: { role: 'status' } }, [
    el('div', { className: 'orm-banner-body' }, [
      el('strong', { text: options.title }),
      options.body ? el('div', { className: 'orm-banner-text', text: options.body }) : null,
    ]),
    el('div', { className: 'orm-banner-actions' }, [
      options.action ? button(options.action.label, options.action.onClick, 'secondary', { small: true }) : null,
      options.secondary ? button(options.secondary.label, options.secondary.onClick, 'ghost', { small: true }) : null,
    ]),
  ]);
}

export function field(labelText: string, control: HTMLElement, helper?: string): HTMLElement {
  // A switch is itself a label; wrapping it in another label is invalid and can double-toggle.
  const tag = control.tagName === 'LABEL' ? 'div' : 'label';
  return el(tag, { className: 'orm-field' }, [
    el('span', { className: 'orm-field-label', text: labelText }),
    control,
    helper ? el('span', { className: 'orm-field-helper', text: helper }) : null,
  ]);
}

export function textInput(
  value: string,
  onChange: (value: string) => void,
  options: { placeholder?: string; type?: string; min?: string; max?: string; step?: string; disabled?: boolean } = {},
): HTMLInputElement {
  const input = el('input', {
    className: 'orm-input',
    attrs: {
      type: options.type ?? 'text',
      placeholder: options.placeholder,
      min: options.min,
      max: options.max,
      step: options.step ?? (options.type === 'number' ? 'any' : undefined),
      disabled: options.disabled,
      value,
    },
  });
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

export function textArea(value: string, onChange: (value: string) => void, rows = 4): HTMLTextAreaElement {
  const area = el('textarea', { className: 'orm-input orm-textarea', attrs: { rows } });
  area.value = value;
  area.addEventListener('input', () => onChange(area.value));
  return area;
}

export function selectBox(
  value: string,
  options: Array<{ value: string; label: string }>,
  onChange: (value: string) => void,
  attrs: Record<string, string | boolean | undefined> = {},
): HTMLSelectElement {
  const select = el('select', { className: 'orm-input orm-select', attrs });
  for (const option of options) {
    const node = el('option', { text: option.label, attrs: { value: option.value } });
    if (option.value === value) node.selected = true;
    select.append(node);
  }
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

export function switchBox(
  checked: boolean,
  onChange: (checked: boolean) => void,
  label: string,
  description?: string,
): HTMLElement {
  const input = el('input', { className: 'orm-switch-input', attrs: { type: 'checkbox', checked } });
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { className: 'orm-switch-row' }, [
    input,
    el('span', { className: 'orm-switch-track' }, [el('span', { className: 'orm-switch-thumb' })]),
    el('span', { className: 'orm-switch-copy' }, [
      el('span', { className: 'orm-switch-label', text: label }),
      description ? el('span', { className: 'orm-field-helper', text: description }) : null,
    ]),
  ]);
}

export function modal(options: {
  title: string;
  body: HTMLElement | string;
  actions: Array<{ id: string; label: string; variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>;
  onClose?: () => void;
}): Promise<string> {
  return new Promise((resolve) => {
    const previous = document.activeElement as HTMLElement | null;
    const close = (id: string) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
      resolve(id);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close('cancel');
    };
    const overlay = el('div', { className: 'orm-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
    const card = el('div', { className: 'orm-modal' });
    card.append(el('h2', { className: 'orm-modal-title', text: options.title }));
    const body = el('div', { className: 'orm-modal-body' });
    if (typeof options.body === 'string') body.textContent = options.body;
    else body.append(options.body);
    card.append(body);
    const actions = el('div', { className: 'orm-modal-actions' });
    for (const action of options.actions) {
      actions.append(
        button(action.label, () => close(action.id), action.variant ?? 'secondary', {
          small: true,
        }),
      );
    }
    card.append(actions);
    overlay.append(card);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close('cancel');
    });
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    const first = card.querySelector('button');
    (first as HTMLButtonElement | null)?.focus();
  });
}

export async function confirmDialog(
  title: string,
  message: string,
  confirmLabel = 'Confirm',
  destructive = false,
): Promise<boolean> {
  const result = await modal({
    title,
    body: message,
    actions: [
      { id: 'cancel', label: 'Cancel', variant: 'ghost' },
      { id: 'confirm', label: confirmLabel, variant: destructive ? 'danger' : 'primary' },
    ],
  });
  return result === 'confirm';
}

export function codeBlock(text: string): HTMLElement {
  return el('pre', { className: 'orm-code' }, [el('code', { text })]);
}

export function table(headers: Array<{ label: string; className?: string; title?: string }>): {
  element: HTMLTableElement;
  head: HTMLTableRowElement;
  body: HTMLTableSectionElement;
} {
  const head = el('tr');
  for (const header of headers) {
    head.append(
      el('th', {
        className: header.className,
        text: header.label,
        title: header.title,
      }),
    );
  }
  const body = el('tbody');
  const element = el('table', { className: 'orm-table' }, [el('thead', {}, [head]), body]);
  return { element, head, body };
}

export function metric(label: string, value: string, hint?: string): HTMLElement {
  return el('div', { className: 'orm-metric' }, [
    el('div', { className: 'orm-metric-label', text: label }),
    el('div', { className: 'orm-metric-value', text: value }),
    hint ? el('div', { className: 'orm-metric-hint', text: hint }) : null,
  ]);
}

export function chip(label: string, tone: 'neutral' | 'success' | 'warning' | 'error' | 'info' = 'neutral'): HTMLElement {
  return el('span', { className: `orm-chip orm-chip-${tone}`, text: label });
}

/** A checkbox that reports changes; used by provider pickers and bulk actions. */
export function checkbox(
  checked: boolean,
  onChange: (checked: boolean) => void,
  label: string,
  description?: string,
): HTMLElement {
  const input = el('input', { className: 'orm-check-input', attrs: { type: 'checkbox', checked } });
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { className: 'orm-check-row' }, [
    input,
    el('span', { className: 'orm-check-copy' }, [
      el('span', { text: label }),
      description ? el('span', { className: 'orm-field-helper', text: description }) : null,
    ]),
  ]);
}
