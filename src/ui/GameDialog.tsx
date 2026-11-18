import { useEffect, useRef, type ReactNode } from 'react';
import { InterfaceIcon } from './InterfaceIcon';

/** Native modal owns focus trapping, background inertness and focus restoration. */
export function GameDialog({ title, onClose, children, testId, className = '', overlay }: {
  title: string; onClose: () => void; children: ReactNode; testId?: string; className?: string; overlay?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const node = dialog.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const native = typeof node.showModal === 'function';
    if (native) node.showModal();
    else node.setAttribute('open', '');
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (typeof node.close === 'function') node.close();
      if (!native && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={`game-dialog ${className}`} aria-label={title} data-testid={testId} data-overlay={overlay}
    onKeyDown={event => event.stopPropagation()}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <header className="dialog-heading">
      <span className="dialog-emblem"><InterfaceIcon name={testId==='npc-dialogue'?'compass':overlay==='settings'?'settings':'book'} /></span>
      <div><p className="dialog-kicker">{testId==='npc-dialogue'?'途中 · 相逢':'雾汀岛 · 留与归'}</p>
        <h2 ref={heading} tabIndex={-1}>{title}</h2></div>
      <button type="button" className="dialog-close" aria-label={`关闭${title}`} title="关闭 · Esc" onClick={onClose}><InterfaceIcon name="close" /></button>
    </header>
    {children}
  </dialog>;
}
