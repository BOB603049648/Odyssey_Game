import { Component, type ReactNode } from 'react';
import './screenLoader.css';
import { InterfaceIcon } from './InterfaceIcon';

export function ScreenLoader({ failed = false }: { failed?: boolean }) {
  return <section className="screen-loader" role="status" aria-live="polite">
    <div className="loading-emblem" aria-hidden="true"><InterfaceIcon name="book" /></div>
    <p className="eyebrow">奥德赛 · 留与归</p>
    <p>{failed ? '这段旅程未能载入，请重新加载。' : '正在展开旅程…'}</p>
    {failed && <button className="btn" type="button" onClick={() => window.location.reload()}>重新加载</button>}
    {!failed && <div className="loading-track" aria-hidden="true" />}
  </section>;
}

/** A failed dynamic import must leave a way to retry, with the saved game intact. */
export class ScreenLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ScreenLoader failed /> : this.props.children; }
}
