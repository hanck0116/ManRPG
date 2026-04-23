import {
  createEnemyForFloor,
  createSamplePlayer,
  IMAGINATION_STEPS,
  PHASES,
  REWARDS,
  SHOP_ITEM_POOL,
  SKILL_POOL,
  SPELLBOOK_POOL,
} from './data.js';
import { gameState, resetBattleState, resetTurnFlags, resetWorldState } from './state.js';
import {
  validateAttackAllowed,
  validateBattleStartAllowed,
  validateDefendAllowed,
  validateImaginationEntry,
  validateImaginationProgressAllowed,
  validateNextFloorAllowed,
  validateRewardNotDuplicated,
  validateRewardStepAllowed,
  validateSkillUseAllowed,
  validateShopFinishAllowed,
  validateShopPreparationAllowed,
  validateShopPurchaseAllowed,
  validateSkillCreatePreparationAllowed,
  validateSkillSelectionAllowed,
  validateSpellbookPreparationAllowed,
  validateSpellbookSelectionAllowed,
  validateSpellbookSkipAllowed,
  validateStatAllocationAllowed,
  validateStatDistributionFinishAllowed,
} from './validator.js';

const SAVE_KEY = 'manrpg_mobile_save_v1';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isValidLoadedState(data) {
  return Boolean(data && data.session && data.battle && data.world && data.entities);
}

export function pushLog(message, isError = false) {
  gameState.ui.lastMessage = message;
  gameState.logs.unshift({ message, isError });
  gameState.logs = gameState.logs.slice(0, 40);
}

function rollDice(max) {
  const safeMax = Math.max(1, Math.floor(max));
  return Math.floor(Math.random() * safeMax) + 1;
}

function pickUniqueFromPool(pool, count) {
  const source = [...pool];
  const picks = [];
  while (source.length > 0 && picks.length < count) {
    const index = Math.floor(Math.random() * source.length);
    picks.push(source.splice(index, 1)[0]);
  }
  return picks;
}

function ensurePlayerStatShape(player) {
  if (!player.stats) player.stats = {};
  const fallback = {
    strength: 10,
    agility: 8,
    vitality: 10,
    intelligence: 7,
    wisdom: 6,
    charisma: 5,
  };
  Object.keys(fallback).forEach((key) => {
    if (typeof player.stats[key] !== 'number') player.stats[key] = fallback[key];
  });
}

function recalcDerivedStats(player) {
  ensurePlayerStatShape(player);
  player.level = Math.max(1, Number(player.level || 1));
  player.baseMaxHpBonus = Number(player.baseMaxHpBonus || 0);
  player.baseMaxMpBonus = Number(player.baseMaxMpBonus || 0);

  const derivedMaxHp = player.stats.vitality * 10 + player.baseMaxHpBonus;
  const derivedMaxMp = player.level * 5 + player.stats.intelligence * 10 + player.baseMaxMpBonus;
  const derivedMpRecovery = player.level + player.stats.wisdom * 2;

  player.maxHp = Math.max(1, Math.floor(derivedMaxHp));
  player.maxMp = Math.max(1, Math.floor(derivedMaxMp));
  player.mpRecovery = Math.max(0, Math.floor(derivedMpRecovery));

  const currentHp = Number.isFinite(Number(player.hp)) ? Number(player.hp) : player.maxHp;
  const currentMp = Number.isFinite(Number(player.mp)) ? Number(player.mp) : player.maxMp;
  player.hp = Math.min(player.maxHp, Math.max(0, currentHp));
  player.mp = Math.min(player.maxMp, Math.max(0, currentMp));
}

function getBasicAttackDamage(player) {
  return Math.floor((player.stats.strength + player.stats.vitality) / 5) + 2;
}

