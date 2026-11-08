"use strict";
(() => {
  // node_modules/@openchamber/sdk/dist/api-version.js
  var OPENCHAMBER_SDK_CHANNEL = "openchamber.sdk";
  var OPENCHAMBER_SDK_API_VERSION = 1;

  // node_modules/@openchamber/sdk/dist/scrollbar-style.js
  var GUEST_SCROLLING_ATTRIBUTE = "data-oc-scrolling";
  var GUEST_SCROLLBAR_CSS = `
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${GUEST_SCROLLING_ATTRIBUTE}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${GUEST_SCROLLING_ATTRIBUTE}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${GUEST_SCROLLING_ATTRIBUTE}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;
  function installGuestScrollbarActivity(doc) {
    const root2 = doc.documentElement;
    if (root2.hasAttribute("data-oc-scrollbar-activity"))
      return;
    root2.setAttribute("data-oc-scrollbar-activity", "");
    const timers = /* @__PURE__ */ new WeakMap();
    doc.addEventListener("scroll", (event) => {
      const target = event.target === doc ? root2 : event.target;
      if (!(target instanceof Element))
        return;
      if (!target.hasAttribute("data-oc-scrolling"))
        target.setAttribute("data-oc-scrolling", "");
      const pending = timers.get(target);
      if (pending !== void 0)
        clearTimeout(pending);
      timers.set(target, setTimeout(() => {
        timers.delete(target);
        target.removeAttribute("data-oc-scrolling");
      }, 1e3));
    }, { capture: true, passive: true });
  }
  var GUEST_SCROLLBAR_SCRIPT = `(${installGuestScrollbarActivity.toString()})(document);`;

  // node_modules/@openchamber/sdk/dist/workspace.js
  var GUEST_STORAGE_KEY_MAX = 128;
  var GUEST_STORAGE_VALUE_BYTES = 65536;

  // node_modules/@openchamber/sdk/dist/shells.js
  var GUEST_SHELL_ID_MAX = 128;
  var GUEST_SHELL_OUTPUT_TAIL_MAX = 65536;

  // node_modules/@openchamber/sdk/dist/status-controls.js
  var GUEST_STATUS_CONTROLS_MAX = 4;
  var GUEST_STATUS_CONTROL_ID = /^[a-z][a-z0-9-]{0,39}$/;
  var GUEST_STATUS_CONTROL_LABEL_MAX = 60;
  var GUEST_STATUS_CONTROL_OPTIONS_MAX = 16;
  var GUEST_STATUS_CONTROL_VALUE_MAX = 80;
  var isControlObject = (value) => Object(value) === value && !Array.isArray(value);
  var hasOnlyKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
  var isLabel = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_LABEL_MAX;
  var isValue = (value) => String(value) === value && value.length >= 1 && value.length <= GUEST_STATUS_CONTROL_VALUE_MAX;
  var isGuestStatusControls = (controls) => {
    if (!Array.isArray(controls) || controls.length > GUEST_STATUS_CONTROLS_MAX)
      return false;
    const ids = /* @__PURE__ */ new Set();
    for (const control of controls) {
      if (!isControlObject(control) || !GUEST_STATUS_CONTROL_ID.test(control.id) || !isLabel(control.label))
        return false;
      if (control.disabled !== void 0 && control.disabled !== true && control.disabled !== false)
        return false;
      if (ids.has(control.id))
        return false;
      ids.add(control.id);
      if (control.kind === "button") {
        if (!hasOnlyKeys(control, ["kind", "id", "label", "disabled"]))
          return false;
        continue;
      }
      if (control.kind !== "select" || !hasOnlyKeys(control, ["kind", "id", "label", "value", "options", "disabled"]))
        return false;
      if (!isValue(control.value) || !Array.isArray(control.options) || control.options.length < 1 || control.options.length > GUEST_STATUS_CONTROL_OPTIONS_MAX)
        return false;
      const values = /* @__PURE__ */ new Set();
      for (const option of control.options) {
        if (!isControlObject(option) || !hasOnlyKeys(option, ["value", "label"]) || !isValue(option.value) || !isLabel(option.label) || values.has(option.value))
          return false;
        values.add(option.value);
      }
      if (!values.has(control.value))
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/manifest.js
  var TRACKER_URL_TOKENS = ["{id}", "{segment}", "{segments+}"];
  var TRACKER_URL_TOKEN_SET = new Set(TRACKER_URL_TOKENS);

  // node_modules/@openchamber/sdk/dist/session-events.js
  var GUEST_SESSION_EVENT_TYPES = [
    "turn-finished",
    "turn-failed",
    "permission-asked",
    "question-asked",
    "turn-started",
    "session-created",
    "session-archived",
    "session-deleted"
  ];
  var SESSION_EVENTS_IDLE_MS = 10 * 6e4;
  var EVENT_TYPES = new Set(GUEST_SESSION_EVENT_TYPES);

  // node_modules/@openchamber/sdk/dist/service-host.js
  var SERVICE_SCHEDULE_IDLE_MS = 10 * 6e4;
  var MENTIONS_IDLE_MS = 10 * 6e4;

  // node_modules/@openchamber/sdk/dist/file-editor.js
  var GUEST_FILE_EDITOR_CONTENT_MAX = 2e7;
  var GUEST_FILE_EDITOR_VERSION_MAX = 256;
  var fileEditorPayloadSize = (value) => "bytes" in value ? value.bytes.byteLength : value.content.length;
  var sameFileEditorDocument = (left, right) => {
    if (left.path !== right.path || left.readOnly !== right.readOnly)
      return false;
    if (left.encoding === "text" || right.encoding === "text") {
      return left.encoding === "text" && right.encoding === "text" && left.content === right.content;
    }
    if (left.bytes.byteLength !== right.bytes.byteLength)
      return false;
    for (let index = 0; index < left.bytes.byteLength; index += 1) {
      if (left.bytes[index] !== right.bytes[index])
        return false;
    }
    return true;
  };

  // node_modules/@openchamber/sdk/dist/popover.js
  var GUEST_POPOVER_ID = /^[A-Za-z0-9_-]{1,80}$/;
  var GUEST_POPOVER_COORDINATE_MAX = 1e5;
  var GUEST_POPOVER_WIDTH_MIN = 160;
  var GUEST_POPOVER_WIDTH_MAX = 640;
  var GUEST_POPOVER_HEIGHT_MIN = 48;
  var GUEST_POPOVER_HEIGHT_MAX = 480;
  var GUEST_POPOVER_DATA_MAX = 16e3;
  var GUEST_POPOVER_DATA_DEPTH_MAX = 32;
  var GUEST_POPOVER_SIDES = ["left", "right", "top", "bottom"];
  var hasBoundedJsonTree = (value, depth = 0, budget = { remaining: GUEST_POPOVER_DATA_MAX }) => {
    if (--budget.remaining < 0 || depth >= GUEST_POPOVER_DATA_DEPTH_MAX)
      return false;
    if (value === null)
      return true;
    const children = Array.isArray(value) ? value : Object(value) === value ? Object.values(value) : [];
    for (const item of children) {
      if (!hasBoundedJsonTree(item, depth + 1, budget))
        return false;
    }
    return true;
  };
  var isFiniteJson = (value) => {
    if (value === null || value === true || value === false)
      return true;
    if (Array.isArray(value))
      return Object.keys(value).every((key) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length) && value.every(isFiniteJson);
    if (Object(value) === value) {
      const prototype = Object.getPrototypeOf(value);
      return (prototype === null || prototype === Object.prototype) && Object.values(value).every(isFiniteJson);
    }
    return String(value) === value || Number.isFinite(value);
  };
  var isGuestPopoverRequest = (request) => {
    try {
      if (String(request.id) !== request.id || !GUEST_POPOVER_ID.test(request.id) || !Number.isFinite(request.anchor.x) || Math.abs(request.anchor.x) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.y) || Math.abs(request.anchor.y) > GUEST_POPOVER_COORDINATE_MAX || !Number.isFinite(request.anchor.width) || !Number.isFinite(request.anchor.height) || request.anchor.width <= 0 || request.anchor.height <= 0 || request.anchor.width > GUEST_POPOVER_COORDINATE_MAX || request.anchor.height > GUEST_POPOVER_COORDINATE_MAX || !Number.isInteger(request.width) || request.width < GUEST_POPOVER_WIDTH_MIN || request.width > GUEST_POPOVER_WIDTH_MAX || !Number.isInteger(request.height) || request.height < GUEST_POPOVER_HEIGHT_MIN || request.height > GUEST_POPOVER_HEIGHT_MAX || request.side !== void 0 && !GUEST_POPOVER_SIDES.includes(request.side) || request.focus !== void 0 && request.focus !== true && request.focus !== false || !hasBoundedJsonTree(request.data) || !isFiniteJson(request.data))
        return false;
      return JSON.stringify(request.data).length <= GUEST_POPOVER_DATA_MAX;
    } catch {
      return false;
    }
  };

  // node_modules/@openchamber/sdk/dist/contract.js
  var GUEST_BLOCK_ANSWER_MAX = 2e3;
  var GUEST_FILE_STAT_KINDS = ["file", "directory", "other", "missing"];
  var isStartSessionResult = (value) => Boolean(value && "sessionId" in value);
  var isPromptResult = (value) => Boolean(value && "sent" in value && !("sessionId" in value));
  var GUEST_COMMIT_SHA = /^[0-9a-f]{7,64}$/i;
  var isGuestCommitSha = (value) => GUEST_COMMIT_SHA.test(value);
  var GUEST_TOAST_MAX = 500;
  var GUEST_CLIPBOARD_TEXT_MAX = 32e3;
  var GUEST_COMPOSE_TEXT_MAX = 16e3;
  var GUEST_ATTACH_ID_MAX = 128;
  var GUEST_ATTACH_TITLE_MAX = 200;
  var GUEST_ATTACH_URL_MAX = 2e3;
  var GUEST_ATTACH_TEXT_MAX = 16e3;
  var GUEST_ATTACH_AUTHOR_MAX = 80;
  var GUEST_ATTACH_BRANCH_MAX = 200;
  var GUEST_ATTACH_DATA_MAX = 16e3;
  var GUEST_REQUEST_PATH_MAX = 2e3;
  var GUEST_REQUEST_TIMEOUT_MS = 2e4;
  var GUEST_FILE_PATH_MAX = 1024;
  var GUEST_FILE_CONTENT_MAX = 2e6;
  var GUEST_GENERATE_PROMPT_MAX = 64e3;
  var GUEST_GENERATE_SYSTEM_MAX = 8e3;
  var GUEST_GENERATE_OUTPUT_TOKENS_MAX = 4e3;
  var GUEST_GENERATE_TIMEOUT_MS = 96e4;
  var GUEST_GENERATE_LATE_KEEP_MS = 60 * 6e4;
  var GUEST_BADGE_MAX = 999;
  var GUEST_FRAME_HEIGHT_MAX = 1e4;
  var GUEST_RESOLVE_ERROR_MAX = 500;
  var HOST_REQUEST_ERROR_CODES = [
    "HOST_UNAVAILABLE",
    "HOST_TIMEOUT",
    "HOST_REJECTED",
    "DISCONNECTED",
    "DISABLED",
    "BAD_PATH",
    "NO_INTEGRATION",
    "NO_SERVICE",
    "SERVICE_FAILED",
    "REQUEST_FAILED",
    "RESPONSE_TOO_LARGE",
    "NO_SESSION",
    "SESSION_BUSY",
    "NOT_GRANTED",
    "NO_DIRECTORY",
    "NOT_FOUND",
    "FILE_TOO_LARGE",
    "DENIED",
    "NO_MODEL",
    "MODEL_FAILED",
    "UNSUPPORTED"
  ];
  var SERVICE_STATUS_VALUES = ["stopped", "starting", "ready", "failed"];
  var hostRequestErrorCodeSet = new Set(HOST_REQUEST_ERROR_CODES);
  var isHostRequestErrorCode = (value) => hostRequestErrorCodeSet.has(value);
  var resolveHostRequestErrorCode = (value) => value && isHostRequestErrorCode(value) ? value : "HOST_REJECTED";
  var isJsonValue = (value) => {
    if (value === void 0)
      return false;
    if (value === null || value === true || value === false)
      return true;
    if (String(value) === value)
      return true;
    if (Number(value) === value)
      return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every(isJsonValue);
    if (Object(value) === value)
      return Object.values(value).every(isJsonValue);
    return false;
  };
  var isAttachData = (value) => isJsonValue(value) && JSON.stringify(value).length <= GUEST_ATTACH_DATA_MAX;
  var clampBranch = (value) => value?.trim().slice(0, GUEST_ATTACH_BRANCH_MAX) ?? "";
  var clampAttachRequest = (request) => {
    const id = request.id.trim().slice(0, GUEST_ATTACH_ID_MAX);
    const title = request.title.trim().slice(0, GUEST_ATTACH_TITLE_MAX);
    const url = request.url.trim().slice(0, GUEST_ATTACH_URL_MAX);
    const text = request.text?.trim().slice(0, GUEST_ATTACH_TEXT_MAX);
    const author = request.author?.trim().slice(0, GUEST_ATTACH_AUTHOR_MAX);
    const kind = request.kind === "pull" ? "pull" : "issue";
    const next = {
      providerId: request.providerId.trim(),
      id,
      title: title || id,
      url,
      kind
    };
    if (text) {
      next.text = text;
    }
    if (author) {
      next.author = author;
    }
    if (kind === "pull") {
      const head = clampBranch(request.branches?.head);
      const base = clampBranch(request.branches?.base);
      if (head && base) {
        next.branches = { head, base };
      }
    }
    if (isAttachData(request.data)) {
      next.data = request.data;
    }
    return next;
  };
  var clampStartSessionRequest = (request) => {
    const next = clampAttachRequest(request);
    if (request.projectId)
      next.projectId = request.projectId;
    if (request.navigation)
      next.navigation = request.navigation;
    if (request.worktree) {
      next.worktree = request.worktree;
    }
    return next;
  };
  var clampPromptRequest = (request) => {
    const next = {
      text: request.text.trim().slice(0, GUEST_COMPOSE_TEXT_MAX)
    };
    if (request.send) {
      next.send = true;
    }
    return next;
  };
  var clampBadgeCount = (count2) => {
    if (count2 === null || !Number.isFinite(count2))
      return null;
    return Math.min(GUEST_BADGE_MAX, Math.max(0, Math.round(count2)));
  };
  var clampFrameHeight = (height) => {
    if (!Number.isFinite(height))
      return 0;
    return Math.min(GUEST_FRAME_HEIGHT_MAX, Math.max(0, Math.ceil(height)));
  };
  var isGuestFilePath = (value) => value.length > 0 && value.length <= GUEST_FILE_PATH_MAX && !value.includes("\0") && !value.includes("\\");
  var isGuestRequestPath = (value) => {
    if (!value.startsWith("/") || value.includes("\0") || value.includes("\\") || value.includes("://")) {
      return false;
    }
    if (value.length > GUEST_REQUEST_PATH_MAX) {
      return false;
    }
    const segments = value.split("/");
    return !segments.some((segment) => segment === "." || segment === "..");
  };
  var serviceStatusSet = new Set(SERVICE_STATUS_VALUES);
  var isServiceStatusResult = (value) => Boolean(value && "status" in value && serviceStatusSet.has(String(value.status)) && !("body" in value));
  var isGuestRequestResult = (value) => Boolean(value && "status" in value && "body" in value && Number.isInteger(value.status));
  var isFileReadResult = (value) => Boolean(value && "content" in value && String(value.content) === value.content);
  var isFileWriteResult = (value) => Boolean(value && "written" in value && value.written === true);
  var isFileListResult = (value) => Boolean(value && "entries" in value && Array.isArray(value.entries));
  var fileStatKindSet = new Set(GUEST_FILE_STAT_KINDS);
  var isFileStatResult = (value) => Boolean(value && "kind" in value && "size" in value && fileStatKindSet.has(String(value.kind)) && Number.isFinite(value.size));
  var isGenerateResult = (value) => Boolean(value && "text" in value && String(value.text) === value.text && !("status" in value));
  var HOST_PUSH_TYPES = /* @__PURE__ */ new Set([
    "workspace",
    "shells",
    "ready",
    "directory",
    "session",
    "connection",
    "settings",
    "session-lifecycle",
    "item",
    "resolve",
    "action",
    "service-event",
    "status-control-event",
    "popover-closed",
    "file-open",
    "file-snapshot",
    "file-saved",
    "generate-late"
  ]);
  var asWireRecord = (data) => Object(data) === data ? data : null;
  var isNonEmptyString = (value) => String(value) === value && value.length > 0;
  var readResultMessage = (wire) => {
    if (!isNonEmptyString(wire.id))
      return null;
    if (wire.ok === true) {
      const message = {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: true
      };
      if (Object(wire.payload) === wire.payload) {
        message.payload = wire.payload;
      }
      return message;
    }
    if (wire.ok === false && isNonEmptyString(wire.error)) {
      return {
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "result",
        id: wire.id,
        ok: false,
        error: wire.error,
        code: resolveHostRequestErrorCode(isNonEmptyString(wire.code) ? wire.code : void 0)
      };
    }
    return null;
  };
  var readHostMessage = (data) => {
    const wire = asWireRecord(data);
    if (!wire || wire.channel !== OPENCHAMBER_SDK_CHANNEL || wire.v !== OPENCHAMBER_SDK_API_VERSION)
      return null;
    if (wire.type === "result")
      return readResultMessage(wire);
    if (!HOST_PUSH_TYPES.has(String(wire.type)) || Object(wire.payload) !== wire.payload)
      return null;
    return wire;
  };

  // node_modules/@openchamber/sdk/dist/host.js
  var isKeyEvent = (event) => "key" in event && "metaKey" in event && "ctrlKey" in event;
  var isSaveShortcut = (event) => (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
  var HostRequestError = class extends Error {
    code;
    constructor(code, message) {
      super(message);
      this.name = "HostRequestError";
      this.code = code;
    }
  };
  var rejectBadPath = () => Promise.reject(new HostRequestError("BAD_PATH", 'Request path must start with "/" and stay on the declared origin.'));
  var rejectBadFilePath = () => Promise.reject(new HostRequestError("BAD_PATH", `File path must be 1 to ${GUEST_FILE_PATH_MAX} characters without NUL or backslash.`));
  var deviceStorageScope = (options) => {
    if (options === void 0)
      return void 0;
    if (Object(options) !== options || Array.isArray(options) || options.scope !== void 0 && options.scope !== "instance" && options.scope !== "device") {
      throw new HostRequestError("HOST_REJECTED", 'Storage scope must be "instance" or "device".');
    }
    return options.scope === "device" ? "device" : void 0;
  };
  var nextId = (n) => {
    n.value += 1;
    return `oc-${n.value}`;
  };
  var connectHost = (options = {}) => {
    const target = options.target ?? ("window" in globalThis ? window : null);
    if (!target) {
      throw new HostRequestError("HOST_UNAVAILABLE", "No window. connectHost runs in a browser frame.");
    }
    const acceptSource = options.acceptSource ?? ((source) => source === target.parent);
    const requestTimeoutMs = options.requestTimeoutMs ?? GUEST_REQUEST_TIMEOUT_MS;
    const readyListeners = /* @__PURE__ */ new Set();
    const directoryListeners = /* @__PURE__ */ new Set();
    const sessionListeners = /* @__PURE__ */ new Set();
    const lifecycleListeners = /* @__PURE__ */ new Set();
    const connectionListeners = /* @__PURE__ */ new Set();
    const settingsListeners = /* @__PURE__ */ new Set();
    const itemListeners = /* @__PURE__ */ new Set();
    const blockListeners = /* @__PURE__ */ new Set();
    const serviceEventListeners = /* @__PURE__ */ new Set();
    const statusControlListeners = /* @__PURE__ */ new Set();
    const popoverClosedListeners = /* @__PURE__ */ new Set();
    const lateGenerateListeners = /* @__PURE__ */ new Set();
    const unclaimedLateGenerate = [];
    let resolveHandler = null;
    let actionHandler = null;
    const fileOpenListeners = /* @__PURE__ */ new Set();
    const fileSavedListeners = /* @__PURE__ */ new Set();
    let fileSnapshotHandler = null;
    let lastFile = null;
    let saveShortcutInstalled = false;
    const pending = /* @__PURE__ */ new Map();
    const workspaceListeners = /* @__PURE__ */ new Map();
    const shellsListeners = /* @__PURE__ */ new Map();
    let disposed = false;
    const ids = { value: 0 };
    let lastReady = null;
    let lastLifecycle = null;
    let popoverPointerActive = false;
    let popoverFocusActive = false;
    let popoverActivityReported = null;
    const lifecycleFromSession = (session) => {
      if (!session)
        return null;
      return {
        sessionId: session.id,
        phase: session.busy ? "started" : "completed"
      };
    };
    const post = (message) => {
      target.parent.postMessage(message, "*");
    };
    const listenForLateGenerate = () => {
      if (disposed || target.parent === target || lateGenerateListeners.size === 0 || lastReady?.features?.lateGenerateResults !== true)
        return;
      post({ channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION, type: "generate-late-listen" });
    };
    const emit = (listeners, value) => {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error(error);
        }
      }
    };
    const onMessage = (event) => {
      if (!(event instanceof MessageEvent))
        return;
      if (!acceptSource(event.source))
        return;
      const message = readHostMessage(event.data);
      if (!message)
        return;
      if (message.type === "workspace") {
        const listener = workspaceListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "shells") {
        const listener = shellsListeners.get(message.payload.subscriptionId);
        if (listener)
          emit([listener], message.payload.snapshot);
        return;
      }
      if (message.type === "ready") {
        lastReady = message.payload;
        lastLifecycle = lifecycleFromSession(message.payload.session);
        emit(readyListeners, message.payload);
        emit(directoryListeners, message.payload.directory);
        emit(sessionListeners, message.payload.session);
        if (lastLifecycle) {
          emit(lifecycleListeners, lastLifecycle);
        }
        emit(connectionListeners, message.payload.connection);
        emit(settingsListeners, message.payload.settings);
        emit(itemListeners, message.payload.item);
        if (message.payload.block)
          emit(blockListeners, message.payload.block);
        listenForLateGenerate();
        return;
      }
      if (message.type === "service-event") {
        emit(serviceEventListeners, message.payload);
        return;
      }
      if (message.type === "generate-late") {
        if (lateGenerateListeners.size === 0)
          unclaimedLateGenerate.push(message.payload);
        else
          emit(lateGenerateListeners, message.payload);
        return;
      }
      if (message.type === "directory") {
        if (lastReady) {
          lastReady = { ...lastReady, directory: message.payload.directory };
        }
        emit(directoryListeners, message.payload.directory);
        return;
      }
      if (message.type === "session") {
        if (lastReady) {
          lastReady = { ...lastReady, session: message.payload.session };
        }
        if (!message.payload.session) {
          lastLifecycle = null;
        } else if (lastLifecycle?.sessionId !== message.payload.session.id) {
          lastLifecycle = lifecycleFromSession(message.payload.session);
        }
        emit(sessionListeners, message.payload.session);
        return;
      }
      if (message.type === "session-lifecycle") {
        lastLifecycle = message.payload;
        emit(lifecycleListeners, message.payload);
        return;
      }
      if (message.type === "connection") {
        if (lastReady) {
          lastReady = { ...lastReady, connection: message.payload.connection };
        }
        emit(connectionListeners, message.payload.connection);
        return;
      }
      if (message.type === "settings") {
        if (lastReady) {
          lastReady = { ...lastReady, settings: message.payload.settings };
        }
        emit(settingsListeners, message.payload.settings);
        return;
      }
      if (message.type === "item") {
        if (lastReady) {
          lastReady = { ...lastReady, item: message.payload.item };
        }
        emit(itemListeners, message.payload.item);
        return;
      }
      if (message.type === "status-control-event") {
        emit(statusControlListeners, message.payload);
        return;
      }
      if (message.type === "popover-closed") {
        emit(popoverClosedListeners, message.payload);
        return;
      }
      if (message.type === "action") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "action-result",
              id: message.id,
              payload
            });
        };
        const handler = actionHandler;
        if (!handler) {
          answer({ ok: false, error: "This extension does not handle background actions." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then(() => answer({ ok: true }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ ok: false, error: (text || "Action failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      if (message.type === "file-open") {
        const next = message.payload;
        if (lastFile && sameFileEditorDocument(lastFile, next))
          return;
        lastFile = next;
        emit(fileOpenListeners, message.payload);
        return;
      }
      if (message.type === "file-saved") {
        emit(fileSavedListeners, message.payload.version);
        return;
      }
      if (message.type === "file-snapshot") {
        const answer = (payload) => {
          if (!disposed)
            post({
              channel: OPENCHAMBER_SDK_CHANNEL,
              v: OPENCHAMBER_SDK_API_VERSION,
              type: "file-snapshot-result",
              id: message.id,
              payload
            });
        };
        const fail = (text) => answer({ error: (text.trim() || "Could not read the edited file.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        const handler = fileSnapshotHandler;
        if (!handler) {
          fail("This extension does not edit files.");
          return;
        }
        Promise.resolve().then(() => handler(message.payload.purpose)).then((snapshot) => {
          if (fileEditorPayloadSize(snapshot) > GUEST_FILE_EDITOR_CONTENT_MAX) {
            fail(`The file is over ${GUEST_FILE_EDITOR_CONTENT_MAX} ${"bytes" in snapshot ? "bytes" : "characters"}.`);
            return;
          }
          if (snapshot.version.length > GUEST_FILE_EDITOR_VERSION_MAX) {
            fail(`The snapshot version is over ${GUEST_FILE_EDITOR_VERSION_MAX} characters.`);
            return;
          }
          answer({ snapshot: "bytes" in snapshot ? { bytes: snapshot.bytes, version: snapshot.version } : { content: snapshot.content, version: snapshot.version } });
        }, (error) => fail(error instanceof Error ? error.message : String(error)));
        return;
      }
      if (message.type === "resolve") {
        const answer = (payload) => {
          post({
            channel: OPENCHAMBER_SDK_CHANNEL,
            v: OPENCHAMBER_SDK_API_VERSION,
            type: "resolve-result",
            id: message.id,
            payload
          });
        };
        const handler = resolveHandler;
        if (!handler) {
          answer({ error: "This extension does not resolve commands." });
          return;
        }
        Promise.resolve().then(() => handler(message.payload)).then((item) => answer({ item: item ? clampAttachRequest(item) : null }), (error) => {
          const text = (error instanceof Error ? error.message : String(error)).trim();
          answer({ error: (text || "Command failed.").slice(0, GUEST_RESOLVE_ERROR_MAX) });
        });
        return;
      }
      const waiter = pending.get(message.id);
      if (!waiter)
        return;
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      if (message.ok) {
        waiter.resolve(message.payload);
        return;
      }
      waiter.reject(new HostRequestError(message.code, message.error));
    };
    target.addEventListener("message", onMessage);
    post({
      channel: OPENCHAMBER_SDK_CHANNEL,
      v: OPENCHAMBER_SDK_API_VERSION,
      type: "hello"
    });
    const send = (message, timeoutMs = requestTimeoutMs) => {
      if (disposed || target.parent === target) {
        return Promise.reject(new HostRequestError("HOST_UNAVAILABLE", "No host frame. This page is not in an iframe."));
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(message.id);
          reject(new HostRequestError("HOST_TIMEOUT", "Host did not answer in time."));
        }, timeoutMs);
        pending.set(message.id, { resolve, reject, timer });
        post(message);
      });
    };
    const request = (message) => send(message).then(() => void 0);
    const envelope = { channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION };
    const notify = (message) => {
      if (!disposed && target.parent !== target)
        post(message);
    };
    const requestFileSave = () => notify({ ...envelope, type: "file-save" });
    const onSaveShortcut = (event) => {
      if (!isKeyEvent(event) || !isSaveShortcut(event))
        return;
      event.preventDefault();
      requestFileSave();
    };
    const onPopoverEscape = (event) => {
      if (!isKeyEvent(event) || event.key !== "Escape" || lastReady?.surface !== "popover" || !lastReady.popover)
        return;
      event.preventDefault();
      void closePopover(lastReady.popover.id, "escape").catch(() => void 0);
    };
    const reportPopoverActivity = () => {
      const popover = lastReady?.surface === "popover" ? lastReady.popover : void 0;
      if (!popover)
        return;
      const active2 = popoverPointerActive || popoverFocusActive;
      if (popoverActivityReported === active2)
        return;
      popoverActivityReported = active2;
      void setPopoverAnchorActive(popover.id, active2).catch(() => void 0);
    };
    const onPopoverPointerOver = () => {
      if (lastReady?.surface !== "popover" || popoverPointerActive)
        return;
      popoverPointerActive = true;
      reportPopoverActivity();
    };
    const onPopoverPointerOut = (event) => {
      if (lastReady?.surface !== "popover" || event.relatedTarget !== null || !popoverPointerActive)
        return;
      popoverPointerActive = false;
      reportPopoverActivity();
    };
    const onPopoverFocus = () => {
      if (lastReady?.surface !== "popover" || popoverFocusActive)
        return;
      popoverFocusActive = true;
      reportPopoverActivity();
    };
    const onPopoverBlur = () => {
      if (lastReady?.surface !== "popover" || !popoverFocusActive)
        return;
      popoverFocusActive = false;
      reportPopoverActivity();
    };
    const requireIdentity = (value, maximum = 1024) => {
      if (!value.trim() || value.length > maximum)
        throw new HostRequestError("HOST_REJECTED", `Identity must contain 1 to ${maximum} characters.`);
    };
    const readWorkspace = async (query) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const result = await send({ ...envelope, type: "workspace-read", id: nextId(ids), payload: query });
      if (!result || !("kind" in result) || !("state" in result) || result.kind !== query.kind) {
        throw new HostRequestError("HOST_REJECTED", "Host did not return workspace data.");
      }
      return result;
    };
    const subscribeWorkspace = async (query, listener) => {
      if (query.kind !== "projects")
        requireIdentity(query.projectId);
      const subscriptionId = nextId(ids);
      workspaceListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "workspace-subscribe", id: nextId(ids), payload: { subscriptionId, query } });
      } catch (error) {
        workspaceListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!workspaceListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const subscribeShells = async (scope, listener) => {
      if (scope.kind === "session")
        requireIdentity(scope.sessionId);
      if (scope.kind === "project")
        requireIdentity(scope.projectId);
      const subscriptionId = nextId(ids);
      shellsListeners.set(subscriptionId, listener);
      try {
        await request({ ...envelope, type: "shells-subscribe", id: nextId(ids), payload: { subscriptionId, scope } });
      } catch (error) {
        shellsListeners.delete(subscriptionId);
        if (!disposed)
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        throw error;
      }
      return () => {
        if (!shellsListeners.delete(subscriptionId) || disposed)
          return;
        post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
      };
    };
    const storage = async (payload) => {
      if ("key" in payload && (payload.key.length === 0 || payload.key.length > GUEST_STORAGE_KEY_MAX)) {
        throw new HostRequestError("HOST_REJECTED", "Storage key must contain 1 to 128 characters.");
      }
      if (payload.op === "set" && !isJsonValue(payload.value)) {
        throw new HostRequestError("HOST_REJECTED", "Storage values must be JSON.");
      }
      if (payload.op === "set" && new TextEncoder().encode(JSON.stringify(payload.value)).length > GUEST_STORAGE_VALUE_BYTES) {
        throw new HostRequestError("HOST_REJECTED", "Storage value exceeds 64 KiB.");
      }
      if (payload.scope === "device" && lastReady?.features?.deviceStorage !== true) {
        throw new HostRequestError("UNSUPPORTED", "This host does not support device storage.");
      }
      const result = await send({ ...envelope, type: "storage", id: nextId(ids), payload });
      if (!result || !("storage" in result) || result.op !== payload.op)
        throw new HostRequestError("HOST_REJECTED", "Host did not return storage data.");
      return result;
    };
    const closePopover = (id, reason) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-close", id: nextId(ids), payload: reason ? { id, reason } : { id } });
    const setPopoverAnchorActive = (id, active2) => lastReady?.features?.popovers !== true && !(lastReady?.surface === "popover" && lastReady.popover?.id === id) ? Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers.")) : request({ ...envelope, type: "popover-anchor", id: nextId(ids), payload: { id, active: active2 } });
    target.addEventListener("keydown", onPopoverEscape, true);
    target.addEventListener("pointerover", onPopoverPointerOver);
    target.addEventListener("pointermove", onPopoverPointerOver);
    target.addEventListener("pointerout", onPopoverPointerOut);
    target.addEventListener("focus", onPopoverFocus);
    target.addEventListener("blur", onPopoverBlur);
    return {
      onAction: (handler) => {
        actionHandler = handler;
        return () => {
          if (actionHandler === handler)
            actionHandler = null;
        };
      },
      listProjects: async () => {
        const result = await readWorkspace({ kind: "projects" });
        if (result.kind !== "projects")
          throw new HostRequestError("HOST_REJECTED", "Expected projects.");
        return result;
      },
      listWorktrees: async (projectId) => {
        const result = await readWorkspace({ kind: "worktrees", projectId });
        if (result.kind !== "worktrees")
          throw new HostRequestError("HOST_REJECTED", "Expected worktrees.");
        return result;
      },
      listSessions: async (projectId) => {
        const result = await readWorkspace({ kind: "sessions", projectId });
        if (result.kind !== "sessions")
          throw new HostRequestError("HOST_REJECTED", "Expected sessions.");
        return result;
      },
      onProjects: (listener) => subscribeWorkspace({ kind: "projects" }, (snapshot) => {
        if (snapshot.kind === "projects")
          listener(snapshot);
      }),
      onWorktrees: (projectId, listener) => subscribeWorkspace({ kind: "worktrees", projectId }, (snapshot) => {
        if (snapshot.kind === "worktrees")
          listener(snapshot);
      }),
      onSessions: (projectId, listener) => subscribeWorkspace({ kind: "sessions", projectId }, (snapshot) => {
        if (snapshot.kind === "sessions")
          listener(snapshot);
      }),
      onRunningShells: (scope, listener) => subscribeShells(scope, listener),
      readShellOutput: async (shellId, options2) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const cursor = options2?.cursor;
        if (cursor !== void 0 && (!Number.isInteger(cursor) || cursor < 0)) {
          throw new HostRequestError("HOST_REJECTED", "Shell output cursor must be a non-negative integer.");
        }
        const tailBytes = options2?.tailBytes;
        if (tailBytes !== void 0 && (!Number.isInteger(tailBytes) || tailBytes < 1 || tailBytes > GUEST_SHELL_OUTPUT_TAIL_MAX)) {
          throw new HostRequestError("HOST_REJECTED", `Shell output tailBytes must be an integer between 1 and ${GUEST_SHELL_OUTPUT_TAIL_MAX}.`);
        }
        const result = await send({ ...envelope, type: "shell-output", id: nextId(ids), payload: { shellId, cursor, tailBytes } });
        const output = result;
        if (!output || typeof output.output !== "string" || !Number.isFinite(output.cursor)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return shell output.");
        }
        return output;
      },
      stopShell: async (shellId) => {
        requireIdentity(shellId, GUEST_SHELL_ID_MAX);
        const result = await send({ ...envelope, type: "shell-stop", id: nextId(ids), payload: { shellId } });
        if (result?.stopped !== true)
          throw new HostRequestError("HOST_REJECTED", "Host did not stop the shell.");
        return { stopped: true };
      },
      openSession: async (sessionId) => {
        requireIdentity(sessionId);
        await request({ ...envelope, type: "open-session", id: nextId(ids), payload: { sessionId } });
      },
      storage: {
        get: async (key, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "get", key };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          return result.op === "get" && result.found ? result.value : void 0;
        },
        set: async (key, value, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "set", key, value };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        delete: async (key, options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "delete", key };
          if (scope)
            payload.scope = scope;
          await storage(payload);
        },
        keys: async (options2) => {
          const scope = deviceStorageScope(options2);
          const payload = { op: "keys" };
          if (scope)
            payload.scope = scope;
          const result = await storage(payload);
          if (result.op !== "keys")
            throw new HostRequestError("HOST_REJECTED", "Expected storage keys.");
          return result.keys;
        }
      },
      onReady: (listener) => {
        readyListeners.add(listener);
        if (lastReady)
          listener(lastReady);
        return () => {
          readyListeners.delete(listener);
        };
      },
      onDirectory: (listener) => {
        directoryListeners.add(listener);
        if (lastReady)
          listener(lastReady.directory);
        return () => {
          directoryListeners.delete(listener);
        };
      },
      onSession: (listener) => {
        sessionListeners.add(listener);
        if (lastReady)
          listener(lastReady.session);
        return () => {
          sessionListeners.delete(listener);
        };
      },
      onSessionLifecycle: (listener) => {
        lifecycleListeners.add(listener);
        if (lastLifecycle)
          listener(lastLifecycle);
        return () => {
          lifecycleListeners.delete(listener);
        };
      },
      onConnection: (listener) => {
        connectionListeners.add(listener);
        if (lastReady)
          listener(lastReady.connection);
        return () => {
          connectionListeners.delete(listener);
        };
      },
      onSettings: (listener) => {
        settingsListeners.add(listener);
        if (lastReady)
          listener(lastReady.settings);
        return () => {
          settingsListeners.delete(listener);
        };
      },
      onItem: (listener) => {
        itemListeners.add(listener);
        if (lastReady)
          listener(lastReady.item);
        return () => {
          itemListeners.delete(listener);
        };
      },
      onBlock: (listener) => {
        blockListeners.add(listener);
        if (lastReady?.block)
          listener(lastReady.block);
        return () => {
          blockListeners.delete(listener);
        };
      },
      onServiceEvent: (listener) => {
        serviceEventListeners.add(listener);
        return () => {
          serviceEventListeners.delete(listener);
        };
      },
      onStatusControl: (listener) => {
        statusControlListeners.add(listener);
        return () => {
          statusControlListeners.delete(listener);
        };
      },
      onPopoverClosed: (listener) => {
        popoverClosedListeners.add(listener);
        return () => {
          popoverClosedListeners.delete(listener);
        };
      },
      setStatusControls: (controls) => {
        if (lastReady?.features?.statusControls !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support status controls."));
        }
        if (!isGuestStatusControls(controls)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Status controls must have unique bounded ids and valid selected options."));
        }
        return request({ ...envelope, type: "status-controls", id: nextId(ids), payload: { controls } });
      },
      openPopover: (payload) => {
        if (lastReady?.features?.popovers !== true) {
          return Promise.reject(new HostRequestError("UNSUPPORTED", "This host does not support popovers."));
        }
        if (!isGuestPopoverRequest(payload)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "Popover requests need bounded geometry and JSON data."));
        }
        return request({ ...envelope, type: "popover-open", id: nextId(ids), payload });
      },
      closePopover,
      setPopoverAnchorActive,
      onResolve: (handler) => {
        resolveHandler = handler;
        return () => {
          if (resolveHandler === handler)
            resolveHandler = null;
        };
      },
      toast: (payload) => {
        const message = payload.message.trim();
        if (!message || message.length > GUEST_TOAST_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast message must contain 1 to ${GUEST_TOAST_MAX} characters.`));
        }
        if (payload.copy && payload.copy !== true && (!payload.copy.text.length || payload.copy.text.length > GUEST_CLIPBOARD_TEXT_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Toast copy text must contain 1 to ${GUEST_CLIPBOARD_TEXT_MAX} characters.`));
        }
        return request({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "toast",
          id: nextId(ids),
          payload: { ...payload, message }
        });
      },
      openUrl: (url) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-url",
        id: nextId(ids),
        payload: { url }
      }),
      openCommit: (sha) => isGuestCommitSha(sha) ? request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-commit",
        id: nextId(ids),
        payload: { sha }
      }) : Promise.reject(new HostRequestError("HOST_REJECTED", "Commit id must be 7 to 64 hex characters.")),
      answerBlock: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "block-answer",
        id: nextId(ids),
        payload: { text: text.trim().slice(0, GUEST_BLOCK_ANSWER_MAX) }
      }),
      openSurface: (surfaceId) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "open-surface",
        id: nextId(ids),
        payload: { surfaceId }
      }),
      writeClipboard: (text) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "clipboard-write",
        id: nextId(ids),
        payload: { text }
      }),
      compose: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "compose",
        id: nextId(ids),
        payload
      }),
      attach: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "attach",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      startSession: async (payload) => {
        if (payload.projectId !== void 0)
          requireIdentity(payload.projectId);
        const worktree = payload.worktree;
        if (worktree && worktree !== true) {
          if (worktree.kind === "existing")
            requireIdentity(worktree.directory);
          else {
            if (worktree.name !== void 0)
              requireIdentity(worktree.name, 200);
            if (worktree.baseBranch !== void 0)
              requireIdentity(worktree.baseBranch, 200);
          }
        }
        const result = await send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "start-session",
          id: nextId(ids),
          payload: clampStartSessionRequest(payload)
        }, options.requestTimeoutMs ?? 18e4);
        if (!isStartSessionResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a session.");
        }
        return result;
      },
      prompt: (payload) => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "prompt",
        id: nextId(ids),
        payload: clampPromptRequest(payload)
      }).then((result) => {
        if (!isPromptResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return a prompt result.");
        }
        return result;
      }),
      sessionLink: (payload) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "session-link",
        id: nextId(ids),
        payload: clampAttachRequest(payload)
      }),
      close: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "close",
        id: nextId(ids)
      }),
      oauthStart: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-start",
        id: nextId(ids)
      }),
      oauthDisconnect: () => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "oauth-disconnect",
        id: nextId(ids)
      }),
      request: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host request result was empty.");
        }
        return result;
      }),
      serviceRequest: (payload) => (isGuestRequestPath(payload.path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-request",
        id: nextId(ids),
        payload
      }) : rejectBadPath()).then((result) => {
        if (!isGuestRequestResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host service request result was empty.");
        }
        return result;
      }),
      serviceStatus: () => send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "service-status",
        id: nextId(ids)
      }).then((result) => {
        if (!isServiceStatusResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return service status.");
        }
        return result;
      }),
      readFile: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-read",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileReadResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file content.");
        }
        return result;
      }),
      writeFile: (path, content) => {
        if (!isGuestFilePath(path)) {
          return rejectBadFilePath();
        }
        if (content.length > GUEST_FILE_CONTENT_MAX) {
          return Promise.reject(new HostRequestError("FILE_TOO_LARGE", `Content is over ${GUEST_FILE_CONTENT_MAX} characters.`));
        }
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "file-write",
          id: nextId(ids),
          payload: { path, content }
        }).then((result) => {
          if (!isFileWriteResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not confirm the write.");
          }
          return result;
        });
      },
      listDir: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-list",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileListResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return directory entries.");
        }
        return result;
      }),
      stat: (path) => (isGuestFilePath(path) ? send({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "file-stat",
        id: nextId(ids),
        payload: { path }
      }) : rejectBadFilePath()).then((result) => {
        if (!isFileStatResult(result)) {
          throw new HostRequestError("HOST_REJECTED", "Host did not return file status.");
        }
        return result;
      }),
      generate: (input) => {
        const prompt = input.prompt.trim();
        const system = input.system?.trim();
        if (prompt.length === 0 || prompt.length > GUEST_GENERATE_PROMPT_MAX) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `Prompt must be 1 to ${GUEST_GENERATE_PROMPT_MAX} characters.`));
        }
        if (system !== void 0 && (system.length === 0 || system.length > GUEST_GENERATE_SYSTEM_MAX)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", `System prompt must be 1 to ${GUEST_GENERATE_SYSTEM_MAX} characters.`));
        }
        const maxOutputTokens = input.maxOutputTokens === void 0 ? void 0 : Math.min(GUEST_GENERATE_OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(input.maxOutputTokens)));
        if (maxOutputTokens !== void 0 && !Number.isFinite(maxOutputTokens)) {
          return Promise.reject(new HostRequestError("HOST_REJECTED", "maxOutputTokens must be a number."));
        }
        const payload = { prompt };
        if (system !== void 0)
          payload.system = system;
        if (maxOutputTokens !== void 0)
          payload.maxOutputTokens = maxOutputTokens;
        return send({
          channel: OPENCHAMBER_SDK_CHANNEL,
          v: OPENCHAMBER_SDK_API_VERSION,
          type: "generate",
          id: nextId(ids),
          payload
        }, options.requestTimeoutMs ?? GUEST_GENERATE_TIMEOUT_MS).then((result) => {
          if (!isGenerateResult(result)) {
            throw new HostRequestError("HOST_REJECTED", "Host did not return generated text.");
          }
          return result;
        });
      },
      onLateGenerateResult: (listener) => {
        lateGenerateListeners.add(listener);
        for (const result of unclaimedLateGenerate.splice(0))
          emit([listener], result);
        listenForLateGenerate();
        return () => {
          lateGenerateListeners.delete(listener);
        };
      },
      setBadge: (count2) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "badge",
        id: nextId(ids),
        payload: { count: clampBadgeCount(count2) }
      }),
      setHeight: (height) => request({
        channel: OPENCHAMBER_SDK_CHANNEL,
        v: OPENCHAMBER_SDK_API_VERSION,
        type: "resize",
        id: nextId(ids),
        payload: { height: clampFrameHeight(height) }
      }),
      onFileOpen: (listener) => {
        fileOpenListeners.add(listener);
        if (!saveShortcutInstalled) {
          saveShortcutInstalled = true;
          target.addEventListener("keydown", onSaveShortcut, true);
        }
        if (lastFile)
          listener(lastFile);
        return () => {
          fileOpenListeners.delete(listener);
        };
      },
      onFileSnapshot: (handler) => {
        fileSnapshotHandler = handler;
        return () => {
          if (fileSnapshotHandler === handler)
            fileSnapshotHandler = null;
        };
      },
      onFileSaved: (listener) => {
        fileSavedListeners.add(listener);
        return () => {
          fileSavedListeners.delete(listener);
        };
      },
      reportFileChange: (change) => notify({ ...envelope, type: "file-change", payload: { dirty: change.dirty, edited: change.edited } }),
      requestFileSave,
      reportFileUnsupported: () => notify({ ...envelope, type: "file-unsupported" }),
      dispose: () => {
        for (const subscriptionId of workspaceListeners.keys()) {
          post({ ...envelope, type: "workspace-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        workspaceListeners.clear();
        for (const subscriptionId of shellsListeners.keys()) {
          post({ ...envelope, type: "shells-unsubscribe", id: nextId(ids), payload: { subscriptionId } });
        }
        shellsListeners.clear();
        disposed = true;
        resolveHandler = null;
        actionHandler = null;
        fileSnapshotHandler = null;
        fileOpenListeners.clear();
        fileSavedListeners.clear();
        if (saveShortcutInstalled)
          target.removeEventListener("keydown", onSaveShortcut, true);
        target.removeEventListener("message", onMessage);
        target.removeEventListener("keydown", onPopoverEscape, true);
        target.removeEventListener("pointerover", onPopoverPointerOver);
        target.removeEventListener("pointermove", onPopoverPointerOver);
        target.removeEventListener("pointerout", onPopoverPointerOut);
        target.removeEventListener("focus", onPopoverFocus);
        target.removeEventListener("blur", onPopoverBlur);
        for (const waiter of pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(new HostRequestError("HOST_UNAVAILABLE", "Host client was disposed."));
        }
        pending.clear();
        readyListeners.clear();
        directoryListeners.clear();
        sessionListeners.clear();
        lifecycleListeners.clear();
        connectionListeners.clear();
        settingsListeners.clear();
        itemListeners.clear();
        blockListeners.clear();
        serviceEventListeners.clear();
        statusControlListeners.clear();
        popoverClosedListeners.clear();
        lateGenerateListeners.clear();
        unclaimedLateGenerate.length = 0;
      }
    };
  };

  // node_modules/@openchamber/sdk/dist/service-providers.js
  var BROWSER_CONTROL_ACTIONS = [
    "browser.open",
    "browser.snapshot",
    "browser.click",
    "browser.type",
    "browser.select",
    "browser.scroll",
    "browser.back",
    "browser.forward",
    "browser.inspect",
    "browser.capture",
    "browser.resize",
    "browser.close"
  ];
  var BROWSER_PROVIDER_IDLE_MS = 10 * 6e4;
  var CONTROL_ACTIONS = new Set(BROWSER_CONTROL_ACTIONS);
  var SOURCE_CONTROL_PROVIDER_IDLE_MS = 10 * 6e4;
  var NOTIFICATIONS_PROVIDER_IDLE_MS = 10 * 6e4;
  var TRACKER_PROVIDER_IDLE_MS = 10 * 6e4;
  var QUOTA_PROVIDER_IDLE_MS = 10 * 6e4;

  // node_modules/@openchamber/sdk/dist/service-surface.js
  var SURFACE_CONTROLLERS = ["none", "agent", "user"];
  var CONTROLLERS = new Set(SURFACE_CONTROLLERS);

  // node_modules/@openchamber/sdk/dist/ui/theme.js
  var TOKEN_VARS = [
    ["--oc-bg", "background"],
    ["--oc-elevated", "elevated"],
    ["--oc-fg", "foreground"],
    ["--oc-muted", "muted"],
    ["--oc-subtle", "subtle"],
    ["--oc-border", "border"],
    ["--oc-hover", "hover"],
    ["--oc-selection", "selection"],
    ["--oc-focus", "focus"],
    ["--oc-primary", "primary"],
    ["--oc-muted-surface", "mutedSurface"],
    ["--oc-elevated-fg", "elevatedForeground"],
    ["--oc-active", "active"],
    ["--oc-selection-fg", "selectionForeground"],
    ["--oc-primary-fg", "primaryForeground"],
    ["--oc-primary-text", "primaryText"],
    ["--oc-success-text", "successText"],
    ["--oc-warning-text", "warningText"],
    ["--oc-error-text", "errorText"],
    ["--oc-info-text", "infoText"],
    ["--oc-success", "success"],
    ["--oc-warning", "warning"],
    ["--oc-error", "error"],
    ["--oc-info", "info"],
    ["--oc-font", "font"],
    ["--oc-mono", "mono"],
    ["--oc-radius", "radius"],
    ["--surface-background", "background"],
    ["--surface-elevated", "elevated"],
    ["--surface-foreground", "foreground"],
    ["--surface-muted-foreground", "muted"],
    ["--surface-subtle", "subtle"],
    ["--interactive-border", "border"],
    ["--interactive-hover", "hover"],
    ["--interactive-selection", "selection"],
    ["--interactive-focus-ring", "focus"],
    ["--primary", "primary"],
    ["--surface-muted", "mutedSurface"],
    ["--surface-elevated-foreground", "elevatedForeground"],
    ["--interactive-active", "active"],
    ["--interactive-selection-foreground", "selectionForeground"],
    ["--primary-foreground", "primaryForeground"],
    ["--primary-text", "primaryText"],
    ["--success-text", "successText"],
    ["--warning-text", "warningText"],
    ["--error-text", "errorText"],
    ["--info-text", "infoText"],
    ["--status-success", "success"],
    ["--status-warning", "warning"],
    ["--status-error", "error"],
    ["--status-info", "info"],
    ["--font-sans", "font"],
    ["--font-mono", "mono"],
    ["--radius", "radius"]
  ];
  var SYNTAX_TOKEN_VARS = [
    ["--oc-syntax-keyword", "--syntax-keyword", "syntaxKeyword"],
    ["--oc-syntax-string", "--syntax-string", "syntaxString"],
    ["--oc-syntax-number", "--syntax-number", "syntaxNumber"],
    ["--oc-syntax-function", "--syntax-function", "syntaxFunction"],
    ["--oc-syntax-type", "--syntax-type", "syntaxType"],
    ["--oc-syntax-comment", "--syntax-comment", "syntaxComment"],
    ["--oc-syntax-variable", "--syntax-variable", "syntaxVariable"],
    ["--oc-syntax-operator", "--syntax-operator", "syntaxOperator"]
  ];
  var applyHostTheme = (theme, root2) => {
    root2.style.colorScheme = theme.mode;
    for (const [name, key] of TOKEN_VARS) {
      root2.style.setProperty(name, theme.tokens[key]);
    }
    for (const [alias, hostName, key] of SYNTAX_TOKEN_VARS) {
      const value = theme.tokens[key] ?? "";
      root2.style.setProperty(alias, value);
      root2.style.setProperty(hostName, value);
    }
    root2.style.setProperty("font-family", theme.tokens.font);
    root2.style.setProperty("font-size", "0.875rem");
    root2.style.setProperty("line-height", "1.45");
    root2.style.setProperty("color", theme.tokens.foreground);
  };
  var applyHostReady = (ctx, root2) => {
    applyHostTheme(ctx.theme, root2);
    if (root2.dataset) {
      root2.dataset.ocSurface = ctx.surface;
      root2.dataset.ocTheme = ctx.theme.mode;
    }
  };

  // node_modules/@openchamber/sdk/dist/ui/style.js
  var OC_ALIAS = {
    "surface-background": "bg",
    "surface-elevated": "elevated",
    "surface-elevated-foreground": "elevated-fg",
    "surface-foreground": "fg",
    "surface-muted-foreground": "muted",
    "surface-muted": "muted-surface",
    "surface-subtle": "subtle",
    "interactive-border": "border",
    "interactive-hover": "hover",
    "interactive-active": "active",
    "interactive-selection": "selection",
    "interactive-selection-foreground": "selection-fg",
    "interactive-focus-ring": "focus",
    "primary": "primary",
    "primary-foreground": "primary-fg",
    "primary-text": "primary-text",
    "success-text": "success-text",
    "warning-text": "warning-text",
    "error-text": "error-text",
    "info-text": "info-text",
    "status-success": "success",
    "status-warning": "warning",
    "status-error": "error",
    "status-info": "info",
    "font-sans": "font",
    "font-mono": "mono",
    "radius": "radius"
  };
  var v = (name, fallback) => `var(--${name}, var(--oc-${OC_ALIAS[name]}, ${fallback}))`;
  var bg = v("surface-background", "transparent");
  var elevated = v("surface-elevated", "transparent");
  var elevatedFg = v("surface-elevated-foreground", "inherit");
  var fg = v("surface-foreground", "inherit");
  var muted = v("surface-muted-foreground", "gray");
  var secondary = v("surface-muted", "transparent");
  var border = v("interactive-border", "currentColor");
  var hover = v("interactive-hover", "transparent");
  var active = v("interactive-active", "transparent");
  var selection = v("interactive-selection", "transparent");
  var selectionFg = v("interactive-selection-foreground", "inherit");
  var primary = v("primary", "currentColor");
  var primaryText = v("primary-text", "inherit");
  var errorText = v("error-text", "inherit");
  var font = v("font-sans", "inherit");
  var mono = v("font-mono", "monospace");
  var radius = v("radius", "9px");
  var controlRadius = `calc(${radius} - 2px)`;
  var smallRadius = `calc(${radius} - 4px)`;
  var mix = (color, pct, base = "transparent") => `color-mix(in srgb, ${color} ${pct}%, ${base})`;
  var focusFill = `background-image: linear-gradient(${hover}, ${hover});`;
  var field = (edge, width = "0.5px") => `box-shadow: inset 0 0 0 ${width} ${edge}, var(--oc-sdk-field-lift);`;
  var raised = "border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);";
  var litButton = "box-shadow: var(--oc-sdk-lit);";
  var darkLift = `inset 0 0.5px 0 0 ${mix(fg, 8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`;
  var THEME_VARS = `
:root {
  --oc-sdk-edge: ${mix(fg, 16)};
  --oc-sdk-field-bg: ${elevated};
  --oc-sdk-raised-bg: ${bg};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${mix(fg, 14)};
  --oc-sdk-field-bg: ${mix(bg, 50, elevated)};
  --oc-sdk-raised-bg: ${elevated};
  --oc-sdk-field-lift: ${darkLift};
  --oc-sdk-raised-lift: ${darkLift};
  --oc-sdk-lit: ${darkLift};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`;
  var tone = (name) => {
    const color = v(`status-${name}`, "currentColor");
    return `
.oc-sdk[data-tone="${name}"], .oc-sdk [data-tone="${name}"] { --oc-sdk-tone: ${color}; --oc-sdk-tone-text: ${v(`${name}-text`, "inherit")}; }`;
  };
  var UI_SIZE_CSS = `
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }
.oc-sdk-progress-value { display: inline-flex; align-items: center; gap: 2px; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { font-weight: 600; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`;
  var GUEST_UI_LOOK_CSS = `${THEME_VARS}
.oc-sdk { color: ${fg}; font-family: ${font}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${focusFill} }
.oc-sdk-mono { font-family: ${mono}; }
.oc-sdk-muted { color: ${muted}; }
${tone("success")}${tone("warning")}${tone("error")}${tone("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${primary}; --oc-sdk-tone-text: ${primaryText}; }

.oc-sdk-btn { border-radius: ${controlRadius}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${smallRadius}; }
.oc-sdk-btn[data-variant="default"] { color: ${primaryText}; background: ${mix(primary, 10, bg)}; border-color: ${mix(primary, 12)}; ${litButton} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${mix(primary, 16, bg)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${mix(primary, 22, bg)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${secondary}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${active}, ${active}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${hover}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${active}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${v("status-error", "red")}; color: ${errorText}; background: ${mix("var(--oc-sdk-tone)", 7, bg)}; border-color: ${mix("var(--oc-sdk-tone)", 12)}; ${litButton} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${mix("var(--oc-sdk-tone)", 9, bg)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${mix("var(--oc-sdk-tone)", 11, bg)}; box-shadow: none; }

.oc-sdk-field-note { color: ${muted}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${errorText}; }
.oc-sdk-input { border-radius: ${controlRadius}; background: var(--oc-sdk-field-bg); color: ${elevatedFg}; ${field("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${muted}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${field(mix(fg, 26), "1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${field(v("status-error", "red"), "1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${mono}; }

.oc-sdk-search-icon { color: ${muted}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${primary}; }
.oc-sdk-search-clear { border-radius: ${smallRadius}; color: ${muted}; }
.oc-sdk-search-clear:hover { background: ${hover}; color: ${fg}; }

.oc-sdk-trigger { border-radius: ${controlRadius}; background: var(--oc-sdk-raised-bg); color: ${elevatedFg}; ${raised} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${hover}, ${hover}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${active}, ${active}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${muted}; }
.oc-sdk-trigger-chevron { color: ${muted}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${elevatedFg}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${elevated}; background-clip: padding-box; color: ${elevatedFg}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${hover}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-option-check { color: ${fg}; }
.oc-sdk-option[data-destructive="true"] { color: ${errorText}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${mix(v("status-error", "red"), 10)}; }
.oc-sdk-option-hint { color: ${muted}; }
.oc-sdk-popup-empty { color: ${muted}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${border}; border-radius: 4px; color: ${fg}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${mix(fg, 60, border)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${border}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${bg}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${primary}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${focusFill} }
.oc-sdk-check-desc { color: ${muted}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${mix(fg, 4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${muted}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${fg}; }
.oc-sdk-tab[aria-selected="true"] { color: ${selectionFg}; background: ${selection}; border-color: ${border}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${elevatedFg}; background: var(--oc-sdk-raised-bg); ${raised} }
.oc-sdk-tab-count { color: ${muted}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${mix(fg, 6)}; color: ${muted}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${mix("var(--oc-sdk-tone)", 15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${hover}; }
.oc-sdk-row[aria-selected="true"] { background: ${selection}; color: ${selectionFg}; }
.oc-sdk-row-lead { font-family: ${mono}; color: ${muted}; }
.oc-sdk-row-sub { color: ${muted}; }
.oc-sdk-row-meta { color: ${muted}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${muted}; }

.oc-sdk-empty-body { color: ${muted}; }

.oc-sdk-spinner { color: ${muted}; }
.oc-sdk-spinner-ring { border-color: ${border}; border-top-color: ${primary}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${mix("var(--oc-sdk-tone)", 10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${muted}; }

.oc-sdk-separator { color: ${muted}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${mix(border, 40)}; }

.oc-sdk-progress-label { color: ${muted}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${mix(fg, 6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${primary}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${v("status-success", "currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${v("success-text", "inherit")}; }

.oc-sdk-text a { color: ${primaryText}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${mix(border, 60)}; }
`;
  var UI_CSS = `
${GUEST_SCROLLBAR_CSS}
${UI_SIZE_CSS}
${GUEST_UI_LOOK_CSS}`;

  // src/panel/dom.ts
  function el2(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    if (props.className) node.className = props.className;
    if (props.text !== void 0) node.textContent = props.text;
    if (props.title) node.title = props.title;
    if (props.html !== void 0) node.innerHTML = props.html;
    if (props.onClick) node.addEventListener("click", props.onClick);
    if (props.attrs) {
      for (const [key, value] of Object.entries(props.attrs)) {
        if (value === null || value === void 0 || value === false) continue;
        node.setAttribute(key, value === true ? "" : String(value));
      }
    }
    if (props.dataset) Object.assign(node.dataset, props.dataset);
    if (props.style) Object.assign(node.style, props.style);
    for (const child of children) {
      if (child === null || child === void 0 || child === false) continue;
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }
  function button2(label, onClick, variant = "secondary", options = {}) {
    return el2("button", {
      className: `orm-btn orm-btn-${variant}${options.small ? " orm-btn-sm" : ""}`,
      text: label,
      title: options.title,
      attrs: { type: "button", disabled: options.disabled },
      onClick: (event) => {
        event.preventDefault();
        if (!options.disabled) onClick();
      }
    });
  }
  function badge(label, tone2 = "neutral") {
    return el2("span", { className: `orm-badge orm-badge-${tone2}`, text: label });
  }
  function emptyState(title, body, action) {
    return el2("div", { className: "orm-empty" }, [
      el2("div", { className: "orm-empty-title", text: title }),
      body ? el2("div", { className: "orm-muted", text: body }) : null,
      action ? button2(action.label, action.onClick, "primary") : null
    ]);
  }
  function banner(options) {
    return el2("div", { className: `orm-banner orm-banner-${options.tone}`, attrs: { role: "status" } }, [
      el2("div", { className: "orm-banner-body" }, [
        el2("strong", { text: options.title }),
        options.body ? el2("div", { className: "orm-banner-text", text: options.body }) : null
      ]),
      el2("div", { className: "orm-banner-actions" }, [
        options.action ? button2(options.action.label, options.action.onClick, "secondary", { small: true }) : null,
        options.secondary ? button2(options.secondary.label, options.secondary.onClick, "ghost", { small: true }) : null
      ])
    ]);
  }
  function field2(labelText, control, helper) {
    const tag = control.tagName === "LABEL" ? "div" : "label";
    return el2(tag, { className: "orm-field" }, [
      el2("span", { className: "orm-field-label", text: labelText }),
      control,
      helper ? el2("span", { className: "orm-field-helper", text: helper }) : null
    ]);
  }
  function textInput(value, onChange, options = {}) {
    const input = el2("input", {
      className: "orm-input",
      attrs: {
        type: options.type ?? "text",
        placeholder: options.placeholder,
        min: options.min,
        max: options.max,
        step: options.step ?? (options.type === "number" ? "any" : void 0),
        disabled: options.disabled,
        value
      }
    });
    input.addEventListener("input", () => onChange(input.value));
    return input;
  }
  function selectBox(value, options, onChange, attrs = {}) {
    const select = el2("select", { className: "orm-input orm-select", attrs });
    for (const option of options) {
      const node = el2("option", { text: option.label, attrs: { value: option.value } });
      if (option.value === value) node.selected = true;
      select.append(node);
    }
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }
  function switchBox(checked, onChange, label, description) {
    const input = el2("input", { className: "orm-switch-input", attrs: { type: "checkbox", checked } });
    input.addEventListener("change", () => onChange(input.checked));
    return el2("label", { className: "orm-switch-row" }, [
      input,
      el2("span", { className: "orm-switch-track" }, [el2("span", { className: "orm-switch-thumb" })]),
      el2("span", { className: "orm-switch-copy" }, [
        el2("span", { className: "orm-switch-label", text: label }),
        description ? el2("span", { className: "orm-field-helper", text: description }) : null
      ])
    ]);
  }
  function modal(options) {
    return new Promise((resolve) => {
      const previous = document.activeElement;
      const close = (id) => {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
        previous?.focus?.();
        resolve(id);
      };
      const onKey = (event) => {
        if (event.key === "Escape") close("cancel");
      };
      const overlay = el2("div", { className: "orm-overlay", attrs: { role: "dialog", "aria-modal": "true" } });
      const card2 = el2("div", { className: "orm-modal" });
      card2.append(el2("h2", { className: "orm-modal-title", text: options.title }));
      const body = el2("div", { className: "orm-modal-body" });
      if (typeof options.body === "string") body.textContent = options.body;
      else body.append(options.body);
      card2.append(body);
      const actions = el2("div", { className: "orm-modal-actions" });
      for (const action of options.actions) {
        actions.append(
          button2(action.label, () => close(action.id), action.variant ?? "secondary", {
            small: true
          })
        );
      }
      card2.append(actions);
      overlay.append(card2);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close("cancel");
      });
      document.addEventListener("keydown", onKey);
      document.body.append(overlay);
      const first = card2.querySelector("button");
      first?.focus();
    });
  }
  async function confirmDialog(title, message, confirmLabel = "Confirm", destructive = false) {
    const result = await modal({
      title,
      body: message,
      actions: [
        { id: "cancel", label: "Cancel", variant: "ghost" },
        { id: "confirm", label: confirmLabel, variant: destructive ? "danger" : "primary" }
      ]
    });
    return result === "confirm";
  }
  function codeBlock(text) {
    return el2("pre", { className: "orm-code" }, [el2("code", { text })]);
  }
  function checkbox(checked, onChange, label, description) {
    const input = el2("input", { className: "orm-check-input", attrs: { type: "checkbox", checked } });
    input.addEventListener("change", () => onChange(input.checked));
    return el2("label", { className: "orm-check-row" }, [
      input,
      el2("span", { className: "orm-check-copy" }, [
        el2("span", { text: label }),
        description ? el2("span", { className: "orm-field-helper", text: description }) : null
      ])
    ]);
  }

  // src/shared/format.ts
  var NA = "N/A";
  function formatPricePerMillion(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    const text = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    }).format(value);
    return `$${text}`;
  }
  function formatUsd(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    const text = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    }).format(value);
    return `$${text}`;
  }
  function formatLatencyMs(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)} s`;
    if (value >= 100) return `${Math.round(value)} ms`;
    return `${value.toFixed(1)} ms`;
  }
  function formatThroughput(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(digits)} tok/s`;
  }
  function formatContext(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    if (value >= 1e6) return `${(value / 1e6).toFixed(value % 1e6 === 0 ? 0 : 1)}M`;
    if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
    return String(value);
  }
  function formatUptime(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    return `${value.toFixed(value >= 99.95 ? 0 : 1)}%`;
  }
  function percentDifference(value, base) {
    if (value === null || value === void 0 || base === null || base === void 0) return null;
    if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return null;
    return (value - base) / base * 100;
  }
  function formatRelativeTime(iso2, now = Date.now()) {
    if (!iso2) return NA;
    const time = Date.parse(iso2);
    if (!Number.isFinite(time)) return NA;
    const seconds = Math.max(0, Math.round((now - time) / 1e3));
    if (seconds < 20) return "just now";
    if (seconds < 90) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 36) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(time).toLocaleDateString();
  }
  function formatDateTime(iso2) {
    if (!iso2) return NA;
    const time = Date.parse(iso2);
    if (!Number.isFinite(time)) return NA;
    return new Date(time).toLocaleString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function formatCount(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return NA;
    return new Intl.NumberFormat("en-US").format(value);
  }

  // src/shared/version.ts
  var EXTENSION_VERSION = "1.0.0";
  var EXTENSION_NAME = "OpenRouter Manager";

  // src/panel/components.ts
  function pageHeader(options) {
    return el2("header", { className: "orm-page-head" }, [
      el2("div", { className: "orm-page-heading" }, [
        options.eyebrow ? el2("div", { className: "orm-eyebrow", text: options.eyebrow }) : null,
        el2("h1", { className: "orm-page-title", text: options.title }),
        options.subtitle ? el2("p", { className: "orm-page-sub", text: options.subtitle }) : null
      ]),
      options.actions && options.actions.length > 0 ? el2("div", { className: "orm-actions" }, options.actions) : null
    ]);
  }
  function card(title, body, options = {}) {
    const bodyNode = el2("div", { className: "orm-card-body" });
    if (Array.isArray(body)) {
      for (const child of body) if (child) bodyNode.append(child);
    } else bodyNode.append(body);
    return el2("section", { className: `orm-card${options.className ? ` ${options.className}` : ""}` }, [
      title !== null || options.actions ? el2("div", { className: "orm-card-head" }, [
        el2("div", {}, [
          title ? el2("h2", { className: "orm-card-title", text: title }) : null,
          options.subtitle ? el2("p", { className: "orm-card-sub", text: options.subtitle }) : null
        ]),
        options.actions ? el2("div", { className: "orm-actions" }, options.actions) : null
      ]) : null,
      bodyNode
    ]);
  }
  function statCard(label, value, hint, tone2) {
    return el2("div", { className: `orm-stat orm-stat-${tone2 ?? "neutral"}` }, [
      el2("div", { className: "orm-stat-label", text: label }),
      el2("div", { className: "orm-stat-value", text: value }),
      hint ? el2("div", { className: "orm-stat-hint", text: hint }) : null
    ]);
  }
  function kvRow(label, value) {
    return el2("div", { className: "orm-kv" }, [
      el2("span", { className: "orm-kv-label", text: label }),
      typeof value === "string" ? el2("span", { className: "orm-kv-value", text: value }) : value
    ]);
  }
  function disclosure(summary, body, options = {}) {
    const details = el2("details", { className: "orm-disclosure" });
    if (options.open) details.open = true;
    const content = el2("div", { className: "orm-disclosure-body" });
    if (Array.isArray(body)) content.append(...body);
    else content.append(body);
    details.append(
      el2("summary", {}, [
        el2("span", { className: "orm-disclosure-title", text: summary }),
        options.hint ? el2("span", { className: "orm-disclosure-hint", text: options.hint }) : null
      ]),
      content
    );
    return details;
  }
  function skeletonRows(count2 = 6) {
    const wrap = el2("div", { className: "orm-skeleton", attrs: { role: "status", "aria-label": "Loading" } });
    for (let i = 0; i < count2; i++) wrap.append(el2("div", { className: "orm-skeleton-row" }));
    return wrap;
  }
  function saveBar(options) {
    const status = options.dirty ? badge("Unsaved changes", "warning") : el2("span", { className: "orm-muted orm-small", text: options.statusText });
    const reason = options.saveDisabledReason && !options.saving ? el2("span", { className: "orm-small orm-error-text", text: options.saveDisabledReason }) : null;
    return el2("div", { className: "orm-savebar", attrs: { role: "region", "aria-label": "Save changes" } }, [
      el2("div", { className: "orm-savebar-status" }, [status, reason]),
      el2("div", { className: "orm-savebar-actions" }, [
        ...options.extra ?? [],
        button2("Discard", options.onDiscard, "ghost", { disabled: !options.dirty || options.saving }),
        button2(options.saving ? "Saving\u2026" : "Save", options.onSave, "primary", {
          disabled: !options.dirty || Boolean(options.saveDisabledReason) || options.saving
        })
      ])
    ]);
  }
  function toolbar(children) {
    return el2("div", { className: "orm-toolbar" }, children);
  }

  // src/panel/views/overview.ts
  var OverviewView = class {
    constructor(store2) {
      this.store = store2;
      this.element.append(this.body);
      this.update();
    }
    element = el2("div", { className: "orm-view" });
    body = el2("div", { className: "orm-view-body" });
    attention() {
      const state = this.store.getState();
      const items = [];
      const config = state.config?.config;
      const status = state.status;
      if (state.connection && !state.connection.connected) {
        items.push({
          tone: "info",
          title: "Connect OpenRouter",
          body: "Routing still works without a key, but latency and throughput appear only with one.",
          action: { label: "Open settings", onClick: () => this.store.navigate({ view: "settings" }) }
        });
      }
      if (state.configError) {
        items.push({
          tone: "error",
          title: "Your saved routing could not be read",
          body: state.configError.message,
          action: { label: "Fix in settings", onClick: () => this.store.navigate({ view: "settings" }) }
        });
      }
      if (state.conflict) {
        items.push({
          tone: "warning",
          title: "Routing was changed elsewhere",
          body: "Reload before saving so nothing is overwritten.",
          action: { label: "Reload", onClick: () => void this.store.reloadConfig() }
        });
      }
      if (state.catalog?.stale) {
        items.push({
          tone: "warning",
          title: "Showing saved model data",
          body: state.catalog.error ?? "The latest refresh failed.",
          action: { label: "Try again", onClick: () => void this.store.refreshCatalog(true) }
        });
      }
      if (status && status.pluginVersion !== EXTENSION_VERSION) {
        items.push({
          tone: "warning",
          title: "Restart OpenCode to finish the update",
          body: `Running plugin v${status.pluginVersion}; this extension is v${EXTENSION_VERSION}.`
        });
      }
      if (config && status && (status.configRevision ?? -1) < config.revision) {
        items.push({
          tone: "info",
          title: "Latest routing applies to the next request",
          body: "Your most recent change has been saved and will be used the next time a model runs."
        });
      }
      if (!status && config && Object.keys(config.models).length > 0) {
        items.push({
          tone: "info",
          title: "Routing is saved but not confirmed yet",
          body: "Send one request to a model with routing to confirm it is in use."
        });
      }
      return items;
    }
    update() {
      const state = this.store.getState();
      const config = state.config?.config;
      const stats = this.store.stats();
      const connected = state.connection?.connected ?? null;
      this.body.replaceChildren();
      this.body.append(
        pageHeader({
          title: "Overview",
          subtitle: "Set how OpenRouter picks providers for each model.",
          actions: [
            button2("Refresh", () => void this.store.refreshCatalog(true), "secondary"),
            button2("Browse models", () => this.store.navigate({ view: "models" }), "primary")
          ]
        })
      );
      const attention = this.attention();
      if (attention.length > 0) {
        this.body.append(
          el2("div", { className: "orm-stack" }, attention.map(
            (item) => banner({
              tone: item.tone === "error" ? "error" : item.tone === "warning" ? "warning" : "info",
              title: item.title,
              body: item.body,
              ...item.action ? { action: item.action } : {}
            })
          ))
        );
      }
      const customCount = stats?.custom ?? 0;
      this.body.append(
        el2("div", { className: "orm-stats" }, [
          statCard("Models", stats ? formatCount(stats.models) : "\u2014", state.catalog ? `Updated ${formatRelativeTime(state.catalog.fetchedAt)}` : "Loading\u2026"),
          statCard("With custom routing", stats ? formatCount(customCount) : "\u2014", customCount === 0 ? "None yet. Others use OpenRouter defaults." : "The rest use OpenRouter defaults.", customCount > 0 ? "success" : "neutral"),
          statCard("Excluded providers", stats ? formatCount(stats.excluded) : "\u2014", stats && stats.excluded > 0 ? "Across your routing rules" : "None", stats && stats.excluded > 0 ? "warning" : "neutral"),
          statCard("OpenRouter", connected === null ? "\u2014" : connected ? "Connected" : "Not connected", connected ? "Latency and throughput are available" : "Connect a key in settings", connected ? "success" : "warning")
        ])
      );
      this.body.append(
        el2("div", { className: "orm-grid orm-grid-main" }, [
          this.recentCard(),
          this.runtimeCard()
        ])
      );
    }
    recentCard() {
      const config = this.store.getState().config?.config;
      const entries = config ? Object.entries(config.models) : [];
      entries.sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt));
      const recent = entries.slice(0, 5);
      if (recent.length === 0) {
        return card("Recently changed", emptyState(
          "No model has custom routing yet",
          "Pick a model to choose providers, price limits, or speed preferences.",
          { label: "Choose a model", onClick: () => this.store.navigate({ view: "models" }) }
        ), { subtitle: "Models you change routing for appear here" });
      }
      const list = el2("ul", { className: "orm-list-plain" });
      for (const [id, entry] of recent) {
        const model = this.store.getModel(id);
        const profile2 = this.store.getProfile(entry.profileId);
        const label = profile2 ? profile2.name : "Custom";
        list.append(
          el2("li", { className: "orm-row-item" }, [
            el2("button", {
              className: "orm-row-button",
              attrs: { type: "button" },
              onClick: () => this.store.navigate({ view: "model", modelId: id, tab: "routing" })
            }, [
              el2("span", { className: "orm-row-main" }, [
                el2("span", { className: "orm-row-title", text: model?.name ?? id }),
                el2("span", { className: "orm-row-meta", text: `${label} \xB7 ${formatRelativeTime(entry.updatedAt)}` })
              ]),
              el2("span", { className: "orm-row-end", text: "Edit" })
            ])
          ])
        );
      }
      return card("Recently changed", list, {
        actions: [button2("All profiles", () => this.store.navigate({ view: "profiles" }), "ghost", { small: true })]
      });
    }
    runtimeCard() {
      const status = this.store.getState().status;
      const body = el2("div", { className: "orm-stack-tight" });
      if (!status) {
        body.append(
          el2("p", { className: "orm-body", text: "Not active yet." }),
          el2("p", { className: "orm-muted orm-small", text: "Routing starts when OpenCode loads the plugin. Restart OpenCode if it has been enabled recently." })
        );
      } else {
        body.append(
          el2("div", { className: "orm-row-between" }, [
            el2("span", { className: "orm-body", text: "Active" }),
            badge("Running", "success")
          ])
        );
        if (status.lastApplied) {
          body.append(
            el2("p", { className: "orm-muted orm-small", text: `Last routed request: ${status.lastApplied.modelID}` }),
            el2("p", { className: "orm-muted orm-small", text: formatRelativeTime(status.lastApplied.at) })
          );
        } else {
          body.append(el2("p", { className: "orm-muted orm-small", text: "No routed request yet since OpenCode started." }));
        }
      }
      return card("Runtime", body, {
        actions: [button2("Check", () => void this.store.refreshStatus(), "ghost", { small: true })]
      });
    }
  };

  // src/shared/model-id.ts
  function modelAuthor(id) {
    const index = id.indexOf("/");
    return index === -1 ? "" : id.slice(0, index);
  }

  // src/shared/normalize.ts
  function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }
  function perMillion(value) {
    const raw = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.round(raw * 1e6 * 1e6) / 1e6;
  }
  function usd(value) {
    const raw = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.round(raw * 1e6) / 1e6;
  }
  function count(value) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }
  function percent(value) {
    const n = typeof value === "number" ? value : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  }
  var PERCENTILE_KEYS = ["p50", "p75", "p90", "p99"];
  function percentiles(raw) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const key of PERCENTILE_KEYS) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : null;
  }
  function priceOverrides(pricing) {
    if (!pricing || !Array.isArray(pricing.overrides)) return [];
    const result = [];
    for (const entry of pricing.overrides) {
      if (!entry || typeof entry !== "object") continue;
      result.push({
        utcStart: count(entry.utc_start) ?? 0,
        utcEnd: count(entry.utc_end) ?? 0,
        promptPerMillion: perMillion(entry.prompt),
        completionPerMillion: perMillion(entry.completion),
        cacheReadPerMillion: perMillion(entry.input_cache_read)
      });
    }
    return result;
  }
  function modalities(raw) {
    const input = Array.isArray(raw?.input_modalities) ? raw.input_modalities.filter((x) => typeof x === "string") : [];
    const output = Array.isArray(raw?.output_modalities) ? raw.output_modalities.filter((x) => typeof x === "string") : [];
    if ((input.length === 0 || output.length === 0) && typeof raw?.modality === "string") {
      const [left, right] = raw.modality.split("->");
      return {
        input: input.length > 0 ? input : left?.split("+").filter(Boolean) ?? [],
        output: output.length > 0 ? output : right?.split("+").filter(Boolean) ?? []
      };
    }
    return { input, output };
  }
  function normalizeModel(value) {
    const raw = record(value);
    if (!raw || typeof raw.id !== "string" || !raw.id.trim()) return null;
    const id = raw.id.trim();
    const architecture = raw.architecture;
    const { input, output } = modalities(architecture);
    const pricing = raw.pricing;
    return {
      id,
      canonicalSlug: typeof raw.canonical_slug === "string" && raw.canonical_slug.trim() ? raw.canonical_slug.trim() : id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id,
      author: modelAuthor(id),
      created: count(raw.created),
      contextLength: count(raw.top_provider?.context_length) ?? count(raw.context_length),
      maxCompletionTokens: count(raw.top_provider?.max_completion_tokens),
      inputModalities: input,
      outputModalities: output,
      inputPerMillion: perMillion(pricing?.prompt),
      outputPerMillion: perMillion(pricing?.completion),
      cacheReadPerMillion: perMillion(pricing?.input_cache_read),
      cacheWritePerMillion: perMillion(pricing?.input_cache_write),
      detailsPath: typeof raw.links?.details === "string" ? raw.links.details : null
    };
  }
  function normalizeModels(payload) {
    const raw = record(payload);
    if (!raw || !Array.isArray(raw.data)) return [];
    const seen = /* @__PURE__ */ new Set();
    const models = [];
    for (const item of raw.data) {
      const model = normalizeModel(item);
      if (!model || seen.has(model.id)) continue;
      seen.add(model.id);
      models.push(model);
    }
    return models;
  }
  function normalizeEndpoint(value, fallbackModelId, updatedAt) {
    const raw = record(value);
    if (!raw || typeof raw.tag !== "string" || !raw.tag.trim()) return null;
    const tag = raw.tag.trim();
    const status = count(raw.status) ?? 0;
    const pricing = raw.pricing;
    return {
      tag,
      providerName: typeof raw.provider_name === "string" && raw.provider_name.trim() ? raw.provider_name.trim() : tag.split("/")[0] ?? tag,
      endpointName: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : tag,
      modelId: typeof raw.model_id === "string" && raw.model_id.trim() ? raw.model_id.trim() : fallbackModelId,
      inputPerMillion: perMillion(pricing?.prompt),
      outputPerMillion: perMillion(pricing?.completion),
      cacheReadPerMillion: perMillion(pricing?.input_cache_read),
      cacheWritePerMillion: perMillion(pricing?.input_cache_write),
      imagePrice: usd(pricing?.image),
      requestPrice: usd(pricing?.request),
      latencyMs: percentiles(raw.latency_last_30m),
      throughputTps: percentiles(raw.throughput_last_30m),
      contextLength: count(raw.context_length),
      maxPromptTokens: count(raw.max_prompt_tokens),
      maxCompletionTokens: count(raw.max_completion_tokens),
      quantization: typeof raw.quantization === "string" && raw.quantization ? raw.quantization : null,
      serviceTier: typeof raw.service_tier === "string" && raw.service_tier ? raw.service_tier : null,
      status,
      available: status === 0,
      uptime30m: percent(raw.uptime_last_30m),
      uptime1d: percent(raw.uptime_last_1d),
      supportsImplicitCaching: raw.supports_implicit_caching === true,
      supportedParameters: Array.isArray(raw.supported_parameters) ? raw.supported_parameters.filter((x) => typeof x === "string") : [],
      priceOverrides: priceOverrides(pricing),
      lastUpdated: updatedAt
    };
  }
  function normalizeEndpoints(payload, updatedAt) {
    const raw = record(payload);
    const data = record(raw?.data);
    if (!data) return { modelId: null, endpoints: [] };
    const modelId = typeof data.id === "string" ? data.id : null;
    const source = Array.isArray(data.endpoints) ? data.endpoints : [];
    const seen = /* @__PURE__ */ new Set();
    const endpoints = [];
    for (const item of source) {
      const endpoint = normalizeEndpoint(item, modelId ?? "", updatedAt);
      if (!endpoint || seen.has(endpoint.tag)) continue;
      seen.add(endpoint.tag);
      endpoints.push(endpoint);
    }
    return { modelId, endpoints };
  }
  var SAFE_ENDPOINT_PATH = /^\/api\/v1\/models\/[A-Za-z0-9._:/-]+\/endpoints$/;
  function isSafeEndpointPath(path) {
    return SAFE_ENDPOINT_PATH.test(path) && !path.includes("..");
  }
  function endpointsPath(model) {
    if (model.detailsPath && isSafeEndpointPath(model.detailsPath)) return model.detailsPath;
    const slug = (model.canonicalSlug || model.id).split("/").filter(Boolean).map((segment) => segment === "." || segment === ".." ? "_" : encodeURIComponent(segment)).join("/");
    return `/api/v1/models/${slug}/endpoints`;
  }
  function bestPrice(endpoints, key) {
    let best = null;
    for (const endpoint of endpoints) {
      const value = endpoint[key];
      if (value === null) continue;
      if (best === null || value < best) best = value;
    }
    return best;
  }
  function bestPercentile(endpoints, metric, percentile) {
    let best = null;
    for (const endpoint of endpoints) {
      const value = endpoint[metric]?.[percentile];
      if (value === void 0) continue;
      if (best === null) best = value;
      else if (metric === "latencyMs" ? value < best : value > best) best = value;
    }
    return best;
  }

  // src/panel/views/models.ts
  function numeric(value) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function providerSlugs(endpoints) {
    const set = /* @__PURE__ */ new Set();
    for (const endpoint of endpoints ?? []) set.add(endpoint.tag.split("/")[0] ?? endpoint.tag);
    return set;
  }
  function filterAndSortModels(models, endpoints, browser) {
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
    const value = (model) => {
      switch (browser.sort) {
        case "input":
          return model.inputPerMillion;
        case "output":
          return model.outputPerMillion;
        case "context":
          return model.contextLength;
        case "providers": {
          const list = endpoints[model.id];
          return list ? list.length : null;
        }
        case "latency":
          return bestPercentile(endpoints[model.id] ?? [], "latencyMs", "p50");
        case "throughput":
          return bestPercentile(endpoints[model.id] ?? [], "throughputTps", "p50");
        case "name":
        default:
          return null;
      }
    };
    const direction = browser.direction === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (browser.sort === "name") {
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
  var PAGE_SIZE = 25;
  var CONTEXT_PRESETS = [
    { value: "", label: "Any size" },
    { value: "32000", label: "At least 32K" },
    { value: "128000", label: "At least 128K" },
    { value: "200000", label: "At least 200K" },
    { value: "1000000", label: "At least 1M" }
  ];
  var PRICE_PRESETS = [
    { value: "", label: "Any price" },
    { value: "0.5", label: "Up to $0.50 / M" },
    { value: "1", label: "Up to $1 / M" },
    { value: "3", label: "Up to $3 / M" },
    { value: "10", label: "Up to $10 / M" }
  ];
  var COLUMNS = [
    { key: "name", label: "Model" },
    { key: "context", label: "Context", numeric: true },
    { key: "input", label: "Input", numeric: true, hint: "Published price per million input tokens" },
    { key: "output", label: "Output", numeric: true, hint: "Published price per million output tokens" },
    { key: "providers", label: "Providers", numeric: true, hint: "Providers with data loaded so far" },
    { key: "latency", label: "Fastest start", numeric: true, hint: "Shortest median wait before the first token, among loaded providers" },
    { key: "throughput", label: "Fastest output", numeric: true, hint: "Highest median tokens per second, among loaded providers" },
    { key: null, label: "Routing" }
  ];
  var ModelsView = class {
    constructor(store2) {
      this.store = store2;
      const browser = store2.getState().browser;
      const search = textInput(
        browser.query,
        (value) => {
          if (this.searchTimer) clearTimeout(this.searchTimer);
          this.searchTimer = setTimeout(() => this.store.setBrowser({ query: value, page: 0 }), 150);
        },
        { placeholder: "Search models, e.g. \u201Cclaude\u201D or \u201Cdeepseek\u201D" }
      );
      search.setAttribute("aria-label", "Search models");
      search.type = "search";
      this.filterToggle = button2("Filters", () => this.toggleFilters(), "outline");
      this.filterToggle.setAttribute("aria-expanded", "false");
      this.element.append(
        pageHeader({
          title: "Models",
          subtitle: "Compare what each model costs and how quickly providers serve it.",
          actions: [button2("Refresh", () => void this.store.refreshCatalog(true), "secondary")]
        }),
        card(null, [
          toolbar([el2("div", { className: "orm-grow" }, [search]), this.filterToggle]),
          this.filterPanel,
          el2("div", { className: "orm-results-meta" }, [this.countHost]),
          this.resultsHost,
          this.pagerHost
        ])
      );
      this.buildFilters();
      this.update();
    }
    element = el2("div", { className: "orm-view" });
    resultsHost = el2("div");
    countHost = el2("span", { className: "orm-muted orm-small" });
    pagerHost = el2("div", { className: "orm-pager" });
    filterPanel = el2("div", { className: "orm-filter-panel" });
    filterToggle;
    filtersOpen = false;
    searchTimer = null;
    providerSelect = null;
    toggleFilters() {
      this.filtersOpen = !this.filtersOpen;
      this.filterPanel.hidden = !this.filtersOpen;
      this.filterToggle.setAttribute("aria-expanded", String(this.filtersOpen));
    }
    activeFilterCount(browser) {
      return [browser.provider, browser.minContext, browser.maxInput, browser.availableOnly ? "y" : ""].filter(Boolean).length;
    }
    /** Built once; the controls keep focus while the results update. */
    buildFilters() {
      const browser = this.store.getState().browser;
      const context = selectBox(
        browser.minContext,
        CONTEXT_PRESETS,
        (value) => this.store.setBrowser({ minContext: value, page: 0 })
      );
      const price = selectBox(
        browser.maxInput,
        PRICE_PRESETS,
        (value) => this.store.setBrowser({ maxInput: value, page: 0 })
      );
      const available = switchBox(
        browser.availableOnly,
        (checked) => this.store.setBrowser({ availableOnly: checked, page: 0 }),
        "Only models with an available provider",
        "Uses loaded provider data."
      );
      this.providerSelect = el2("div", { className: "orm-provider-select" });
      this.filterPanel.hidden = true;
      this.filterPanel.replaceChildren(
        el2("div", { className: "orm-grid orm-grid-3" }, [
          field2("Context window", context),
          field2("Input price", price),
          this.providerSelect
        ]),
        el2("div", { className: "orm-row-between" }, [
          available,
          button2("Clear filters", () => this.clearFilters(), "ghost", { small: true })
        ])
      );
    }
    clearFilters() {
      this.store.setBrowser({
        query: "",
        provider: "",
        minContext: "",
        maxInput: "",
        maxOutput: "",
        availableOnly: false,
        page: 0
      });
      this.buildFilters();
      this.update();
    }
    renderProviderSelect() {
      if (!this.providerSelect) return;
      const suggestions = this.store.providerSuggestions();
      const current = this.store.getState().browser.provider;
      this.providerSelect.replaceChildren(
        suggestions.length === 0 ? field2("Provider", el2("span", { className: "orm-muted orm-small", text: "Open a model or wait for data to load" })) : field2(
          "Provider",
          selectBox(
            current,
            [{ value: "", label: "Any provider" }, ...suggestions.map((entry) => ({ value: entry.slug, label: entry.name }))],
            (value) => this.store.setBrowser({ provider: value, page: 0 })
          )
        )
      );
    }
    update() {
      const state = this.store.getState();
      const browser = state.browser;
      this.renderProviderSelect();
      const active2 = this.activeFilterCount(browser);
      this.filterToggle.textContent = active2 > 0 ? `Filters (${active2})` : "Filters";
      if (!state.catalog) {
        this.countHost.textContent = "";
        this.pagerHost.replaceChildren();
        this.resultsHost.replaceChildren(
          state.catalogLoading ? skeletonRows(8) : emptyState("Models could not be loaded", state.catalogError ?? "Check your connection, then try again.", {
            label: "Try again",
            onClick: () => void this.store.refreshCatalog(true)
          })
        );
        return;
      }
      const models = state.catalog.models;
      const endpoints = {};
      for (const [id, result] of Object.entries(state.endpoints)) {
        if (result) endpoints[id] = result.endpoints;
      }
      const filtered = filterAndSortModels(models, endpoints, browser);
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const page = Math.min(browser.page, pages - 1);
      const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      this.countHost.textContent = active2 > 0 || browser.query ? `${filtered.length} of ${models.length} models` : `${models.length} models`;
      if (visible.length === 0) {
        this.resultsHost.replaceChildren(
          emptyState("No models match", "Try a shorter search or clear the filters.", {
            label: "Clear filters",
            onClick: () => this.clearFilters()
          })
        );
        this.pagerHost.replaceChildren();
        return;
      }
      this.resultsHost.replaceChildren(this.table(visible, endpoints, browser));
      this.store.queueEndpoints(visible.map((model) => model.id));
      this.renderPager(page, pages, filtered.length);
    }
    table(visible, endpoints, browser) {
      const state = this.store.getState();
      const headRow = el2("tr");
      for (const column of COLUMNS) {
        const th = el2("th", { className: column.numeric ? "orm-num" : void 0, attrs: { scope: "col" } });
        if (column.key) {
          const active2 = browser.sort === column.key;
          const arrow = active2 ? browser.direction === "asc" ? " \u2191" : " \u2193" : "";
          th.setAttribute("aria-sort", active2 ? browser.direction === "asc" ? "ascending" : "descending" : "none");
          th.append(
            el2("button", {
              className: `orm-sort${active2 ? " orm-sort-active" : ""}`,
              text: `${column.label}${arrow}`,
              attrs: { type: "button", title: column.hint ?? "" },
              onClick: () => {
                const key = column.key;
                if (browser.sort === key) {
                  this.store.setBrowser({ direction: browser.direction === "asc" ? "desc" : "asc" });
                } else {
                  this.store.setBrowser({ sort: key, direction: key === "name" ? "asc" : "desc", page: 0 });
                }
              }
            })
          );
        } else {
          th.textContent = column.label;
        }
        headRow.append(th);
      }
      const body = el2("tbody");
      for (const model of visible) {
        const loaded = endpoints[model.id];
        const loading = state.endpointsLoading[model.id];
        const entry = state.config?.config.models[model.id];
        const profile2 = this.store.getProfile(entry?.profileId ?? null);
        const routing = !entry ? badge("Default", "neutral") : badge(profile2 ? profile2.name : "Custom", "info");
        const providerCount = loaded ? String(loaded.length) : loading ? "\u2026" : NA;
        const fastestStart = loaded ? bestPercentile(loaded, "latencyMs", "p50") : null;
        const fastestOutput = loaded ? bestPercentile(loaded, "throughputTps", "p50") : null;
        body.append(
          el2("tr", {}, [
            el2("td", {}, [
              el2("button", {
                className: "orm-link-strong",
                text: model.name,
                attrs: { type: "button", "aria-label": `Open ${model.name}` },
                onClick: () => this.store.navigate({ view: "model", modelId: model.id, tab: "providers" })
              }),
              el2("div", { className: "orm-mono orm-small orm-muted", text: model.id })
            ]),
            el2("td", { className: "orm-num", text: formatContext(model.contextLength) }),
            el2("td", { className: "orm-num", text: formatPricePerMillion(model.inputPerMillion) }),
            el2("td", { className: "orm-num", text: formatPricePerMillion(model.outputPerMillion) }),
            el2("td", { className: "orm-num", text: providerCount }),
            el2("td", { className: "orm-num", text: formatLatencyMs(fastestStart) }),
            el2("td", { className: "orm-num", text: formatThroughput(fastestOutput) }),
            el2("td", {}, [routing])
          ])
        );
      }
      const table = el2("table", { className: "orm-table orm-table-models", attrs: { "aria-label": "Models" } });
      table.append(el2("thead", {}, [headRow]), body);
      return el2("div", { className: "orm-table-wrap" }, [table]);
    }
    renderPager(page, pages, total) {
      if (pages <= 1) {
        this.pagerHost.replaceChildren();
        return;
      }
      const from = page * PAGE_SIZE + 1;
      const to = Math.min(total, (page + 1) * PAGE_SIZE);
      this.pagerHost.replaceChildren(
        el2("span", { className: "orm-muted orm-small", text: `${from}\u2013${to} of ${total}` }),
        el2("div", { className: "orm-actions" }, [
          button2("Previous", () => {
            this.store.setBrowser({ page: Math.max(0, page - 1) });
            window.scrollTo({ top: 0 });
          }, "secondary", { small: true, disabled: page === 0 }),
          button2("Next", () => {
            this.store.setBrowser({ page: Math.min(pages - 1, page + 1) });
            window.scrollTo({ top: 0 });
          }, "secondary", { small: true, disabled: page >= pages - 1 })
        ])
      );
    }
  };

  // src/panel/views/model-providers.ts
  var COLUMNS2 = [
    { key: "provider", label: "Provider" },
    { key: "input", label: "Input", numeric: true, hint: "Price per million input tokens" },
    { key: "output", label: "Output", numeric: true, hint: "Price per million output tokens" },
    { key: "cacheRead", label: "Cached input", numeric: true, hint: "Price per million cached input tokens" },
    { key: "latencyP50", label: "First token", numeric: true, hint: "Median wait before the first token (P50), last 30 minutes" },
    { key: "throughputP50", label: "Speed", numeric: true, hint: "Median output tokens per second (P50), last 30 minutes" },
    { key: null, label: "Status" },
    { key: null, label: "" },
    { key: "latencyP90", label: "First token P90", numeric: true, hint: "Slower end: 90% of requests start faster than this", advanced: true },
    { key: "throughputP90", label: "Speed P90", numeric: true, hint: "90% of requests run at least this fast", advanced: true },
    { key: "cacheWrite", label: "Cache write", numeric: true, hint: "Price per million tokens written to cache, when published", advanced: true },
    { key: "image", label: "Image", numeric: true, hint: "Price per image, when published", advanced: true },
    { key: "request", label: "Request", numeric: true, hint: "Price per request, when published", advanced: true },
    { key: "context", label: "Context", numeric: true, advanced: true },
    { key: "maxCompletion", label: "Max output", numeric: true, advanced: true },
    { key: null, label: "Quantization", advanced: true }
  ];
  function sortValue(endpoint, key) {
    switch (key) {
      case "provider":
        return endpoint.providerName;
      case "input":
        return endpoint.inputPerMillion;
      case "output":
        return endpoint.outputPerMillion;
      case "cacheRead":
        return endpoint.cacheReadPerMillion;
      case "cacheWrite":
        return endpoint.cacheWritePerMillion;
      case "latencyP50":
        return endpoint.latencyMs?.p50 ?? null;
      case "latencyP90":
        return endpoint.latencyMs?.p90 ?? null;
      case "throughputP50":
        return endpoint.throughputTps?.p50 ?? null;
      case "throughputP90":
        return endpoint.throughputTps?.p90 ?? null;
      case "context":
        return endpoint.contextLength;
      case "maxCompletion":
        return endpoint.maxCompletionTokens;
      case "image":
        return endpoint.imagePrice;
      case "request":
        return endpoint.requestPrice;
    }
  }
  var MAX_INPUT_PRESETS = [
    { value: "", label: "Any price" },
    { value: "0.5", label: "Up to $0.50 / M" },
    { value: "1", label: "Up to $1 / M" },
    { value: "3", label: "Up to $3 / M" },
    { value: "10", label: "Up to $10 / M" }
  ];
  var MIN_SPEED_PRESETS = [
    { value: "", label: "Any speed" },
    { value: "30", label: "At least 30 tok/s" },
    { value: "60", label: "At least 60 tok/s" },
    { value: "100", label: "At least 100 tok/s" }
  ];
  var MAX_WAIT_PRESETS = [
    { value: "", label: "Any wait" },
    { value: "1000", label: "Under 1 s" },
    { value: "2000", label: "Under 2 s" },
    { value: "5000", label: "Under 5 s" }
  ];
  var ProvidersPanel = class {
    constructor(store2, modelId, canonicalSlug) {
      this.store = store2;
      this.modelId = modelId;
      this.canonicalSlug = canonicalSlug;
      this.element.append(this.statusHost, this.filtersHost(), this.tableHost, this.compareHost);
      this.update();
    }
    element = el2("div", { className: "orm-providers" });
    statusHost = el2("div");
    tableHost = el2("div");
    compareHost = el2("div");
    selected = /* @__PURE__ */ new Set();
    sortKey = "input";
    direction = "asc";
    maxInput = "";
    minSpeed = "";
    maxWait = "";
    availableOnly = false;
    showAdvanced = false;
    filtersHost() {
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
      }, "Available only");
      const advanced = switchBox(this.showAdvanced, (checked) => {
        this.showAdvanced = checked;
        this.update();
      }, "More columns");
      return card(null, toolbar([
        field2("Input price", price),
        field2("Speed", speed),
        field2("First token", wait),
        el2("div", { className: "orm-toolbar-switches" }, [available, advanced])
      ]));
    }
    update() {
      const state = this.store.getState();
      const result = state.endpoints[this.modelId];
      const loading = state.endpointsLoading[this.modelId];
      this.statusHost.replaceChildren();
      this.tableHost.replaceChildren();
      if (!result && loading) {
        this.tableHost.append(skeletonRows(4));
        return;
      }
      if (!result || result.endpoints.length === 0 && result.error) {
        this.tableHost.append(
          emptyState(
            "Providers could not be loaded",
            result?.error ?? "Check your connection, then try again.",
            { label: "Try again", onClick: () => void this.store.loadEndpoints(this.modelId, true) }
          )
        );
        return;
      }
      const all = result.endpoints;
      const noSpeedData = all.every((endpoint) => endpoint.latencyMs === null && endpoint.throughputTps === null);
      this.statusHost.append(
        el2("div", { className: "orm-sync-line" }, [
          el2("span", { className: "orm-muted orm-small", text: `Updated ${formatRelativeTime(result.fetchedAt)}` }),
          button2("Refresh", () => void this.store.loadEndpoints(this.modelId, true), "ghost", { small: true })
        ])
      );
      if (noSpeedData && state.connection?.connected !== true) {
        this.statusHost.append(
          banner({
            tone: "info",
            title: "Speed appears after you connect OpenRouter",
            body: "Prices are always shown. First-token and speed numbers need an OpenRouter key.",
            action: { label: "Open settings", onClick: () => this.store.navigate({ view: "settings" }) }
          })
        );
      }
      const maxInput = this.maxInput ? Number(this.maxInput) : null;
      const minSpeed = this.minSpeed ? Number(this.minSpeed) : null;
      const maxWait = this.maxWait ? Number(this.maxWait) : null;
      const filtered = all.filter((endpoint) => {
        if (maxInput !== null && (endpoint.inputPerMillion === null || endpoint.inputPerMillion > maxInput)) return false;
        if (minSpeed !== null && (endpoint.throughputTps?.p50 === void 0 || endpoint.throughputTps.p50 < minSpeed)) return false;
        if (maxWait !== null && (endpoint.latencyMs?.p50 === void 0 || endpoint.latencyMs.p50 > maxWait)) return false;
        if (this.availableOnly && !endpoint.available) return false;
        return true;
      });
      filtered.sort((a, b) => {
        const left = sortValue(a, this.sortKey);
        const right = sortValue(b, this.sortKey);
        if (left === null && right === null) return a.tag.localeCompare(b.tag);
        if (left === null) return 1;
        if (right === null) return -1;
        const dir = this.direction === "asc" ? 1 : -1;
        if (typeof left === "string" || typeof right === "string") return String(left).localeCompare(String(right)) * dir;
        return (left - right) * dir;
      });
      if (filtered.length === 0) {
        this.tableHost.append(
          emptyState("No providers match", "Loosen a filter above.", {
            label: "Clear filters",
            onClick: () => {
              this.maxInput = "";
              this.minSpeed = "";
              this.maxWait = "";
              this.availableOnly = false;
              this.update();
            }
          })
        );
        this.renderCompare(all);
        return;
      }
      const cheapestInput = bestPrice(all, "inputPerMillion");
      const cheapestOutput = bestPrice(all, "outputPerMillion");
      const fastest = bestPercentile(all, "throughputTps", "p50");
      const quickest = bestPercentile(all, "latencyMs", "p50");
      const columns = COLUMNS2.filter((column) => this.showAdvanced || !column.advanced);
      const head = el2("tr");
      for (const column of columns) {
        const th = el2("th", { className: column.numeric ? "orm-num" : void 0, attrs: { scope: "col" } });
        if (column.key) {
          const active2 = this.sortKey === column.key;
          th.setAttribute("aria-sort", active2 ? this.direction === "asc" ? "ascending" : "descending" : "none");
          th.append(
            el2("button", {
              className: `orm-sort${active2 ? " orm-sort-active" : ""}`,
              text: `${column.label}${active2 ? this.direction === "asc" ? " \u2191" : " \u2193" : ""}`,
              attrs: { type: "button", title: column.hint ?? "" },
              onClick: () => {
                const key = column.key;
                if (this.sortKey === key) this.direction = this.direction === "asc" ? "desc" : "asc";
                else {
                  this.sortKey = key;
                  this.direction = "asc";
                }
                this.update();
              }
            })
          );
        } else {
          th.textContent = column.label;
        }
        head.append(th);
      }
      head.prepend(el2("th", { attrs: { scope: "col", "aria-label": "Compare" } }));
      const body = el2("tbody");
      for (const endpoint of filtered) {
        const selected = this.selected.has(endpoint.tag);
        const isCheapestInput = cheapestInput !== null && endpoint.inputPerMillion === cheapestInput;
        const isCheapestOutput = cheapestOutput !== null && endpoint.outputPerMillion === cheapestOutput;
        const isFastest = fastest !== null && endpoint.throughputTps?.p50 === fastest;
        const isQuickest = quickest !== null && endpoint.latencyMs?.p50 === quickest;
        const inputDelta = isCheapestInput ? null : percentDifference(endpoint.inputPerMillion, cheapestInput);
        const outputDelta = isCheapestOutput ? null : percentDifference(endpoint.outputPerMillion, cheapestOutput);
        const badges = [];
        if (isCheapestInput) badges.push(badge("Lowest price", "success"));
        if (isFastest) badges.push(badge("Fastest", "info"));
        if (isQuickest) badges.push(badge("Quickest start", "info"));
        const cells = [
          el2("td", { className: "orm-cell-check" }, [
            checkbox(selected, (checked) => {
              if (checked && this.selected.size >= 4) {
                void this.store.toast("info", "You can compare up to four providers.");
                this.update();
                return;
              }
              if (checked) this.selected.add(endpoint.tag);
              else this.selected.delete(endpoint.tag);
              this.update();
            }, `Compare ${endpoint.providerName}`)
          ]),
          el2("td", {}, [
            el2("div", { className: "orm-provider-name", text: endpoint.providerName }),
            el2("div", { className: "orm-mono orm-small orm-muted", text: endpoint.tag }),
            badges.length > 0 ? el2("div", { className: "orm-chip-row" }, badges) : null
          ]),
          this.priceCell(endpoint.inputPerMillion, inputDelta),
          this.priceCell(endpoint.outputPerMillion, outputDelta),
          el2("td", { className: "orm-num", text: formatPricePerMillion(endpoint.cacheReadPerMillion) }),
          el2("td", { className: "orm-num", text: formatLatencyMs(endpoint.latencyMs?.p50) }),
          el2("td", { className: "orm-num", text: formatThroughput(endpoint.throughputTps?.p50) }),
          el2("td", {}, [
            endpoint.available ? badge("Available", "success") : badge("Degraded", "warning"),
            el2("div", { className: "orm-small orm-muted", text: `Uptime ${formatUptime(endpoint.uptime30m)}` })
          ]),
          el2("td", {}, [
            button2("Exclude", () => void this.exclude(endpoint), "ghost", { small: true })
          ])
        ];
        if (this.showAdvanced) {
          cells.push(
            el2("td", { className: "orm-num", text: formatLatencyMs(endpoint.latencyMs?.p90) }),
            el2("td", { className: "orm-num", text: formatThroughput(endpoint.throughputTps?.p90) }),
            el2("td", { className: "orm-num", text: formatPricePerMillion(endpoint.cacheWritePerMillion) }),
            el2("td", { className: "orm-num", text: formatUsd(endpoint.imagePrice) }),
            el2("td", { className: "orm-num", text: formatUsd(endpoint.requestPrice) }),
            el2("td", { className: "orm-num", text: formatContext(endpoint.contextLength) }),
            el2("td", { className: "orm-num", text: formatContext(endpoint.maxCompletionTokens) }),
            el2("td", { text: endpoint.quantization ?? NA })
          );
        }
        body.append(el2("tr", { className: selected ? "orm-row-selected" : void 0 }, cells));
      }
      const table = el2("table", { className: "orm-table orm-table-providers", attrs: { "aria-label": "Provider comparison" } });
      table.append(el2("thead", {}, [head]), body);
      this.tableHost.append(
        card(null, [
          el2("div", { className: "orm-table-wrap" }, [table]),
          el2("p", {
            className: "orm-small orm-muted",
            text: `${filtered.length} of ${all.length} providers. Percentages show how much more a provider costs than the lowest price.`
          })
        ])
      );
      this.renderCompare(all);
    }
    priceCell(value, delta) {
      return el2("td", { className: "orm-num" }, [
        el2("span", { text: formatPricePerMillion(value) }),
        delta !== null ? el2("span", {
          className: `orm-delta ${delta <= 0 ? "orm-delta-good" : "orm-delta-bad"}`,
          text: ` ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`
        }) : null
      ]);
    }
    renderCompare(all) {
      this.compareHost.replaceChildren();
      const selected = all.filter((endpoint) => this.selected.has(endpoint.tag));
      if (selected.length < 2) return;
      const cheapestInput = bestPrice(all, "inputPerMillion");
      const cheapestOutput = bestPrice(all, "outputPerMillion");
      const columns = selected.map(
        (endpoint) => el2("div", { className: "orm-compare-card" }, [
          el2("div", { className: "orm-row-between" }, [
            el2("div", {}, [
              el2("div", { className: "orm-provider-name", text: endpoint.providerName }),
              el2("div", { className: "orm-mono orm-small orm-muted", text: endpoint.tag })
            ]),
            button2("Remove", () => {
              this.selected.delete(endpoint.tag);
              this.update();
            }, "ghost", { small: true })
          ]),
          el2("dl", { className: "orm-dl" }, [
            el2("dt", { text: "Input" }),
            el2("dd", { text: `${formatPricePerMillion(endpoint.inputPerMillion)}${endpoint.inputPerMillion === cheapestInput ? " \xB7 lowest" : ""}` }),
            el2("dt", { text: "Output" }),
            el2("dd", { text: `${formatPricePerMillion(endpoint.outputPerMillion)}${endpoint.outputPerMillion === cheapestOutput ? " \xB7 lowest" : ""}` }),
            el2("dt", { text: "Cached input" }),
            el2("dd", { text: formatPricePerMillion(endpoint.cacheReadPerMillion) }),
            el2("dt", { text: "First token" }),
            el2("dd", { text: formatLatencyMs(endpoint.latencyMs?.p50) }),
            el2("dt", { text: "Speed" }),
            el2("dd", { text: formatThroughput(endpoint.throughputTps?.p50) })
          ])
        ])
      );
      this.compareHost.append(
        card(`Comparing ${selected.length} providers`, [
          el2("div", { className: "orm-compare-grid" }, columns),
          el2("div", { className: "orm-row-between" }, [
            el2("span", { className: "orm-muted orm-small", text: "Lower prices are better; faster is better for speed and first token." }),
            button2("Clear comparison", () => {
              this.selected.clear();
              this.update();
            }, "ghost", { small: true })
          ])
        ])
      );
    }
    async exclude(endpoint) {
      const slug = endpoint.tag.split("/")[0] ?? endpoint.tag;
      const ok = await confirmDialog(
        `Exclude ${endpoint.providerName}?`,
        `Requests for this model will skip ${endpoint.providerName}. You can undo this in Routing.`,
        "Exclude"
      );
      if (!ok) return;
      const saved = await this.store.excludeProvider(this.modelId, this.canonicalSlug, slug);
      if (saved) this.update();
    }
  };

  // src/shared/policy.ts
  var PERCENTILES = ["p50", "p75", "p90", "p99"];
  var SORT_BYS = ["price", "latency", "throughput"];
  var PROVIDER_MODES = ["all", "only", "exclude"];
  var PROVIDER_SLUG = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;
  function emptyPolicy() {
    return { mode: "all", providers: [], order: [], allowFallbacks: true };
  }
  function clonePolicy(policy) {
    return {
      ...policy,
      providers: [...policy.providers],
      order: [...policy.order],
      ...policy.quantizations ? { quantizations: [...policy.quantizations] } : {}
    };
  }
  function cleanSlug(value) {
    if (typeof value !== "string") return null;
    const slug = value.trim().toLowerCase();
    return slug && PROVIDER_SLUG.test(slug) ? slug : null;
  }
  function cleanProviders(value) {
    if (!Array.isArray(value)) return [];
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const item of value) {
      const slug = cleanSlug(item);
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        result.push(slug);
      }
    }
    return result;
  }
  function positive(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
  }
  function nonNegative(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
  }
  function oneOf(value, allowed) {
    return typeof value === "string" && allowed.includes(value) ? value : void 0;
  }
  function sanitizePolicy(input, fallback = emptyPolicy()) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return clonePolicy(fallback);
    const raw = input;
    const policy = {
      mode: oneOf(raw.mode, PROVIDER_MODES) ?? fallback.mode,
      providers: raw.providers === void 0 ? [...fallback.providers] : cleanProviders(raw.providers),
      order: raw.order === void 0 ? [...fallback.order] : cleanProviders(raw.order),
      allowFallbacks: typeof raw.allowFallbacks === "boolean" ? raw.allowFallbacks : fallback.allowFallbacks
    };
    const maxPrompt = nonNegative(raw.maxPromptPerMillion);
    if (maxPrompt !== void 0) policy.maxPromptPerMillion = maxPrompt;
    const maxCompletion = nonNegative(raw.maxCompletionPerMillion);
    if (maxCompletion !== void 0) policy.maxCompletionPerMillion = maxCompletion;
    const maxImage = nonNegative(raw.maxImagePrice);
    if (maxImage !== void 0) policy.maxImagePrice = maxImage;
    const maxRequest = nonNegative(raw.maxRequestPrice);
    if (maxRequest !== void 0) policy.maxRequestPrice = maxRequest;
    const sort = oneOf(raw.sort, SORT_BYS);
    if (sort) policy.sort = sort;
    const partition = oneOf(raw.partition, ["model", "none"]);
    if (partition && sort) policy.partition = partition;
    const latency = positive(raw.maxLatencySeconds);
    const latencyPercentile = oneOf(raw.maxLatencyPercentile, PERCENTILES);
    if (latency !== void 0) {
      policy.maxLatencySeconds = latency;
      policy.maxLatencyPercentile = latencyPercentile ?? "p50";
    }
    const throughput = positive(raw.minThroughputTps);
    const throughputPercentile = oneOf(raw.minThroughputPercentile, PERCENTILES);
    if (throughput !== void 0) {
      policy.minThroughputTps = throughput;
      policy.minThroughputPercentile = throughputPercentile ?? "p50";
    }
    const quantizations = cleanProviders(raw.quantizations);
    if (quantizations.length > 0) policy.quantizations = quantizations;
    const dataCollection = oneOf(raw.dataCollection, ["allow", "deny"]);
    if (dataCollection) policy.dataCollection = dataCollection;
    if (raw.zdr === true) policy.zdr = true;
    if (raw.requireParameters === true) policy.requireParameters = true;
    if (raw.enforceDistillableText === true) policy.enforceDistillableText = true;
    const localCache = nonNegative(raw.localMaxCacheReadPerMillion);
    if (localCache !== void 0) policy.localMaxCacheReadPerMillion = localCache;
    return policy;
  }
  var OPTIONAL_POLICY_KEYS = [
    "maxPromptPerMillion",
    "maxCompletionPerMillion",
    "maxImagePrice",
    "maxRequestPrice",
    "sort",
    "partition",
    "maxLatencySeconds",
    "maxLatencyPercentile",
    "minThroughputTps",
    "minThroughputPercentile",
    "quantizations",
    "dataCollection",
    "zdr",
    "requireParameters",
    "enforceDistillableText",
    "localMaxCacheReadPerMillion"
  ];
  function equal(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((value, index) => value === b[index]);
    }
    return a === b;
  }
  function mergePolicy(base, override) {
    const merged = clonePolicy(base);
    if (!override) return merged;
    const record3 = override;
    if (override.mode !== void 0 && override.mode !== null) merged.mode = override.mode;
    if (override.providers !== void 0 && override.providers !== null) {
      merged.providers = cleanProviders(override.providers);
    }
    if (override.order !== void 0 && override.order !== null) {
      merged.order = cleanProviders(override.order);
    }
    if (override.allowFallbacks !== void 0 && override.allowFallbacks !== null) {
      merged.allowFallbacks = override.allowFallbacks;
    }
    for (const key of OPTIONAL_POLICY_KEYS) {
      if (record3[key] === null) delete merged[key];
    }
    const candidate = { ...merged };
    for (const key of OPTIONAL_POLICY_KEYS) {
      const value = record3[key];
      if (value !== void 0 && value !== null) candidate[key] = value;
    }
    return sanitizePolicy(candidate, merged);
  }
  function diffPolicy(base, edited) {
    const out = {};
    const baseRecord = base;
    const editedRecord = edited;
    for (const key of ["mode", "providers", "order", "allowFallbacks", ...OPTIONAL_POLICY_KEYS]) {
      const before = baseRecord[key];
      const after = editedRecord[key];
      if (equal(before, after)) continue;
      out[key] = after === void 0 ? null : after;
    }
    return out;
  }
  function overrideCount(override) {
    return override ? Object.keys(override).length : 0;
  }
  function policyToProvider(policy) {
    const out = {};
    const providers = cleanProviders(policy.providers);
    if (policy.mode === "only" && providers.length > 0) out.only = providers;
    if (policy.mode === "exclude" && providers.length > 0) out.ignore = providers;
    const order = cleanProviders(policy.order);
    if (order.length > 0) out.order = order;
    if (policy.allowFallbacks === false) out.allow_fallbacks = false;
    if (policy.sort && SORT_BYS.includes(policy.sort)) {
      if (policy.partition === "model" || policy.partition === "none") {
        out.sort = { by: policy.sort, partition: policy.partition };
      } else {
        out.sort = policy.sort;
      }
    }
    const maxPrice = {};
    if (policy.maxPromptPerMillion !== void 0) maxPrice.prompt = policy.maxPromptPerMillion;
    if (policy.maxCompletionPerMillion !== void 0) maxPrice.completion = policy.maxCompletionPerMillion;
    if (policy.maxImagePrice !== void 0) maxPrice.image = policy.maxImagePrice;
    if (policy.maxRequestPrice !== void 0) maxPrice.request = policy.maxRequestPrice;
    if (Object.keys(maxPrice).length > 0) out.max_price = maxPrice;
    if (policy.maxLatencySeconds !== void 0) {
      out.preferred_max_latency = {
        [policy.maxLatencyPercentile ?? "p50"]: policy.maxLatencySeconds
      };
    }
    if (policy.minThroughputTps !== void 0) {
      out.preferred_min_throughput = {
        [policy.minThroughputPercentile ?? "p50"]: policy.minThroughputTps
      };
    }
    const quantizations = cleanProviders(policy.quantizations);
    if (quantizations.length > 0) out.quantizations = quantizations;
    if (policy.dataCollection) out.data_collection = policy.dataCollection;
    if (policy.zdr === true) out.zdr = true;
    if (policy.requireParameters === true) out.require_parameters = true;
    if (policy.enforceDistillableText === true) out.enforce_distillable_text = true;
    return Object.keys(out).length === 0 ? null : out;
  }
  function validatePolicy(policy) {
    const issues = [];
    if (policy.mode !== "all" && policy.providers.length === 0) {
      issues.push({
        field: "providers",
        severity: "error",
        message: policy.mode === "only" ? 'Choose at least one provider to allow, or switch to "All providers".' : 'Choose at least one provider to exclude, or switch to "All providers".'
      });
    }
    const bad = [...policy.providers, ...policy.order].filter((slug) => !PROVIDER_SLUG.test(slug));
    for (const slug of bad) {
      issues.push({ field: "providers", severity: "error", message: `"${slug}" is not a provider slug.` });
    }
    if (policy.mode === "exclude" && policy.order.length > 0) {
      const overlap = policy.order.filter((slug) => policy.providers.includes(slug));
      if (overlap.length > 0) {
        issues.push({
          field: "order",
          severity: "warning",
          message: `Order lists excluded providers (${overlap.join(", ")}); they will not be tried.`
        });
      }
    }
    if (policy.mode === "only" && policy.order.length > 0) {
      const outside = policy.order.filter((slug) => !policy.providers.includes(slug));
      if (outside.length > 0) {
        issues.push({
          field: "order",
          severity: "warning",
          message: `Order names providers outside "Only" (${outside.join(", ")}); OpenRouter ignores them.`
        });
      }
    }
    if (policy.maxPromptPerMillion !== void 0 && policy.maxPromptPerMillion < 0) {
      issues.push({ field: "maxPromptPerMillion", severity: "error", message: "Price cannot be negative." });
    }
    if (policy.maxCompletionPerMillion !== void 0 && policy.maxCompletionPerMillion < 0) {
      issues.push({ field: "maxCompletionPerMillion", severity: "error", message: "Price cannot be negative." });
    }
    if (policy.maxImagePrice !== void 0 && policy.maxImagePrice < 0) {
      issues.push({ field: "maxImagePrice", severity: "error", message: "Price cannot be negative." });
    }
    if (policy.maxRequestPrice !== void 0 && policy.maxRequestPrice < 0) {
      issues.push({ field: "maxRequestPrice", severity: "error", message: "Price cannot be negative." });
    }
    if (policy.maxLatencySeconds !== void 0 && policy.maxLatencySeconds <= 0) {
      issues.push({ field: "maxLatencySeconds", severity: "error", message: "Latency must be greater than zero." });
    }
    if (policy.minThroughputTps !== void 0 && policy.minThroughputTps <= 0) {
      issues.push({ field: "minThroughputTps", severity: "error", message: "Throughput must be greater than zero." });
    }
    if (policy.partition && !policy.sort) {
      issues.push({
        field: "partition",
        severity: "warning",
        message: "Partition only applies with a sort strategy; it is ignored otherwise."
      });
    }
    if (policy.localMaxCacheReadPerMillion !== void 0) {
      issues.push({
        field: "localMaxCacheReadPerMillion",
        severity: "warning",
        message: "A cache-read ceiling is a local preference: OpenRouter cannot enforce it in a routing request. It only flags providers here."
      });
    }
    return issues;
  }
  function describePolicy(policy) {
    const lines = [];
    const names = (slugs) => {
      if (slugs.length <= 3) return slugs.join(", ");
      return `${slugs.slice(0, 3).join(", ")} and ${slugs.length - 3} more`;
    };
    if (policy.mode === "only" && policy.providers.length > 0) {
      lines.push(`Uses only ${names(policy.providers)}.`);
    }
    if (policy.mode === "exclude" && policy.providers.length > 0) {
      lines.push(`Never uses ${names(policy.providers)}.`);
    }
    if (policy.order.length > 0) {
      lines.push(`Tries ${names(policy.order)} first, in that order.`);
    }
    if (policy.allowFallbacks === false) {
      lines.push("Does not fall back to other providers if the chosen ones fail.");
    }
    if (policy.sort === "price") lines.push("Prefers the lowest price.");
    if (policy.sort === "throughput") lines.push("Prefers the fastest output speed.");
    if (policy.sort === "latency") lines.push("Prefers the shortest wait before the first token.");
    if (policy.maxPromptPerMillion !== void 0) {
      lines.push(`Skips providers charging more than $${policy.maxPromptPerMillion} per million input tokens.`);
    }
    if (policy.maxCompletionPerMillion !== void 0) {
      lines.push(`Skips providers charging more than $${policy.maxCompletionPerMillion} per million output tokens.`);
    }
    if (policy.maxImagePrice !== void 0) {
      lines.push(`Skips providers charging more than $${policy.maxImagePrice} per image.`);
    }
    if (policy.maxRequestPrice !== void 0) {
      lines.push(`Skips providers charging more than $${policy.maxRequestPrice} per request.`);
    }
    if (policy.maxLatencySeconds !== void 0) {
      lines.push(
        `Prefers providers that respond within ${policy.maxLatencySeconds} s (${(policy.maxLatencyPercentile ?? "p50").toUpperCase()}).`
      );
    }
    if (policy.minThroughputTps !== void 0) {
      lines.push(
        `Prefers providers that generate at least ${policy.minThroughputTps} tokens/s (${(policy.minThroughputPercentile ?? "p50").toUpperCase()}).`
      );
    }
    if (policy.quantizations && policy.quantizations.length > 0) {
      lines.push(`Only ${policy.quantizations.join(" or ")} quantization.`);
    }
    if (policy.dataCollection === "deny") lines.push("Excludes providers that may store your data.");
    if (policy.zdr) lines.push("Uses only zero-data-retention providers.");
    if (policy.requireParameters) lines.push("Uses only providers that support every request parameter.");
    if (policy.enforceDistillableText) lines.push("Uses only models that allow text distillation.");
    return lines.length > 0 ? lines : ["No rules. OpenRouter chooses the provider."];
  }

  // src/panel/routing-form.ts
  var PROVIDER_SLUG2 = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;
  function numberValue(value) {
    if (!value.trim()) return void 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  function numberField(labelText, value, onChange, options = {}) {
    const input = textInput(value === void 0 ? "" : String(value), (raw) => onChange(numberValue(raw)), {
      type: "number",
      min: "0",
      step: "any",
      placeholder: options.placeholder ?? "No limit"
    });
    const control = el2("div", { className: "orm-input-unit" }, [
      input,
      options.unit ? el2("span", { className: "orm-unit", text: options.unit }) : null
    ]);
    return field2(labelText, control, options.helper);
  }
  function chipsEditor(title, values, onChange, suggestions, options, rerender) {
    const listId = `orm-suggest-${Math.random().toString(36).slice(2)}`;
    const wrapper = el2("div", { className: "orm-chips" });
    values.forEach((value, index) => {
      wrapper.append(
        el2("span", { className: "orm-chip orm-chip-removable" }, [
          el2("span", { text: value }),
          el2("button", {
            className: "orm-chip-x",
            text: "\xD7",
            attrs: { type: "button", "aria-label": `Remove ${value}` },
            onClick: () => {
              const next = [...values];
              next.splice(index, 1);
              onChange(next);
              rerender();
            }
          })
        ])
      );
    });
    const input = el2("input", {
      className: "orm-input orm-chip-input",
      attrs: { placeholder: options.placeholder, list: listId, "aria-label": title }
    });
    const datalist = el2("datalist", { attrs: { id: listId } });
    for (const suggestion of suggestions) datalist.append(el2("option", { attrs: { value: suggestion } }));
    const add = () => {
      const raw = input.value.trim().toLowerCase();
      if (!raw) return;
      const pattern = options.pattern ?? PROVIDER_SLUG2;
      if (!pattern.test(raw)) return;
      input.value = "";
      if (values.includes(raw)) return;
      onChange([...values, raw]);
      rerender();
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        add();
      }
    });
    wrapper.append(el2("div", { className: "orm-chip-entry" }, [input, datalist, button2("Add", add, "outline", { small: true })]));
    return field2(title, wrapper, options.helper);
  }
  var MODE_LABELS = {
    all: "Any provider",
    only: "Only these providers",
    exclude: "Any except these providers"
  };
  var PolicyEditor = class {
    policy;
    root;
    options;
    openGroups = /* @__PURE__ */ new Set(["providers", "price", "speed"]);
    constructor(root2, options) {
      this.root = root2;
      this.options = options;
      this.policy = clonePolicy(options.policy);
      this.render();
    }
    value() {
      return clonePolicy(this.policy);
    }
    setPolicy(policy) {
      this.policy = clonePolicy(policy);
      this.render();
    }
    changed() {
      this.options.onChange(clonePolicy(this.policy));
    }
    group(id, title, hint, body) {
      const details = disclosure(title, body, { open: this.openGroups.has(id), hint });
      details.dataset.group = id;
      details.addEventListener("toggle", () => {
        if (details.open) this.openGroups.add(id);
        else this.openGroups.delete(id);
      });
      return details;
    }
    render() {
      const root2 = this.root;
      root2.replaceChildren();
      const suggestions = this.options.suggestions.flatMap((entry) => [entry.slug, ...entry.tags]);
      const rerender = () => this.render();
      const modeSelect = selectBox(
        this.policy.mode,
        Object.keys(MODE_LABELS).map((mode) => ({ value: mode, label: MODE_LABELS[mode] })),
        (value) => {
          this.policy.mode = value;
          this.changed();
          rerender();
        },
        { "aria-describedby": "orm-mode-help" }
      );
      const providerBody = [
        field2("Which providers", modeSelect, this.policy.mode === "all" ? "OpenRouter picks from all providers." : void 0)
      ];
      if (this.policy.mode !== "all") {
        providerBody.push(
          chipsEditor(
            this.policy.mode === "only" ? "Allowed providers" : "Providers to avoid",
            this.policy.providers,
            (values) => {
              this.policy.providers = values;
              this.changed();
            },
            suggestions,
            {
              placeholder: "Type a provider, e.g. deepinfra",
              helper: "Use a base name for all its endpoints, or a full endpoint such as deepinfra/fp8."
            },
            rerender
          )
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
          "Fall back to other providers",
          this.policy.allowFallbacks ? "If a chosen provider fails, another one can take over." : "Requests fail rather than use a provider outside this list."
        ),
        chipsEditor(
          "Try these first",
          this.policy.order,
          (values) => {
            this.policy.order = values;
            this.changed();
          },
          suggestions,
          { placeholder: "Optional, in order", helper: "Listed providers are tried first, in this order." },
          rerender
        )
      );
      const priceBody = [
        el2("div", { className: "orm-grid orm-grid-2" }, [
          numberField(
            "Input price limit",
            this.policy.maxPromptPerMillion,
            (value) => this.setOptional("maxPromptPerMillion", value),
            { unit: "$ / M tokens", helper: "Skip providers charging more for input." }
          ),
          numberField(
            "Output price limit",
            this.policy.maxCompletionPerMillion,
            (value) => this.setOptional("maxCompletionPerMillion", value),
            { unit: "$ / M tokens", helper: "Skip providers charging more for output." }
          )
        ])
      ];
      const speedBody = [
        field2(
          "Choose providers by",
          selectBox(
            this.policy.sort ?? "",
            [
              { value: "", label: "Balanced (OpenRouter default)" },
              { value: "price", label: "Lowest price" },
              { value: "throughput", label: "Fastest output" },
              { value: "latency", label: "Shortest first-token wait" }
            ],
            (value) => {
              if (value) this.policy.sort = value;
              else delete this.policy.sort;
              if (!this.policy.sort) delete this.policy.partition;
              this.changed();
              rerender();
            }
          ),
          this.policy.sort ? void 0 : "OpenRouter balances price, speed and reliability."
        ),
        el2("div", { className: "orm-grid orm-grid-2" }, [
          el2("div", { className: "orm-stack-tight" }, [
            numberField(
              "Preferred first-token wait",
              this.policy.maxLatencySeconds,
              (value) => {
                this.setOptional("maxLatencySeconds", value);
                if (value !== void 0 && !this.policy.maxLatencyPercentile) this.policy.maxLatencyPercentile = "p50";
              },
              { unit: "seconds", helper: "Preference only. Never blocks a request." }
            ),
            this.policy.maxLatencySeconds !== void 0 ? field2("Measured as", percentileSelect(this.policy.maxLatencyPercentile ?? "p50", (v2) => {
              this.policy.maxLatencyPercentile = v2;
              this.changed();
            })) : null
          ]),
          el2("div", { className: "orm-stack-tight" }, [
            numberField(
              "Preferred output speed",
              this.policy.minThroughputTps,
              (value) => {
                this.setOptional("minThroughputTps", value);
                if (value !== void 0 && !this.policy.minThroughputPercentile) this.policy.minThroughputPercentile = "p50";
              },
              { unit: "tokens / s", helper: "Preference only. Never blocks a request." }
            ),
            this.policy.minThroughputTps !== void 0 ? field2("Measured as", percentileSelect(this.policy.minThroughputPercentile ?? "p50", (v2) => {
              this.policy.minThroughputPercentile = v2;
              this.changed();
            })) : null
          ])
        ])
      ];
      const moreBody = [
        el2("div", { className: "orm-grid orm-grid-2" }, [
          numberField("Image price limit", this.policy.maxImagePrice, (value) => this.setOptional("maxImagePrice", value), { unit: "$ / image" }),
          numberField("Request price limit", this.policy.maxRequestPrice, (value) => this.setOptional("maxRequestPrice", value), { unit: "$ / request" })
        ]),
        chipsEditor(
          "Quantizations",
          this.policy.quantizations ?? [],
          (values) => {
            this.policy.quantizations = values;
            this.changed();
          },
          ["fp16", "bf16", "fp8", "fp4", "int8", "int4"],
          { placeholder: "Any unless you add one", pattern: /^[a-z0-9._-]+$/, helper: "Only providers serving these precisions." },
          rerender
        ),
        el2("div", { className: "orm-grid orm-grid-2" }, [
          field2(
            "Data retention",
            selectBox(
              this.policy.dataCollection ?? "",
              [
                { value: "", label: "OpenRouter default" },
                { value: "allow", label: "Allow providers that may store data" },
                { value: "deny", label: "Avoid providers that may store data" }
              ],
              (value) => {
                if (value) this.policy.dataCollection = value;
                else delete this.policy.dataCollection;
                this.changed();
              }
            )
          ),
          field2(
            "Routing when sorting",
            selectBox(
              this.policy.partition ?? "model",
              [
                { value: "model", label: "Within each model (default)" },
                { value: "none", label: "Across models" }
              ],
              (value) => {
                this.policy.partition = value;
                this.changed();
              },
              { disabled: !this.policy.sort }
            ),
            this.policy.sort ? void 0 : "Applies only when \u201CChoose providers by\u201D is set."
          )
        ]),
        switchBox(this.policy.zdr === true, (checked) => {
          if (checked) this.policy.zdr = true;
          else delete this.policy.zdr;
          this.changed();
        }, "Zero data retention only", "Only providers that do not keep your prompts."),
        switchBox(this.policy.requireParameters === true, (checked) => {
          if (checked) this.policy.requireParameters = true;
          else delete this.policy.requireParameters;
          this.changed();
        }, "Only providers that support every option in the request", "Useful for tool calls or structured output."),
        switchBox(this.policy.enforceDistillableText === true, (checked) => {
          if (checked) this.policy.enforceDistillableText = true;
          else delete this.policy.enforceDistillableText;
          this.changed();
        }, "Only models that allow text distillation"),
        el2("div", { className: "orm-note-box" }, [
          el2("div", { className: "orm-row-between" }, [
            el2("span", { className: "orm-note-title", text: "Cached-input price limit" }),
            badge("Not sent to OpenRouter", "warning")
          ]),
          el2("p", {
            className: "orm-small orm-muted",
            text: "OpenRouter cannot enforce a cached-input limit. This is kept as a note for comparisons only."
          }),
          numberField("Cached-input price limit", this.policy.localMaxCacheReadPerMillion, (value) => this.setOptional("localMaxCacheReadPerMillion", value), { unit: "$ / M tokens" })
        ])
      ];
      const modeHelp = el2("span", { className: "orm-hidden", attrs: { id: "orm-mode-help" }, text: "Choose how providers are selected for this model." });
      root2.append(
        modeHelp,
        this.group("providers", "Providers", summarizeProviders(this.policy), providerBody),
        this.group("price", "Price limits", summarizePrice(this.policy), priceBody),
        this.group("speed", "Speed and first-token wait", summarizeSpeed(this.policy), speedBody),
        this.group("more", "More options", "Data, quantization, and fine-tuning", moreBody)
      );
    }
    setOptional(key, value) {
      if (value === void 0) delete this.policy[key];
      else this.policy[key] = value;
      this.changed();
    }
  };
  function percentileSelect(value, onChange) {
    return selectBox(
      value,
      [
        { value: "p50", label: "Typical (median)" },
        { value: "p75", label: "Most requests (P75)" },
        { value: "p90", label: "Nearly all requests (P90)" },
        { value: "p99", label: "Almost all requests (P99)" }
      ],
      (next) => onChange(next)
    );
  }
  function summarizeProviders(policy) {
    if (policy.mode === "all") return policy.allowFallbacks ? "Any provider" : "Any provider, no fallback";
    const count2 = policy.providers.length;
    return `${policy.mode === "only" ? "Only" : "Avoiding"} ${count2} provider${count2 === 1 ? "" : "s"}`;
  }
  function summarizePrice(policy) {
    const parts = [];
    if (policy.maxPromptPerMillion !== void 0) parts.push(`input \u2264 $${policy.maxPromptPerMillion}`);
    if (policy.maxCompletionPerMillion !== void 0) parts.push(`output \u2264 $${policy.maxCompletionPerMillion}`);
    return parts.length > 0 ? parts.join(", ") : "No limits";
  }
  function summarizeSpeed(policy) {
    if (!policy.sort && policy.maxLatencySeconds === void 0 && policy.minThroughputTps === void 0) {
      return "OpenRouter default";
    }
    return policy.sort ? `Sorted by ${policy.sort === "throughput" ? "speed" : policy.sort === "latency" ? "first-token wait" : "price"}` : "Preferences set";
  }

  // src/panel/views/model-routing.ts
  var RoutingPanel = class {
    constructor(store2, modelId, canonicalSlug) {
      this.store = store2;
      this.modelId = modelId;
      this.canonicalSlug = canonicalSlug;
      this.syncFromStore();
      this.element.append(
        this.headerHost,
        el2("div", { className: "orm-routing-layout" }, [
          el2("div", { className: "orm-routing-main" }, [this.editorHost]),
          this.summaryHost
        ]),
        this.barHost
      );
      this.mountEditor();
      this.renderAll();
    }
    element = el2("div", { className: "orm-routing" });
    headerHost = el2("div", { className: "orm-routing-head" });
    editorHost = el2("div", { className: "orm-routing-editor" });
    summaryHost = el2("div", { className: "orm-sticky" });
    barHost = el2("div");
    editor = null;
    profileId = null;
    policy = emptyPolicy();
    baseline = emptyPolicy();
    baselineProfileId = null;
    isDirty() {
      return this.profileId !== this.baselineProfileId || JSON.stringify(this.policy) !== JSON.stringify(this.baseline);
    }
    syncFromStore() {
      const entry = this.store.modelEntry(this.modelId);
      const effective = this.store.effective(this.modelId);
      this.profileId = entry?.profileId ?? null;
      this.baselineProfileId = this.profileId;
      this.policy = structuredClone(effective?.policy ?? emptyPolicy());
      this.baseline = structuredClone(effective?.policy ?? emptyPolicy());
    }
    /** Keeps the user's draft when the store refreshes but nothing was saved elsewhere. */
    update() {
      if (!this.isDirty()) {
        const before = JSON.stringify([this.profileId, this.baseline]);
        this.syncFromStore();
        if (before !== JSON.stringify([this.profileId, this.baseline])) {
          this.mountEditor();
        }
      }
      this.renderAll();
    }
    mountEditor() {
      const container = el2("div");
      this.editorHost.replaceChildren(container);
      this.editor = new PolicyEditor(container, {
        policy: this.policy,
        suggestions: this.store.providerSuggestions(),
        onChange: (policy) => {
          this.policy = policy;
          this.renderSummary();
          this.renderBar();
        }
      });
    }
    renderAll() {
      this.renderHeader();
      this.renderSummary();
      this.renderBar();
    }
    renderHeader() {
      const state = this.store.getState();
      const profiles = state.config?.config.profiles ?? [];
      const saved = this.store.modelEntry(this.modelId);
      const hasSaved = Boolean(saved);
      const stateBadge = hasSaved ? badge(this.profileId ? `Uses ${this.store.getProfile(this.profileId)?.name ?? "profile"}` : "Custom routing", "info") : badge("OpenRouter default", "neutral");
      this.headerHost.replaceChildren(
        el2("div", { className: "orm-routing-head-main" }, [
          field2(
            "Start from a profile",
            selectBox(
              this.profileId ?? "",
              [{ value: "", label: "No profile \u2014 set everything here" }, ...profiles.map((profile2) => ({ value: profile2.id, label: profile2.name }))],
              (value) => void this.changeProfile(value || null)
            ),
            profiles.find((profile2) => profile2.id === this.profileId)?.description
          ),
          el2("div", { className: "orm-routing-state" }, [
            el2("span", { className: "orm-muted orm-small", text: "Current" }),
            stateBadge
          ])
        ]),
        ...hasSaved ? [button2("Remove routing", () => void this.remove(), "ghost", { small: true })] : []
      );
    }
    renderSummary() {
      const sentences = describePolicy(this.policy);
      const provider = policyToProvider(this.policy);
      const issues = validatePolicy(this.policy).filter((issue) => issue.severity === "warning");
      const list = el2("ul", { className: "orm-sentences" });
      for (const sentence of sentences) list.append(el2("li", { text: sentence }));
      const json = provider ? JSON.stringify({ provider }, null, 2) : "{}";
      this.summaryHost.replaceChildren(
        card("What this does", [
          list,
          issues.length > 0 ? banner({ tone: "warning", title: "Worth knowing", body: issues.map((issue) => issue.message).join(" ") }) : null,
          disclosure("Request sent to OpenRouter", [
            codeBlock(json),
            el2("div", { className: "orm-actions" }, [
              button2("Copy", () => void this.store.copy(json, "Copied"), "ghost", { small: true })
            ])
          ], { open: true })
        ], { className: "orm-summary-card" })
      );
    }
    renderBar() {
      const errors = validatePolicy(this.policy).filter((issue) => issue.severity === "error");
      const saving = this.store.getState().saving;
      const dirty = this.isDirty();
      const saved = this.store.modelEntry(this.modelId) !== void 0;
      this.barHost.replaceChildren(
        saveBar({
          dirty,
          statusText: saved ? "Saved. Applies to the next request." : "Using OpenRouter defaults.",
          saveDisabledReason: errors[0]?.message,
          saving,
          onSave: () => void this.save(),
          onDiscard: () => {
            this.syncFromStore();
            this.mountEditor();
            this.renderAll();
          }
        })
      );
    }
    async changeProfile(profileId) {
      if (this.isDirty()) {
        const ok = await confirmDialog(
          "Replace your unsaved changes?",
          "Picking a profile loads its settings and discards the edits you have not saved.",
          "Replace",
          true
        );
        if (!ok) {
          this.renderHeader();
          return;
        }
      }
      const profile2 = this.store.getProfile(profileId);
      this.profileId = profileId;
      this.policy = profile2 ? structuredClone(profile2.policy) : emptyPolicy();
      this.mountEditor();
      this.renderAll();
    }
    async save() {
      const ok = await this.store.saveModelPolicy(this.modelId, this.canonicalSlug, this.profileId, this.policy);
      if (!ok) return;
      this.syncFromStore();
      this.mountEditor();
      this.renderAll();
    }
    async remove() {
      const ok = await confirmDialog(
        "Remove routing for this model?",
        "It returns to OpenRouter\u2019s default choice of provider. The model itself does not change.",
        "Remove",
        true
      );
      if (!ok) return;
      const saved = await this.store.removeModelPolicy(this.modelId);
      if (!saved) return;
      this.syncFromStore();
      this.mountEditor();
      this.renderAll();
    }
  };

  // src/panel/views/model-detail.ts
  var ModelDetailView = class {
    constructor(store2, modelId, initialTab) {
      this.store = store2;
      this.modelId = modelId;
      this.tab = initialTab;
      this.element.append(this.headerHost, this.tabsHost, this.contentHost);
      this.update();
    }
    element = el2("div", { className: "orm-view" });
    headerHost = el2("div");
    tabsHost = el2("div", { className: "orm-tabs", attrs: { role: "tablist" } });
    contentHost = el2("div");
    tab;
    providers = null;
    routing = null;
    update() {
      const state = this.store.getState();
      const model = this.store.getModel(this.modelId);
      if (!model) {
        this.tabsHost.replaceChildren();
        this.headerHost.replaceChildren(pageHeader({ title: state.catalog ? "Model not found" : "Loading\u2026", subtitle: this.modelId }));
        this.contentHost.replaceChildren(
          state.catalog ? emptyState("This model is no longer listed", "OpenRouter may have removed it. Saved routing for it stays in your settings but is not used.", {
            label: "Back to models",
            onClick: () => this.store.navigate({ view: "models" })
          }) : skeletonRows(3)
        );
        return;
      }
      const entry = state.config?.config.models[model.id];
      const profile2 = state.config ? this.store.getProfile(entry?.profileId ?? null) : null;
      const status = entry ? badge(profile2 ? `Uses ${profile2.name}` : "Custom routing", "info") : badge("OpenRouter default", "neutral");
      const modalities2 = [...model.inputModalities].join(", ") || "text";
      this.headerHost.replaceChildren(
        pageHeader({
          title: model.name,
          subtitle: model.id,
          actions: [
            button2("Copy ID", () => void this.store.copy(model.id, "Model ID copied"), "outline", { small: true }),
            button2("Back", () => this.store.navigate({ view: "models" }), "ghost", { small: true })
          ]
        }),
        el2("div", { className: "orm-facts" }, [
          this.fact("Context", formatContext(model.contextLength)),
          this.fact("Input", formatPricePerMillion(model.inputPerMillion), "/ M tokens"),
          this.fact("Output", formatPricePerMillion(model.outputPerMillion), "/ M tokens"),
          this.fact("Accepts", modalities2),
          el2("div", { className: "orm-fact" }, [el2("span", { className: "orm-fact-label", text: "Routing" }), status])
        ])
      );
      this.tabsHost.replaceChildren(
        this.tabButton("providers", "Providers"),
        this.tabButton("routing", "Routing")
      );
      if (this.tab === "providers") {
        if (!this.providers) this.providers = new ProvidersPanel(this.store, model.id, model.canonicalSlug);
        else this.providers.update();
        this.contentHost.replaceChildren(this.providers.element);
      } else {
        if (!this.routing) this.routing = new RoutingPanel(this.store, model.id, model.canonicalSlug);
        else this.routing.update();
        this.contentHost.replaceChildren(this.routing.element);
      }
    }
    fact(label, value, unit) {
      return el2("div", { className: "orm-fact" }, [
        el2("span", { className: "orm-fact-label", text: label }),
        el2("span", { className: "orm-fact-value" }, [
          el2("span", { text: value }),
          unit ? el2("span", { className: "orm-fact-unit", text: ` ${unit}` }) : null
        ])
      ]);
    }
    tabButton(id, label) {
      const active2 = this.tab === id;
      return el2("button", {
        className: `orm-tab${active2 ? " orm-tab-active" : ""}`,
        text: label,
        attrs: { type: "button", role: "tab", "aria-selected": String(active2) },
        onClick: () => {
          if (this.tab === id) return;
          this.tab = id;
          this.update();
        }
      });
    }
  };

  // src/panel/views/profiles.ts
  var ProfilesView = class {
    constructor(store2) {
      this.store = store2;
      const first = store2.getState().config?.config.profiles[0]?.id ?? null;
      this.selectedId = first;
      this.loadDraft();
      this.element.append(this.body);
      this.update();
    }
    element = el2("div", { className: "orm-view" });
    body = el2("div", { className: "orm-view-body" });
    tab = "edit";
    selectedId = null;
    creating = false;
    draftName = "";
    draftDescription = "";
    draftPolicy = emptyPolicy();
    savedSnapshot = "";
    bulkProfileId = null;
    bulkQuery = "";
    bulkReplace = false;
    bulkSelected = /* @__PURE__ */ new Set();
    loadDraft() {
      const profile2 = this.store.getState().config?.config.profiles.find((entry) => entry.id === this.selectedId);
      this.draftName = profile2?.name ?? "";
      this.draftDescription = profile2?.description ?? "";
      this.draftPolicy = profile2 ? structuredClone(profile2.policy) : emptyPolicy();
      this.savedSnapshot = JSON.stringify([this.draftName, this.draftDescription, this.draftPolicy]);
    }
    isDirty() {
      return this.creating || JSON.stringify([this.draftName, this.draftDescription, this.draftPolicy]) !== this.savedSnapshot;
    }
    update() {
      const active2 = document.activeElement;
      if (active2 && this.body.contains(active2) && ["INPUT", "TEXTAREA", "SELECT"].includes(active2.tagName)) return;
      const config = this.store.getState().config?.config;
      this.body.replaceChildren();
      this.body.append(
        pageHeader({
          title: "Profiles",
          subtitle: "Reusable routing settings. Apply one to many models, and override it per model when needed.",
          actions: [button2("New profile", () => this.startNew(), "primary")]
        })
      );
      if (!config) {
        this.body.append(emptyState("Settings are not loaded", "Open Settings to repair or reset them.", {
          label: "Open settings",
          onClick: () => this.store.navigate({ view: "settings" })
        }));
        return;
      }
      this.body.append(this.tabs());
      this.body.append(this.tab === "edit" ? this.editLayout() : this.applyLayout());
    }
    tabs() {
      const make = (id, label) => el2("button", {
        className: `orm-tab${this.tab === id ? " orm-tab-active" : ""}`,
        text: label,
        attrs: { type: "button", role: "tab", "aria-selected": String(this.tab === id) },
        onClick: () => {
          if (this.tab === id) return;
          this.tab = id;
          this.update();
        }
      });
      return el2("div", { className: "orm-tabs", attrs: { role: "tablist" } }, [make("edit", "Edit profiles"), make("apply", "Apply to models")]);
    }
    startNew() {
      this.tab = "edit";
      this.creating = true;
      this.selectedId = null;
      this.draftName = "";
      this.draftDescription = "";
      this.draftPolicy = emptyPolicy();
      this.savedSnapshot = "";
      this.update();
    }
    editLayout() {
      const config = this.store.getState().config.config;
      const list = el2("div", { className: "orm-profile-list", attrs: { role: "list" } });
      for (const profile2 of config.profiles) {
        const assigned2 = Object.values(config.models).filter((entry) => entry.profileId === profile2.id).length;
        const active2 = !this.creating && this.selectedId === profile2.id;
        list.append(
          el2("button", {
            className: `orm-profile-item${active2 ? " orm-profile-active" : ""}`,
            attrs: { type: "button", "aria-current": String(active2) },
            onClick: async () => {
              if (this.isDirty()) {
                const ok = await confirmDialog("Discard unsaved changes?", "Your edits to this profile have not been saved.", "Discard", true);
                if (!ok) return;
              }
              this.creating = false;
              this.selectedId = profile2.id;
              this.loadDraft();
              this.update();
            }
          }, [
            el2("span", { className: "orm-profile-name", text: profile2.name }),
            el2("span", { className: "orm-muted orm-small", text: `${assigned2} model${assigned2 === 1 ? "" : "s"}` })
          ])
        );
      }
      const selected = config.profiles.find((profile2) => profile2.id === this.selectedId) ?? null;
      if (!this.creating && !selected) {
        return el2("div", { className: "orm-split" }, [list, card(null, emptyState("Choose a profile", "Or create a new one to start."))]);
      }
      const nameInput = textInput(this.draftName, (value) => {
        this.draftName = value;
        this.refreshBar();
      }, { placeholder: "e.g. Cheap coding" });
      nameInput.setAttribute("aria-label", "Profile name");
      const descInput = textInput(this.draftDescription, (value) => {
        this.draftDescription = value;
        this.refreshBar();
      }, { placeholder: "What this profile is for" });
      const editorHost = el2("div");
      new PolicyEditor(editorHost, {
        policy: this.draftPolicy,
        suggestions: this.store.providerSuggestions(),
        onChange: (policy) => {
          this.draftPolicy = policy;
          this.refreshBar();
        }
      });
      const assigned = selected ? Object.values(config.models).filter((entry) => entry.profileId === selected.id).length : 0;
      const bar = el2("div", { className: "orm-bar-slot" });
      this.bar = bar;
      this.renderBar(bar);
      return el2("div", { className: "orm-split" }, [
        list,
        el2("div", { className: "orm-split-main" }, [
          card(this.creating ? "New profile" : selected?.name ?? "", [
            el2("div", { className: "orm-grid orm-grid-2" }, [
              field2("Name", nameInput),
              field2("Description", descInput)
            ]),
            selected ? el2("div", { className: "orm-chip-row" }, [
              badge(`${assigned} model${assigned === 1 ? "" : "s"}`, "info"),
              selected.builtin ? badge("Preset", "neutral") : null
            ]) : null,
            el2("h3", { className: "orm-subhead", text: "Settings in this profile" }),
            el2("p", { className: "orm-small orm-muted", text: "Models that use this profile follow these settings unless they have their own." }),
            disclosure("What this profile does", el2(
              "ul",
              { className: "orm-sentences" },
              describePolicy(this.draftPolicy).map((line) => el2("li", { text: line }))
            ), { open: false }),
            editorHost,
            bar
          ], {
            actions: selected && !this.creating ? [
              button2("Duplicate", () => void this.store.duplicateProfile(selected.id), "ghost", { small: true }),
              button2("Delete", () => void this.deleteProfile(selected), "ghost", { small: true })
            ] : []
          })
        ])
      ]);
    }
    bar = null;
    refreshBar() {
      if (this.bar) this.renderBar(this.bar);
    }
    renderBar(slot) {
      const nameMissing = !this.draftName.trim();
      slot.replaceChildren(
        saveBar({
          dirty: this.isDirty(),
          statusText: "All changes saved.",
          saveDisabledReason: nameMissing ? "Give the profile a name to save it." : void 0,
          saving: this.store.getState().saving,
          onSave: () => void this.save(),
          onDiscard: () => {
            if (this.creating) {
              this.creating = false;
              this.selectedId = this.store.getState().config?.config.profiles[0]?.id ?? null;
            }
            this.loadDraft();
            this.update();
          }
        })
      );
    }
    async save() {
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
        policy: this.draftPolicy
      });
      if (ok) {
        this.loadDraft();
        this.update();
      }
    }
    async deleteProfile(profile2) {
      const config = this.store.getState().config?.config;
      if (!config) return;
      const assigned = Object.values(config.models).filter((entry) => entry.profileId === profile2.id).length;
      const others = config.profiles.filter((entry) => entry.id !== profile2.id);
      if (others.length === 0) {
        await this.store.toast("error", "Keep at least one profile.");
        return;
      }
      const fallback = others.find((entry) => entry.id === config.settings.defaultProfileId) ?? others[0];
      const ok = await confirmDialog(
        `Delete \u201C${profile2.name}\u201D?`,
        assigned > 0 ? `${assigned} model${assigned === 1 ? "" : "s"} will move to \u201C${fallback.name}\u201D. Their own custom settings stay.` : "No models use this profile.",
        "Delete",
        true
      );
      if (!ok) return;
      const saved = await this.store.deleteProfile(profile2.id, fallback.id);
      if (saved) {
        this.selectedId = this.store.getState().config?.config.profiles[0]?.id ?? null;
        this.creating = false;
        this.loadDraft();
        this.update();
      }
    }
    applyLayout() {
      const config = this.store.getState().config.config;
      const profileId = this.bulkProfileId ?? config.profiles[0]?.id ?? "";
      const list = el2("div", { className: "orm-pick-list", attrs: { role: "group", "aria-label": "Models" } });
      const count2 = el2("span", { className: "orm-muted orm-small" });
      const applyButton = button2("Apply to selected", () => void apply(), "primary", { disabled: true });
      const refreshCount = () => {
        count2.textContent = `${this.bulkSelected.size} selected`;
        applyButton.disabled = this.bulkSelected.size === 0;
      };
      const rebuild = () => {
        list.replaceChildren();
        const query = this.bulkQuery.trim().toLowerCase();
        const models = (this.store.getState().catalog?.models ?? []).filter((model) => !query || `${model.name} ${model.id}`.toLowerCase().includes(query)).slice(0, 150);
        for (const model of models) {
          const entry = config.models[model.id];
          const input = el2("input", { attrs: { type: "checkbox", checked: this.bulkSelected.has(model.id) } });
          input.addEventListener("change", () => {
            if (input.checked) this.bulkSelected.add(model.id);
            else this.bulkSelected.delete(model.id);
            refreshCount();
          });
          list.append(el2("label", { className: "orm-pick-row" }, [
            input,
            el2("span", { className: "orm-pick-copy" }, [
              el2("span", { text: model.name }),
              el2("span", { className: "orm-small orm-muted orm-mono", text: model.id })
            ]),
            entry?.customized ? badge("Custom settings", "warning") : null
          ]));
        }
        if (models.length === 0) list.append(emptyState("No models match", "Try a different search."));
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
      }, { placeholder: "Search models" });
      search.type = "search";
      search.setAttribute("aria-label", "Search models");
      rebuild();
      return card("Apply a profile", [
        toolbar([
          field2("Profile", selectBox(profileId, config.profiles.map((profile2) => ({ value: profile2.id, label: profile2.name })), (value) => {
            this.bulkProfileId = value;
          })),
          el2("div", { className: "orm-grow" }, [field2("Models", search)])
        ]),
        switchBox(this.bulkReplace, (checked) => {
          this.bulkReplace = checked;
          this.update();
        }, "Replace models\u2019 own custom settings", this.bulkReplace ? "Their custom settings will be removed." : "Models with their own settings keep them."),
        list,
        el2("div", { className: "orm-row-between" }, [
          count2,
          el2("div", { className: "orm-actions" }, [
            button2("Clear", () => {
              this.bulkSelected.clear();
              rebuild();
            }, "ghost", { small: true }),
            applyButton
          ])
        ])
      ]);
    }
  };

  // src/panel/views/analytics.ts
  var LEADERS_PREVIEW = 10;
  function sparkline(values, label) {
    const width = 240;
    const height = 48;
    const points = values.map((value, index) => ({ value, index })).filter((point) => point.value !== null && Number.isFinite(point.value));
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "orm-spark");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    if (points.length >= 2) {
      const min2 = Math.min(...points.map((point) => point.value));
      const max = Math.max(...points.map((point) => point.value));
      const span = max - min2 || 1;
      const coords = points.map((point) => {
        const x = point.index / Math.max(1, values.length - 1) * width;
        const y = height - 6 - (point.value - min2) / span * (height - 12);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      const line = document.createElementNS(svgNs, "polyline");
      line.setAttribute("points", coords);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "currentColor");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      svg.append(line);
    }
    return el2("div", { className: "orm-spark-box" }, [el2("div", { className: "orm-small orm-muted", text: label }), svg]);
  }
  var AnalyticsView = class {
    constructor(store2) {
      this.store = store2;
      this.element.append(this.body);
      this.update();
    }
    element = el2("div", { className: "orm-view" });
    body = el2("div", { className: "orm-view-body" });
    providerFilter = "";
    modelQuery = "";
    showAllLeaders = false;
    leaderTableHost = el2("div");
    lastAnalytics = null;
    update() {
      const active2 = document.activeElement;
      if (active2 && this.body.contains(active2) && ["INPUT", "SELECT"].includes(active2.tagName)) return;
      const state = this.store.getState();
      this.body.replaceChildren();
      const loaded = Object.values(state.endpoints).filter(Boolean).length;
      const total = state.catalog?.models.length ?? 0;
      const progress = state.bulk ? `Loading ${state.bulk.done} of ${state.bulk.total}\u2026` : null;
      this.body.append(
        pageHeader({
          title: "Analytics",
          subtitle: "How providers compare across the models you have looked at.",
          actions: [
            state.bulk ? el2("span", { className: "orm-muted orm-small", text: progress ?? "" }) : button2(`Load more models`, () => void this.store.loadMissingEndpoints(30), "secondary", { disabled: total === 0 || loaded >= total })
          ]
        })
      );
      if (!state.catalog) {
        this.body.append(skeletonRows(4));
        return;
      }
      const analytics = this.store.analytics();
      this.lastAnalytics = analytics;
      if (!analytics || analytics.providerCount === 0) {
        this.body.append(emptyState(
          "No provider data yet",
          "Open a model, or load a batch of models to compare providers here.",
          { label: "Load 30 models", onClick: () => void this.store.loadMissingEndpoints(30) }
        ));
        return;
      }
      const custom = this.store.stats()?.custom ?? 0;
      this.body.append(
        el2("div", { className: "orm-stats" }, [
          statCard("Providers", formatCount(analytics.providerCount), `${formatCount(analytics.endpointCount)} endpoints`),
          statCard("Models with data", `${analytics.modelsWithEndpoints} of ${analytics.modelCount}`, analytics.modelsWithEndpoints < analytics.modelCount ? "Load more for a full picture" : "All loaded"),
          statCard("Custom routing", formatCount(custom), "Models with your own settings", custom > 0 ? "success" : "neutral")
        ]),
        card("Providers", [
          this.providerTable(analytics.providers),
          el2("p", { className: "orm-small orm-muted", text: "Medians across loaded endpoints. \u201CLowest price\u201D counts models where this provider is cheapest for input." })
        ]),
        this.leadersCard(analytics)
      );
      if (state.history && state.history.points.length >= 2) {
        const points = state.history.points;
        this.body.append(
          disclosure("Local history on this device", [
            el2("p", { className: "orm-small orm-muted", text: "Recorded by this extension at each catalog refresh. OpenRouter does not provide this history." }),
            el2("div", { className: "orm-spark-grid" }, [
              sparkline(points.map((point) => point.medianInputPerMillion), "Median input price"),
              sparkline(points.map((point) => point.medianOutputPerMillion), "Median output price")
            ])
          ])
        );
      }
    }
    providerTable(providers) {
      const filtered = this.providerFilter ? providers.filter((provider) => provider.slug === this.providerFilter) : providers;
      const table = el2("table", { className: "orm-table", attrs: { "aria-label": "Providers" } });
      table.append(
        el2("thead", {}, [
          el2("tr", {}, [
            el2("th", { text: "Provider", attrs: { scope: "col" } }),
            el2("th", { className: "orm-num", text: "Models", attrs: { scope: "col" } }),
            el2("th", { className: "orm-num", text: "Median input", attrs: { scope: "col" } }),
            el2("th", { className: "orm-num", text: "Median output", attrs: { scope: "col" } }),
            el2("th", { className: "orm-num", text: "Lowest price", attrs: { scope: "col" } }),
            el2("th", { className: "orm-num", text: "Fastest", attrs: { scope: "col" } }),
            el2("th", { className: "orm-num", text: "Uptime (30 min)", attrs: { scope: "col" } })
          ])
        ])
      );
      const body = el2("tbody");
      for (const provider of filtered) {
        body.append(el2("tr", {}, [
          el2("td", {}, [el2("div", { text: provider.name }), el2("div", { className: "orm-mono orm-small orm-muted", text: provider.slug })]),
          el2("td", { className: "orm-num", text: formatCount(provider.models) }),
          el2("td", { className: "orm-num", text: formatPricePerMillion(provider.medianInputPerMillion) }),
          el2("td", { className: "orm-num", text: formatPricePerMillion(provider.medianOutputPerMillion) }),
          el2("td", { className: "orm-num", text: formatCount(provider.cheapestInputWins) }),
          el2("td", { className: "orm-num", text: formatCount(provider.fastestWins) }),
          el2("td", { className: "orm-num", text: formatUptime(provider.medianUptime30m) })
        ]));
      }
      table.append(body);
      return el2("div", { className: "orm-table-wrap" }, [table]);
    }
    leadersCard(analytics) {
      this.renderLeaderTable();
      const search = textInput(this.modelQuery, (value) => {
        this.modelQuery = value;
        this.renderLeaderTable();
      }, { placeholder: "Search models" });
      search.type = "search";
      search.setAttribute("aria-label", "Search models");
      const providerSelect = selectBox(
        this.providerFilter,
        [{ value: "", label: "All providers" }, ...analytics.providers.map((provider) => ({ value: provider.slug, label: provider.name }))],
        (value) => {
          this.providerFilter = value;
          this.renderLeaderTable();
        }
      );
      return card("Best provider per model", [
        el2("div", { className: "orm-grid orm-grid-2" }, [field2("Search", search), field2("Provider", providerSelect)]),
        this.leaderTableHost
      ]);
    }
    /** Re-renders only the table, so filters never disturb the controls. */
    renderLeaderTable() {
      const analytics = this.lastAnalytics;
      const state = this.store.getState();
      if (!analytics) return;
      const query = this.modelQuery.trim().toLowerCase();
      const rows = [];
      for (const model of state.catalog?.models ?? []) {
        const leader = analytics.leaders[model.id];
        if (!leader) continue;
        const endpoints = state.endpoints[model.id]?.endpoints ?? [];
        if (this.providerFilter && !endpoints.some((endpoint) => (endpoint.tag.split("/")[0] ?? endpoint.tag) === this.providerFilter)) continue;
        if (query && !`${model.name} ${model.id}`.toLowerCase().includes(query)) continue;
        rows.push({ id: model.id, name: model.name, leader });
      }
      const visible = this.showAllLeaders ? rows : rows.slice(0, LEADERS_PREVIEW);
      const nameOf = (id, tag) => {
        if (!tag) return NA;
        const endpoint = (state.endpoints[id]?.endpoints ?? []).find((entry) => entry.tag === tag);
        return endpoint?.providerName ?? tag;
      };
      const table = el2("table", { className: "orm-table", attrs: { "aria-label": "Best provider per model" } });
      table.append(
        el2("thead", {}, [el2("tr", {}, [
          el2("th", { text: "Model", attrs: { scope: "col" } }),
          el2("th", { text: "Lowest price", attrs: { scope: "col" } }),
          el2("th", { text: "Fastest output", attrs: { scope: "col" } }),
          el2("th", { text: "Quickest start", attrs: { scope: "col" } })
        ])])
      );
      const body = el2("tbody");
      for (const row of visible) {
        body.append(el2("tr", {}, [
          el2("td", {}, [
            el2("button", {
              className: "orm-link-strong",
              text: row.name,
              attrs: { type: "button" },
              onClick: () => this.store.navigate({ view: "model", modelId: row.id, tab: "providers" })
            })
          ]),
          el2("td", { text: nameOf(row.id, row.leader.cheapestInput) }),
          el2("td", { text: nameOf(row.id, row.leader.fastestThroughput) }),
          el2("td", { text: nameOf(row.id, row.leader.lowestLatency) })
        ]));
      }
      table.append(body);
      const toggle = rows.length > LEADERS_PREVIEW ? [button2(this.showAllLeaders ? "Show fewer" : `Show all ${rows.length}`, () => {
        this.showAllLeaders = !this.showAllLeaders;
        this.renderLeaderTable();
      }, "ghost", { small: true })] : [];
      this.leaderTableHost.replaceChildren(
        rows.length === 0 ? el2("p", { className: "orm-muted", text: "No loaded model matches." }) : el2("div", { className: "orm-table-wrap" }, [table]),
        ...toggle
      );
    }
  };

  // src/shared/types.ts
  var CONFIG_SCHEMA_VERSION = 1;

  // src/shared/config.ts
  function iso(now) {
    return new Date(now).toISOString();
  }
  function profile(id, name, description, policy, now) {
    return {
      id,
      name,
      description,
      builtin: true,
      policy: sanitizePolicy({ ...emptyPolicy(), ...policy }),
      createdAt: iso(now),
      updatedAt: iso(now)
    };
  }
  function builtinProfiles(now = Date.now()) {
    return [
      profile("cheapest", "Cheapest", "Lowest published price first.", { sort: "price" }, now),
      profile("fastest", "Fastest", "Highest measured throughput first.", { sort: "throughput" }, now),
      profile("low-latency", "Low latency", "Lowest time to first token first.", { sort: "latency" }, now),
      profile(
        "balanced",
        "Balanced",
        "Cheapest provider that still reports at least 30 tokens/sec at the median.",
        { sort: "price", minThroughputTps: 30, minThroughputPercentile: "p50" },
        now
      ),
      profile("custom", "Custom", "Start from OpenRouter defaults and configure every knob.", {}, now)
    ];
  }
  function defaultSettings() {
    return { enabled: true, defaultProfileId: "balanced", providerIds: ["openrouter"] };
  }
  function createDefaultConfig(now = Date.now()) {
    return {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      revision: 0,
      updatedAt: iso(now),
      settings: defaultSettings(),
      profiles: builtinProfiles(now),
      models: {},
      aliases: {}
    };
  }
  var MODEL_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/;
  var PROFILE_ID = /^[a-z0-9][a-z0-9._-]*$/;
  var PROVIDER_ID = /^[a-z0-9][a-z0-9._-]*$/;
  function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }
  function sanitizeOverride(input) {
    const raw = asRecord(input);
    if (!raw) return {};
    const out = {};
    for (const key of OPTIONAL_POLICY_KEYS) {
      if (raw[key] === null) out[key] = null;
    }
    if (raw.mode === "all" || raw.mode === "only" || raw.mode === "exclude") out.mode = raw.mode;
    if (raw.providers !== void 0) out.providers = cleanProviders(raw.providers);
    if (raw.order !== void 0) out.order = cleanProviders(raw.order);
    if (typeof raw.allowFallbacks === "boolean") out.allowFallbacks = raw.allowFallbacks;
    for (const key of ["maxPromptPerMillion", "maxCompletionPerMillion", "maxImagePrice", "maxRequestPrice"]) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[key] = value;
    }
    if (typeof raw.sort === "string" && SORT_BYS.includes(raw.sort)) {
      out.sort = raw.sort;
    }
    if (raw.partition === "model" || raw.partition === "none") out.partition = raw.partition;
    if (typeof raw.maxLatencySeconds === "number" && Number.isFinite(raw.maxLatencySeconds) && raw.maxLatencySeconds > 0) {
      out.maxLatencySeconds = raw.maxLatencySeconds;
      out.maxLatencyPercentile = typeof raw.maxLatencyPercentile === "string" && PERCENTILES.includes(raw.maxLatencyPercentile) ? raw.maxLatencyPercentile : "p50";
    }
    if (typeof raw.minThroughputTps === "number" && Number.isFinite(raw.minThroughputTps) && raw.minThroughputTps > 0) {
      out.minThroughputTps = raw.minThroughputTps;
      out.minThroughputPercentile = typeof raw.minThroughputPercentile === "string" && PERCENTILES.includes(raw.minThroughputPercentile) ? raw.minThroughputPercentile : "p50";
    }
    if (Array.isArray(raw.quantizations)) {
      out.quantizations = cleanProviders(raw.quantizations);
    }
    if (raw.dataCollection === "allow" || raw.dataCollection === "deny") out.dataCollection = raw.dataCollection;
    if (raw.zdr === true) out.zdr = true;
    if (raw.requireParameters === true) out.requireParameters = true;
    if (raw.enforceDistillableText === true) out.enforceDistillableText = true;
    if (typeof raw.localMaxCacheReadPerMillion === "number" && Number.isFinite(raw.localMaxCacheReadPerMillion) && raw.localMaxCacheReadPerMillion >= 0) {
      out.localMaxCacheReadPerMillion = raw.localMaxCacheReadPerMillion;
    }
    return out;
  }
  function sanitizeProfile(input, now) {
    const raw = asRecord(input);
    if (!raw) return null;
    const id = typeof raw.id === "string" ? raw.id.trim().toLowerCase() : "";
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "";
    if (!PROFILE_ID.test(id) || !name) return null;
    return {
      id,
      name,
      description: typeof raw.description === "string" ? raw.description.trim().slice(0, 240) : "",
      builtin: raw.builtin === true,
      policy: sanitizePolicy(raw.policy),
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : iso(now),
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : iso(now)
    };
  }
  function invalid(message) {
    return {
      ok: false,
      config: null,
      issues: [{ field: "file", severity: "error", message }],
      readOnly: false
    };
  }
  function parseConfig(text, now = Date.now()) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return invalid("The configuration file is not valid JSON.");
    }
    const record3 = asRecord(raw);
    if (!record3) return invalid("The configuration file must contain a JSON object.");
    const version = typeof record3.schemaVersion === "number" ? record3.schemaVersion : 0;
    if (version > CONFIG_SCHEMA_VERSION) {
      return {
        ok: false,
        config: null,
        readOnly: true,
        issues: [
          {
            field: "schemaVersion",
            severity: "error",
            message: `This file uses schema ${version}; this extension understands ${CONFIG_SCHEMA_VERSION}. Update the extension instead of overwriting it.`
          }
        ]
      };
    }
    const issues = [];
    let migratedFrom;
    let source = record3;
    if (version < CONFIG_SCHEMA_VERSION) {
      migratedFrom = version;
      source = migrateV0(record3, now);
      issues.push({
        field: "schemaVersion",
        severity: "warning",
        message: `Migrated the configuration from schema ${version} to ${CONFIG_SCHEMA_VERSION}.`
      });
    }
    const settingsRaw = asRecord(source.settings) ?? {};
    const providerIds = Array.isArray(settingsRaw.providerIds) ? settingsRaw.providerIds.map((value) => typeof value === "string" ? value.trim().toLowerCase() : "").filter((value) => PROVIDER_ID.test(value)) : [];
    const settings = {
      enabled: settingsRaw.enabled !== false,
      defaultProfileId: typeof settingsRaw.defaultProfileId === "string" ? settingsRaw.defaultProfileId : null,
      providerIds: providerIds.length > 0 ? [...new Set(providerIds)] : ["openrouter"]
    };
    const profiles = [];
    const profileIds = /* @__PURE__ */ new Set();
    if (Array.isArray(source.profiles)) {
      for (const entry of source.profiles) {
        const parsed = sanitizeProfile(entry, now);
        if (!parsed) {
          issues.push({ field: "profiles", severity: "warning", message: "Dropped a profile with an invalid id or name." });
          continue;
        }
        if (profileIds.has(parsed.id)) continue;
        profileIds.add(parsed.id);
        profiles.push(parsed);
      }
    }
    if (profiles.length === 0) profiles.push(...builtinProfiles(now));
    if (settings.defaultProfileId && !profileIds.has(settings.defaultProfileId)) {
      issues.push({
        field: "settings.defaultProfileId",
        severity: "warning",
        message: "The default profile no longer exists; no default is selected."
      });
      settings.defaultProfileId = null;
    }
    if (!settings.defaultProfileId) settings.defaultProfileId = profiles[0]?.id ?? null;
    const models = {};
    const modelsRaw = asRecord(source.models);
    if (modelsRaw) {
      for (const [key, value] of Object.entries(modelsRaw)) {
        const modelKey = key.trim();
        if (!MODEL_KEY.test(modelKey)) {
          issues.push({ field: "models", severity: "warning", message: `Dropped model entry "${key}".` });
          continue;
        }
        const entry = asRecord(value);
        if (!entry) continue;
        let profileId = typeof entry.profileId === "string" ? entry.profileId : null;
        if (profileId && !profileIds.has(profileId)) {
          issues.push({
            field: `models.${modelKey}.profileId`,
            severity: "warning",
            message: `Model "${modelKey}" pointed at missing profile "${profileId}"; its overrides remain.`
          });
          profileId = null;
        }
        models[modelKey] = {
          profileId,
          overrides: sanitizeOverride(entry.overrides),
          customized: entry.customized !== false,
          updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : iso(now)
        };
      }
    }
    const aliases = {};
    const aliasesRaw = asRecord(source.aliases);
    if (aliasesRaw) {
      for (const [key, value] of Object.entries(aliasesRaw)) {
        if (typeof value !== "string") continue;
        const from = key.trim();
        const to = value.trim();
        if (!from || !to || from === to || !MODEL_KEY.test(from) || !MODEL_KEY.test(to)) continue;
        aliases[from] = to;
      }
    }
    const revision = typeof source.revision === "number" && Number.isFinite(source.revision) && source.revision >= 0 ? Math.floor(source.revision) : 0;
    const config = {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      revision,
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : iso(now),
      settings,
      profiles,
      models,
      aliases
    };
    return { ok: true, config, issues, readOnly: false, ...migratedFrom !== void 0 ? { migratedFrom } : {} };
  }
  function migrateV0(record3, _now) {
    return { ...record3, schemaVersion: CONFIG_SCHEMA_VERSION };
  }
  function serializeConfig(config) {
    return `${JSON.stringify(config, null, 2)}
`;
  }
  function fingerprint(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }
  function findProfile(config, id) {
    if (!id) return null;
    return config.profiles.find((profile2) => profile2.id === id) ?? null;
  }
  function effectivePolicy(config, routingKey) {
    const entry = config.models[routingKey];
    if (!entry) return null;
    const profile2 = findProfile(config, entry.profileId);
    const base = profile2 ? profile2.policy : emptyPolicy();
    return { policy: mergePolicy(base, entry.overrides), profileId: entry.profileId };
  }
  function countCustomModels(config) {
    return Object.keys(config.models).length;
  }
  function countExcludedProviders(config) {
    const excluded = /* @__PURE__ */ new Set();
    for (const key of Object.keys(config.models)) {
      const resolved = effectivePolicy(config, key);
      if (!resolved || resolved.policy.mode !== "exclude") continue;
      for (const slug of resolved.policy.providers) excluded.add(slug);
    }
    return excluded.size;
  }

  // src/shared/storage.ts
  var CONFIG_DIR = "~/.config/openrouter-manager";
  var CONFIG_PATH = `${CONFIG_DIR}/routing.json`;
  var STATUS_PATH = `${CONFIG_DIR}/runtime-status.json`;
  var CACHE_DIR = `${CONFIG_DIR}/cache`;
  var MODELS_CACHE_PATH = `${CACHE_DIR}/models.json`;
  var HISTORY_PATH = `${CACHE_DIR}/history.json`;
  function endpointCachePath(modelId) {
    return `${CACHE_DIR}/endpoints/${fingerprint(modelId)}.json`;
  }
  function record2(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : void 0;
  }
  function nullableNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function parseStatus(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return null;
    }
    const data = record2(raw);
    if (!data || typeof data.pluginVersion !== "string" || typeof data.writtenAt !== "string") return null;
    const last = record2(data.lastApplied);
    return {
      pluginVersion: data.pluginVersion,
      writtenAt: data.writtenAt,
      ...typeof data.openCodeVersion === "string" ? { openCodeVersion: data.openCodeVersion } : {},
      ...finite(data.configRevision) !== void 0 ? { configRevision: finite(data.configRevision) } : {},
      ...typeof data.configUpdatedAt === "string" ? { configUpdatedAt: data.configUpdatedAt } : {},
      ...typeof data.configError === "string" ? { configError: data.configError } : {},
      appliedCount: finite(data.appliedCount) ?? 0,
      ...last ? {
        lastApplied: {
          at: typeof last.at === "string" ? last.at : "",
          ...typeof last.requestKind === "string" ? { requestKind: last.requestKind } : {},
          providerID: typeof last.providerID === "string" ? last.providerID : "",
          modelID: typeof last.modelID === "string" ? last.modelID : "",
          routingKey: typeof last.routingKey === "string" ? last.routingKey : "",
          profileId: typeof last.profileId === "string" ? last.profileId : null,
          providerKeys: Array.isArray(last.providerKeys) ? last.providerKeys.filter((key) => typeof key === "string") : [],
          provider: last.provider
        }
      } : {}
    };
  }
  function parseModelsCache(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return null;
    }
    const data = record2(raw);
    if (!data || data.schemaVersion !== 1 || typeof data.fetchedAt !== "string" || !Array.isArray(data.models)) {
      return null;
    }
    return data;
  }
  function parseEndpointsCache(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return null;
    }
    const data = record2(raw);
    if (!data || data.schemaVersion !== 1 || typeof data.fetchedAt !== "string" || !Array.isArray(data.endpoints)) {
      return null;
    }
    return data;
  }
  function parseHistory(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return null;
    }
    const data = record2(raw);
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.points)) return null;
    const points = [];
    for (const point of data.points) {
      const entry = record2(point);
      if (!entry || typeof entry.at !== "string") continue;
      points.push({
        at: entry.at,
        models: finite(entry.models) ?? 0,
        ...finite(entry.providers) !== void 0 ? { providers: finite(entry.providers) } : {},
        medianInputPerMillion: nullableNumber(entry.medianInputPerMillion),
        medianOutputPerMillion: nullableNumber(entry.medianOutputPerMillion)
      });
    }
    return { schemaVersion: 1, points };
  }

  // src/panel/views/settings.ts
  var SettingsView = class {
    constructor(store2) {
      this.store = store2;
      this.element.append(this.body);
      this.update();
    }
    element = el2("div", { className: "orm-view" });
    body = el2("div", { className: "orm-view-body" });
    providerDraft = null;
    update() {
      const active2 = document.activeElement;
      if (active2 && this.body.contains(active2) && ["INPUT", "SELECT"].includes(active2.tagName)) return;
      const state = this.store.getState();
      const config = state.config?.config;
      const connected = state.connection?.connected ?? null;
      this.body.replaceChildren();
      this.body.append(
        pageHeader({ title: "Settings", subtitle: "Connection, data, and how routing is applied." })
      );
      if (state.configError) {
        this.body.append(banner({
          tone: "error",
          title: state.configError.readOnly ? "Saved settings are from a newer version" : "Saved settings could not be read",
          body: state.configError.readOnly ? "Update OpenRouter Manager. Nothing is overwritten." : "Reset to start fresh. A backup of the current file is kept.",
          ...state.configError.readOnly ? {} : { action: { label: "Reset with backup", onClick: () => void this.reset() } }
        }));
      }
      this.body.append(
        card("OpenRouter connection", [
          el2("div", { className: "orm-row-between" }, [
            el2("span", { className: "orm-body", text: connected ? "Connected" : connected === false ? "Not connected" : "Checking\u2026" }),
            connected === null ? badge("Checking", "neutral") : badge(connected ? "Connected" : "Not connected", connected ? "success" : "warning")
          ]),
          el2("p", {
            className: "orm-small orm-muted",
            text: connected ? "Latency and throughput are available. Your key is kept by OpenChamber and is never shown here." : "Add your key in OpenChamber \u2192 Settings \u2192 Integrations \u2192 OpenRouter. It is never shown here."
          }),
          el2("div", { className: "orm-actions" }, [
            button2("Test connection", () => void this.store.testConnection(), "outline", { disabled: state.keyLoading })
          ]),
          state.keyError ? banner({ tone: "error", title: "Connection test failed", body: state.keyError }) : null,
          state.keyInfo ? el2("div", { className: "orm-stack-tight" }, [
            kvRow("Key", state.keyInfo.label ?? "Connected"),
            state.keyInfo.usage !== null ? kvRow("Used", `$${state.keyInfo.usage.toFixed(2)}`) : null
          ]) : null
        ])
      );
      this.body.append(
        card("Model data", [
          el2("div", { className: "orm-stack-tight" }, [
            kvRow("Model list", state.catalog ? `${state.catalog.models.length} models \xB7 updated ${formatRelativeTime(state.catalog.fetchedAt)}` : "Not loaded yet"),
            kvRow("Provider data loaded", `${this.store.cacheSummary().endpointModels} models`)
          ]),
          state.catalog?.stale ? banner({ tone: "warning", title: "Showing saved data", body: state.catalog.error ?? "The last refresh failed." }) : null,
          el2("div", { className: "orm-actions" }, [
            button2("Refresh model list", () => void this.store.refreshCatalog(true), "secondary"),
            button2("Refresh loaded providers", () => {
              for (const id of Object.keys(state.endpoints)) void this.store.loadEndpoints(id, true);
            }, "outline")
          ])
        ], { subtitle: "Saved on the OpenChamber server for speed. Refresh to get the latest prices." })
      );
      if (config) {
        const providerInput = textInput(this.providerDraft ?? config.settings.providerIds.join(", "), (next) => {
          this.providerDraft = next;
        }, { placeholder: "openrouter" });
        providerInput.setAttribute("aria-label", "Provider IDs");
        this.body.append(
          card("Routing", [
            switchBox(
              config.settings.enabled,
              (checked) => void this.store.setSetting("enabled", checked, checked ? "Routing is on" : "Routing is off. Your settings are kept."),
              "Apply my routing settings",
              config.settings.enabled ? "Turn off to use OpenRouter\u2019s defaults everywhere. Your settings are kept." : "Routing is off. Every model uses OpenRouter\u2019s defaults."
            ),
            field2(
              "Default profile for new models",
              selectBox(
                config.settings.defaultProfileId ?? "",
                [{ value: "", label: "None" }, ...config.profiles.map((profile2) => ({ value: profile2.id, label: profile2.name }))],
                (next) => void this.store.setSetting("defaultProfileId", next || null, "Default profile saved")
              )
            ),
            disclosure("Advanced", [
              field2("OpenRouter provider IDs", providerInput, "Usually \u201Copenrouter\u201D. Change only if you use a custom provider ID."),
              el2("div", { className: "orm-actions" }, [
                button2("Save", () => {
                  const ids = (this.providerDraft ?? config.settings.providerIds.join(", ")).split(",").map((id) => id.trim().toLowerCase()).filter(Boolean);
                  this.providerDraft = null;
                  void this.store.setSetting("providerIds", ids.length > 0 ? [...new Set(ids)] : ["openrouter"], "Saved");
                }, "secondary", { small: true })
              ])
            ])
          ])
        );
        this.body.append(this.advanced(config));
      }
      this.body.append(el2("p", { className: "orm-footer-note", text: `${EXTENSION_NAME} ${EXTENSION_VERSION}` }));
    }
    advanced(config) {
      const state = this.store.getState();
      const status = state.status;
      const runtime = status ? [
        kvRow("Plugin version", status.pluginVersion),
        kvRow("Last reported", formatRelativeTime(status.writtenAt)),
        kvRow("Requests routed", String(status.appliedCount)),
        status.configError ? kvRow("Problem", status.configError) : null
      ] : [el2("p", { className: "orm-small orm-muted", text: "Not reported yet. It appears after OpenCode loads the plugin." })];
      return card("Advanced", [
        disclosure("Saved settings file", [
          kvRow("Location", CONFIG_PATH),
          kvRow("Revision", String(config.revision)),
          kvRow("Last saved", formatDateTime(config.updatedAt)),
          el2("div", { className: "orm-actions" }, [
            button2("Reload from disk", () => void this.store.reloadConfig(), "secondary", { small: true }),
            button2("Copy file contents", () => {
              const text = this.store.getState().config?.text ?? "";
              void this.store.copy(text, "Copied");
            }, "ghost", { small: true })
          ])
        ]),
        disclosure("Runtime status", runtime.filter((node) => node !== null)),
        disclosure("Reset", [
          el2("p", { className: "orm-small orm-muted", text: "Removes all model routing and restores the built-in profiles. A backup of the current file is kept." }),
          el2("div", { className: "orm-actions" }, [
            button2("Reset everything", () => void this.reset(), "danger", { small: true, disabled: state.configError?.readOnly === true })
          ])
        ])
      ]);
    }
    async reset() {
      const ok = await confirmDialog(
        "Reset all routing?",
        "Every model goes back to OpenRouter\u2019s defaults. A backup of your current settings is kept next to the file.",
        "Reset",
        true
      );
      if (!ok) return;
      await this.store.resetConfig();
      this.update();
    }
  };

  // src/panel/app.ts
  var ICONS = {
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    models: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3 21 7.5v9L12 21 3 16.5v-9L12 3Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>',
    profiles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>'
  };
  function icon2(name) {
    return el2("span", { className: "orm-nav-icon", html: ICONS[name] ?? "" });
  }
  function routeKey(route) {
    if (route.view === "model") return `model:${route.modelId}:${route.tab}`;
    if (route.view === "profiles") return `profiles:${route.profileId ?? ""}`;
    return route.view;
  }
  var App = class {
    constructor(store2) {
      this.store = store2;
      this.buildShell();
      this.store.subscribe(() => this.update());
      window.addEventListener("focus", () => {
        void this.store.checkExternalChange();
      });
      this.update();
    }
    element = el2("div", { className: "orm-shell" });
    navHost = el2("nav", { className: "orm-nav", attrs: { "aria-label": "Sections" } });
    viewHost = el2("main", { className: "orm-main" });
    bannerHost = el2("div", { className: "orm-global-banners" });
    connectionHost = el2("div", { className: "orm-nav-foot" });
    navButtons = /* @__PURE__ */ new Map();
    currentKey = "";
    current = null;
    updating = false;
    mount(root2) {
      root2.replaceChildren(this.element);
    }
    buildShell() {
      const brand = el2("div", { className: "orm-brand" }, [
        el2("div", { className: "orm-brand-mark", attrs: { "aria-hidden": "true" }, html: ICONS.analytics }),
        el2("div", {}, [
          el2("div", { className: "orm-brand-name", text: EXTENSION_NAME }),
          el2("div", { className: "orm-brand-version", text: `v${EXTENSION_VERSION}` })
        ])
      ]);
      const items = [
        { key: "overview", label: "Overview" },
        { key: "models", label: "Models" },
        { key: "profiles", label: "Profiles" },
        { key: "analytics", label: "Analytics" },
        { key: "settings", label: "Settings" }
      ];
      for (const item of items) {
        const badgeHost = el2("span", { className: "orm-nav-count" });
        const node = el2("button", {
          className: "orm-nav-item",
          attrs: { type: "button" },
          onClick: () => {
            if (item.key === "profiles") this.store.navigate({ view: "profiles" });
            else this.store.navigate({ view: item.key });
          }
        }, [icon2(item.key), el2("span", { text: item.label }), badgeHost]);
        this.navButtons.set(item.key, { node, badgeHost });
        this.navHost.append(node);
      }
      const aside = el2("aside", { className: "orm-sidebar" }, [brand, this.navHost, this.connectionHost]);
      this.viewHost.append(this.bannerHost);
      this.element.append(aside, this.viewHost);
    }
    update() {
      if (this.updating) return;
      this.updating = true;
      try {
        this.paint();
      } finally {
        this.updating = false;
      }
    }
    paint() {
      const state = this.store.getState();
      const route = state.route;
      const key = routeKey(route);
      for (const [name, entry] of this.navButtons) {
        const active2 = name === route.view || route.view === "model" && name === "models";
        entry.node.classList.toggle("orm-nav-active", active2);
        entry.node.setAttribute("aria-current", active2 ? "page" : "false");
        let count2 = "";
        if (name === "models" && state.catalog) count2 = String(state.catalog.models.length);
        if (name === "profiles" && state.config) count2 = String(state.config.config.profiles.length);
        entry.badgeHost.textContent = count2;
      }
      this.connectionHost.replaceChildren(
        el2("div", { className: "orm-nav-connection" }, [
          el2("span", { className: `orm-dot ${state.connection?.connected ? "orm-dot-ok" : "orm-dot-off"}` }),
          el2("span", { text: state.connection?.connected ? "Connected to OpenRouter" : "Not connected" })
        ])
      );
      this.renderBanners(state);
      this.renderRoute(key, route);
    }
    renderBanners(state) {
      this.bannerHost.replaceChildren();
      if (state.conflict) {
        this.bannerHost.append(
          banner({
            tone: "warning",
            title: "Configuration changed on disk",
            body: "This panel has unsaved assumptions about the file. Reload it before saving anything.",
            action: { label: "Reload", onClick: () => void this.store.reloadConfig() }
          })
        );
      }
      if (state.configError && state.config) {
        this.bannerHost.append(
          banner({
            tone: "error",
            title: "Configuration could not be re-read",
            body: state.configError.message,
            action: { label: "Settings", onClick: () => this.store.navigate({ view: "settings" }) }
          })
        );
      }
      if (this.store.getState().catalogLoading) {
        this.bannerHost.append(
          el2("div", { className: "orm-loading-line" }, [
            el2("span", { className: "orm-spinner-ring orm-spinner-inline" }),
            el2("span", { className: "orm-muted orm-small", text: "Syncing with OpenRouter\u2026" })
          ])
        );
      }
    }
    renderRoute(key, route) {
      if (key !== this.currentKey) {
        this.current?.element.remove();
        this.current = this.createView(route);
        this.currentKey = key;
        this.viewHost.append(this.current.element);
        window.scrollTo({ top: 0 });
        return;
      }
      this.current?.update();
    }
    createView(route) {
      const state = this.store.getState();
      if (state.configError && !state.config && route.view !== "settings") {
        return {
          element: el2("div", { className: "orm-view orm-recovery" }, [
            el2("h1", { text: "OpenRouter Manager needs attention" }),
            el2("p", { className: "orm-muted", text: state.configError.message }),
            el2("p", {
              className: "orm-muted",
              text: state.configError.readOnly ? "The configuration was written by a newer version. Update the extension; resetting would destroy data this version does not understand." : "The file can be repaired in Settings: reload it or reset with a timestamped backup."
            }),
            badge("Configuration not loaded", "error"),
            el2("div", { className: "orm-actions" }, [
              el2("button", {
                className: "orm-btn orm-btn-primary",
                attrs: { type: "button" },
                text: "Open settings",
                onClick: () => this.store.navigate({ view: "settings" })
              })
            ])
          ]),
          update: () => {
          }
        };
      }
      switch (route.view) {
        case "overview":
          return new OverviewView(this.store);
        case "models":
          return new ModelsView(this.store);
        case "model":
          return new ModelDetailView(this.store, route.modelId, route.tab);
        case "profiles":
          return new ProfilesView(this.store);
        case "analytics":
          return new AnalyticsView(this.store);
        case "settings":
          return new SettingsView(this.store);
        default:
          return new OverviewView(this.store);
      }
    }
  };

  // src/shared/analytics.ts
  function median(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a2, b2) => a2 - b2);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle] ?? null;
    const a = sorted[middle - 1];
    const b = sorted[middle];
    return a === void 0 || b === void 0 ? null : (a + b) / 2;
  }
  function min(values) {
    let best = null;
    for (const value of values) {
      if (value === null || !Number.isFinite(value)) continue;
      if (best === null || value < best) best = value;
    }
    return best;
  }
  function providerSlug(endpoint) {
    return endpoint.tag.split("/")[0] ?? endpoint.tag;
  }
  function buildAnalytics(models, endpointsByModel) {
    const byProvider = /* @__PURE__ */ new Map();
    const leaders = {};
    let endpointCount = 0;
    let modelsWithEndpoints = 0;
    for (const model of models) {
      const endpoints = endpointsByModel[model.id];
      if (!endpoints || endpoints.length === 0) continue;
      modelsWithEndpoints++;
      endpointCount += endpoints.length;
      let cheapestInput = null;
      let cheapestOutput = null;
      let bestCache = null;
      let fastest = null;
      let lowestLatency = null;
      for (const endpoint of endpoints) {
        const slug = providerSlug(endpoint);
        const entry = byProvider.get(slug) ?? { name: endpoint.providerName, endpoints: [], models: /* @__PURE__ */ new Set() };
        entry.endpoints.push(endpoint);
        entry.models.add(model.id);
        byProvider.set(slug, entry);
        if (endpoint.inputPerMillion !== null && (cheapestInput === null || endpoint.inputPerMillion < (cheapestInput.inputPerMillion ?? Infinity))) {
          cheapestInput = endpoint;
        }
        if (endpoint.outputPerMillion !== null && (cheapestOutput === null || endpoint.outputPerMillion < (cheapestOutput.outputPerMillion ?? Infinity))) {
          cheapestOutput = endpoint;
        }
        if (endpoint.cacheReadPerMillion !== null && (bestCache === null || endpoint.cacheReadPerMillion < (bestCache.cacheReadPerMillion ?? Infinity))) {
          bestCache = endpoint;
        }
        const throughput = endpoint.throughputTps?.p50;
        if (throughput !== void 0 && (fastest === null || throughput > (fastest.throughputTps?.p50 ?? -Infinity))) {
          fastest = endpoint;
        }
        const latency = endpoint.latencyMs?.p50;
        if (latency !== void 0 && (lowestLatency === null || latency < (lowestLatency.latencyMs?.p50 ?? Infinity))) {
          lowestLatency = endpoint;
        }
      }
      leaders[model.id] = {
        cheapestInput: cheapestInput?.tag ?? null,
        cheapestOutput: cheapestOutput?.tag ?? null,
        bestCacheRead: bestCache?.tag ?? null,
        fastestThroughput: fastest?.tag ?? null,
        lowestLatency: lowestLatency?.tag ?? null
      };
    }
    const providers = [];
    for (const [slug, entry] of byProvider) {
      const winCount = (tag) => tag && providerSlugOf(tag) === slug ? 1 : 0;
      let cheapestInputWins = 0;
      let cheapestOutputWins = 0;
      let bestCacheWins = 0;
      let fastestWins = 0;
      let lowestLatencyWins = 0;
      for (const leader of Object.values(leaders)) {
        cheapestInputWins += winCount(leader.cheapestInput);
        cheapestOutputWins += winCount(leader.cheapestOutput);
        bestCacheWins += winCount(leader.bestCacheRead);
        fastestWins += winCount(leader.fastestThroughput);
        lowestLatencyWins += winCount(leader.lowestLatency);
      }
      providers.push({
        slug,
        name: entry.name,
        endpoints: entry.endpoints.length,
        models: entry.models.size,
        availableEndpoints: entry.endpoints.filter((endpoint) => endpoint.available).length,
        medianInputPerMillion: median(
          entry.endpoints.flatMap((endpoint) => endpoint.inputPerMillion === null ? [] : [endpoint.inputPerMillion])
        ),
        medianOutputPerMillion: median(
          entry.endpoints.flatMap((endpoint) => endpoint.outputPerMillion === null ? [] : [endpoint.outputPerMillion])
        ),
        bestInputPerMillion: min(entry.endpoints.map((endpoint) => endpoint.inputPerMillion)),
        bestOutputPerMillion: min(entry.endpoints.map((endpoint) => endpoint.outputPerMillion)),
        bestCacheReadPerMillion: min(entry.endpoints.map((endpoint) => endpoint.cacheReadPerMillion)),
        cheapestInputWins,
        cheapestOutputWins,
        bestCacheWins,
        fastestWins,
        lowestLatencyWins,
        medianUptime30m: median(
          entry.endpoints.flatMap((endpoint) => endpoint.uptime30m === null ? [] : [endpoint.uptime30m])
        )
      });
    }
    providers.sort((a, b) => b.models - a.models || a.name.localeCompare(b.name));
    return {
      modelCount: models.length,
      modelsWithEndpoints,
      endpointCount,
      providerCount: providers.length,
      providers,
      leaders
    };
  }
  function providerSlugOf(tag) {
    return tag.split("/")[0] ?? tag;
  }
  function buildHistoryPoint(models, endpointsByModel, now = Date.now()) {
    const inputs = models.flatMap((model) => model.inputPerMillion === null ? [] : [model.inputPerMillion]);
    const outputs = models.flatMap((model) => model.outputPerMillion === null ? [] : [model.outputPerMillion]);
    const providers = /* @__PURE__ */ new Set();
    for (const endpoints of Object.values(endpointsByModel)) {
      for (const endpoint of endpoints) providers.add(providerSlug(endpoint));
    }
    return {
      at: new Date(now).toISOString(),
      models: models.length,
      ...providers.size > 0 ? { providers: providers.size } : {},
      medianInputPerMillion: median(inputs),
      medianOutputPerMillion: median(outputs)
    };
  }

  // src/data/host.ts
  function hostErrorCode(error) {
    if (!error || typeof error !== "object") return void 0;
    const code = error.code;
    return typeof code === "string" ? code : void 0;
  }
  function errorMessage(error) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unexpected error";
  }

  // src/data/client.ts
  var OpenRouterError = class extends Error {
    kind;
    status;
    constructor(kind, message, status) {
      super(message);
      this.name = "OpenRouterError";
      this.kind = kind;
      if (status !== void 0) this.status = status;
    }
  };
  function apiMessage(body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.error?.message === "string") return parsed.error.message;
      if (parsed && typeof parsed.message === "string") return parsed.message;
    } catch {
    }
    return null;
  }
  var OpenRouterClient = class {
    constructor(host2) {
      this.host = host2;
    }
    async get(path, query) {
      try {
        return await this.host.request({ method: "GET", path, ...query ? { query } : {} });
      } catch (error) {
        const code = hostErrorCode(error);
        if (code === "DISCONNECTED") {
          throw new OpenRouterError(
            "disconnected",
            "OpenRouter is not connected. Add an API key in Settings \u2192 Integrations \u2192 OpenRouter."
          );
        }
        throw new OpenRouterError("host", `OpenChamber could not make the request (${code ?? errorMessage(error)}).`);
      }
    }
    async getJson(path, query) {
      const result = await this.get(path, query);
      if (result.status === 401 || result.status === 403) {
        throw new OpenRouterError(
          "auth",
          "OpenRouter rejected the API key. Reconnect it in Settings \u2192 Integrations \u2192 OpenRouter.",
          result.status
        );
      }
      if (result.status === 429) {
        throw new OpenRouterError(
          "rate-limit",
          "OpenRouter rate-limited this request. Wait a moment, then refresh again.",
          429
        );
      }
      if (result.status < 200 || result.status >= 300) {
        const detail = apiMessage(result.body);
        throw new OpenRouterError(
          "http",
          `OpenRouter returned ${result.status}${detail ? `: ${detail}` : "."}`,
          result.status
        );
      }
      try {
        return JSON.parse(result.body);
      } catch {
        throw new OpenRouterError("invalid", "OpenRouter returned a response this extension could not read.");
      }
    }
    async listModels() {
      const payload = await this.getJson("/api/v1/models");
      const models = normalizeModels(payload);
      if (models.length === 0) {
        throw new OpenRouterError("invalid", "OpenRouter returned an empty model catalog.");
      }
      return models;
    }
    async listEndpoints(model) {
      const payload = await this.getJson(endpointsPath(model));
      const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return normalizeEndpoints(payload, updatedAt);
    }
    async keyInfo() {
      const payload = await this.getJson("/api/v1/key");
      const data = payload.data ?? {};
      return {
        label: typeof data.label === "string" ? data.label : null,
        usage: typeof data.usage === "number" ? data.usage : null,
        limit: typeof data.limit === "number" ? data.limit : null,
        isFreeTier: typeof data.is_free_tier === "boolean" ? data.is_free_tier : null,
        rateLimit: data.rate_limit ?? null
      };
    }
  };

  // src/data/files.ts
  async function readText(host2, path) {
    try {
      const result = await host2.readFile(path);
      return result.content;
    } catch (error) {
      const code = hostErrorCode(error);
      if (code === "NOT_FOUND") return null;
      throw error;
    }
  }
  async function writeText(host2, path, content) {
    await host2.writeFile(path, content);
  }

  // src/data/repository.ts
  var MODEL_TTL_MS = 6 * 60 * 60 * 1e3;
  var ENDPOINT_TTL_MS = 10 * 60 * 1e3;
  var HISTORY_LIMIT = 120;
  var HISTORY_MIN_GAP_MS = 60 * 60 * 1e3;
  var ConfigFileError = class extends Error {
    issues;
    rawText;
    readOnly;
    constructor(message, issues, rawText, readOnly = false) {
      super(message);
      this.name = "ConfigFileError";
      this.issues = issues;
      this.rawText = rawText;
      this.readOnly = readOnly;
    }
  };
  var ConfigConflictError = class extends Error {
    currentText;
    constructor(currentText) {
      super("The configuration file changed outside this panel.");
      this.name = "ConfigConflictError";
      this.currentText = currentText;
    }
  };
  var Repository = class {
    constructor(host2, now = Date.now) {
      this.host = host2;
      this.now = now;
      this.client = new OpenRouterClient(host2);
    }
    client;
    async readConfigText() {
      return readText(this.host, CONFIG_PATH);
    }
    async loadConfig() {
      const text = await this.readConfigText();
      if (text === null) {
        const config = createDefaultConfig(this.now());
        const created = serializeConfig(config);
        await writeText(this.host, CONFIG_PATH, created);
        return {
          config,
          text: created,
          fingerprint: fingerprint(created),
          issues: [],
          readOnly: false
        };
      }
      const parsed = parseConfig(text, this.now());
      if (!parsed.ok || !parsed.config) {
        throw new ConfigFileError(
          parsed.issues[0]?.message ?? "The configuration file could not be read.",
          parsed.issues,
          text,
          parsed.readOnly
        );
      }
      return {
        config: parsed.config,
        text,
        fingerprint: fingerprint(text),
        issues: parsed.issues,
        readOnly: parsed.readOnly,
        ...parsed.migratedFrom !== void 0 ? { migratedFrom: parsed.migratedFrom } : {}
      };
    }
    /** Re-read the file and compare; used to detect a change under the panel. */
    async currentFingerprint() {
      const text = await this.readConfigText();
      return { text, fingerprint: text === null ? null : fingerprint(text) };
    }
    async backup(text, label = "backup") {
      const stamp = new Date(this.now()).toISOString().replace(/[:.]/g, "-");
      const path = `${CONFIG_PATH.replace(/\/[^/]+$/, "")}/routing.${label}-${stamp}.json`;
      await writeText(this.host, path, text);
      return path;
    }
    async saveConfig(config, expectedFingerprint) {
      const current = await this.readConfigText();
      if (current !== null && expectedFingerprint !== null && fingerprint(current) !== expectedFingerprint) {
        throw new ConfigConflictError(current);
      }
      const next = {
        ...config,
        schemaVersion: CONFIG_SCHEMA_VERSION,
        revision: config.revision + 1,
        updatedAt: new Date(this.now()).toISOString()
      };
      const text = serializeConfig(next);
      await writeText(this.host, CONFIG_PATH, text);
      return {
        config: next,
        text,
        fingerprint: fingerprint(text),
        issues: [],
        readOnly: false
      };
    }
    async resetConfig(rawText) {
      if (rawText) await this.backup(rawText, "backup");
      const config = createDefaultConfig(this.now());
      const text = serializeConfig(config);
      await writeText(this.host, CONFIG_PATH, text);
      return {
        config,
        text,
        fingerprint: fingerprint(text),
        issues: [],
        readOnly: false
      };
    }
    async loadCatalog(force = false) {
      const cachedText = await readText(this.host, MODELS_CACHE_PATH);
      const cached = cachedText ? parseModelsCache(cachedText) : null;
      const age = cached ? this.now() - Date.parse(cached.fetchedAt) : Number.POSITIVE_INFINITY;
      if (!force && cached && cached.models.length > 0 && age >= 0 && age < MODEL_TTL_MS) {
        return {
          models: cached.models,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          stale: false
        };
      }
      try {
        const models = await this.client.listModels();
        const cache = {
          schemaVersion: 1,
          fetchedAt: new Date(this.now()).toISOString(),
          models
        };
        try {
          await writeText(this.host, MODELS_CACHE_PATH, JSON.stringify(cache));
        } catch {
        }
        await this.appendHistory(models).catch(() => void 0);
        return {
          models,
          fetchedAt: cache.fetchedAt,
          fromCache: false,
          stale: false
        };
      } catch (error) {
        if (cached && cached.models.length > 0) {
          return {
            models: cached.models,
            fetchedAt: cached.fetchedAt,
            fromCache: true,
            stale: true,
            error: error instanceof Error ? error.message : "Could not refresh the catalog."
          };
        }
        throw error;
      }
    }
    async loadEndpoints(model, force = false) {
      const path = endpointCachePath(model.id);
      const cachedText = await readText(this.host, path);
      const cached = cachedText ? parseEndpointsCache(cachedText) : null;
      const age = cached ? this.now() - Date.parse(cached.fetchedAt) : Number.POSITIVE_INFINITY;
      if (!force && cached && age >= 0 && age < ENDPOINT_TTL_MS) {
        return {
          endpoints: cached.endpoints,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          stale: false
        };
      }
      try {
        const result = await this.client.listEndpoints(model);
        const fetchedAt = new Date(this.now()).toISOString();
        const cache = {
          schemaVersion: 1,
          fetchedAt,
          modelId: result.modelId ?? model.id,
          endpoints: result.endpoints
        };
        try {
          await writeText(this.host, path, JSON.stringify(cache));
        } catch {
        }
        return { endpoints: result.endpoints, fetchedAt, fromCache: false, stale: false };
      } catch (error) {
        if (cached) {
          return {
            endpoints: cached.endpoints,
            fetchedAt: cached.fetchedAt,
            fromCache: true,
            stale: true,
            error: error instanceof Error ? error.message : "Could not refresh endpoint data."
          };
        }
        throw error;
      }
    }
    async readStatus() {
      const text = await readText(this.host, STATUS_PATH);
      return text ? parseStatus(text) : null;
    }
    async readHistory() {
      const text = await readText(this.host, HISTORY_PATH);
      return text ? parseHistory(text) : null;
    }
    async appendHistory(models, endpointsByModel = {}) {
      const existing = await this.readHistory() ?? { schemaVersion: 1, points: [] };
      const now = this.now();
      const last = existing.points[existing.points.length - 1];
      if (last && now - Date.parse(last.at) < HISTORY_MIN_GAP_MS) return;
      const point = buildHistoryPoint(models, endpointsByModel, now);
      const points = [...existing.points, point].slice(-HISTORY_LIMIT);
      await writeText(this.host, HISTORY_PATH, JSON.stringify({ schemaVersion: 1, points }));
    }
  };

  // src/panel/state.ts
  var Store = class {
    constructor(host2) {
      this.host = host2;
      this.repo = new Repository(host2);
    }
    listeners = /* @__PURE__ */ new Set();
    repo;
    queue = [];
    active = 0;
    queued = /* @__PURE__ */ new Set();
    state = {
      ready: false,
      route: { view: "overview" },
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
        query: "",
        page: 0,
        sort: "name",
        direction: "asc",
        provider: "",
        minContext: "",
        maxInput: "",
        maxOutput: "",
        availableOnly: false
      }
    };
    getState() {
      return this.state;
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    emit() {
      for (const listener of this.listeners) listener();
    }
    patch(partial) {
      this.state = { ...this.state, ...partial };
      this.emit();
    }
    async init() {
      const [configResult, catalogResult, statusResult, historyResult] = await Promise.allSettled([
        this.repo.loadConfig(),
        this.repo.loadCatalog(),
        this.repo.readStatus(),
        this.repo.readHistory()
      ]);
      if (configResult.status === "fulfilled") {
        this.state.config = configResult.value;
        this.state.configIssues = configResult.value.issues;
      } else {
        const error = configResult.reason;
        this.state.configError = error instanceof ConfigFileError ? {
          message: error.message,
          issues: error.issues,
          rawText: error.rawText,
          readOnly: error.readOnly
        } : { message: errorMessage(error), issues: [], rawText: "", readOnly: false };
      }
      if (catalogResult.status === "fulfilled") {
        this.state.catalog = catalogResult.value;
      } else {
        this.state.catalogError = errorMessage(catalogResult.reason);
      }
      if (statusResult.status === "fulfilled") {
        this.state.status = statusResult.value;
        this.state.statusCheckedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      if (historyResult.status === "fulfilled") this.state.history = historyResult.value;
      this.state.ready = true;
      this.emit();
    }
    setConnection(connection) {
      this.patch({ connection });
    }
    navigate(route) {
      this.patch({ route });
      if (route.view === "model") {
        const id = route.modelId;
        void this.loadEndpoints(id);
      }
    }
    setBrowser(partial) {
      this.patch({ browser: { ...this.state.browser, ...partial } });
    }
    getModel(id) {
      return this.state.catalog?.models.find((model) => model.id === id) ?? null;
    }
    getEndpoints(id) {
      return this.state.endpoints[id];
    }
    getProfile(id) {
      return this.state.config ? findProfile(this.state.config.config, id) : null;
    }
    modelEntry(id) {
      return this.state.config?.config.models[id];
    }
    effective(id) {
      if (!this.state.config) return null;
      return effectivePolicy(this.state.config.config, id);
    }
    analytics() {
      if (!this.state.catalog) return null;
      const endpoints = {};
      for (const [id, result] of Object.entries(this.state.endpoints)) {
        if (result) endpoints[id] = result.endpoints;
      }
      return buildAnalytics(this.state.catalog.models, endpoints);
    }
    stats() {
      if (!this.state.config || !this.state.catalog) return null;
      const custom = countCustomModels(this.state.config.config);
      return {
        models: this.state.catalog.models.length,
        custom,
        excluded: countExcludedProviders(this.state.config.config),
        defaultRouting: Math.max(0, this.state.catalog.models.length - custom)
      };
    }
    providerSuggestions() {
      const map = /* @__PURE__ */ new Map();
      for (const result of Object.values(this.state.endpoints)) {
        if (!result) continue;
        for (const endpoint of result.endpoints) {
          const slug = endpoint.tag.split("/")[0] ?? endpoint.tag;
          const entry = map.get(slug) ?? { slug, name: endpoint.providerName, tags: /* @__PURE__ */ new Set() };
          entry.tags.add(endpoint.tag);
          map.set(slug, entry);
        }
      }
      return [...map.values()].map((entry) => ({
        slug: entry.slug,
        name: entry.name,
        tags: [...entry.tags].sort()
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    async copy(text, message = "Copied") {
      try {
        await this.host.writeClipboard(text);
        await this.toast("success", message);
      } catch (error) {
        await this.toast("error", `Could not copy: ${errorMessage(error)}`);
      }
    }
    async toast(kind, message) {
      try {
        await this.host.toast({ kind, message });
      } catch {
      }
    }
    async refreshCatalog(force = true) {
      this.patch({ catalogLoading: true, catalogError: null });
      try {
        const result = await this.repo.loadCatalog(force);
        this.patch({ catalog: result, catalogLoading: false });
        if (result.error) await this.toast("error", result.error);
      } catch (error) {
        this.patch({ catalogLoading: false, catalogError: errorMessage(error) });
        await this.toast("error", errorMessage(error));
      }
    }
    async loadEndpointsNow(id, force) {
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
          [id]: { endpoints: [], fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), fromCache: false, stale: true, error: errorMessage(error) }
        };
      } finally {
        this.state.endpointsLoading = { ...this.state.endpointsLoading, [id]: false };
        this.emit();
      }
    }
    async loadEndpoints(id, force = false) {
      await this.loadEndpointsNow(id, force);
    }
    /** Prefetch a page with at most three parallel API calls. */
    queueEndpoints(ids, force = false) {
      for (const id of ids) {
        if (!force && this.state.endpoints[id]) continue;
        if (this.queued.has(id) || this.state.endpointsLoading[id]) continue;
        this.queued.add(id);
        this.queue.push(id);
      }
      this.pump();
    }
    pump() {
      while (this.active < 3 && this.queue.length > 0) {
        const id = this.queue.shift();
        if (!id) break;
        this.active++;
        void this.loadEndpointsNow(id, false).catch(() => {
        }).finally(() => {
          this.queued.delete(id);
          this.active--;
          this.pump();
        });
      }
    }
    async loadMissingEndpoints(limit) {
      if (!this.state.catalog || this.state.bulk) return;
      const missing = this.state.catalog.models.filter((model) => !this.state.endpoints[model.id]).slice(0, limit);
      if (missing.length === 0) return;
      const total = missing.length;
      let done = 0;
      this.patch({ bulk: { done, total } });
      const workers = Array.from({ length: Math.min(3, missing.length) }, async () => {
        for (; ; ) {
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
    async refreshStatus() {
      this.patch({ status: await this.repo.readStatus(), statusCheckedAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
    async refreshHistory() {
      this.patch({ history: await this.repo.readHistory() });
    }
    async testConnection() {
      this.patch({ keyLoading: true, keyError: null });
      try {
        const info = await this.repo.client.keyInfo();
        this.patch({ keyInfo: info, keyLoading: false });
        await this.toast("success", "OpenRouter responded.");
      } catch (error) {
        this.patch({ keyInfo: null, keyLoading: false, keyError: errorMessage(error) });
        await this.toast("error", errorMessage(error));
      }
    }
    /** Save a mutation atomically; refuses to overwrite an external change. */
    async saveConfig(mutate, message = "Saved") {
      const snapshot = this.state.config;
      if (!snapshot || this.state.saving) return false;
      if (snapshot.readOnly) {
        await this.toast("error", "This configuration is read-only. Update the extension first.");
        return false;
      }
      this.patch({ saving: true });
      try {
        const draft = structuredClone(snapshot.config);
        mutate(draft);
        draft.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        if (snapshot.migratedFrom !== void 0) {
          await this.repo.backup(snapshot.text, "pre-migration").catch(() => "");
        }
        const saved = await this.repo.saveConfig(draft, snapshot.fingerprint);
        this.patch({ config: saved, configIssues: [], conflict: false, saving: false });
        if (message) await this.toast("success", message);
        return true;
      } catch (error) {
        this.patch({ saving: false });
        if (error instanceof ConfigConflictError) {
          this.patch({ conflict: true });
          await this.toast("error", "The configuration file changed on disk. Reload it before saving.");
        } else {
          await this.toast("error", `Could not save: ${errorMessage(error)}`);
        }
        return false;
      }
    }
    async reloadConfig() {
      try {
        const snapshot = await this.repo.loadConfig();
        this.patch({
          config: snapshot,
          configError: null,
          configIssues: snapshot.issues,
          conflict: false
        });
        await this.toast("success", "Configuration reloaded from disk.");
      } catch (error) {
        if (error instanceof ConfigFileError) {
          this.patch({
            configError: {
              message: error.message,
              issues: error.issues,
              rawText: error.rawText,
              readOnly: error.readOnly
            },
            conflict: false
          });
        }
        await this.toast("error", errorMessage(error));
      }
    }
    async checkExternalChange() {
      const snapshot = this.state.config;
      if (!snapshot || this.state.saving || this.state.conflict) return;
      try {
        const current = await this.repo.currentFingerprint();
        if (current.fingerprint && current.fingerprint !== snapshot.fingerprint) {
          this.patch({ conflict: true });
        }
      } catch {
      }
    }
    async resetConfig() {
      const raw = this.state.configError?.rawText ?? this.state.config?.text ?? null;
      try {
        const snapshot = await this.repo.resetConfig(raw);
        this.patch({
          config: snapshot,
          configError: null,
          configIssues: [],
          conflict: false
        });
        await this.toast("success", "Configuration reset. A backup was written next to it.");
      } catch (error) {
        await this.toast("error", `Could not reset: ${errorMessage(error)}`);
      }
    }
    async saveModelPolicy(modelId, canonicalSlug, profileId, policy) {
      const snapshot = this.state.config;
      if (!snapshot) return false;
      const profile2 = profileId ? findProfile(snapshot.config, profileId) : null;
      const base = profile2?.policy ?? emptyPolicy();
      const overrides = diffPolicy(base, policy);
      const count2 = overrideCount(overrides);
      return this.saveConfig((draft) => {
        if (!profileId && count2 === 0) {
          delete draft.models[modelId];
        } else {
          draft.models[modelId] = {
            profileId,
            overrides,
            customized: count2 > 0,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
        if (canonicalSlug && canonicalSlug !== modelId) {
          const isAnotherModel = draft.models[canonicalSlug] !== void 0 || this.state.catalog?.models.some((model) => model.id === canonicalSlug) === true;
          if (!isAnotherModel) draft.aliases[canonicalSlug] = modelId;
        }
      }, "Routing saved");
    }
    async removeModelPolicy(modelId) {
      return this.saveConfig((draft) => {
        delete draft.models[modelId];
      }, "Model routing removed");
    }
    async excludeProvider(modelId, canonicalSlug, providerSlug2) {
      const entry = this.modelEntry(modelId);
      const effective = this.effective(modelId);
      const profileId = entry?.profileId ?? null;
      const policy = mergePolicy(effective?.policy ?? emptyPolicy(), void 0);
      policy.providers = [...policy.providers];
      policy.order = [...policy.order];
      if (policy.mode === "only") {
        policy.providers = policy.providers.filter((slug) => slug !== providerSlug2);
        if (policy.providers.length === 0) policy.mode = "all";
      } else if (policy.mode === "exclude") {
        if (!policy.providers.includes(providerSlug2)) policy.providers.push(providerSlug2);
      } else {
        policy.mode = "exclude";
        policy.providers = [providerSlug2];
      }
      policy.order = policy.order.filter((slug) => slug !== providerSlug2);
      return this.saveModelPolicy(modelId, canonicalSlug, profileId, policy);
    }
    async createProfile(name, description, policy) {
      const snapshot = this.state.config;
      if (!snapshot) return null;
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "profile";
      let id = base;
      let index = 2;
      while (snapshot.config.profiles.some((profile3) => profile3.id === id)) {
        id = `${base}-${index++}`;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const profile2 = {
        id,
        name: name.trim().slice(0, 80),
        description: description.trim().slice(0, 240),
        builtin: false,
        policy,
        createdAt: now,
        updatedAt: now
      };
      const ok = await this.saveConfig((draft) => {
        draft.profiles.push(profile2);
      }, "Profile created");
      return ok ? id : null;
    }
    async updateProfile(id, patch) {
      return this.saveConfig((draft) => {
        const profile2 = draft.profiles.find((entry) => entry.id === id);
        if (!profile2) return;
        if (patch.name !== void 0) profile2.name = patch.name.trim().slice(0, 80);
        if (patch.description !== void 0) profile2.description = patch.description.trim().slice(0, 240);
        if (patch.policy !== void 0) profile2.policy = patch.policy;
        profile2.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      }, "Profile saved");
    }
    async duplicateProfile(id) {
      const snapshot = this.state.config;
      const source = snapshot?.config.profiles.find((profile2) => profile2.id === id);
      if (!snapshot || !source) return false;
      let newId = `${id}-copy`;
      let index = 2;
      while (snapshot.config.profiles.some((profile2) => profile2.id === newId)) {
        newId = `${id}-copy-${index++}`;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return this.saveConfig((draft) => {
        draft.profiles.push({
          ...structuredClone(source),
          id: newId,
          name: `${source.name} copy`.slice(0, 80),
          builtin: false,
          createdAt: now,
          updatedAt: now
        });
      }, "Profile duplicated");
    }
    async deleteProfile(id, reassignTo) {
      const snapshot = this.state.config;
      if (!snapshot || snapshot.config.profiles.length <= 1) {
        await this.toast("error", "At least one profile must remain.");
        return false;
      }
      return this.saveConfig((draft) => {
        for (const entry of Object.values(draft.models)) {
          if (entry.profileId === id) entry.profileId = reassignTo;
        }
        draft.profiles = draft.profiles.filter((profile2) => profile2.id !== id);
        if (draft.settings.defaultProfileId === id) draft.settings.defaultProfileId = reassignTo;
      }, "Profile deleted");
    }
    async assignProfileToModels(modelIds, profileId, replaceCustom) {
      let applied = 0;
      let skipped = 0;
      const ok = await this.saveConfig((draft) => {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        for (const id of modelIds) {
          const existing = draft.models[id];
          if (existing?.customized && !replaceCustom) {
            skipped++;
            continue;
          }
          if (!profileId && !existing) continue;
          draft.models[id] = {
            profileId,
            overrides: replaceCustom ? {} : existing?.overrides ?? {},
            customized: replaceCustom ? false : existing?.customized ?? false,
            updatedAt: now
          };
          applied++;
        }
      }, "");
      if (!ok) return { applied: 0, skipped: modelIds.length };
      await this.toast("success", `Applied to ${applied} model${applied === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} customized` : ""}.`);
      return { applied, skipped };
    }
    async setSetting(key, value, message = "Settings saved") {
      return this.saveConfig((draft) => {
        draft.settings[key] = value;
      }, message);
    }
    /** Endpoint cache size, for the Settings summary. */
    cacheSummary() {
      return {
        models: this.state.catalog?.models.length ?? 0,
        endpointModels: Object.values(this.state.endpoints).filter(Boolean).length
      };
    }
  };

  // src/panel/main.ts
  var root = document.querySelector("#root");
  if (!root) throw new Error("Missing #root");
  var host = connectHost();
  var store = new Store(host);
  var app = null;
  host.onReady((context) => {
    applyHostReady(context, document.documentElement);
    store.setConnection({
      connected: context.connection.connected,
      account: context.connection.account || null
    });
    if (app) return;
    app = new App(store);
    app.mount(root);
    void store.init();
  });
  host.onConnection((connection) => {
    store.setConnection({
      connected: connection.connected,
      account: connection.account || null
    });
  });
  window.setTimeout(() => {
    if (app) return;
    root.replaceChildren();
    const notice = document.createElement("div");
    notice.style.padding = "16px";
    notice.textContent = "Open OpenRouter Manager from OpenChamber \u2192 Settings \u2192 Extensions.";
    root.append(notice);
  }, 2500);
})();
