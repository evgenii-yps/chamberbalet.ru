import { initModes } from './mode.js';
import { scene } from './scene.js';
import { initTabs } from './components.js';
import { initHeader } from './header.js';
import { initReveals } from './reveal.js';
import { initDecor } from './decor.js';
import { store } from './store.js';

initModes({ scene });
initTabs();
initHeader();
initReveals();
initDecor();
// Вступительная сцена — один раз за сессию
store.set('ne-seen', '1', 'session');