export function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    pushLog('[SAVE] 게임 저장 완료');
  } catch {
    pushLog('[ERROR] 게임 저장 실패', true);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      pushLog('[ERROR] 저장된 데이터가 없음', true);
      return;
    }

    const loaded = JSON.parse(raw);
    if (!isValidLoadedState(loaded)) {
      pushLog('[ERROR] 저장 데이터 형식이 올바르지 않음', true);
      return;
    }

    const loadedBattle = loaded.battle || {};

    Object.assign(gameState.session, loaded.session);
    Object.assign(gameState.battle, loadedBattle);
    gameState.battle.turnMeta = Object.assign({ mpRecoveredThisTurn: false }, loadedBattle.turnMeta || {});
    gameState.battle.defending = Boolean(loadedBattle.defending);
    gameState.battle.lastActionType = loadedBattle.lastActionType || null;
    Object.assign(gameState.world, loaded.world);
    gameState.entities.player = loaded.entities.player;
    gameState.entities.enemy = loaded.entities.enemy;

    if (gameState.entities.player) {
      ensurePlayerStatShape(gameState.entities.player);
      recalcDerivedStats(gameState.entities.player);
    }
    gameState.ui.lastMessage = loaded.ui?.lastMessage || '';
    gameState.logs = Array.isArray(loaded.logs) ? loaded.logs : [];

    pushLog('[SAVE] 저장된 게임 불러오기 완료');
  } catch {
    pushLog('[ERROR] 저장 데이터 형식이 올바르지 않음', true);
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  pushLog('[SAVE] 저장 데이터 삭제 완료');
}

export function startGame() {
  gameState.entities.player = createSamplePlayer();
  recalcDerivedStats(gameState.entities.player);
  gameState.entities.player.hp = gameState.entities.player.maxHp;
  gameState.entities.player.mp = gameState.entities.player.maxMp;
  gameState.entities.enemy = null;
  gameState.session.started = true;
  gameState.session.phase = PHASES.INIT;
  gameState.session.floor = 1;
  resetBattleState();
  resetWorldState();
  pushLog('[INIT] 샘플 플레이어 로드 완료');
}

export function setupFloor() {
  gameState.entities.enemy = createEnemyForFloor(gameState.session.floor);
  gameState.session.phase = PHASES.FLOOR_SETUP;
  resetBattleState();
  resetWorldState();
  pushLog(`[FLOOR] ${gameState.session.floor}층 적 생성: ${gameState.entities.enemy.name}`);
  pushLog(`[FLOOR] ${gameState.session.floor}층 준비 완료`);
}

function beginTurn() {
  gameState.battle.turn += 1;
  resetTurnFlags();
  const player = gameState.entities.player;
  const beforeMp = player.mp;
  player.mp = Math.min(player.maxMp, player.mp + player.mpRecovery);
  const recovered = player.mp - beforeMp;
  gameState.battle.turnMeta.mpRecoveredThisTurn = true;
  pushLog(`[TURN] ${gameState.battle.turn}턴 시작, MP +${recovered}`);
}

export function startBattle() {
  if (!validateBattleStartAllowed(gameState, pushLog)) return;
  gameState.session.phase = PHASES.BATTLE;
  pushLog('[BATTLE] 전투 시작');
  beginTurn();
}

function enemyReactOnce() {
  const player = gameState.entities.player;
  const enemy = gameState.entities.enemy;
  if (!enemy || !enemy.isAlive) return;

  const enemyRoll = rollDice(enemy.stats.strength);
  const beforeHp = player.hp;
  const isDefending = gameState.battle.defending;
  if (isDefending) pushLog('[DEFEND] 이번 적 반응 피해 감소 적용');

  const damage = isDefending ? Math.floor(enemyRoll / 2) : enemyRoll;
  if (isDefending) gameState.battle.defending = false;
  player.hp = Math.max(0, player.hp - damage);

  pushLog(`[ENEMY] ${enemy.name} 반응 공격`);
  pushLog(`[ROLL] 적 반응 d${enemy.stats.strength} → ${enemyRoll}`);
  if (isDefending) pushLog(`[DEFEND] 방어로 피해 감소 ${enemyRoll} → ${damage}`);
  pushLog(`[RESULT] ${player.name} HP ${beforeHp} → ${player.hp}`);

  if (player.hp <= 0) {
    gameState.battle.result.playerDefeated = true;
    pushLog('[ERROR] 플레이어가 쓰러져 행동 불가 상태', true);
  }
}


