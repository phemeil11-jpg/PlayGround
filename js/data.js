// Card definitions for Duel Legacy. All cards and artwork are original.

export const ATTRIBUTES = {
  LIGHT: { label: 'LIGHT', jp: '光', color: '#f4d67d', deep: '#7a4d0e', glow: '#fff3c4', ink: '#2a1a05' },
  DARK:  { label: 'DARK',  jp: '闇', color: '#b07cff', deep: '#2b1250', glow: '#e2ccff', ink: '#15061f' },
  WATER: { label: 'WATER', jp: '水', color: '#56d8ff', deep: '#0a3550', glow: '#c3f3ff', ink: '#031823' },
  FIRE:  { label: 'FIRE',  jp: '炎', color: '#ff8a4d', deep: '#5c1a08', glow: '#ffd0ae', ink: '#210702' },
  EARTH: { label: 'EARTH', jp: '地', color: '#dfaa62', deep: '#43290e', glow: '#f7dcb0', ink: '#1d1204' },
  WIND:  { label: 'WIND',  jp: '風', color: '#6bf0b0', deep: '#0a4530', glow: '#c6ffe4', ink: '#031a10' },
  SPELL: { label: 'SPELL', jp: '魔法', color: '#4ce6c6', deep: '#073e37', glow: '#c1fff4', ink: '#03211e' },
  TRAP:  { label: 'TRAP',  jp: '罠',  color: '#e66dff', deep: '#3e0a50', glow: '#f6c6ff', ink: '#1c0424' },
};

