import { emptyPolicy, describePolicy } from '../../shared/policy.ts';
import type { RoutingPolicy } from '../../shared/types.ts';
import type { Store } from '../state.ts';
import { badge, button, confirmDialog, el, emptyState, field, selectBox, switchBox, textInput } from '../dom.ts';
import { card, disclosure, pageHeader, saveBar, toolbar } from '../components.ts';
import { PolicyEditor } from '../routing-form.ts';

type Tab = 'edit' | 'apply';

export class ProfilesView {
  readonly element = el('div', { className: 'orm-view' });
  private body = el('div', { className: 'orm-view-body' });
  private tab: Tab = 'edit';
  private selectedId: string | null = null;
  private creating = false;
  private draftName = '';
  private draftDescription = '';
  private draftPolicy: RoutingPolicy = emptyPolicy();
  private savedSnapshot = '';
  private bulkProfileId: string | null = null;
  private bulkQuery = '';
  private bulkReplace = false;
  private bulkSelected = new Set<string>();

  constructor(private readonly store: Store) {
    const first = store.getState().config?.config.profiles[0]?.id ?? null;
    this.selectedId = first;
    this.loadDraft();
    this.element.append(this.body);
    this.update();
  }

  private loadDraft(): void {
    const profile = this.store.getState().config?.config.profiles.find((entry) => entry.id === this.selectedId);
    this.draftName = profile?.name ?? '';
    this.draftDescription = profile?.description ?? '';
    this.draftPolicy = profile ? structuredClone(profile.policy) : emptyPolicy();
    this.savedSnapshot = JSON.stringify([this.draftName, this.draftDescription, this.draftPolicy]);
  }

  private isDirty(): boolean {
    return this.creating || JSON.stringify([this.draftName, this.draftDescription, this.draftPolicy]) !== this.savedSnapshot;
  }