function checkFloorClear() {
  const enemy = gameState.entities.enemy;
  if (!enemy || enemy.hp > 0) return false;

  enemy.hp = 0;
  enemy.isAlive = false;
  gameState.battle.result.enemyDefeated = true;
  gameState.world.floorCleared = true;
  gameState.session.phase = PHASES.FLOOR_CLEAR;

  pushLog(`[CLEAR] ${gameState.session.floor}층 클리어`);
  pushLog('[CLEAR] 심상세계 자동 진입 처리');
  enterImaginationWorld();
  return true;
}


function applyBasicAttack() {
  pushLog('[ACTION] 기본 공격');
  const player = gameState.entities.player;
  const enemy = gameState.entities.enemy;
  const damage = getBasicAttackDamage(player);
  const beforeHp = enemy.hp;

  enemy.hp = Math.max(0, enemy.hp - damage);
  gameState.battle.actionUsed = true;
  gameState.battle.lastActionType = 'basic_attack';

  pushLog(`[ROLL] 기본 공격 고정 피해 → ${damage}`);
  pushLog(`[RESULT] ${enemy.name} HP ${beforeHp} → ${enemy.hp}`);
  return true;
}

function applyDefend() {
  gameState.battle.actionUsed = true;
  gameState.battle.defending = true;
  gameState.battle.lastActionType = 'defend';
  pushLog('[ACTION] 방어 태세 돌입');
  return true;
}


function getFallbackSkillDamageRoll(skillId, player) {
  return rollDice(player.stats.strength + 2);
}

function applySkillAction(skill) {
  const player = gameState.entities.player;
  const enemy = gameState.entities.enemy;
  const beforeHp = enemy.hp;
  let totalDamage = 0;

  pushLog(`[ACTION] 스킬 사용: ${skill.name}`);
  pushLog(`[SKILL] ${skill.name} 사용`);

  const mpCost = Math.max(0, Number(skill.mpCost || 0));
  gameState.battle.lastActionType = 'skill';
  const beforeMp = player.mp;
  player.mp = Math.max(0, player.mp - mpCost);
  pushLog(`[SKILL] MP ${beforeMp} → ${player.mp}`);

  switch (skill.id) {
    case 'skill_power_strike': {
      const max = player.stats.strength + 4;
      const roll = rollDice(max);
      totalDamage = roll;
      pushLog(`[ROLL] 스킬 ${skill.name} d${max} → ${roll}`);
      break;
    }
    case 'skill_double_slash': {
      const max = player.stats.agility;
      const first = rollDice(max);
      const second = rollDice(max);
      totalDamage = first + second;
      pushLog(`[ROLL] 스킬 ${skill.name} 1타 d${max} → ${first}`);
      pushLog(`[ROLL] 스킬 ${skill.name} 2타 d${max} → ${second}`);
      break;
    }
    case 'skill_quick_thrust': {
      const max = player.stats.agility + 2;
      const roll = rollDice(max);
      totalDamage = roll;
      pushLog(`[ROLL] 스킬 ${skill.name} d${max} → ${roll}`);
      break;
    }
    case 'skill_mana_wave': {
      const max = player.stats.wisdom + 3;
      const roll = rollDice(max);
      totalDamage = roll;
      pushLog(`[ROLL] 스킬 ${skill.name} d${max} → ${roll}`);
      break;
    }
    default: {
      const roll = getFallbackSkillDamageRoll(skill.id, player);
      totalDamage = roll;
      pushLog(`[ROLL] 스킬 ${skill.name} d${player.stats.strength + 2} → ${roll}`);
    }
  }

  enemy.hp = Math.max(0, enemy.hp - totalDamage);
  gameState.battle.actionUsed = true;
  pushLog(`[RESULT] ${enemy.name} HP ${beforeHp} → ${enemy.hp}`);
  return true;
}

