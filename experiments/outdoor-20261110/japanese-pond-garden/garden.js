import { boot } from './scene_lib.js';
import { animateGarden, buildPlants, buildShell } from './garden_build.js';

boot({
  makeShell: () => buildShell(),
  makeProcedural: () => buildPlants(),
  onFrame: animateGarden,
  readyText: 'ready — japanese pond garden · drag orbit · U unlit · T toon',
});
