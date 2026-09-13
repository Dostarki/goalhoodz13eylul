// Static game content (characters, arenas, copy). League/score data lives in the backend.

export const BASE_ROWS = [
  '....####....',
  '..##....##..',
  '.#........#.',
  '.#........#.',
  '#..##..##..#',
  '#..##..##..#',
  '#..........#',
  '.#........#.',
  '.#..####..#.',
  '..#......#..',
  '...######...',
  '............',
];

const withTop = (topRows, fromRow = 0) => [...topRows, ...BASE_ROWS.slice(fromRow)];

export const CHARACTERS = [
  {
    id: 'arc',
    name: 'ARC',
    title: 'Antenna Captain',
    desc: 'Balanced all-rounder. Clean headers, reliable jumps.',
    stats: { speed: 7, jump: 8, shot: 7 },
    bitmap: withTop(['.....#......', '.....#......']),
  },
  {
    id: 'mohawk',
    name: 'MOHAWK',
    title: 'Punk Forward',
    desc: 'Aggressive and direct. Heavy shot power.',
    stats: { speed: 8, jump: 6, shot: 9 },
    bitmap: withTop(['.....##.....', '.....##.....', '....####....', '..########..'], 2),
  },
  {
    id: 'cap',
    name: 'CAP',
    title: 'Street Master',
    desc: 'Cool head under the visor. Loves control.',
    stats: { speed: 7, jump: 7, shot: 8 },
    bitmap: withTop(['............', '...######...', '..########..', '.###########'], 2),
  },
  {
    id: 'afro',
    name: 'AFRO',
    title: 'Rhythm Master',
    desc: 'Big head, big reach. King of aerial duels.',
    stats: { speed: 6, jump: 9, shot: 7 },
    bitmap: withTop(
      ['..########..', '.##########.', '############', '############', '##........##', '.#........#.'],
      4
    ),
  },
  {
    id: 'halo',
    name: 'HALO',
    title: 'Angel Wing',
    desc: 'Light and quick. Nobody catches him on the ground.',
    stats: { speed: 9, jump: 8, shot: 6 },
    bitmap: withTop(['..########..', '............']),
  },
  {
    id: 'spiky',
    name: 'SPIKE',
    title: 'Electric Hair',
    desc: 'Energetic and unpredictable. Expect surprises.',
    stats: { speed: 8, jump: 8, shot: 7 },
    bitmap: withTop(['.#..#..#..#.', '.##.####.##.', '..########..', '.##########.'], 2),
  },
  {
    id: 'glasses',
    name: 'SPECS',
    title: 'The Analyst',
    desc: 'Calculates every ball. Master of positioning.',
    stats: { speed: 7, jump: 7, shot: 7 },
    bitmap: [
      '............',
      '............',
      '....####....',
      '..##....##..',
      '.#........#.',
      '.#........#.',
      '#.###..###.#',
      '#.#.####.#.#',
      '#.###..###.#',
      '.#........#.',
      '.#..####..#.',
      '..#......#..',
      '...######...',
      '............',
    ],
  },
  {
    id: 'crown',
    name: 'KING',
    title: 'Crown Holder',
    desc: 'League legend. Heavy but devastating shot.',
    stats: { speed: 6, jump: 7, shot: 9 },
    bitmap: withTop(['#..#.##.#..#', '#..#.##.#..#', '############', '############'], 2),
  },
];

export const BALL_BITMAP = [
  '..####..',
  '.#....#.',
  '#..##..#',
  '#.##...#',
  '#...##.#',
  '#..##..#',
  '.#....#.',
  '..####..',
];

export const TROPHY_BITMAP = [
  '############',
  '#.########.#',
  '#.########.#',
  '#.########.#',
  '.#.######.#.',
  '..########..',
  '...######...',
  '....####....',
  '.....##.....',
  '.....##.....',
  '....####....',
  '...######...',
  '..########..',
  '............',
];

export const ARENAS = {
  paper: {
    id: 'paper',
    name: 'PAPER ARENA',
    desc: 'Ink on paper. The classic daylight pitch.',
    bg: '#efede4',
    ink: '#1c1c22',
  },
  inverted: {
    id: 'inverted',
    name: 'INK ARENA',
    desc: 'Paper on ink. The inverted night pitch.',
    bg: '#1c1c22',
    ink: '#efede4',
  },
};

// 6-team single round-robin schedule (indices: 0 = you, 1..5 = league opponents)
export const ROUNDS = [
  [[0, 5], [1, 4], [2, 3]],
  [[0, 4], [5, 3], [1, 2]],
  [[0, 3], [4, 2], [5, 1]],
  [[0, 2], [3, 1], [4, 5]],
  [[0, 1], [2, 5], [3, 4]],
];

export const MATCH_SECONDS = 60;

export const CONTROLS = [
  { action: 'Move left / right', keys: ['←', '→'], alt: ['A', 'D'], mobile: 'Left / Right buttons' },
  { action: 'Jump', keys: ['↑'], alt: ['W', 'SPACE'], mobile: 'Jump button' },
  { action: 'Kick (Shoot)', keys: ['X'], alt: ['K', '↓'], mobile: 'Kick button' },
  { action: 'Pause', keys: ['P'], alt: ['ESC'], mobile: 'Pause icon' },
];

export const FEATURES = [
  {
    title: '1-Bit Pitch',
    text: 'Two colors, zero noise. Every pixel is drawn in ink; crowd, goals and ball all speak the same 1-bit language.',
  },
  {
    title: 'Ruthless Opponents',
    text: 'Your rival predicts where the ball lands, closes the goal and shoots the moment there is space. You need to read the game to win.',
  },
  {
    title: '60-Second Matches',
    text: 'Every match is exactly one minute. Quick decisions, short matches, long season. Draws earn a point; wins earn three.',
  },
];

export const TEAM_NAME = (username) => (username ? `@${username}` : 'YOU');

// ---------- local preferences (character + sound only) ----------
const KEYS = { char: 'futbot.char', sound: 'futbot.sound' };

const read = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export const getSelectedCharId = () => read(KEYS.char, 'arc');
export const setSelectedCharId = (id) => write(KEYS.char, id);
export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

export const getSoundEnabled = () => read(KEYS.sound, true);
export const setSoundEnabled = (v) => write(KEYS.sound, v);

export const arenaForRound = (round) => (round % 2 === 0 ? 'paper' : 'inverted');
