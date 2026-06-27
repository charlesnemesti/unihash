import './gallery.css';

import { initCaStrip } from './ca-strip.js';
import { TOKEN_SYMBOL } from './config/brand.js';
import { HOLDER_THRESHOLD_LABEL } from './config/holder.js';
import { createChainBrowser } from './three/pdb/chain-browser.js';

let browser = null;

function boot() {
  initCaStrip();
  browser = createChainBrowser({
    stageId: 'mol-stage',
    panelSelector: '.mol-presenter',
    tokenSymbol: TOKEN_SYMBOL,
    holdLabel: HOLDER_THRESHOLD_LABEL,
  });
}

boot();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    browser?.dispose();
  });
}
