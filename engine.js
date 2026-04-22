import { createEnemyForFloor, createSamplePlayer, PHASES, REWARDS } from './data.js';
import { gameState, resetTurnFlags } from './state.js';
import {
  validateAttackAllowed,
  validateBattleStartAllowed,
  validateImaginationEntry,
  validateRewardNotDuplicated,
} from './validator.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function pushLog(message, isError = false) {
  gameState.logs.unshift({ message, isError });
  gameState.logs = gameState.logs.slice(0, 40);
}

function rollDice(max) {
  const safeMax = Math.max(1, Math.floor(max));
  return Math.floor(Math.random() * safeMax) + 1;
}

export function startGame() {
  // 역할: 플레이어 및 기본 게임 상태 초기화 담당
  gameState.player = createSamplePlayer();
  gameState.enemy = null;
  gameState.phase = PHASES.INIT;
  gameState.turn = 0;
  gameState.floor = 1;
  gameState.rewardsGranted = false;
  gameState.imaginationEntered = false;
  resetTurnFlags();

  pushLog('[INIT] 샘플 플레이어 로드 완료');
}

export function setupFloor() {
  // 역할: 현재 floor 기준 적 생성 + 층 준비 페이즈 전환 담당
  gameState.enemy = createEnemyForFloor(gameState.floor);
  gameState.phase = PHASES.FLOOR_SETUP;
  gameState.rewardsGranted = false;
  gameState.imaginationEntered = false;
  gameState.turn = 0;
  resetTurnFlags();

  pushLog(`[FLOOR] ${gameState.floor}층 적 생성: ${gameState.enemy.name}`);
  pushLog(`[FLOOR] ${gameState.floor}층 준비 완료`);
}

function beginTurn() {
  gameState.turn += 1;
  resetTurnFlags();

  // 확장 포인트: 이후 턴 시작 버프/디버프 훅 추가 가능
  const beforeMp = gameState.player.mp;
  gameState.player.mp = Math.min(
    gameState.player.maxMp,
    gameState.player.mp + gameState.player.mpRecovery,
  );
  const recovered = gameState.player.mp - beforeMp;
  gameState.turnMeta.mpRecoveredThisTurn = true;
  pushLog(`[TURN] ${gameState.turn}턴 시작, MP +${recovered}`);
}

export function startBattle() {
  if (!validateBattleStartAllowed(gameState, pushLog)) {
    return;
  }

  gameState.phase = PHASES.BATTLE;
  pushLog('[BATTLE] 전투 시작');
  beginTurn();
}

function enemyReactOnce() {
  if (!gameState.enemy || !gameState.enemy.isAlive) {
    return;
  }

  const enemyRoll = rollDice(gameState.enemy.stats.strength);
  const damage = enemyRoll;
  const beforeHp = gameState.player.hp;
  gameState.player.hp = Math.max(0, gameState.player.hp - damage);

  pushLog(`[ENEMY] ${gameState.enemy.name} 반응 공격`);
  pushLog(`[ROLL] 적 반응 d${gameState.enemy.stats.strength} → ${enemyRoll}`);
  pushLog(`[RESULT] ${gameState.player.name} HP ${beforeHp} → ${gameState.player.hp}`);

  if (gameState.player.hp <= 0) {
    // 확장 포인트: 패배/리스폰 시스템 연결 가능
    pushLog('[ERROR] 플레이어가 쓰러져 행동 불가 상태', true);
  }
}

function checkFloorClear() {
  if (!gameState.enemy || gameState.enemy.hp > 0) {
    return;
  }

  gameState.enemy.hp = 0;
  gameState.enemy.isAlive = false;
  gameState.phase = PHASES.FLOOR_CLEAR;
  pushLog(`[CLEAR] ${gameState.floor}층 클리어`);
  pushLog('[CLEAR] 심상세계 자동 진입 처리');
  enterImaginationWorld();
}

export function useBasicAttack() {
  if (!validateAttackAllowed(gameState, pushLog)) {
    return;
  }

  const roll = rollDice(gameState.player.stats.strength);
  const damage = roll;
  const beforeHp = gameState.enemy.hp;

  gameState.enemy.hp = Math.max(0, gameState.enemy.hp - damage);
  gameState.actionUsed = true;

  pushLog(`[ROLL] 기본 공격 d${gameState.player.stats.strength} → ${roll}`);
  pushLog(`[RESULT] ${gameState.enemy.name} HP ${beforeHp} → ${gameState.enemy.hp}`);

  if (gameState.enemy.hp <= 0) {
    checkFloorClear();
    return;
  }

  enemyReactOnce();
  beginTurn();
}

export function enterImaginationWorld() {
  if (!validateImaginationEntry(gameState, pushLog)) {
    return;
  }

  gameState.phase = PHASES.IMAGINATION_WORLD;
  gameState.imaginationEntered = true;

  // 심상세계 진입 시 회복 + 일시 상태이상 제거
  gameState.player.hp = gameState.player.maxHp;
  gameState.player.mp = gameState.player.maxMp;
  gameState.player.statusEffects = [];

  if (validateRewardNotDuplicated(gameState, pushLog)) {
    gameState.player.level += REWARDS.LEVEL;
    gameState.player.statPoints += REWARDS.STAT_POINTS;
    gameState.player.coins += REWARDS.COINS;
    gameState.rewardsGranted = true;
  }

  pushLog('[IMAGINATION] 회복 및 보상 지급 완료');
}

export function goToNextFloor() {
  if (gameState.phase !== PHASES.IMAGINATION_WORLD) {
    pushLog('[ERROR] 심상세계가 아닌데 다음 층 이동 시도', true);
    return;
  }

  gameState.floor += 1;
  gameState.enemy = null;

  pushLog(`[FLOOR] ${gameState.floor}층 준비`);
  setupFloor();
}

export function getSerializableState() {
  return clone(gameState);
}
