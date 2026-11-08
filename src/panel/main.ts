import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { App } from './app.ts';
import { Store } from './state.ts';

const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('Missing #root');

const host = connectHost();
const store = new Store(host);
let app: App | null = null;

host.onReady((context) => {
  applyHostReady(context, document.documentElement);
  store.setConnection({
    connected: context.connection.connected,
    account: context.connection.account || null,
  });
  if (app) return;
  app = new App(store);
  app.mount(root);
  void store.init();
});

host.onConnection((connection) => {
  store.setConnection({
    connected: connection.connected,
    account: connection.account || null,
  });
});

window.setTimeout(() => {
  if (app) return;
  root.replaceChildren();
  const notice = document.createElement('div');
  notice.style.padding = '16px';
  notice.textContent = 'Open OpenRouter Manager from OpenChamber → Settings → Extensions.';
  root.append(notice);
}, 2500);
