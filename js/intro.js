import { Preloader } from './ui/Preloader.js';

const preloader = new Preloader(document.querySelector('#preloader'));
preloader.start().catch(() => preloader.finish());