export const CARDS = {
  'solar-paladin': {
    id: 'solar-paladin', name: 'Solar Paladin', code: 'DL-001', kind: 'monster',
    attribute: 'LIGHT', race: 'Warrior', level: 4, atk: 1900, def: 1000, art: 'paladin', rarity: 'SR',
    typeLabel: 'Warrior', flavor: 'A knight sworn to the sun. His blade burns with the first light of dawn.',
  },
  'azure-serpent': {
    id: 'azure-serpent', name: 'Azure Serpent', code: 'DL-002', kind: 'monster',
    attribute: 'WATER', race: 'Dragon', level: 4, atk: 1800, def: 1200, art: 'dragon', rarity: 'R',
    typeLabel: 'Dragon', flavor: 'A coiled dragon of the deep, guardian of the Nile\u2019s hidden source.',
  },
  'obsidian-mage': {
    id: 'obsidian-mage', name: 'Obsidian Mage', code: 'DL-003', kind: 'monster',
    attribute: 'DARK', race: 'Spellcaster', level: 4, atk: 1700, def: 1500, art: 'mage', rarity: 'SR',
    typeLabel: 'Spellcaster / Effect', effect: 'When Summoned: draw 1 card.',
    onSummon: { draw: 1 },
  },
  'sandstone-golem': {
    id: 'sandstone-golem', name: 'Sandstone Golem', code: 'DL-004', kind: 'monster',
    attribute: 'EARTH', race: 'Rock', level: 4, atk: 1600, def: 2000, art: 'golem', rarity: 'R',
    typeLabel: 'Rock', flavor: 'Carved from the tombs of kings, it wakes only to guard the dead.',
  },
  'storm-falcon': {
    id: 'storm-falcon', name: 'Storm Falcon', code: 'DL-005', kind: 'monster',
    attribute: 'WIND', race: 'Winged Beast', level: 4, atk: 1500, def: 1000, art: 'falcon', rarity: 'R',
    typeLabel: 'Winged Beast / Effect', effect: 'If this card destroys a monster by battle: draw 1 card.',
    onBattleDestroy: { draw: 1 },
  },
  'tidecaller-siren': {
    id: 'tidecaller-siren', name: 'Tidecaller Siren', code: 'DL-006', kind: 'monster',
    attribute: 'WATER', race: 'Aqua', level: 3, atk: 1200, def: 1500, art: 'siren', rarity: 'N',
    typeLabel: 'Aqua / Effect', effect: 'When Summoned: gain 500 LP.',
    onSummon: { heal: 500 },
  },
  'flame-djinn': {
    id: 'flame-djinn', name: 'Flame Djinn', code: 'DL-007', kind: 'monster',
    attribute: 'FIRE', race: 'Fiend', level: 3, atk: 1400, def: 900, art: 'djinn', rarity: 'N',
    typeLabel: 'Fiend / Effect', effect: 'When Summoned: inflict 300 damage to your opponent.',
    onSummon: { damage: 300 },
  },
  'twin-jackal': {
    id: 'twin-jackal', name: 'Twin-Headed Jackal', code: 'DL-008', kind: 'monster',
    attribute: 'EARTH', race: 'Beast', level: 5, atk: 2200, def: 1700, art: 'jackal', rarity: 'SR',
    typeLabel: 'Beast / Effect', effect: 'Requires 1 Tribute. When Summoned: inflict 200 damage.',
    onSummon: { damage: 200 },
  },
  'celestial-anubis': {
    id: 'celestial-anubis', name: 'Celestial Anubis', code: 'DL-009', kind: 'monster',
    attribute: 'LIGHT', race: 'Dragon', level: 7, atk: 2800, def: 2400, art: 'anubis', rarity: 'UR',
    typeLabel: 'Dragon / Effect', effect: 'Requires 2 Tributes. When Summoned: destroy all Set Spell/Trap Cards your opponent controls.',
    onSummon: { destroySet: true },
  },
  'mirror-spirit': {
    id: 'mirror-spirit', name: 'Mirror Spirit', code: 'DL-010', kind: 'monster',
    attribute: 'LIGHT', race: 'Fairy', level: 2, atk: 500, def: 500, art: 'fairy', rarity: 'N',
    typeLabel: 'Fairy / Effect', effect: 'If this card is destroyed by battle: gain 1000 LP.',
    onDestroyed: { heal: 1000 },
  },
  'cursed-blade': {
    id: 'cursed-blade', name: 'Cursed Blade', code: 'DL-011', kind: 'monster',
    attribute: 'DARK', race: 'Warrior', level: 4, atk: 1800, def: 800, art: 'warrior', rarity: 'N',
    typeLabel: 'Warrior', flavor: 'The blade drinks the light. Its wielder has forgotten his own name.',
  },
  'crimson-warlord': {
    id: 'crimson-warlord', name: 'Crimson Warlord', code: 'DL-012', kind: 'monster',
    attribute: 'FIRE', race: 'Warrior', level: 4, atk: 1900, def: 1200, art: 'warlord', rarity: 'SR',
    typeLabel: 'Warrior', flavor: 'He has burned a hundred kingdoms and remembers none of them.',
  },
  'iron-colossus': {
    id: 'iron-colossus', name: 'Iron Colossus', code: 'DL-013', kind: 'monster',
    attribute: 'EARTH', race: 'Machine', level: 4, atk: 1700, def: 2100, art: 'colossus', rarity: 'R',
    typeLabel: 'Machine', flavor: 'A walking fortress forged in the heart of a dead volcano.',
  },
  'night-panther': {
    id: 'night-panther', name: 'Night Panther', code: 'DL-014', kind: 'monster',
    attribute: 'DARK', race: 'Beast', level: 4, atk: 1800, def: 1000, art: 'panther', rarity: 'R',
    typeLabel: 'Beast', flavor: 'It hunts between heartbeats, where the moon cannot follow.',
  },
  'void-sorcerer': {
    id: 'void-sorcerer', name: 'Void Sorcerer', code: 'DL-015', kind: 'monster',
    attribute: 'DARK', race: 'Spellcaster', level: 4, atk: 1600, def: 1400, art: 'voidmage', rarity: 'R',
    typeLabel: 'Spellcaster / Effect', effect: 'When Summoned: draw 1 card.',
    onSummon: { draw: 1 },
  },
  'abyss-serpent': {
    id: 'abyss-serpent', name: 'Abyss Serpent', code: 'DL-016', kind: 'monster',
    attribute: 'WATER', race: 'Sea Serpent', level: 4, atk: 1750, def: 1300, art: 'seaserpent', rarity: 'N',
    typeLabel: 'Sea Serpent', flavor: 'Sailors who see its coils are already drowned.',
  },
  'ember-hound': {
    id: 'ember-hound', name: 'Ember Hound', code: 'DL-017', kind: 'monster',
    attribute: 'FIRE', race: 'Beast', level: 3, atk: 1300, def: 1000, art: 'hound', rarity: 'N',
    typeLabel: 'Beast / Effect', effect: 'When Summoned: inflict 200 damage to your opponent.',
    onSummon: { damage: 200 },
  },
  'storm-herald': {
    id: 'storm-herald', name: 'Storm Herald', code: 'DL-018', kind: 'monster',
    attribute: 'WIND', race: 'Fairy', level: 4, atk: 1600, def: 1200, art: 'herald', rarity: 'N',
    typeLabel: 'Fairy', flavor: 'Her wings carry the last message of a forgotten sky.',
  },
  'colossus-titan': {
    id: 'colossus-titan', name: 'Colossus Titan', code: 'DL-019', kind: 'monster',
    attribute: 'EARTH', race: 'Machine', level: 7, atk: 2700, def: 2300, art: 'titan', rarity: 'UR',
    typeLabel: 'Machine / Effect', effect: 'Requires 2 Tributes. When Summoned: inflict 500 damage.',
    onSummon: { damage: 500 },
  },
  'grim-warden': {
    id: 'grim-warden', name: 'Grim Warden', code: 'DL-020', kind: 'monster',
    attribute: 'DARK', race: 'Zombie', level: 3, atk: 1000, def: 1400, art: 'warden', rarity: 'N',
    typeLabel: 'Zombie', flavor: 'The lantern never goes out. Neither does its hunger.',
  },
  'specter-knight': {
    id: 'specter-knight', name: 'Specter Knight', code: 'DL-021', kind: 'monster',
    attribute: 'DARK', race: 'Zombie', level: 4, atk: 1700, def: 900, art: 'knight', rarity: 'N',
    typeLabel: 'Zombie', flavor: 'Its armor is empty. Its oath is not.',
  },

  'chalice-greed': {
    id: 'chalice-greed', name: 'Chalice of Greed', code: 'DL-030', kind: 'spell',
    attribute: 'SPELL', art: 'chalice', rarity: 'SR', typeLabel: 'Spell / Normal',
    effect: 'Draw 2 cards.', spell: 'draw2',
  },
  'mystic-cyclone': {
    id: 'mystic-cyclone', name: 'Mystic Cyclone', code: 'DL-031', kind: 'spell',
    attribute: 'SPELL', art: 'cyclone', rarity: 'R', typeLabel: 'Spell / Normal',
    effect: 'Target 1 Set Spell/Trap your opponent controls; destroy it.', spell: 'cyclone',
  },
  'rite-rebirth': {
    id: 'rite-rebirth', name: 'Rite of Rebirth', code: 'DL-032', kind: 'spell',
    attribute: 'SPELL', art: 'rebirth', rarity: 'SR', typeLabel: 'Spell / Normal',
    effect: 'Special Summon the strongest monster in your GY in Attack Position.', spell: 'reborn',
  },
  'inferno-burst': {
    id: 'inferno-burst', name: 'Inferno Burst', code: 'DL-033', kind: 'spell',
    attribute: 'SPELL', art: 'inferno', rarity: 'R', typeLabel: 'Spell / Normal',
    effect: 'Inflict 800 damage to your opponent.', spell: 'burn800',
  },
  'rune-war': {
    id: 'rune-war', name: 'Rune of War', code: 'DL-034', kind: 'spell',
    attribute: 'SPELL', art: 'rune', rarity: 'N', typeLabel: 'Spell / Quick-Play',
    effect: 'Your monsters gain 400 ATK until the end of this turn.', spell: 'atkBoost400',
  },
  'aegis-prayer': {
    id: 'aegis-prayer', name: 'Aegis Prayer', code: 'DL-035', kind: 'spell',
    attribute: 'SPELL', art: 'shield', rarity: 'N', typeLabel: 'Spell / Quick-Play',
    effect: 'Your monsters gain 700 DEF until the end of this turn.', spell: 'defBoost700',
  },

  'mirror-barrier': {
    id: 'mirror-barrier', name: 'Mirror Barrier', code: 'DL-040', kind: 'trap',
    attribute: 'TRAP', art: 'barrier', rarity: 'R', typeLabel: 'Trap / Normal',
    effect: 'When an opponent\u2019s monster declares an attack: destroy the attacking monster.', trap: 'mirror',
  },
  'karmic-reflector': {
    id: 'karmic-reflector', name: 'Karmic Reflector', code: 'DL-041', kind: 'trap',
    attribute: 'TRAP', art: 'reflector', rarity: 'SR', typeLabel: 'Trap / Normal',
    effect: 'When an opponent\u2019s monster declares an attack: negate the attack and inflict damage equal to its ATK to your opponent.', trap: 'reflect',
  },
  'abyss-trap-hole': {
    id: 'abyss-trap-hole', name: 'Abyss Trap Hole', code: 'DL-042', kind: 'trap',
    attribute: 'TRAP', art: 'hole', rarity: 'R', typeLabel: 'Trap / Normal',
    effect: 'When your opponent Summons a monster with 1500 or more ATK: destroy it.', trap: 'trapHole',
  },
  'waboku': {
    id: 'waboku', name: 'Waboku', code: 'DL-043', kind: 'trap',
    attribute: 'TRAP', art: 'ward', rarity: 'N', typeLabel: 'Trap / Normal',
    effect: 'When an opponent\u2019s monster declares an attack: you take no battle damage this turn.', trap: 'waboku',
  },
};

