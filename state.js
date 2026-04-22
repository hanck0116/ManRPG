import { IMAGINATION_STEPS, PHASES } from './data.js';

// gameState를 영역별로 분리해 각 책임을 명확히 한다.
// - session: 게임 전체 진행 메타(페이즈/층/시작 여부)
// - battle: 전투 턴/행동/전투 결과
// - world: 층 클리어/심상세계/보상 처리 상태
// - entities: 실제 전투 참여 데이터(플레이어/적)
// - ui: 렌더링 보조 상태
// - logs: 디버깅/플레이 로그
export const gameState = {
  session: {
    phase: PHASES.INIT,
    floor: 1,
    started: false,
  },
  battle: {
    turn: 0,
    actionUsed: false,
    bonusAttackUsed: false,
    turnMeta: {
      mpRecoveredThisTurn: false,
    },
    result: {
      playerDefeated: false,
      enemyDefeated: false,
    },
  },
  world: {
    // floorCleared: 적 처치 시 true, 새 층 준비(setupFloor)에서 false
    floorCleared: false,
    // imaginationEntered: 심상세계 진입 시 true, 새 층 준비에서 false
    imaginationEntered: false,
    // rewardsGranted: REWARD 단계에서 보상 지급 시 true, 새 층 준비에서 false
    rewardsGranted: false,
    // imaginationStep: 심상세계 진행 단계
    imaginationStep: IMAGINATION_STEPS.NONE,
    // skillChoices: SKILL_CREATE 단계에서 표시할 후보 3개
    skillChoices: [],
  },
  entities: {
    player: null,
    enemy: null,
  },
  ui: {
    lastMessage: '',
  },
  logs: [],
};

export function resetTurnFlags() {
  gameState.battle.actionUsed = false;
  gameState.battle.bonusAttackUsed = false;
  gameState.battle.turnMeta.mpRecoveredThisTurn = false;
}

export function resetBattleState() {
  gameState.battle.turn = 0;
  resetTurnFlags();
  gameState.battle.result.playerDefeated = false;
  gameState.battle.result.enemyDefeated = false;
}

export function resetWorldState() {
  gameState.world.floorCleared = false;
  gameState.world.imaginationEntered = false;
  gameState.world.rewardsGranted = false;
  gameState.world.imaginationStep = IMAGINATION_STEPS.NONE;
  gameState.world.skillChoices = [];
}
