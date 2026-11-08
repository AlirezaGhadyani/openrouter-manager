import { formatDateTime, formatRelativeTime } from '../../shared/format.ts';
import { EXTENSION_NAME, EXTENSION_VERSION } from '../../shared/version.ts';
import { CONFIG_PATH } from '../../shared/storage.ts';
import type { Store } from '../state.ts';
import { badge, banner, button, confirmDialog, el, field, selectBox, switchBox, textInput } from '../dom.ts';
import { card, disclosure, kvRow, pageHeader } from '../components.ts';

export class SettingsView {
  readonly element = el('div', { className: 'orm-view' });
  private body = el('div', { className: 'orm-view-body' });
  private providerDraft: string | null = null;

  constructor(private readonly store: Store) {
    this.element.append(this.body);
    this.update();
  }

  update(): void {
    const active = document.activeElement;
    if (active && this.body.contains(active) && ['INPUT', 'SELECT'].includes(active.tagName)) return;

    const state = this.store.getState();
    const config = state.config?.config;
    const connected = state.connection?.connected ?? null;
    this.body.replaceChildren();

    this.body.append(
      pageHeader({ title: 'Settings', subtitle: 'Connection, data, and how routing is applied.' }),
    );

    if (state.configError) {
      this.body.append(banner({
        tone: 'error',
        title: state.configError.readOnly ? 'Saved settings are from a newer version' : 'Saved settings could not be read',
        body: state.configError.readOnly
          ? 'Update OpenRouter Manager. Nothing is overwritten.'
          : 'Reset to start fresh. A backup of the current file is kept.',
        ...(state.configError.readOnly ? {} : { action: { label: 'Reset with backup', onClick: () => void this.reset() } }),
      }));
    }

    this.body.append(
      card('OpenRouter connection', [
        el('div', { className: 'orm-row-between' }, [
          el('span', { className: 'orm-body', text: connected ? 'Connected' : connected === false ? 'Not connected' : 'Checking…' }),
          connected === null ? badge('Checking', 'neutral') : badge(connected ? 'Connected' : 'Not connected', connected ? 'success' : 'warning'),
        ]),
        el('p', {
          className: 'orm-small orm-muted',
          text: connected
            ? 'Latency and throughput are available. Your key is kept by OpenChamber and is never shown here.'
            : 'Add your key in OpenChamber → Settings → Integrations → OpenRouter. It is never shown here.',
        }),
        el('div', { className: 'orm-actions' }, [
          button('Test connection', () => void this.store.testConnection(), 'outline', { disabled: state.keyLoading }),
        ]),
        state.keyError ? banner({ tone: 'error', title: 'Connection test failed', body: state.keyError }) : null,
        state.keyInfo
          ? el('div', { className: 'orm-stack-tight' }, [
              kvRow('Key', state.keyInfo.label ?? 'Connected'),
              state.keyInfo.usage !== null ? kvRow('Used', `$${state.keyInfo.usage.toFixed(2)}`) : null,
            ])
          : null,
      ]),
    );

    this.body.append(
      card('Model data', [
        el('div', { className: 'orm-stack-tight' }, [
          kvRow('Model list', state.catalog ? `${state.catalog.models.length} models · updated ${formatRelativeTime(state.catalog.fetchedAt)}` : 'Not loaded yet'),
          kvRow('Provider data loaded', `${this.store.cacheSummary().endpointModels} models`),
        ]),
        state.catalog?.stale
          ? banner({ tone: 'warning', title: 'Showing saved data', body: state.catalog.error ?? 'The last refresh failed.' })
          : null,
        el('div', { className: 'orm-actions' }, [
          button('Refresh model list', () => void this.store.refreshCatalog(true), 'secondary'),
          button('Refresh loaded providers', () => {
            for (const id of Object.keys(state.endpoints)) void this.store.loadEndpoints(id, true);
          }, 'outline'),
        ]),
      ], { subtitle: 'Saved on the OpenChamber server for speed. Refresh to get the latest prices.' }),
    );

    if (config) {
      const providerInput = textInput(this.providerDraft ?? config.settings.providerIds.join(', '), (next) => {
        this.providerDraft = next;
      }, { placeholder: 'openrouter' });
      providerInput.setAttribute('aria-label', 'Provider IDs');

      this.body.append(
        card('Routing', [
          switchBox(
            config.settings.enabled,
            (checked) => void this.store.setSetting('enabled', checked, checked ? 'Routing is on' : 'Routing is off. Your settings are kept.'),
            'Apply my routing settings',
            config.settings.enabled ? 'Turn off to use OpenRouter’s defaults everywhere. Your settings are kept.' : 'Routing is off. Every model uses OpenRouter’s defaults.',
          ),
          field(
            'Default profile for new models',
            selectBox(
              config.settings.defaultProfileId ?? '',
              [{ value: '', label: 'None' }, ...config.profiles.map((profile) => ({ value: profile.id, label: profile.name }))],
              (next) => void this.store.setSetting('defaultProfileId', next || null, 'Default profile saved'),
            ),
          ),
          disclosure('Advanced', [
            field('OpenRouter provider IDs', providerInput, 'Usually “openrouter”. Change only if you use a custom provider ID.'),
            el('div', { className: 'orm-actions' }, [
              button('Save', () => {
                const ids = (this.providerDraft ?? config.settings.providerIds.join(', '))
                  .split(',')
                  .map((id) => id.trim().toLowerCase())
                  .filter(Boolean);
                this.providerDraft = null;
                void this.store.setSetting('providerIds', ids.length > 0 ? [...new Set(ids)] : ['openrouter'], 'Saved');
              }, 'secondary', { small: true }),
            ]),
          ]),
        ]),
      );

      this.body.append(this.advanced(config));
    }

    this.body.append(el('p', { className: 'orm-footer-note', text: `${EXTENSION_NAME} ${EXTENSION_VERSION}` }));
  }

