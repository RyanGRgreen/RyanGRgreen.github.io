/** Multi-area stages. KO into a wall travels to the adjacent area. */

export const STAGES = {
  training: {
    id: "training",
    name: "TRAINING",
    areas: [
      {
        id: "dojo",
        name: "TRAINING ROOM",
        bg: ["#1a2433", "#0e141c"],
        platforms: [{ x: 480, y: 400, w: 320, h: 16 }],
        props: "tutorial",
      },
    ],
  },
  desktop: {
    id: "desktop",
    name: "ALANSPC",
    areas: [
      {
        id: "empty",
        name: "DESKTOP",
        bg: ["#1b2330", "#0f141c"],
        platforms: [],
        props: "desktop",
      },
      {
        id: "browser",
        name: "STICKSFIGHT.COM",
        bg: ["#243044", "#152031"],
        platforms: [{ x: 340, y: 380, w: 600, h: 18 }],
        props: "browser",
      },
      {
        id: "animate",
        name: "ADOBE ANIMATE",
        bg: ["#2a3340", "#1a222c"],
        platforms: [
          { x: 180, y: 420, w: 180, h: 16 },
          { x: 920, y: 420, w: 180, h: 16 },
        ],
        props: "animate",
      },
      {
        id: "explorer",
        name: "FILE EXPLORER",
        bg: ["#202830", "#10161c"],
        platforms: [{ x: 540, y: 460, w: 200, h: 14, moving: true, amp: 220, speed: 1.4 }],
        props: "explorer",
      },
    ],
  },
  lake: {
    id: "lake",
    name: "THE LAKE",
    areas: [
      {
        id: "cliff",
        name: "CLIFF EDGE",
        bg: ["#1e3a2f", "#0e1c18"],
        platforms: [{ x: 480, y: 400, w: 320, h: 16 }],
        props: "cliff",
      },
      {
        id: "shallows",
        name: "SHALLOWS",
        bg: ["#1a3d4a", "#0c1e28"],
        platforms: [],
        props: "water",
      },
      {
        id: "rocks",
        name: "ROCK FACE",
        bg: ["#2a2e34", "#14181c"],
        platforms: [{ x: 500, y: 360, w: 280, h: 18 }],
        props: "rocks",
      },
      {
        id: "bunker",
        name: "VERSUS CORE",
        bg: ["#1a1018", "#08060a"],
        platforms: [
          { x: 120, y: 340, w: 260, h: 16 },
          { x: 900, y: 340, w: 260, h: 16 },
          { x: 480, y: 460, w: 320, h: 14 },
        ],
        props: "versus",
      },
    ],
  },
  // Campaign — layered platforms (Dead Cells–inspired silhouettes, original layouts)
  ruins: {
    id: "ruins",
    name: "DESKTOP RUINS",
    areas: [
      {
        id: "r1",
        name: "BROKEN TASKBAR",
        bg: ["#2a2218", "#12100c"],
        platforms: [
          { x: 160, y: 480, w: 200, h: 14 },
          { x: 520, y: 420, w: 160, h: 14 },
          { x: 900, y: 460, w: 220, h: 14 },
        ],
        props: "ruins",
      },
      {
        id: "r2",
        name: "ICON GRAVEYARD",
        bg: ["#262018", "#0e0c0a"],
        platforms: [
          { x: 200, y: 360, w: 140, h: 14 },
          { x: 420, y: 440, w: 180, h: 14 },
          { x: 700, y: 360, w: 140, h: 14 },
          { x: 940, y: 480, w: 160, h: 14 },
        ],
        props: "ruins",
      },
      {
        id: "r3",
        name: "CRACKED WINDOW",
        bg: ["#2c241c", "#14110e"],
        platforms: [
          { x: 120, y: 400, w: 240, h: 16 },
          { x: 520, y: 320, w: 240, h: 16 },
          { x: 900, y: 400, w: 240, h: 16 },
        ],
        props: "ruins",
      },
      {
        id: "r4",
        name: "RECYCLE PIT",
        bg: ["#1e1a14", "#0a0908"],
        platforms: [
          { x: 280, y: 460, w: 120, h: 14 },
          { x: 560, y: 380, w: 160, h: 14 },
          { x: 840, y: 460, w: 120, h: 14 },
          { x: 480, y: 520, w: 280, h: 14 },
        ],
        props: "ruins",
      },
      {
        id: "r5",
        name: "GUARD COURTYARD",
        bg: ["#32281e", "#16120e"],
        platforms: [
          { x: 200, y: 440, w: 180, h: 16 },
          { x: 900, y: 440, w: 180, h: 16 },
          { x: 460, y: 360, w: 360, h: 18 },
        ],
        props: "ruins_boss",
      },
    ],
  },
  caves: {
    id: "caves",
    name: "DATA CAVES",
    areas: [
      {
        id: "c1",
        name: "PACKET SHAFT",
        bg: ["#142028", "#080c12"],
        platforms: [
          { x: 140, y: 500, w: 160, h: 14 },
          { x: 400, y: 420, w: 140, h: 14 },
          { x: 640, y: 340, w: 140, h: 14 },
          { x: 900, y: 420, w: 180, h: 14 },
        ],
        props: "caves",
      },
      {
        id: "c2",
        name: "CRYSTAL LEDGE",
        bg: ["#182430", "#0a1018"],
        platforms: [
          { x: 180, y: 380, w: 200, h: 14 },
          { x: 540, y: 460, w: 200, h: 14 },
          { x: 880, y: 340, w: 200, h: 14 },
          { x: 500, y: 280, w: 120, h: 12, moving: true, amp: 160, speed: 1.1 },
        ],
        props: "caves",
      },
      {
        id: "c3",
        name: "CACHE HOLLOW",
        bg: ["#101820", "#060a10"],
        platforms: [
          { x: 100, y: 440, w: 220, h: 16 },
          { x: 420, y: 360, w: 160, h: 14 },
          { x: 700, y: 440, w: 160, h: 14 },
          { x: 960, y: 360, w: 200, h: 16 },
        ],
        props: "caves",
      },
      {
        id: "c4",
        name: "BITSTREAM FALLS",
        bg: ["#1a2834", "#0c141c"],
        platforms: [
          { x: 240, y: 480, w: 140, h: 14 },
          { x: 480, y: 400, w: 140, h: 14 },
          { x: 720, y: 320, w: 140, h: 14 },
          { x: 960, y: 400, w: 140, h: 14 },
          { x: 360, y: 240, w: 200, h: 12, moving: true, amp: 200, speed: 1.3 },
        ],
        props: "caves",
      },
      {
        id: "c5",
        name: "WRAITH NEST",
        bg: ["#1c2438", "#0a0e18"],
        platforms: [
          { x: 160, y: 400, w: 200, h: 16 },
          { x: 920, y: 400, w: 200, h: 16 },
          { x: 400, y: 480, w: 480, h: 18 },
          { x: 540, y: 300, w: 200, h: 14 },
        ],
        props: "caves_boss",
      },
    ],
  },
  spire: {
    id: "spire",
    name: "CORE SPIRE",
    areas: [
      {
        id: "s1",
        name: "LOWER RAMPART",
        bg: ["#1a1420", "#0a0810"],
        platforms: [
          { x: 120, y: 500, w: 180, h: 14 },
          { x: 400, y: 420, w: 160, h: 14 },
          { x: 700, y: 420, w: 160, h: 14 },
          { x: 980, y: 500, w: 180, h: 14 },
        ],
        props: "spire",
      },
      {
        id: "s2",
        name: "NARROW ASCENT",
        bg: ["#201828", "#0c0a14"],
        platforms: [
          { x: 300, y: 480, w: 100, h: 12 },
          { x: 500, y: 400, w: 100, h: 12 },
          { x: 700, y: 320, w: 100, h: 12 },
          { x: 900, y: 400, w: 100, h: 12 },
          { x: 560, y: 520, w: 160, h: 14 },
        ],
        props: "spire",
      },
      {
        id: "s3",
        name: "SKY BRIDGE",
        bg: ["#241c30", "#100c18"],
        platforms: [
          { x: 200, y: 360, w: 280, h: 16 },
          { x: 800, y: 360, w: 280, h: 16 },
          { x: 480, y: 480, w: 320, h: 14 },
          { x: 560, y: 260, w: 160, h: 12 },
        ],
        props: "spire",
      },
      {
        id: "s4",
        name: "THRONE STEPS",
        bg: ["#281a28", "#120a14"],
        platforms: [
          { x: 160, y: 520, w: 200, h: 14 },
          { x: 400, y: 440, w: 200, h: 14 },
          { x: 680, y: 360, w: 200, h: 14 },
          { x: 920, y: 280, w: 200, h: 14 },
        ],
        props: "spire",
      },
      {
        id: "s5",
        name: "VERSUS APEX",
        bg: ["#1a1018", "#08060c"],
        platforms: [
          { x: 140, y: 420, w: 220, h: 16 },
          { x: 920, y: 420, w: 220, h: 16 },
          { x: 380, y: 520, w: 520, h: 20 },
          { x: 520, y: 300, w: 240, h: 16 },
        ],
        props: "spire_boss",
      },
    ],
  },
};

export const STAGE_ORDER = ["desktop", "lake"];
export const CAMPAIGN_STAGES = ["ruins", "caves", "spire"];

export const ARENA = {
  x: 80,
  y: 80,
  w: 1120,
  h: 560,
  floor: 620,
  wallL: 80,
  wallR: 1200,
  ceiling: 80,
};
