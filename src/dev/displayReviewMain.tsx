import { createRoot } from 'react-dom/client';
import { DisplayReview } from './DisplayReview';
import '../styles.css';

const root = document.getElementById('root');
const local = ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
const knownOrigin = window.location.origin === 'http://47.252.94.138';
if (root) {
  if (import.meta.env.VITE_DISPLAY_REVIEW === '1' && (local || knownOrigin)) createRoot(root).render(<DisplayReview/>);
  else root.textContent = '此独立显示验收入口未启用。';
}