  update(): void {
    // Keep typing intact: never rebuild while a form control has focus.
    const active = document.activeElement;
    if (active && this.body.contains(active) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;

    const config = this.store.getState().config?.config;
    this.body.replaceChildren();
    this.body.append(
      pageHeader({
        title: 'Profiles',
        subtitle: 'Reusable routing settings. Apply one to many models, and override it per model when needed.',
        actions: [button('New profile', () => this.startNew(), 'primary')],
      }),
    );
    if (!config) {
      this.body.append(emptyState('Settings are not loaded', 'Open Settings to repair or reset them.', {
        label: 'Open settings',
        onClick: () => this.store.navigate({ view: 'settings' }),
      }));
      return;
    }

    this.body.append(this.tabs());
    this.body.append(this.tab === 'edit' ? this.editLayout() : this.applyLayout());
  }

  private tabs(): HTMLElement {
    const make = (id: Tab, label: string) =>
      el('button', {
        className: `orm-tab${this.tab === id ? ' orm-tab-active' : ''}`,
        text: label,
        attrs: { type: 'button', role: 'tab', 'aria-selected': String(this.tab === id) },
        onClick: () => {
          if (this.tab === id) return;
          this.tab = id;
          this.update();
        },
      });
    return el('div', { className: 'orm-tabs', attrs: { role: 'tablist' } }, [make('edit', 'Edit profiles'), make('apply', 'Apply to models')]);
  }

  private startNew(): void {
    this.tab = 'edit';
    this.creating = true;
    this.selectedId = null;
    this.draftName = '';
    this.draftDescription = '';
    this.draftPolicy = emptyPolicy();
    this.savedSnapshot = '';
    this.update();
  }

  private editLayout(): HTMLElement {
    const config = this.store.getState().config!.config;
    const list = el('div', { className: 'orm-profile-list', attrs: { role: 'list' } });
    for (const profile of config.profiles) {
      const assigned = Object.values(config.models).filter((entry) => entry.profileId === profile.id).length;
      const active = !this.creating && this.selectedId === profile.id;
      list.append(
        el('button', {
          className: `orm-profile-item${active ? ' orm-profile-active' : ''}`,
          attrs: { type: 'button', 'aria-current': String(active) },
          onClick: async () => {
            if (this.isDirty()) {
              const ok = await confirmDialog('Discard unsaved changes?', 'Your edits to this profile have not been saved.', 'Discard', true);
              if (!ok) return;
            }
            this.creating = false;
            this.selectedId = profile.id;
            this.loadDraft();
            this.update();
          },
        }, [
          el('span', { className: 'orm-profile-name', text: profile.name }),
          el('span', { className: 'orm-muted orm-small', text: `${assigned} model${assigned === 1 ? '' : 's'}` }),
        ]),
      );
    }

    const selected = config.profiles.find((profile) => profile.id === this.selectedId) ?? null;
    if (!this.creating && !selected) {
      return el('div', { className: 'orm-split' }, [list, card(null, emptyState('Choose a profile', 'Or create a new one to start.'))]);
    }

    const nameInput = textInput(this.draftName, (value) => {
      this.draftName = value;
      this.refreshBar();
    }, { placeholder: 'e.g. Cheap coding' });
    nameInput.setAttribute('aria-label', 'Profile name');
    const descInput = textInput(this.draftDescription, (value) => {
      this.draftDescription = value;
      this.refreshBar();
    }, { placeholder: 'What this profile is for' });

    const editorHost = el('div');
    new PolicyEditor(editorHost, {
      policy: this.draftPolicy,
      suggestions: this.store.providerSuggestions(),
      onChange: (policy) => {
        this.draftPolicy = policy;
        this.refreshBar();
      },
    });

    const assigned = selected ? Object.values(config.models).filter((entry) => entry.profileId === selected.id).length : 0;
    const bar = el('div', { className: 'orm-bar-slot' });
    this.bar = bar;
    this.renderBar(bar);

    return el('div', { className: 'orm-split' }, [
      list,
      el('div', { className: 'orm-split-main' }, [
        card(this.creating ? 'New profile' : selected?.name ?? '', [
          el('div', { className: 'orm-grid orm-grid-2' }, [
            field('Name', nameInput),
            field('Description', descInput),
          ]),
          selected
            ? el('div', { className: 'orm-chip-row' }, [
                badge(`${assigned} model${assigned === 1 ? '' : 's'}`, 'info'),
                selected.builtin ? badge('Preset', 'neutral') : null,
              ])
            : null,
          el('h3', { className: 'orm-subhead', text: 'Settings in this profile' }),
          el('p', { className: 'orm-small orm-muted', text: 'Models that use this profile follow these settings unless they have their own.' }),
          disclosure('What this profile does', el('ul', { className: 'orm-sentences' },
            describePolicy(this.draftPolicy).map((line) => el('li', { text: line }))), { open: false }),
          editorHost,
          bar,
        ], {
          actions: selected && !this.creating
            ? [
                button('Duplicate', () => void this.store.duplicateProfile(selected.id), 'ghost', { small: true }),
                button('Delete', () => void this.deleteProfile(selected), 'ghost', { small: true }),
              ]
            : [],
        }),
      ]),
    ]);
  }

  private bar: HTMLElement | null = null;

  private refreshBar(): void {
    if (this.bar) this.renderBar(this.bar);
  }

  private renderBar(slot: HTMLElement): void {
    const nameMissing = !this.draftName.trim();
    slot.replaceChildren(
      saveBar({
        dirty: this.isDirty(),
        statusText: 'All changes saved.',
        saveDisabledReason: nameMissing ? 'Give the profile a name to save it.' : undefined,
        saving: this.store.getState().saving,
        onSave: () => void this.save(),
        onDiscard: () => {
          if (this.creating) {
            this.creating = false;
            this.selectedId = this.store.getState().config?.config.profiles[0]?.id ?? null;
          }
          this.loadDraft();
          this.update();
        },
      }),
    );
  }

  private async save(): Promise<void> {
    if (!this.draftName.trim()) return;
    if (this.creating) {
      const id = await this.store.createProfile(this.draftName, this.draftDescription, this.draftPolicy);
      if (id) {
        this.creating = false;
        this.selectedId = id;
        this.loadDraft();
        this.update();
      }
      return;
    }
    if (!this.selectedId) return;
    const ok = await this.store.updateProfile(this.selectedId, {
      name: this.draftName,
      description: this.draftDescription,
      policy: this.draftPolicy,
    });
    if (ok) {
      this.loadDraft();
      this.update();
    }
  }

  private async deleteProfile(profile: { id: string; name: string }): Promise<void> {
    const config = this.store.getState().config?.config;
    if (!config) return;
    const assigned = Object.values(config.models).filter((entry) => entry.profileId === profile.id).length;
    const others = config.profiles.filter((entry) => entry.id !== profile.id);
    if (others.length === 0) {
      await this.store.toast('error', 'Keep at least one profile.');
      return;
    }
    const fallback = others.find((entry) => entry.id === config.settings.defaultProfileId) ?? others[0]!;
    const ok = await confirmDialog(
      `Delete “${profile.name}”?`,
      assigned > 0
        ? `${assigned} model${assigned === 1 ? '' : 's'} will move to “${fallback.name}”. Their own custom settings stay.`
        : 'No models use this profile.',
      'Delete',
      true,
    );
    if (!ok) return;
    const saved = await this.store.deleteProfile(profile.id, fallback.id);
    if (saved) {
      this.selectedId = this.store.getState().config?.config.profiles[0]?.id ?? null;
      this.creating = false;
      this.loadDraft();
      this.update();
    }
  }

  private applyLayout(): HTMLElement {
    const config = this.store.getState().config!.config;
    const profileId = this.bulkProfileId ?? config.profiles[0]?.id ?? '';
    const list = el('div', { className: 'orm-pick-list', attrs: { role: 'group', 'aria-label': 'Models' } });
    const count = el('span', { className: 'orm-muted orm-small' });
    const applyButton = button('Apply to selected', () => void apply(), 'primary', { disabled: true });

    const refreshCount = () => {
      count.textContent = `${this.bulkSelected.size} selected`;
      applyButton.disabled = this.bulkSelected.size === 0;
    };

    const rebuild = () => {
      list.replaceChildren();
      const query = this.bulkQuery.trim().toLowerCase();
      const models = (this.store.getState().catalog?.models ?? [])
        .filter((model) => !query || `${model.name} ${model.id}`.toLowerCase().includes(query))
        .slice(0, 150);
      for (const model of models) {
        const entry = config.models[model.id];
        const input = el('input', { attrs: { type: 'checkbox', checked: this.bulkSelected.has(model.id) } });
        input.addEventListener('change', () => {
          if (input.checked) this.bulkSelected.add(model.id);
          else this.bulkSelected.delete(model.id);
          refreshCount();
        });
        list.append(el('label', { className: 'orm-pick-row' }, [
          input,
          el('span', { className: 'orm-pick-copy' }, [
            el('span', { text: model.name }),
            el('span', { className: 'orm-small orm-muted orm-mono', text: model.id }),
          ]),
          entry?.customized ? badge('Custom settings', 'warning') : null,
        ]));
      }
      if (models.length === 0) list.append(emptyState('No models match', 'Try a different search.'));
      refreshCount();
    };

    const apply = async () => {
      if (this.bulkSelected.size === 0) return;
      const { applied } = await this.store.assignProfileToModels([...this.bulkSelected], profileId || null, this.bulkReplace);
      if (applied > 0) this.bulkSelected.clear();
      this.update();
    };

    const search = textInput(this.bulkQuery, (value) => {
      this.bulkQuery = value;
      rebuild();
    }, { placeholder: 'Search models' });
    search.type = 'search';
    search.setAttribute('aria-label', 'Search models');
    rebuild();

    return card('Apply a profile', [
      toolbar([
        field('Profile', selectBox(profileId, config.profiles.map((profile) => ({ value: profile.id, label: profile.name })), (value) => {
          this.bulkProfileId = value;
        })),
        el('div', { className: 'orm-grow' }, [field('Models', search)]),
      ]),
      switchBox(this.bulkReplace, (checked) => {
        this.bulkReplace = checked;
        this.update();
      }, 'Replace models’ own custom settings', this.bulkReplace
        ? 'Their custom settings will be removed.'
        : 'Models with their own settings keep them.'),
      list,
      el('div', { className: 'orm-row-between' }, [
        count,
        el('div', { className: 'orm-actions' }, [
          button('Clear', () => {
            this.bulkSelected.clear();
            rebuild();
          }, 'ghost', { small: true }),
          applyButton,
        ]),
      ]),
    ]);
  }
}