export function getUsableSkills() {
  if (gameState.session.phase !== PHASES.BATTLE) return [];
  if (gameState.battle.result.playerDefeated) return [];
  if (gameState.battle.actionUsed) return [];

  const player = gameState.entities.player;
  if (!player) return [];
  if (!Array.isArray(player.skills)) return [];

  return player.skills.map((skill) => {
    const mpCost = Math.max(0, Number(skill.mpCost || 0));
    return {
      id: skill.id,
      name: skill.name,
      description: skill.description || '',
      mpCost,
      canUse: player.mp >= mpCost,
    };
  });
}


function resolveEnemyResponseAndTurnAdvance() {
  enemyReactOnce();
  if (gameState.battle.result.playerDefeated) {
    pushLog('[TURN] 플레이어 사망으로 턴 종료, 다음 턴 시작 안 함');
    return;
  }
  beginTurn();
}


function performPlayerAction({ validate, apply, checkClear = true }) {
  if (!validate()) return;
  const applied = apply();
  if (applied === false) return;
  if (checkClear && checkFloorClear()) return;
  resolveEnemyResponseAndTurnAdvance();
}

export function useBasicAttack() {
  performPlayerAction({
    validate: () => validateAttackAllowed(gameState, pushLog),
    apply: applyBasicAttack,
    checkClear: true,
  });
}

export function useDefend() {
  performPlayerAction({
    validate: () => validateDefendAllowed(gameState, pushLog),
    apply: applyDefend,
    checkClear: false,
  });
}

export function useSkill(skillId) {
  const skill = gameState.entities.player?.skills?.find((ownedSkill) => ownedSkill.id === skillId);

  performPlayerAction({
    validate: () => validateSkillUseAllowed(gameState, skillId, pushLog),
    apply: () => {
      if (!skill) {
        pushLog('[ERROR] 보유하지 않은 스킬 사용 시도', true);
        return false;
      }
      return applySkillAction(skill);
    },
    checkClear: true,
  });
}

export function enterImaginationWorld() {
  if (!validateImaginationEntry(gameState, pushLog)) return;
  const player = gameState.entities.player;
  gameState.session.phase = PHASES.IMAGINATION_WORLD;
  gameState.world.imaginationEntered = true;
  gameState.world.imaginationStep = IMAGINATION_STEPS.ENTER;
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  player.statusEffects = [];
  pushLog('[IMAGINATION] 진입 완료, 회복 처리');
}

function processImaginationReward() {
  if (!validateRewardStepAllowed(gameState, pushLog)) return;

  if (validateRewardNotDuplicated(gameState, pushLog)) {
    const player = gameState.entities.player;
    player.level += REWARDS.LEVEL;
    player.statPoints += REWARDS.STAT_POINTS;
    player.coins += REWARDS.COINS;
    recalcDerivedStats(player);
    gameState.world.rewardsGranted = true;
    pushLog('[IMAGINATION] 보상 지급: 레벨 +5 / 스탯포인트 +15 / 코인 +1');
    pushLog('[IMAGINATION] 보상 지급 완료');
  }

  gameState.world.imaginationStep = IMAGINATION_STEPS.STAT_DISTRIBUTION;
  pushLog('[IMAGINATION] 스탯 분배 단계 진입');
}

export function allocateStat(statKey) {
  if (!validateStatAllocationAllowed(gameState, statKey, pushLog)) return;
  const player = gameState.entities.player;
  player.stats[statKey] += 1;
  player.statPoints -= 1;
  recalcDerivedStats(player);
  const label = { strength: '힘', agility: '민첩', vitality: '활력', intelligence: '지능', wisdom: '지혜', charisma: '매력' }[statKey];
  pushLog(`[STAT] ${label} +1 (남은 포인트: ${player.statPoints})`);
}