export const PLAYER_DECK = [
  ['solar-paladin', 2], ['azure-serpent', 2], ['obsidian-mage', 2], ['sandstone-golem', 1],
  ['storm-falcon', 2], ['tidecaller-siren', 1], ['flame-djinn', 1], ['twin-jackal', 1],
  ['celestial-anubis', 1], ['mirror-spirit', 1], ['cursed-blade', 1],
  ['chalice-greed', 2], ['mystic-cyclone', 1], ['rite-rebirth', 1], ['inferno-burst', 1], ['rune-war', 1],
  ['mirror-barrier', 2], ['karmic-reflector', 1], ['abyss-trap-hole', 1],
];

export const AI_DECK = [
  ['crimson-warlord', 2], ['iron-colossus', 2], ['night-panther', 2], ['void-sorcerer', 2],
  ['abyss-serpent', 2], ['ember-hound', 1], ['storm-herald', 1], ['twin-jackal', 1],
  ['colossus-titan', 1], ['grim-warden', 1], ['specter-knight', 1],
  ['chalice-greed', 2], ['mystic-cyclone', 1], ['rite-rebirth', 1], ['inferno-burst', 1], ['aegis-prayer', 1],
  ['mirror-barrier', 2], ['karmic-reflector', 1], ['abyss-trap-hole', 1],
];

export const RARITY_LABEL = { N: 'N', R: 'R', SR: 'SR', UR: 'UR' };

export function expandDeck(list) {
  const out = [];
  for (const [id, count] of list) for (let i = 0; i < count; i++) out.push(id);
  return out;
}

export function tributesNeeded(level) {
  if (level >= 7) return 2;
  if (level >= 5) return 1;
  return 0;
}
