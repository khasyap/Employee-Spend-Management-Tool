// Polyfills for Node.js modules in Angular
import 'zone.js';
import { Buffer } from 'buffer';

// Make Node globals available in browser
(window as any).global = window;
(window as any).Buffer = (window as any).Buffer || Buffer;
