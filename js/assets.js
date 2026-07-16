/** Pixel packs: VFX Impacts, UI bars, weapon icons. Paths under /assets. */

const VFX_COUNTS = { 1: 4, 2: 7, 3: 5, 4: 5, 5: 6, 6: 7, 7: 7 };

/** Map combat events → free VFX pack index (Frostwindz Pixel Art VFX Impacts). */
export const IMPACT_MAP = {
  hit: 1,
  big: 2,
  block: 3,
  jump: 4,
  special: 5,
  slash: 6,
  ko: 7,
  crit: 2,
  node: 3,
  hook: 6,
};

/** Weapon icons used as Orange drawn props / Red claw accents (32 Free Weapon Icons). */
export const WEAPON_KEYS = {
  pencilProp: "Iicon_32_01.png",
  hammer: "Iicon_32_16.png",
  rush: "Iicon_32_10.png",
  eraser: "Iicon_32_07.png",
  spirit: "Iicon_32_12.png",
  anvil: "Iicon_32_02.png",
  rocket: "Iicon_32_05.png",
  shuriken: "Iicon_32_35.png",
};

const cache = {
  ready: false,
  loading: null,
  vfx: {},
  weapons: {},
  ui: {},
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function loadAssets() {
  if (cache.ready) return Promise.resolve(cache);
  if (cache.loading) return cache.loading;

  cache.loading = (async () => {
    const jobs = [];

    for (const [id, count] of Object.entries(VFX_COUNTS)) {
      cache.vfx[id] = [];
      for (let f = 1; f <= count; f++) {
        const path = `assets/vfx/vfx${id}/VFXimpact${id}_frame${f}.png`;
        jobs.push(
          loadImage(path).then((img) => {
            cache.vfx[id][f - 1] = img;
          })
        );
      }
    }

    for (const [key, file] of Object.entries(WEAPON_KEYS)) {
      jobs.push(
        loadImage(`assets/weapons/${file}`).then((img) => {
          cache.weapons[key] = img;
        })
      );
    }

    for (const name of ["00", "01", "06", "All"]) {
      jobs.push(
        loadImage(`assets/ui/${name}.png`).then((img) => {
          cache.ui[name] = img;
        })
      );
    }

    await Promise.all(jobs);
    cache.ready = true;
    return cache;
  })();

  return cache.loading;
}

export function getAssets() {
  return cache;
}

/** Draw a VFX impact sequence. lifeMax should match spawnFx life.
 *  Pack art is left-oriented (mass/trail on +X when unflipped). Pass the
 *  action direction: facing > 0 mirrors for rightward dodge/attack. */
export function drawImpact(ctx, kind, x, y, life, lifeMax = 20, scale = 1.6, facing = 1) {
  const packId = IMPACT_MAP[kind] || IMPACT_MAP.hit;
  const frames = cache.vfx[packId];
  if (!frames?.length || !frames[0]) return false;

  const total = frames.length;
  const t = 1 - Math.max(0, life) / Math.max(1, lifeMax);
  const idx = Math.min(total - 1, Math.floor(t * total));
  const img = frames[idx];
  if (!img) return false;

  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "screen";
  ctx.translate(x, y);
  if (facing > 0) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

const keyed = {};

function chromaKeyWeapon(img, key) {
  if (keyed[key]) return keyed[key];
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < 18 && d[i + 1] < 18 && d[i + 2] < 18) d[i + 3] = 0;
  }
  g.putImageData(data, 0, 0);
  keyed[key] = c;
  return c;
}

export function drawWeaponIcon(ctx, key, x, y, size = 28, angle = 0, flipX = false) {
  const img = cache.weapons[key];
  if (!img) return false;
  const src = chromaKeyWeapon(img, key);
  ctx.save();
  ctx.translate(x, y);
  if (flipX) ctx.scale(-1, 1);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}
