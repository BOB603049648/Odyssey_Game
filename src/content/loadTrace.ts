export type LoadTraceEvent = {
  t: number;
  event: 'start' | 'retry' | 'ok' | 'fail' | 'timeout' | 'cache-hit' | 'inflight-join' | 'forget';
  key?: string;
  attempt?: number;
  detail?: string;
};

const MAX = 200;
const events: LoadTraceEvent[] = [];
let hooked = false;

export function loadTraceEvents(): LoadTraceEvent[] {
  return events.slice();
}

export function resetLoadTraceForTests(): void {
  events.length = 0;
}

export function loadTraceEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('loadtrace') === '1') return true;
    return window.localStorage.getItem('odyssey-loadtrace') === '1';
  } catch {
    return false;
  }
}

export function recordLoadTrace(event: Omit<LoadTraceEvent, 't'>): void {
  events.push({ t: Date.now(), ...event });
  if (events.length > MAX) events.splice(0, events.length - MAX);
  hookWindow();
}

function hookWindow(): void {
  if (hooked || typeof window === 'undefined') return;
  hooked = true;
  Object.defineProperty(window, '__ODYSSEY_LOAD_TRACE__', {
    configurable: true,
    get: () => events.slice(),
  });
}

export function dumpLoadTrace(): string {
  return JSON.stringify(loadTraceEvents(), null, 2);
}
