import { IMAGINATION_STEPS, PHASES } from './data.js';
import {
  allocateStat,
  finishStatDistribution,
  getSerializableState,
  goToNextFloor,
  proceedImaginationStep,
  setupFloor,
  startBattle,
  startGame,
  useBasicAttack,
} from './engine.js';

const elements = {
  phase: document.getElementById('phase'),
  floor: document.getElementById('floor'),
  turn: document.getElementById('turn'),
  imaginationStep: document.getElementById('imagination-step'),
  playerName: document.getElementById('player-name'),
  playerLevel: document.getElementById('player-level'),
  playerHp: document.getElementById('player-hp'),
  playerMp: document.getElementById('player-mp'),
  playerStats: document.getElementById('player-stats'),
  playerStatPoints: document.getElementById('player-stat-points'),
  playerCoins: document.getElementById('player-coins'),
  enemyName: document.getElementById('enemy-name'),
  enemyHp: document.getElementById('enemy-hp'),
  logList: document.getElementById('log-list'),
  actionButtons: document.getElementById('action-buttons'),
};

function button(label, onClick, className = '', disabled = false) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `action-btn ${className}`.trim();
  btn.textContent = label;
  btn.disabled = disabled;

  if (!disabled) {
    btn.addEventListener('click', () => {
      onClick();
      render();
    });
  }

  return btn;
}

function renderActions(state) {
  elements.actionButtons.innerHTML = '';

  if (state.session.phase === PHASES.INIT && !state.session.started) {
    elements.actionButtons.appendChild(
      button('게임 시작', () => {
        startGame();
        setupFloor();
      }),
    );
    return;
  }

  if (state.session.phase === PHASES.FLOOR_SETUP) {
    if (state.entities.enemy && state.entities.enemy.isAlive) {
      elements.actionButtons.appendChild(button('전투 시작', startBattle));
    } else {
      elements.actionButtons.appendChild(
        button('적 생성 대기중', () => {}, 'secondary', true),
      );
    }
    return;
  }

  if (state.session.phase === PHASES.BATTLE) {
    if (state.battle.result.playerDefeated) {
      elements.actionButtons.appendChild(
        button('행동 불가', () => {}, 'secondary', true),
      );
    } else {
      elements.actionButtons.appendChild(button('기본 공격', useBasicAttack));
    }
    return;
  }

  if (state.session.phase === PHASES.IMAGINATION_WORLD) {
    const step = state.world.imaginationStep;

    if (step === IMAGINATION_STEPS.ENTER) {
      elements.actionButtons.appendChild(button('다음', proceedImaginationStep));
      return;
    }

    if (step === IMAGINATION_STEPS.REWARD) {
      elements.actionButtons.appendChild(button('보상 받기', proceedImaginationStep));
      return;
    }

    if (step === IMAGINATION_STEPS.STAT_DISTRIBUTION) {
      const canAllocate = state.entities.player && state.entities.player.statPoints > 0;

      elements.actionButtons.appendChild(
        button('힘 +1', () => allocateStat('strength'), '', !canAllocate),
      );
      elements.actionButtons.appendChild(
        button('민첩 +1', () => allocateStat('agility'), '', !canAllocate),
      );
      elements.actionButtons.appendChild(
        button('지혜 +1', () => allocateStat('wisdom'), '', !canAllocate),
      );
      elements.actionButtons.appendChild(button('분배 완료', finishStatDistribution, 'secondary'));
      return;
    }

    if (
      step === IMAGINATION_STEPS.SKILL_CREATE ||
      step === IMAGINATION_STEPS.SPELLBOOK_ACTION ||
      step === IMAGINATION_STEPS.SHOP
    ) {
      elements.actionButtons.appendChild(button('다음', proceedImaginationStep));
      return;
    }

    if (step === IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR) {
      elements.actionButtons.appendChild(button('다음 층으로', goToNextFloor));
      return;
    }

    elements.actionButtons.appendChild(button('진행 불가', () => {}, 'secondary', true));
  }
}

function renderLogs(state) {
  elements.logList.innerHTML = '';

  state.logs.slice(0, 15).forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.message;
    if (entry.isError) {
      li.classList.add('error');
    }
    elements.logList.appendChild(li);
  });
}

function render() {
  const state = getSerializableState();
  const player = state.entities.player;
  const enemy = state.entities.enemy;

  elements.phase.textContent = state.session.phase;
  elements.floor.textContent = String(state.session.floor);
  elements.turn.textContent = String(state.battle.turn);
  elements.imaginationStep.textContent = state.world.imaginationStep;

  if (player) {
    elements.playerName.textContent = player.name;
    elements.playerLevel.textContent = String(player.level);
    elements.playerHp.textContent = `${player.hp} / ${player.maxHp}`;
    elements.playerMp.textContent = `${player.mp} / ${player.maxMp}`;
    elements.playerStats.textContent = `${player.stats.strength} / ${player.stats.agility} / ${player.stats.wisdom}`;
    elements.playerStatPoints.textContent = String(player.statPoints);
    elements.playerCoins.textContent = String(player.coins);
  }

  if (enemy) {
    elements.enemyName.textContent = enemy.name;
    elements.enemyHp.textContent = `${enemy.hp} / ${enemy.maxHp}`;
  } else {
    elements.enemyName.textContent = '없음';
    elements.enemyHp.textContent = '-';
  }

  renderActions(state);
  renderLogs(state);
}

render();
