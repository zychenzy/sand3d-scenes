import { boot } from './scene_lib.js';
import { buildSite } from './geometry.mjs';

const params = new URLSearchParams(location.search);
if (params.get('shot') === '1') {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
}

boot({
  makeShell() {
    return buildSite();
  },
  readyText: 'ready — small harbour quay · drag orbit · U unlit · T toon',
});
