import { initModes } from './mode.js';
import { scene } from './scene.js';
import { initTabs, initAccordions } from './components.js';
import { initHeader } from './header.js';
import { initReveals } from './reveal.js';
import { initScrollFx } from './scrollfx.js';
import { initDecor } from './decor.js';
import { initMedia } from './media.js';
import { initPlayer } from './player.js';
import { store } from './store.js';

initModes({ scene });
initTabs();
initAccordions();
initHeader();
initReveals();
initDecor();
initScrollFx();
initMedia();
initPlayer();
// Вступительная сцена — один раз за сессию
store.set('ne-seen', '1', 'session');
