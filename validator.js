import { IMAGINATION_STEPS, PHASES } from './data.js';

function fail(logFn, message) {
  logFn(`[ERROR] ${message}`, true);
  return false;
}

export function validateAttackAllowed(state, logFn) {
  if (state.session.phase !== PHASES.BATTLE) {
    return fail(logFn, 'BATTLE 페이즈가 아닌데 공격이 실행됨');
  }

  if (!state.entities.player) {
    return fail(logFn, '플레이어 정보가 없는데 공격 시도');
  }

  if (state.battle.result.playerDefeated) {
    return fail(logFn, '플레이어 사망 상태로 공격 시도');
  }

  if (state.entities.player.hp <= 0) {
    return fail(logFn, '플레이어 HP 0 상태로 공격 시도');
  }

  if (!state.battle.turnMeta.mpRecoveredThisTurn) {
    return fail(logFn, '턴 시작 MP 회복이 누락된 상태에서 공격 시도');
  }

  if (!state.entities.enemy) {
    return fail(logFn, '적이 없는데 전투가 진행됨');
  }

  if (state.battle.result.enemyDefeated || !state.entities.enemy.isAlive || state.entities.enemy.hp <= 0) {
    return fail(logFn, '이미 죽은 적에게 다시 공격 시도');
  }

  if (state.battle.actionUsed) {
    return fail(logFn, '이미 행동을 사용한 턴에 다시 공격 시도');
  }

  return true;
}

export function validateBattleStartAllowed(state, logFn) {
  if (state.session.phase !== PHASES.FLOOR_SETUP) {
    return fail(logFn, 'FLOOR_SETUP이 아닌데 전투 시작 시도');
  }

  if (!state.entities.enemy) {
    return fail(logFn, '적이 없는 상태에서 전투 시작 시도');
  }

  if (state.battle.result.enemyDefeated || !state.entities.enemy.isAlive || state.entities.enemy.hp <= 0) {
    return fail(logFn, '이미 전투 불가한 적으로 전투 시작 시도');
  }

  return true;
}

export function validateRewardNotDuplicated(state, logFn) {
  if (state.world.rewardsGranted) {
    return fail(logFn, '보상이 중복 지급되려 함');
  }

  return true;
}

export function validateImaginationEntry(state, logFn) {
  if (state.session.phase !== PHASES.FLOOR_CLEAR) {
    return fail(logFn, '층 클리어 전에 심상세계 진입 시도');
  }

  return true;
}

export function validateImaginationProgressAllowed(state, logFn) {
  if (state.session.phase !== PHASES.IMAGINATION_WORLD) {
    return fail(logFn, '심상세계가 아닌데 단계 진행 시도');
  }

  if (!state.world.imaginationEntered) {
    return fail(logFn, '심상세계 미진입 상태에서 단계 진행 시도');
  }

  return true;
}

export function validateRewardStepAllowed(state, logFn) {
  if (state.world.imaginationStep !== IMAGINATION_STEPS.REWARD) {
    return fail(logFn, 'REWARD 단계가 아닌데 보상 처리 시도');
  }

  return true;
}

export function validateNextFloorAllowed(state, logFn) {
  if (state.session.phase !== PHASES.IMAGINATION_WORLD) {
    return fail(logFn, '심상세계가 아닌데 다음 층 이동 시도');
  }

  if (state.world.imaginationStep !== IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR) {
    return fail(logFn, '다음 층 준비 단계 이전에 이동 시도');
  }

  return true;
}

export function validateStatAllocationAllowed(state, statKey, logFn) {
  if (!validateImaginationProgressAllowed(state, logFn)) {
    return false;
  }

  if (state.world.imaginationStep !== IMAGINATION_STEPS.STAT_DISTRIBUTION) {
    return fail(logFn, '스탯 분배 단계가 아닌데 분배 시도');
  }

  if (!state.entities.player) {
    return fail(logFn, '플레이어 정보 없이 스탯 분배 시도');
  }

  if (state.entities.player.statPoints <= 0) {
    return fail(logFn, '포인트가 없는데 스탯 분배 시도');
  }

  if (!['strength', 'agility', 'wisdom'].includes(statKey)) {
    return fail(logFn, '유효하지 않은 스탯 키 분배 시도');
  }

  return true;
}

export function validateStatDistributionFinishAllowed(state, logFn) {
  if (!validateImaginationProgressAllowed(state, logFn)) {
    return false;
  }

  if (state.world.imaginationStep !== IMAGINATION_STEPS.STAT_DISTRIBUTION) {
    return fail(logFn, '스탯 분배 단계가 아닌데 분배 완료 시도');
  }

  return true;
}

export function validateSkillCreatePreparationAllowed(state, logFn) {
  if (!validateImaginationProgressAllowed(state, logFn)) {
    return false;
  }

  if (state.world.imaginationStep !== IMAGINATION_STEPS.SKILL_CREATE) {
    return fail(logFn, '스킬 생성 단계가 아닌데 후보 준비 시도');
  }

  return true;
}

export function validateSkillSelectionAllowed(state, skillId, logFn) {
  if (!validateImaginationProgressAllowed(state, logFn)) {
    return false;
  }

  if (state.world.imaginationStep !== IMAGINATION_STEPS.SKILL_CREATE) {
    return fail(logFn, '스킬 생성 단계가 아닌데 스킬 선택 시도');
  }

  if (!state.entities.player) {
    return fail(logFn, '플레이어 정보 없이 스킬 선택 시도');
  }

  if (!Array.isArray(state.world.skillChoices) || state.world.skillChoices.length === 0) {
    return fail(logFn, '스킬 후보가 없는 상태에서 선택 시도');
  }

  const exists = state.world.skillChoices.some((skill) => skill.id === skillId);
  if (!exists) {
    return fail(logFn, '후보에 없는 스킬 선택 시도');
  }

  return true;
}
