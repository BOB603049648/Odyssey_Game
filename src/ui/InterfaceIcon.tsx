export type InterfaceIconName = 'book' | 'case' | 'settings' | 'home' | 'close' | 'arrow' | 'check' | 'compass' | 'fold';
const paths: Record<InterfaceIconName, string> = {
  book: 'M12 5C8 2 4 3 3 4v15c3-2 6-1 9 1m0-15c4-3 8-2 9-1v15c-3-2-6-1-9 1V5M6 8l3 1m6 0 3-1M6 12l3 1m6 0 3-1',
  case: 'M4 6h16v14H4zM8 6V3h8v3M4 11h16M10 10v3h4v-3',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
  home: 'M3 11 12 3l9 8M6 9v12h12V9M10 21v-7h4v7',
  close: 'm6 6 12 12M18 6 6 18',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  compass: 'M12 2v2m0 16v2M2 12h2m16 0h2M8 8l8-2-2 8-8 4 2-10zM9 11l4 2',
  fold: 'm6 14 6-6 6 6',
};
export function InterfaceIcon({ name, className = '' }: { name: InterfaceIconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={paths[name]} />
  </svg>;
}
