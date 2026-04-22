import { createEnemyForFloor, createSamplePlayer, IMAGINATION_STEPS, PHASES, REWARDS } from './data.js';
import { gameState, resetBattleState, resetTurnFlags, resetWorldState } from './state.js';
import {
  validateAttackAllowed,
  validateBattleStartAllowed,
  validateImaginationEntry,
  validateImaginationProgressAllowed,
  validateNextFloorAllowed,
  validateRewardNotDuplicated,
  validateRewardStepAllowed,
} from './validator.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

export function startGame() {
  // 역할: 플레이어 및 세션 초기화
  gameState.entities.player = createSamplePlayer();
  gameState.entities.enemy = null;

  gameState.session.started = true;
  gameState.session.phase = PHASES.INIT;
  gameState.session.floor = 1;

  resetBattleState();
  resetWorldState();

  pushLog('[INIT] 샘플 플레이어 로드 완료');
}

export function setupFloor() {
  // 역할: "새 층 시작"만 담당한다.
  // - 새 적 생성
  // - session.phase를 FLOOR_SETUP으로 전환
  // - 새 층 기준 battle/world 플래그 초기화
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
  if (!validateBattleStartAllowed(gameState, pushLog)) {
    return;
  }

  gameState.session.phase = PHASES.BATTLE;
  pushLog('[BATTLE] 전투 시작');
  beginTurn();
}

function enemyReactOnce() {
  const player = gameState.entities.player;
  const enemy = gameState.entities.enemy;

  if (!enemy || !enemy.isAlive) {
    return;
  }

  const enemyRoll = rollDice(enemy.stats.strength);
  const damage = enemyRoll;
  const beforeHp = player.hp;
  player.hp = Math.max(0, player.hp - damage);

  pushLog(`[ENEMY] ${enemy.name} 반응 공격`);
  pushLog(`[ROLL] 적 반응 d${enemy.stats.strength} → ${enemyRoll}`);
  pushLog(`[RESULT] ${player.name} HP ${beforeHp} → ${player.hp}`);

  if (player.hp <= 0) {
    gameState.battle.result.playerDefeated = true;
    pushLog('[ERROR] 플레이어가 쓰러져 행동 불가 상태', true);
  }
}

function checkFloorClear() {
  const enemy = gameState.entities.enemy;

  if (!enemy || enemy.hp > 0) {
    return false;
  }

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

export function useBasicAttack() {
  if (!validateAttackAllowed(gameState, pushLog)) {
    return;
  }

  const player = gameState.entities.player;
  const enemy = gameState.entities.enemy;

  const roll = rollDice(player.stats.strength);
  const damage = roll;
  const beforeHp = enemy.hp;

  enemy.hp = Math.max(0, enemy.hp - damage);
  gameState.battle.actionUsed = true;

  pushLog(`[ROLL] 기본 공격 d${player.stats.strength} → ${roll}`);
  pushLog(`[RESULT] ${enemy.name} HP ${beforeHp} → ${enemy.hp}`);

  if (checkFloorClear()) {
    return;
  }

  enemyReactOnce();

  if (gameState.battle.result.playerDefeated) {
    pushLog('[TURN] 플레이어 사망으로 턴 종료, 다음 턴 시작 안 함');
    return;
  }

  beginTurn();
}

export function enterImaginationWorld() {
  if (!validateImaginationEntry(gameState, pushLog)) {
    return;
  }

  const player = gameState.entities.player;

  gameState.session.phase = PHASES.IMAGINATION_WORLD;
  gameState.world.imaginationEntered = true;
  gameState.world.imaginationStep = IMAGINATION_STEPS.ENTER;

  // 진입 시점에는 회복만 처리하고, 보상은 REWARD 단계에서 처리한다.
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  player.statusEffects = [];

  pushLog('[IMAGINATION] 진입 완료, 회복 처리');
}

function processImaginationReward() {
  if (!validateRewardStepAllowed(gameState, pushLog)) {
    return;
  }

  if (validateRewardNotDuplicated(gameState, pushLog)) {
    const player = gameState.entities.player;
    player.level += REWARDS.LEVEL;
    player.statPoints += REWARDS.STAT_POINTS;
    player.coins += REWARDS.COINS;
    gameState.world.rewardsGranted = true;

    pushLog('[IMAGINATION] 보상 지급: 레벨 +5 / 스탯포인트 +15 / 코인 +1');
    pushLog('[IMAGINATION] 보상 지급 완료');
  }

  gameState.world.imaginationStep = IMAGINATION_STEPS.STAT_DISTRIBUTION;
}

export function proceedImaginationStep() {
  if (!validateImaginationProgressAllowed(gameState, pushLog)) {
    return;
  }

  const step = gameState.world.imaginationStep;

  if (step === IMAGINATION_STEPS.ENTER) {
    gameState.world.imaginationStep = IMAGINATION_STEPS.REWARD;
    pushLog('[IMAGINATION] 보상 단계 진입');
    return;
  }

  if (step === IMAGINATION_STEPS.REWARD) {
    processImaginationReward();
    return;
  }

  if (step === IMAGINATION_STEPS.STAT_DISTRIBUTION) {
    pushLog('[IMAGINATION] 스탯 분배 단계 (임시)');
    gameState.world.imaginationStep = IMAGINATION_STEPS.SKILL_CREATE;
    return;
  }

  if (step === IMAGINATION_STEPS.SKILL_CREATE) {
    pushLog('[IMAGINATION] 스킬 생성 단계 (임시)');
    gameState.world.imaginationStep = IMAGINATION_STEPS.SPELLBOOK_ACTION;
    return;
  }

  if (step === IMAGINATION_STEPS.SPELLBOOK_ACTION) {
    pushLog('[IMAGINATION] 마법서 단계 (임시)');
    gameState.world.imaginationStep = IMAGINATION_STEPS.SHOP;
    return;
  }

  if (step === IMAGINATION_STEPS.SHOP) {
    pushLog('[IMAGINATION] 상점 단계 (임시)');
    gameState.world.imaginationStep = IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR;
    pushLog('[IMAGINATION] 다음 층 이동 가능');
    return;
  }

  if (step === IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR) {
    pushLog('[IMAGINATION] 이미 다음 층 이동 가능 상태');
    return;
  }

  pushLog('[ERROR] 알 수 없는 심상세계 단계', true);
}

export function goToNextFloor() {
  if (!validateNextFloorAllowed(gameState, pushLog)) {
    return;
  }

  gameState.session.floor += 1;
  gameState.entities.enemy = null;

  pushLog(`[FLOOR] ${gameState.session.floor}층 준비`);
  setupFloor();
}

export function getSerializableState() {
  return clone(gameState);
}
