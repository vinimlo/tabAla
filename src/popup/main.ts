import { mount } from 'svelte';
import App from './App.svelte';

try {
  const target = document.getElementById('app');
  if (!target) {
    throw new Error('Target element #app not found in DOM');
  }
  mount(App, { target });
} catch (error) {
  console.error('Failed to mount App component:', error);
  document.body.innerHTML =
    '<div style="padding: 20px; font-family: system-ui; color: #d00;">Failed to load TabAla. Check console for details.</div>';
}
