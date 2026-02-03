import App from './App.svelte';

let app: App | null = null;

try {
  const target = document.getElementById('app');
  if (!target) {
    throw new Error('Target element #app not found in DOM');
  }
  app = new App({ target });
} catch (error) {
  console.error('Failed to mount App component:', error);
}

export default app;
