import { initModes } from './mode.js';
import { scene } from './scene.js';
import { initTabs, initMore, initHeader } from './components.js';
import { initDecor } from './decor.js';
import { initMicro } from './micro.js';
import { store } from './store.js';

initModes({ scene });
initTabs();
initMore();
initHeader();
initDecor();
initMicro();
// Вступительная сцена — один раз за сессию
store.set('ne-seen', '1', 'session');
