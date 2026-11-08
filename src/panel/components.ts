import { badge, button, el } from './dom.ts';

export function pageHeader(options: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: HTMLElement[];
}): HTMLElement {
  return el('header', { className: 'orm-page-head' }, [
    el('div', { className: 'orm-page-heading' }, [
      options.eyebrow ? el('div', { className: 'orm-eyebrow', text: options.eyebrow }) : null,
      el('h1', { className: 'orm-page-title', text: options.title }),
      options.subtitle ? el('p', { className: 'orm-page-sub', text: options.subtitle }) : null,
    ]),
    options.actions && options.actions.length > 0
      ? el('div', { className: 'orm-actions' }, options.actions)
      : null,
  ]);
}

export function card(
  title: string | null,
  body: HTMLElement | Array<HTMLElement | null>,
  options: { actions?: HTMLElement[]; subtitle?: string; className?: string } = {},
): HTMLElement {
  const bodyNode = el('div', { className: 'orm-card-body' });
  if (Array.isArray(body)) {
    for (const child of body) if (child) bodyNode.append(child);
  } else bodyNode.append(body);
  return el('section', { className: `orm-card${options.className ? ` ${options.className}` : ''}` }, [
    title !== null || options.actions
      ? el('div', { className: 'orm-card-head' }, [
          el('div', {}, [
            title ? el('h2', { className: 'orm-card-title', text: title }) : null,
            options.subtitle ? el('p', { className: 'orm-card-sub', text: options.subtitle }) : null,
          ]),
          options.actions ? el('div', { className: 'orm-actions' }, options.actions) : null,
        ])
      : null,
    bodyNode,
  ]);
}

/** A key number with one plain label. `tone` colours the value only. */
export function statCard(
  label: string,
  value: string,
  hint?: string,
  tone?: 'neutral' | 'info' | 'success' | 'warning',
): HTMLElement {
  return el('div', { className: `orm-stat orm-stat-${tone ?? 'neutral'}` }, [
    el('div', { className: 'orm-stat-label', text: label }),
    el('div', { className: 'orm-stat-value', text: value }),
    hint ? el('div', { className: 'orm-stat-hint', text: hint }) : null,
  ]);
}

/** Label/value row. Values are plain text unless a node is passed. */
export function kvRow(label: string, value: string | HTMLElement): HTMLElement {
  return el('div', { className: 'orm-kv' }, [
    el('span', { className: 'orm-kv-label', text: label }),
    typeof value === 'string' ? el('span', { className: 'orm-kv-value', text: value }) : value,
  ]);
}

/** Native disclosure: keyboard and screen-reader friendly, no JS state to manage. */
export function disclosure(summary: string, body: HTMLElement | HTMLElement[], options: { open?: boolean; hint?: string } = {}): HTMLDetailsElement {
  const details = el('details', { className: 'orm-disclosure' });
  if (options.open) details.open = true;
  const content = el('div', { className: 'orm-disclosure-body' });
  if (Array.isArray(body)) content.append(...body);
  else content.append(body);
  details.append(
    el('summary', {}, [
      el('span', { className: 'orm-disclosure-title', text: summary }),
      options.hint ? el('span', { className: 'orm-disclosure-hint', text: options.hint }) : null,
    ]),
    content,
  );
  return details;
}

/** Placeholder rows shown while data loads; keeps the layout still. */
export function skeletonRows(count = 6): HTMLElement {
  const wrap = el('div', { className: 'orm-skeleton', attrs: { role: 'status', 'aria-label': 'Loading' } });
  for (let i = 0; i < count; i++) wrap.append(el('div', { className: 'orm-skeleton-row' }));
  return wrap;
}

/** Sticky footer for forms: shows what is unsaved and the two actions. */
export function saveBar(options: {
  dirty: boolean;
  statusText: string;
  saveDisabledReason?: string;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
  extra?: HTMLElement[];
}): HTMLElement {
  const status = options.dirty
    ? badge('Unsaved changes', 'warning')
    : el('span', { className: 'orm-muted orm-small', text: options.statusText });
  const reason = options.saveDisabledReason && !options.saving
    ? el('span', { className: 'orm-small orm-error-text', text: options.saveDisabledReason })
    : null;
  return el('div', { className: 'orm-savebar', attrs: { role: 'region', 'aria-label': 'Save changes' } }, [
    el('div', { className: 'orm-savebar-status' }, [status, reason]),
    el('div', { className: 'orm-savebar-actions' }, [
      ...(options.extra ?? []),
      button('Discard', options.onDiscard, 'ghost', { disabled: !options.dirty || options.saving }),
      button(options.saving ? 'Saving…' : 'Save', options.onSave, 'primary', {
        disabled: !options.dirty || Boolean(options.saveDisabledReason) || options.saving,
      }),
    ]),
  ]);
}

export function toolbar(children: HTMLElement[]): HTMLElement {
  return el('div', { className: 'orm-toolbar' }, children);
}

export function sectionTitle(title: string, right?: HTMLElement): HTMLElement {
  return el('div', { className: 'orm-section-head orm-section-head-row' }, [
    el('h3', { text: title }),
    right ?? el('span'),
  ]);
}
