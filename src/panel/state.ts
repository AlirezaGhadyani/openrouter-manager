import type { connectHost } from '@openchamber/sdk';
import type { EndpointInfo, ModelSummary } from '../shared/api-types.ts';
import { buildAnalytics, type AnalyticsSummary } from '../shared/analytics.ts';
import {
  builtinProfiles,
  countCustomModels,
  countExcludedProviders,
  effectivePolicy,
  findProfile,
} from '../shared/config.ts';
import { diffPolicy, emptyPolicy, mergePolicy, overrideCount } from '../shared/policy.ts';
import type { HistoryCache, StatusReport } from '../shared/storage.ts';
import type {
  ManagerConfig,
  ModelRouting,
  RoutingPolicy,
  RoutingProfile,
  ValidationIssue,
} from '../shared/types.ts';
import {
  ConfigConflictError,
  ConfigFileError,
  Repository,
  type CatalogResult,
  type ConfigSnapshot,
  type EndpointsResult,
} from '../data/repository.ts';
import type { PanelHost } from '../data/host.ts';
import { errorMessage } from '../data/host.ts';
import type { KeyInfo } from '../data/client.ts';

export type Host = ReturnType<typeof connectHost>;

export type Route =
  | { view: 'overview' }
  | { view: 'models' }
  | { view: 'model'; modelId: string; tab: 'providers' | 'routing' }
  | { view: 'profiles'; profileId?: string }
  | { view: 'analytics' }
  | { view: 'settings' };

export interface BrowserState {
  query: string;
  page: number;
  sort: 'name' | 'input' | 'output' | 'context' | 'providers' | 'latency' | 'throughput';
  direction: 'asc' | 'desc';
  provider: string;
  minContext: string;
  maxInput: string;
  maxOutput: string;
  availableOnly: boolean;
}

export interface ConnectionState {
  connected: boolean;
  account: string | null;
}

export interface ConfigErrorState {
  message: string;
  issues: ValidationIssue[];
  rawText: string;
  readOnly: boolean;
}

interface State {
  ready: boolean;
  route: Route;
  connection: ConnectionState | null;
  config: ConfigSnapshot | null;
  configError: ConfigErrorState | null;
  configIssues: ValidationIssue[];
  conflict: boolean;
  saving: boolean;
  catalog: CatalogResult | null;
  catalogLoading: boolean;
  catalogError: string | null;
  endpoints: Record<string, EndpointsResult | undefined>;
  endpointsLoading: Record<string, boolean | undefined>;
  status: StatusReport | null;
  statusCheckedAt: string | null;
  history: HistoryCache | null;
  keyInfo: KeyInfo | null;
  keyError: string | null;
  keyLoading: boolean;
  bulk: { done: number; total: number } | null;
  browser: BrowserState;
}

export class Store {
  private listeners = new Set<() => void>();
  private repo: Repository;
  private queue: string[] = [];
  private active = 0;
  private queued = new Set<string>();
  private state: State = {
    ready: false,
    route: { view: 'overview' },
    connection: null,
    config: null,
    configError: null,
    configIssues: [],
    conflict: false,
    saving: false,
    catalog: null,
    catalogLoading: false,
    catalogError: null,
    endpoints: {},
    endpointsLoading: {},
    status: null,
    statusCheckedAt: null,
    history: null,
    keyInfo: null,
    keyError: null,
    keyLoading: false,
    bulk: null,
    browser: {
      query: '',
      page: 0,
      sort: 'name',
      direction: 'asc',
      provider: '',
      minContext: '',
      maxInput: '',
      maxOutput: '',
      availableOnly: false,
    },
  };

  constructor(readonly host: Host) {
    this.repo = new Repository(host as unknown as PanelHost);
  }

