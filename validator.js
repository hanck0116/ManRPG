import { PHASES } from './data.js';

function fail(logFn, message) {
  logFn(`[ERROR] ${message}`, true);
  return false;
}

export function validateAttackAllowed(state, logFn) {
  if (state.phase !== PHASES.BATTLE) {
    return fail(logFn, 'BATTLE 페이즈가 아닌데 공격이 실행됨');
  }

  if (!state.player) {
    return fail(logFn, '플레이어 정보가 없는데 공격 시도');
  }

  if (state.player.hp <= 0) {
    return fail(logFn, '플레이어 사망 상태로 공격 시도');
  }

  if (!state.turnMeta.mpRecoveredThisTurn) {
    return fail(logFn, '턴 시작 MP 회복이 누락된 상태에서 공격 시도');
  }

  if (!state.enemy) {
    return fail(logFn, '적이 없는데 전투가 진행됨');
  }

  if (!state.enemy.isAlive || state.enemy.hp <= 0) {
    return fail(logFn, '이미 죽은 적에게 다시 공격 시도');
  }

  if (state.actionUsed) {
    return fail(logFn, '이미 행동을 사용한 턴에 다시 공격 시도');
  }

  return true;
}

export function validateBattleStartAllowed(state, logFn) {
  if (state.phase !== PHASES.FLOOR_SETUP) {
    return fail(logFn, 'FLOOR_SETUP이 아닌데 전투 시작 시도');
  }

  if (!state.enemy) {
    return fail(logFn, '적이 없는 상태에서 전투 시작 시도');
  }

  if (!state.enemy.isAlive || state.enemy.hp <= 0) {
    return fail(logFn, '이미 전투 불가한 적으로 전투 시작 시도');
  }

  return true;
}

export function validateRewardNotDuplicated(state, logFn) {
  if (state.rewardsGranted) {
    return fail(logFn, '보상이 중복 지급되려 함');
  }

  return true;
}

export function validateImaginationEntry(state, logFn) {
  if (state.phase !== PHASES.FLOOR_CLEAR) {
    return fail(logFn, '층 클리어 전에 심상세계 진입 시도');
  }

  return true;
}
