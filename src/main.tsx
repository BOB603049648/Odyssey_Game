import { createRoot } from 'react-dom/client';
import { getShoreVisualProfile } from './dev/shoreVisualProfile';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
const reactRoot = createRoot(root);
// Choose the storage-free fixture BEFORE importing App and its persistent store.
if ((import.meta.env.VITE_VISUAL_SAMPLE === '1' || import.meta.env.VITE_SHORE_DEPLOY_ORIGIN === 'http://47.252.94.138') && getShoreVisualProfile().fixture) {
  void import('./dev/ShoreVisualSample').then(({ ShoreVisualSample }) => {
    reactRoot.render(<ShoreVisualSample profile={getShoreVisualProfile()} />);
  });
} else {
  void import('./App').then(({ App }) => reactRoot.render(<App />));
}