  getState(): Readonly<State> {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private patch(partial: Partial<State>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  async init(): Promise<void> {
    const [configResult, catalogResult, statusResult, historyResult] = await Promise.allSettled([
      this.repo.loadConfig(),
      this.repo.loadCatalog(),
      this.repo.readStatus(),
      this.repo.readHistory(),
    ]);

    if (configResult.status === 'fulfilled') {
      this.state.config = configResult.value;
      this.state.configIssues = configResult.value.issues;
    } else {
      const error = configResult.reason;
      this.state.configError =
        error instanceof ConfigFileError
          ? {
              message: error.message,
              issues: error.issues,
              rawText: error.rawText,
              readOnly: error.readOnly,
            }
          : { message: errorMessage(error), issues: [], rawText: '', readOnly: false };
    }

    if (catalogResult.status === 'fulfilled') {
      this.state.catalog = catalogResult.value;
    } else {
      this.state.catalogError = errorMessage(catalogResult.reason);
    }
    if (statusResult.status === 'fulfilled') {
      this.state.status = statusResult.value;
      this.state.statusCheckedAt = new Date().toISOString();
    }
    if (historyResult.status === 'fulfilled') this.state.history = historyResult.value;
    this.state.ready = true;
    this.emit();
  }

  setConnection(connection: ConnectionState): void {
    this.patch({ connection });
  }

  navigate(route: Route): void {
    this.patch({ route });
    if (route.view === 'model') {
      const id = route.modelId;
      void this.loadEndpoints(id);
    }
  }

  setBrowser(partial: Partial<BrowserState>): void {
    this.patch({ browser: { ...this.state.browser, ...partial } });
  }

  getModel(id: string): ModelSummary | null {
    return this.state.catalog?.models.find((model) => model.id === id) ?? null;
  }

  getEndpoints(id: string): EndpointsResult | undefined {
    return this.state.endpoints[id];
  }

  getProfile(id: string | null | undefined): RoutingProfile | null {
    return this.state.config ? findProfile(this.state.config.config, id) : null;
  }

  modelEntry(id: string): ModelRouting | undefined {
    return this.state.config?.config.models[id];
  }

  effective(id: string): { policy: RoutingPolicy; profileId: string | null } | null {
    if (!this.state.config) return null;
    return effectivePolicy(this.state.config.config, id);
  }

  analytics(): AnalyticsSummary | null {
    if (!this.state.catalog) return null;
    const endpoints: Record<string, readonly EndpointInfo[]> = {};
    for (const [id, result] of Object.entries(this.state.endpoints)) {
      if (result) endpoints[id] = result.endpoints;
    }
    return buildAnalytics(this.state.catalog.models, endpoints);
  }

  stats(): { models: number; custom: number; excluded: number; defaultRouting: number } | null {
    if (!this.state.config || !this.state.catalog) return null;
    const custom = countCustomModels(this.state.config.config);
    return {
      models: this.state.catalog.models.length,
      custom,
      excluded: countExcludedProviders(this.state.config.config),
      defaultRouting: Math.max(0, this.state.catalog.models.length - custom),
    };
  }

  providerSuggestions(): Array<{ slug: string; name: string; tags: string[] }> {
    const map = new Map<string, { slug: string; name: string; tags: Set<string> }>();
    for (const result of Object.values(this.state.endpoints)) {
      if (!result) continue;
      for (const endpoint of result.endpoints) {
        const slug = endpoint.tag.split('/')[0] ?? endpoint.tag;
        const entry = map.get(slug) ?? { slug, name: endpoint.providerName, tags: new Set<string>() };
        entry.tags.add(endpoint.tag);
        map.set(slug, entry);
      }
    }
    return [...map.values()]
      .map((entry) => ({
        slug: entry.slug,
        name: entry.name,
        tags: [...entry.tags].sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async copy(text: string, message = 'Copied'): Promise<void> {
    try {
      await this.host.writeClipboard(text);
      await this.toast('success', message);
    } catch (error) {
      await this.toast('error', `Could not copy: ${errorMessage(error)}`);
    }
  }

  async toast(kind: 'info' | 'success' | 'error', message: string): Promise<void> {
    try {
      await this.host.toast({ kind, message });
    } catch {
      // A toast failure must not break the action that succeeded.
    }
  }

  async refreshCatalog(force = true): Promise<void> {
    this.patch({ catalogLoading: true, catalogError: null });
    try {
      const result = await this.repo.loadCatalog(force);
      this.patch({ catalog: result, catalogLoading: false });
      if (result.error) await this.toast('error', result.error);
    } catch (error) {
      this.patch({ catalogLoading: false, catalogError: errorMessage(error) });
      await this.toast('error', errorMessage(error));
    }
  }

  private async loadEndpointsNow(id: string, force: boolean): Promise<void> {
    if (this.state.endpointsLoading[id]) return;
    const model = this.getModel(id);
    if (!model) return;
    if (!force && this.state.endpoints[id]) return;
    this.state.endpointsLoading = { ...this.state.endpointsLoading, [id]: true };
    this.emit();
    try {
      const result = await this.repo.loadEndpoints(model, force);
      this.state.endpoints = { ...this.state.endpoints, [id]: result };
    } catch (error) {
      this.state.endpoints = {
        ...this.state.endpoints,
        [id]: { endpoints: [], fetchedAt: new Date().toISOString(), fromCache: false, stale: true, error: errorMessage(error) },
      };
    } finally {
      this.state.endpointsLoading = { ...this.state.endpointsLoading, [id]: false };
      this.emit();
    }
  }

  async loadEndpoints(id: string, force = false): Promise<void> {
    await this.loadEndpointsNow(id, force);
  }

  /** Prefetch a page with at most three parallel API calls. */
  queueEndpoints(ids: readonly string[], force = false): void {
    for (const id of ids) {
      if (!force && this.state.endpoints[id]) continue;
      if (this.queued.has(id) || this.state.endpointsLoading[id]) continue;
      this.queued.add(id);
      this.queue.push(id);
    }
    this.pump();
  }

  private pump(): void {
    while (this.active < 3 && this.queue.length > 0) {
      const id = this.queue.shift();
      if (!id) break;
      this.active++;
      void this.loadEndpointsNow(id, false)
        .catch(() => {})
        .finally(() => {
          this.queued.delete(id);
          this.active--;
          this.pump();
        });
    }
  }

  async loadMissingEndpoints(limit: number): Promise<void> {
    if (!this.state.catalog || this.state.bulk) return;
    const missing = this.state.catalog.models
      .filter((model) => !this.state.endpoints[model.id])
      .slice(0, limit);
    if (missing.length === 0) return;
    const total = missing.length;
    let done = 0;
    this.patch({ bulk: { done, total } });
    const workers = Array.from({ length: Math.min(3, missing.length) }, async () => {
      for (;;) {
        const model = missing.shift();
        if (!model) return;
        await this.loadEndpointsNow(model.id, false);
        done++;
        this.patch({ bulk: { done, total } });
      }
    });
    await Promise.all(workers);
    this.patch({ bulk: null });
  }

  async refreshStatus(): Promise<void> {
    this.patch({ status: await this.repo.readStatus(), statusCheckedAt: new Date().toISOString() });
  }

  async refreshHistory(): Promise<void> {
    this.patch({ history: await this.repo.readHistory() });
  }

  async testConnection(): Promise<void> {
    this.patch({ keyLoading: true, keyError: null });
    try {
      const info = await this.repo.client.keyInfo();
      this.patch({ keyInfo: info, keyLoading: false });
      await this.toast('success', 'OpenRouter responded.');
    } catch (error) {
      this.patch({ keyInfo: null, keyLoading: false, keyError: errorMessage(error) });
      await this.toast('error', errorMessage(error));
    }
  }

  /** Save a mutation atomically; refuses to overwrite an external change. */
  async saveConfig(mutate: (draft: ManagerConfig) => void, message = 'Saved'): Promise<boolean> {
    const snapshot = this.state.config;
    if (!snapshot || this.state.saving) return false;
    if (snapshot.readOnly) {
      await this.toast('error', 'This configuration is read-only. Update the extension first.');
      return false;
    }
    this.patch({ saving: true });
    try {
      const draft = structuredClone(snapshot.config);
      mutate(draft);
      draft.updatedAt = new Date().toISOString();
      if (snapshot.migratedFrom !== undefined) {
        await this.repo.backup(snapshot.text, 'pre-migration').catch(() => '');
      }
      const saved = await this.repo.saveConfig(draft, snapshot.fingerprint);
      this.patch({ config: saved, configIssues: [], conflict: false, saving: false });
      if (message) await this.toast('success', message);
      return true;
    } catch (error) {
      this.patch({ saving: false });
      if (error instanceof ConfigConflictError) {
        this.patch({ conflict: true });
        await this.toast('error', 'The configuration file changed on disk. Reload it before saving.');
      } else {
        await this.toast('error', `Could not save: ${errorMessage(error)}`);
      }
      return false;
    }
  }

  async reloadConfig(): Promise<void> {
    try {
      const snapshot = await this.repo.loadConfig();
      this.patch({
        config: snapshot,
        configError: null,
        configIssues: snapshot.issues,
        conflict: false,
      });
      await this.toast('success', 'Configuration reloaded from disk.');
    } catch (error) {
      if (error instanceof ConfigFileError) {
        this.patch({
          configError: {
            message: error.message,
            issues: error.issues,
            rawText: error.rawText,
            readOnly: error.readOnly,
          },
          conflict: false,
        });
      }
      await this.toast('error', errorMessage(error));
    }
  }

  async checkExternalChange(): Promise<void> {
    const snapshot = this.state.config;
    if (!snapshot || this.state.saving || this.state.conflict) return;
    try {
      const current = await this.repo.currentFingerprint();
      if (current.fingerprint && current.fingerprint !== snapshot.fingerprint) {
        this.patch({ conflict: true });
      }
    } catch {
      // A transient read failure is not a conflict.
    }
  }

  async resetConfig(): Promise<void> {
    const raw = this.state.configError?.rawText ?? this.state.config?.text ?? null;
    try {
      const snapshot = await this.repo.resetConfig(raw);
      this.patch({
        config: snapshot,
        configError: null,
        configIssues: [],
        conflict: false,
      });
      await this.toast('success', 'Configuration reset. A backup was written next to it.');
    } catch (error) {
      await this.toast('error', `Could not reset: ${errorMessage(error)}`);
    }
  }

  async saveModelPolicy(
    modelId: string,
    canonicalSlug: string,
    profileId: string | null,
    policy: RoutingPolicy,
  ): Promise<boolean> {
    const snapshot = this.state.config;
    if (!snapshot) return false;
    const profile = profileId ? findProfile(snapshot.config, profileId) : null;
    const base = profile?.policy ?? emptyPolicy();
    const overrides = diffPolicy(base, policy);
    const count = overrideCount(overrides);
    return this.saveConfig((draft) => {
      if (!profileId && count === 0) {
        delete draft.models[modelId];
      } else {
        draft.models[modelId] = {
          profileId,
          overrides,
          customized: count > 0,
          updatedAt: new Date().toISOString(),
        };
      }
      if (canonicalSlug && canonicalSlug !== modelId) {
        const isAnotherModel =
          draft.models[canonicalSlug] !== undefined ||
          this.state.catalog?.models.some((model) => model.id === canonicalSlug) === true;
        if (!isAnotherModel) draft.aliases[canonicalSlug] = modelId;
      }
    }, 'Routing saved');
  }

  async removeModelPolicy(modelId: string): Promise<boolean> {
    return this.saveConfig((draft) => {
      delete draft.models[modelId];
    }, 'Model routing removed');
  }

  async excludeProvider(modelId: string, canonicalSlug: string, providerSlug: string): Promise<boolean> {
    const entry = this.modelEntry(modelId);
    const effective = this.effective(modelId);
    const profileId = entry?.profileId ?? null;
    const policy = mergePolicy(effective?.policy ?? emptyPolicy(), undefined);
    policy.providers = [...policy.providers];
    policy.order = [...policy.order];

    if (policy.mode === 'only') {
      policy.providers = policy.providers.filter((slug) => slug !== providerSlug);
      if (policy.providers.length === 0) policy.mode = 'all';
    } else if (policy.mode === 'exclude') {
      if (!policy.providers.includes(providerSlug)) policy.providers.push(providerSlug);
    } else {
      policy.mode = 'exclude';
      policy.providers = [providerSlug];
    }
    policy.order = policy.order.filter((slug) => slug !== providerSlug);
    return this.saveModelPolicy(modelId, canonicalSlug, profileId, policy);
  }

  async createProfile(name: string, description: string, policy: RoutingPolicy): Promise<string | null> {
    const snapshot = this.state.config;
    if (!snapshot) return null;
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'profile';
    let id = base;
    let index = 2;
    while (snapshot.config.profiles.some((profile) => profile.id === id)) {
      id = `${base}-${index++}`;
    }
    const now = new Date().toISOString();
    const profile: RoutingProfile = {
      id,
      name: name.trim().slice(0, 80),
      description: description.trim().slice(0, 240),
      builtin: false,
      policy,
      createdAt: now,
      updatedAt: now,
    };
    const ok = await this.saveConfig((draft) => {
      draft.profiles.push(profile);
    }, 'Profile created');
    return ok ? id : null;
  }

  async updateProfile(id: string, patch: { name?: string; description?: string; policy?: RoutingPolicy }): Promise<boolean> {
    return this.saveConfig((draft) => {
      const profile = draft.profiles.find((entry) => entry.id === id);
      if (!profile) return;
      if (patch.name !== undefined) profile.name = patch.name.trim().slice(0, 80);
      if (patch.description !== undefined) profile.description = patch.description.trim().slice(0, 240);
      if (patch.policy !== undefined) profile.policy = patch.policy;
      profile.updatedAt = new Date().toISOString();
    }, 'Profile saved');
  }

  async duplicateProfile(id: string): Promise<boolean> {
    const snapshot = this.state.config;
    const source = snapshot?.config.profiles.find((profile) => profile.id === id);
    if (!snapshot || !source) return false;
    let newId = `${id}-copy`;
    let index = 2;
    while (snapshot.config.profiles.some((profile) => profile.id === newId)) {
      newId = `${id}-copy-${index++}`;
    }
    const now = new Date().toISOString();
    return this.saveConfig((draft) => {
      draft.profiles.push({
        ...structuredClone(source),
        id: newId,
        name: `${source.name} copy`.slice(0, 80),
        builtin: false,
        createdAt: now,
        updatedAt: now,
      });
    }, 'Profile duplicated');
  }

  async deleteProfile(id: string, reassignTo: string | null): Promise<boolean> {
    const snapshot = this.state.config;
    if (!snapshot || snapshot.config.profiles.length <= 1) {
      await this.toast('error', 'At least one profile must remain.');
      return false;
    }
    return this.saveConfig((draft) => {
      for (const entry of Object.values(draft.models)) {
        if (entry.profileId === id) entry.profileId = reassignTo;
      }
      draft.profiles = draft.profiles.filter((profile) => profile.id !== id);
      if (draft.settings.defaultProfileId === id) draft.settings.defaultProfileId = reassignTo;
    }, 'Profile deleted');
  }

  async assignProfileToModels(
    modelIds: readonly string[],
    profileId: string | null,
    replaceCustom: boolean,
  ): Promise<{ applied: number; skipped: number }> {
    let applied = 0;
    let skipped = 0;
    const ok = await this.saveConfig((draft) => {
      const now = new Date().toISOString();
      for (const id of modelIds) {
        const existing = draft.models[id];
        if (existing?.customized && !replaceCustom) {
          skipped++;
          continue;
        }
        if (!profileId && !existing) continue;
        draft.models[id] = {
          profileId,
          overrides: replaceCustom ? {} : (existing?.overrides ?? {}),
          customized: replaceCustom ? false : (existing?.customized ?? false),
          updatedAt: now,
        };
        applied++;
      }
    }, '');
    if (!ok) return { applied: 0, skipped: modelIds.length };
    await this.toast('success', `Applied to ${applied} model${applied === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} customized` : ''}.`);
    return { applied, skipped };
  }

  async setSetting<K extends keyof ManagerConfig['settings']>(
    key: K,
    value: ManagerConfig['settings'][K],
    message = 'Settings saved',
  ): Promise<boolean> {
    return this.saveConfig((draft) => {
      draft.settings[key] = value;
    }, message);
  }

  /** Endpoint cache size, for the Settings summary. */
  cacheSummary(): { models: number; endpointModels: number } {
    return {
      models: this.state.catalog?.models.length ?? 0,
      endpointModels: Object.values(this.state.endpoints).filter(Boolean).length,
    };
  }
}
