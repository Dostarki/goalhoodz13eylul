export const STAT_INFO = {
  Speed: 'Run speed',
  Agility: 'Jump height',
  Shooting: 'Kick power',
  Attack: 'Kick power (half weight)',
  Dribbling: 'Ball keeps your momentum',
  Passing: 'Livelier headers',
  Defense: 'Bigger blocking radius',
  Physical: 'Harder body bounce, wins shoulder duels',
  Stamina: 'Extra speed in the final 20s',
};

export const STAT_ORDER = Object.keys(STAT_INFO);

export const sortedStats = (stats = {}) => STAT_ORDER.filter((s) => stats[s]).map((s) => [s, stats[s]]);
