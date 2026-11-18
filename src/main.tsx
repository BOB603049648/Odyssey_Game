import { createRoot } from 'react-dom/client';
import { getShoreVisualProfile } from './dev/shoreVisualProfile';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
const reactRoot = createRoot(root);
function showStartupFailure() {
  const message = document.getElementById('boot-message');
  const retry = document.getElementById('boot-retry');
  if (message) message.textContent = '旅程未能载入，请重新加载。';
  if (retry) retry.hidden = false;
}
// Choose the storage-free fixture BEFORE importing App and its persistent store.
if ((import.meta.env.VITE_VISUAL_SAMPLE === '1' || import.meta.env.VITE_SHORE_DEPLOY_ORIGIN === 'http://47.252.94.138') && getShoreVisualProfile().fixture) {
  void import('./dev/ShoreVisualSample').then(({ ShoreVisualSample }) => {
    reactRoot.render(<ShoreVisualSample profile={getShoreVisualProfile()} />);
  }).catch(showStartupFailure);
} else {
  void import('./App').then(({ App }) => reactRoot.render(<App />)).catch(showStartupFailure);
}
