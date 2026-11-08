import { describePolicy, emptyPolicy, policyToProvider, validatePolicy } from '../../shared/policy.ts';
import type { RoutingPolicy } from '../../shared/types.ts';
import type { Store } from '../state.ts';
import { badge, banner, button, codeBlock, confirmDialog, el, field, selectBox } from '../dom.ts';
import { card, disclosure, saveBar } from '../components.ts';
import { PolicyEditor } from '../routing-form.ts';

export class RoutingPanel {
  readonly element = el('div', { className: 'orm-routing' });
  private headerHost = el('div', { className: 'orm-routing-head' });
  private editorHost = el('div', { className: 'orm-routing-editor' });
  private summaryHost = el('div', { className: 'orm-sticky' });
  private barHost = el('div');
  private editor: PolicyEditor | null = null;
  private profileId: string | null = null;
  private policy: RoutingPolicy = emptyPolicy();
  private baseline: RoutingPolicy = emptyPolicy();
  private baselineProfileId: string | null = null;

  constructor(
    private readonly store: Store,
    private readonly modelId: string,
    private readonly canonicalSlug: string,
  ) {
    this.syncFromStore();
    this.element.append(
      this.headerHost,
      el('div', { className: 'orm-routing-layout' }, [
        el('div', { className: 'orm-routing-main' }, [this.editorHost]),
        this.summaryHost,
      ]),
      this.barHost,
    );
    this.mountEditor();
    this.renderAll();
  }

  private isDirty(): boolean {
    return this.profileId !== this.baselineProfileId || JSON.stringify(this.policy) !== JSON.stringify(this.baseline);
  }

  private syncFromStore(): void {
    const entry = this.store.modelEntry(this.modelId);
    const effective = this.store.effective(this.modelId);
    this.profileId = entry?.profileId ?? null;
    this.baselineProfileId = this.profileId;
    this.policy = structuredClone(effective?.policy ?? emptyPolicy());
    this.baseline = structuredClone(effective?.policy ?? emptyPolicy());
  }

  /** Keeps the user's draft when the store refreshes but nothing was saved elsewhere. */
  update(): void {
    if (!this.isDirty()) {
      const before = JSON.stringify([this.profileId, this.baseline]);
      this.syncFromStore();
      if (before !== JSON.stringify([this.profileId, this.baseline])) {
        this.mountEditor();
      }
    }
    this.renderAll();
  }

  private mountEditor(): void {
    const container = el('div');
    this.editorHost.replaceChildren(container);
    this.editor = new PolicyEditor(container, {
      policy: this.policy,
      suggestions: this.store.providerSuggestions(),
      onChange: (policy) => {
        this.policy = policy;
        this.renderSummary();
        this.renderBar();
      },
    });
  }

  private renderAll(): void {
    this.renderHeader();
    this.renderSummary();
    this.renderBar();
  }

  private renderHeader(): void {
    const state = this.store.getState();
    const profiles = state.config?.config.profiles ?? [];
    const saved = this.store.modelEntry(this.modelId);
    const hasSaved = Boolean(saved);
    const stateBadge = hasSaved
      ? badge(this.profileId ? `Uses ${this.store.getProfile(this.profileId)?.name ?? 'profile'}` : 'Custom routing', 'info')
      : badge('OpenRouter default', 'neutral');
    this.headerHost.replaceChildren(
      el('div', { className: 'orm-routing-head-main' }, [
        field(
          'Start from a profile',
          selectBox(
            this.profileId ?? '',
            [{ value: '', label: 'No profile — set everything here' }, ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))],
            (value) => void this.changeProfile(value || null),
          ),
          profiles.find((profile) => profile.id === this.profileId)?.description,
        ),
        el('div', { className: 'orm-routing-state' }, [
          el('span', { className: 'orm-muted orm-small', text: 'Current' }),
          stateBadge,
        ]),
      ]),
      ...(hasSaved ? [button('Remove routing', () => void this.remove(), 'ghost', { small: true })] : []),
    );
  }

  private renderSummary(): void {
    const sentences = describePolicy(this.policy);
    const provider = policyToProvider(this.policy);
    const issues = validatePolicy(this.policy).filter((issue) => issue.severity === 'warning');
    const list = el('ul', { className: 'orm-sentences' });
    for (const sentence of sentences) list.append(el('li', { text: sentence }));

    const json = provider ? JSON.stringify({ provider }, null, 2) : '{}';
    this.summaryHost.replaceChildren(
      card('What this does', [
        list,
        issues.length > 0
          ? banner({ tone: 'warning', title: 'Worth knowing', body: issues.map((issue) => issue.message).join(' ') })
          : null,
        disclosure('Request sent to OpenRouter', [
          codeBlock(json),
          el('div', { className: 'orm-actions' }, [
            button('Copy', () => void this.store.copy(json, 'Copied'), 'ghost', { small: true }),
          ]),
        ], { open: true }),
      ], { className: 'orm-summary-card' }),
    );
  }

  private renderBar(): void {
    const errors = validatePolicy(this.policy).filter((issue) => issue.severity === 'error');
    const saving = this.store.getState().saving;
    const dirty = this.isDirty();
    const saved = this.store.modelEntry(this.modelId) !== undefined;
    this.barHost.replaceChildren(
      saveBar({
        dirty,
        statusText: saved ? 'Saved. Applies to the next request.' : 'Using OpenRouter defaults.',
        saveDisabledReason: errors[0]?.message,
        saving,
        onSave: () => void this.save(),
        onDiscard: () => {
          this.syncFromStore();
          this.mountEditor();
          this.renderAll();
        },
      }),
    );
  }

  private async changeProfile(profileId: string | null): Promise<void> {
    if (this.isDirty()) {
      const ok = await confirmDialog(
        'Replace your unsaved changes?',
        'Picking a profile loads its settings and discards the edits you have not saved.',
        'Replace',
        true,
      );
      if (!ok) {
        this.renderHeader();
        return;
      }
    }
    const profile = this.store.getProfile(profileId);
    this.profileId = profileId;
    this.policy = profile ? structuredClone(profile.policy) : emptyPolicy();
    this.mountEditor();
    this.renderAll();
  }

  private async save(): Promise<void> {
    const ok = await this.store.saveModelPolicy(this.modelId, this.canonicalSlug, this.profileId, this.policy);
    if (!ok) return;
    this.syncFromStore();
    this.mountEditor();
    this.renderAll();
  }

  private async remove(): Promise<void> {
    const ok = await confirmDialog(
      'Remove routing for this model?',
      'It returns to OpenRouter’s default choice of provider. The model itself does not change.',
      'Remove',
      true,
    );
    if (!ok) return;
    const saved = await this.store.removeModelPolicy(this.modelId);
    if (!saved) return;
    this.syncFromStore();
    this.mountEditor();
    this.renderAll();
  }
}
