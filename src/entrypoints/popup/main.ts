import { createApp } from 'vue';
import App from '@/App.vue';
import '@/assets/styles.css';

document.documentElement.classList.add('popup');
createApp(App, { compact: true }).mount('#app');
