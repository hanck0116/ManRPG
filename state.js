import { IMAGINATION_STEPS, PHASES } from './data.js';

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
    floorCleared: false,
    imaginationEntered: false,
    rewardsGranted: false,
    imaginationStep: IMAGINATION_STEPS.NONE,
    skillChoices: [],
    spellbookChoices: [],
    shopChoices: [],
    purchasedShopItemIds: [],
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
  gameState.world.spellbookChoices = [];
  gameState.world.shopChoices = [];
  gameState.world.purchasedShopItemIds = [];
}