export function finishStatDistribution() {
  if (!validateStatDistributionFinishAllowed(gameState, pushLog)) return;
  const remaining = gameState.entities.player.statPoints;
  if (remaining > 0) pushLog(`[IMAGINATION] 남은 포인트 ${remaining} 상태로 분배 종료`);
  gameState.world.imaginationStep = IMAGINATION_STEPS.SKILL_CREATE;
  pushLog('[IMAGINATION] 스탯 분배 완료');
  prepareSkillChoices();
}

export function prepareSkillChoices() {
  if (!validateSkillCreatePreparationAllowed(gameState, pushLog)) return;

  const player = gameState.entities.player;
  if (player.level < 10) {
    gameState.world.skillChoices = [];
    gameState.world.imaginationStep = IMAGINATION_STEPS.SPELLBOOK_ACTION;
    pushLog('[IMAGINATION] 레벨 부족으로 스킬 생성 불가');
    pushLog('[IMAGINATION] 마법서 단계로 이동');
    prepareSpellbookChoices();
    return;
  }

  if (gameState.world.skillChoices.length > 0) return;
  gameState.world.skillChoices = pickUniqueFromPool(SKILL_POOL, 3);
  pushLog('[IMAGINATION] 스킬 생성 단계 진입');
  pushLog('[IMAGINATION] 스킬 후보 3개 준비 완료');
}

export function selectSkill(skillId) {
  if (!validateSkillSelectionAllowed(gameState, skillId, pushLog)) return;
  const selected = gameState.world.skillChoices.find((skill) => skill.id === skillId);
  gameState.entities.player.skills.push(selected);
  gameState.world.skillChoices = [];
  gameState.world.imaginationStep = IMAGINATION_STEPS.SPELLBOOK_ACTION;
  pushLog(`[SKILL] ${selected.name} 획득`);
  pushLog('[IMAGINATION] 스킬 선택 완료, 마법서 단계로 이동');
  prepareSpellbookChoices();
}

export function prepareSpellbookChoices() {
  if (!validateSpellbookPreparationAllowed(gameState, pushLog)) return;
  if (gameState.world.spellbookChoices.length > 0) return;
  gameState.world.spellbookChoices = pickUniqueFromPool(SPELLBOOK_POOL, 2);
  pushLog('[IMAGINATION] 마법서 단계 진입');
  pushLog('[IMAGINATION] 마법서 후보 2개 준비 완료');
}

export function selectSpellbook(spellbookId) {
  if (!validateSpellbookSelectionAllowed(gameState, spellbookId, pushLog)) return;
  const selected = gameState.world.spellbookChoices.find((book) => book.id === spellbookId);
  gameState.entities.player.spellbooks.push(selected);
  gameState.world.spellbookChoices = [];
  gameState.world.imaginationStep = IMAGINATION_STEPS.SHOP;
  pushLog(`[SPELLBOOK] ${selected.name} 획득`);
  pushLog('[IMAGINATION] 마법서 선택 완료, 상점 단계로 이동');
  prepareShopChoices();
}

export function skipSpellbookSelection() {
  if (!validateSpellbookSkipAllowed(gameState, pushLog)) return;
  gameState.world.spellbookChoices = [];
  gameState.world.imaginationStep = IMAGINATION_STEPS.SHOP;
  pushLog('[IMAGINATION] 마법서 선택 건너뜀');
  pushLog('[IMAGINATION] 상점 단계로 이동');
  prepareShopChoices();
}

