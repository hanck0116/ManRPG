export const PHASES = {
  INIT: 'INIT',
  FLOOR_SETUP: 'FLOOR_SETUP',
  BATTLE: 'BATTLE',
  FLOOR_CLEAR: 'FLOOR_CLEAR',
  IMAGINATION_WORLD: 'IMAGINATION_WORLD',
};

export const IMAGINATION_STEPS = {
  NONE: 'NONE',
  ENTER: 'ENTER',
  REWARD: 'REWARD',
  STAT_DISTRIBUTION: 'STAT_DISTRIBUTION',
  SKILL_CREATE: 'SKILL_CREATE',
  SPELLBOOK_ACTION: 'SPELLBOOK_ACTION',
  SHOP: 'SHOP',
  READY_FOR_NEXT_FLOOR: 'READY_FOR_NEXT_FLOOR',
};

export const REWARDS = {
  LEVEL: 5,
  STAT_POINTS: 15,
  COINS: 1,
};

export function createSamplePlayer() {
  return {
    name: '하린',
    level: 1,
    hp: 100,
    maxHp: 100,
    mp: 30,
    maxMp: 30,
    mpRecovery: 10,
    stats: {
      strength: 12,
      agility: 8,
      wisdom: 6,
    },
    statPoints: 0,
    coins: 0,
    statusEffects: [],
  };
}

export function createEnemyForFloor(floor) {
  const baseHp = 20 + (floor - 1) * 5;

  return {
    name: floor === 1 ? '고블린' : `층수 수호자 ${floor}`,
    hp: baseHp,
    maxHp: baseHp,
    stats: {
      strength: 6 + floor,
      agility: 4 + floor,
      wisdom: 2 + floor,
    },
    statusEffects: [],
    isAlive: true,
  };
}
