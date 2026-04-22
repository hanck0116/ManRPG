import { PHASES } from './data.js';

export const gameState = {
  phase: PHASES.INIT,
  floor: 1,
  turn: 0,
  player: null,
  enemy: null,
  logs: [],
  actionUsed: false,
  bonusAttackUsed: false,
  rewardsGranted: false,
  imaginationEntered: false,
  turnMeta: {
    mpRecoveredThisTurn: false,
  },
};

export function resetTurnFlags() {
  gameState.actionUsed = false;
  gameState.bonusAttackUsed = false;
  gameState.turnMeta.mpRecoveredThisTurn = false;
}