export function prepareShopChoices() {
  if (!validateShopPreparationAllowed(gameState, pushLog)) return;
  if (gameState.world.shopChoices.length > 0) return;
  gameState.world.shopChoices = pickUniqueFromPool(SHOP_ITEM_POOL, 3);
  pushLog('[SHOP] 상점 단계 진입');
  pushLog('[SHOP] 상품 3개 준비 완료');
}

function applyShopItemEffect(item) {
  const player = gameState.entities.player;

  switch (item.effectType) {
    case 'heal_hp': {
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + item.effectValue);
      return `HP +${player.hp - before}`;
    }
    case 'heal_mp': {
      const before = player.mp;
      player.mp = Math.min(player.maxMp, player.mp + item.effectValue);
      return `MP +${player.mp - before}`;
    }
    case 'max_hp_up':
      player.baseMaxHpBonus = Number(player.baseMaxHpBonus || 0) + item.effectValue;
      recalcDerivedStats(player);
      player.hp = Math.min(player.maxHp, player.hp + item.effectValue);
      return `최대 HP +${item.effectValue}`;
    case 'max_mp_up':
      player.baseMaxMpBonus = Number(player.baseMaxMpBonus || 0) + item.effectValue;
      recalcDerivedStats(player);
      player.mp = Math.min(player.maxMp, player.mp + item.effectValue);
      return `최대 MP +${item.effectValue}`;
    case 'strength_up':
      player.stats.strength += item.effectValue;
      return `힘 +${item.effectValue}`;
    case 'agility_up':
      player.stats.agility += item.effectValue;
      return `민첩 +${item.effectValue}`;
    case 'wisdom_up':
      player.stats.wisdom += item.effectValue;
      return `지혜 +${item.effectValue}`;
    default:
      return '효과 없음';
  }
}

export function buyShopItem(itemId) {
  if (!validateShopPurchaseAllowed(gameState, itemId, pushLog)) return;

  const item = gameState.world.shopChoices.find((choice) => choice.id === itemId);
  const player = gameState.entities.player;
  player.coins -= item.price;
  gameState.world.purchasedShopItemIds.push(item.id);

  const effectResult = applyShopItemEffect(item);
  pushLog(`[SHOP] ${item.name} 구매, ${effectResult}`);
}

export function finishShop() {
  if (!validateShopFinishAllowed(gameState, pushLog)) return;

  gameState.world.imaginationStep = IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR;
  pushLog('[SHOP] 상점 종료');
  pushLog('[IMAGINATION] 다음 층 이동 가능');
}

export function proceedImaginationStep() {
  if (!validateImaginationProgressAllowed(gameState, pushLog)) return;

  switch (gameState.world.imaginationStep) {
    case IMAGINATION_STEPS.ENTER:
      gameState.world.imaginationStep = IMAGINATION_STEPS.REWARD;
      pushLog('[IMAGINATION] 보상 단계 진입');
      return;
    case IMAGINATION_STEPS.REWARD:
      processImaginationReward();
      return;
    case IMAGINATION_STEPS.STAT_DISTRIBUTION:
      pushLog('[IMAGINATION] 스탯 분배 단계에서 직접 분배 또는 완료를 선택');
      return;
    case IMAGINATION_STEPS.SKILL_CREATE:
      prepareSkillChoices();
      return;
    case IMAGINATION_STEPS.SPELLBOOK_ACTION:
      prepareSpellbookChoices();
      return;
    case IMAGINATION_STEPS.SHOP:
      prepareShopChoices();
      return;
    case IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR:
      pushLog('[IMAGINATION] 이미 다음 층 이동 가능 상태');
      return;
    default:
      pushLog('[ERROR] 알 수 없는 심상세계 단계', true);
  }
}

export function goToNextFloor() {
  if (!validateNextFloorAllowed(gameState, pushLog)) return;
  gameState.session.floor += 1;
  gameState.entities.enemy = null;
  pushLog(`[FLOOR] ${gameState.session.floor}층 준비`);
  setupFloor();
}

export function getSerializableState() {
  return clone(gameState);
}
