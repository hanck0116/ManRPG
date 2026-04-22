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

export const SKILL_POOL = [
  { id: 'skill_power_strike', name: '강타', description: '강한 일격을 가하는 기본 공격형 스킬' },
  { id: 'skill_double_slash', name: '연속 베기', description: '빠른 연속 공격으로 압박하는 스킬' },
  { id: 'skill_focus', name: '집중', description: '집중하여 다음 행동의 효율을 높이는 스킬' },
  { id: 'skill_mana_wave', name: '마력 파동', description: '마력을 전방으로 방출하는 지혜형 스킬' },
  { id: 'skill_quick_thrust', name: '재빠른 찌르기', description: '민첩하게 빈틈을 찌르는 스킬' },
  { id: 'skill_balance_sense', name: '균형 감각', description: '전투 균형을 유지해 안정성을 높이는 스킬' },
  { id: 'skill_arcane_mark', name: '비전 각인', description: '적에게 각인을 새겨 전투 흐름을 유리하게 하는 스킬' },
];

export const SPELLBOOK_POOL = [
  { id: 'spellbook_flame', name: '화염서', description: '불꽃 계열 마법의 기초가 담긴 마법서' },
  { id: 'spellbook_frost', name: '빙결서', description: '냉기 계열 마법의 흐름을 익히는 마법서' },
  { id: 'spellbook_wind', name: '바람서', description: '기동성을 높이는 바람 계열 마법서' },
  { id: 'spellbook_barrier', name: '보호막서', description: '방어 마법의 기초 구조를 담은 마법서' },
  { id: 'spellbook_meditation', name: '명상서', description: '마력 회복과 집중법을 다루는 마법서' },
  { id: 'spellbook_thunder', name: '낙뢰서', description: '번개 계열 기초 공명식을 담은 마법서' },
];

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
    skills: [],
    spellbooks: [],
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