  private advanced(config: NonNullable<ReturnType<Store['getState']>['config']>['config']): HTMLElement {
    const state = this.store.getState();
    const status = state.status;
    const runtime = status
      ? [
          kvRow('Plugin version', status.pluginVersion),
          kvRow('Last reported', formatRelativeTime(status.writtenAt)),
          kvRow('Requests routed', String(status.appliedCount)),
          status.configError ? kvRow('Problem', status.configError) : null,
        ] as Array<HTMLElement | null>
      : [el('p', { className: 'orm-small orm-muted', text: 'Not reported yet. It appears after OpenCode loads the plugin.' })];

    return card('Advanced', [
      disclosure('Saved settings file', [
        kvRow('Location', CONFIG_PATH),
        kvRow('Revision', String(config.revision)),
        kvRow('Last saved', formatDateTime(config.updatedAt)),
        el('div', { className: 'orm-actions' }, [
          button('Reload from disk', () => void this.store.reloadConfig(), 'secondary', { small: true }),
          button('Copy file contents', () => {
            const text = this.store.getState().config?.text ?? '';
            void this.store.copy(text, 'Copied');
          }, 'ghost', { small: true }),
        ]),
      ]),
      disclosure('Runtime status', runtime.filter((node): node is HTMLElement => node !== null)),
      disclosure('Reset', [
        el('p', { className: 'orm-small orm-muted', text: 'Removes all model routing and restores the built-in profiles. A backup of the current file is kept.' }),
        el('div', { className: 'orm-actions' }, [
          button('Reset everything', () => void this.reset(), 'danger', { small: true, disabled: state.configError?.readOnly === true }),
        ]),
      ]),
    ]);
  }

  private async reset(): Promise<void> {
    const ok = await confirmDialog(
      'Reset all routing?',
      'Every model goes back to OpenRouter’s defaults. A backup of your current settings is kept next to the file.',
      'Reset',
      true,
    );
    if (!ok) return;
    await this.store.resetConfig();
    this.update();
  }
}
