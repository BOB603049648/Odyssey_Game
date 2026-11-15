import { useEffect, useRef, type ReactNode } from 'react';

/** Native modal owns focus trapping, background inertness and focus restoration. */
export function GameDialog({ title, onClose, children, testId }: {
  title: string; onClose: () => void; children: ReactNode; testId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current!;
    if (typeof node.showModal === 'function') node.showModal();
    else node.setAttribute('open', '');
    return () => { if (typeof node.close === 'function') node.close(); };
  }, []);
  return <dialog ref={dialog} className="game-dialog" aria-label={title} data-testid={testId}
    onKeyDown={event => event.stopPropagation()}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <h2>{title}</h2>{children}
  </dialog>;
}
