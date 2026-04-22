import { PHASES } from './data.js';
import {
  getSerializableState,
  goToNextFloor,
  setupFloor,
  startBattle,
  startGame,
  useBasicAttack,
} from './engine.js';

const elements = {
  phase: document.getElementById('phase'),
  floor: document.getElementById('floor'),
  turn: document.getElementById('turn'),
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

  if (state.phase === PHASES.INIT) {
    elements.actionButtons.appendChild(
      button('게임 시작', () => {
        startGame();
        setupFloor();
      }),
    );
    return;
  }

  if (state.phase === PHASES.FLOOR_SETUP) {
    if (state.enemy && state.enemy.isAlive) {
      elements.actionButtons.appendChild(button('전투 시작', startBattle));
    } else {
      elements.actionButtons.appendChild(
        button('적 생성 대기중', () => {}, 'secondary', true),
      );
    }
    return;
  }

  if (state.phase === PHASES.BATTLE) {
    elements.actionButtons.appendChild(button('기본 공격', useBasicAttack));
    return;
  }

  if (state.phase === PHASES.IMAGINATION_WORLD) {
    elements.actionButtons.appendChild(button('다음 층으로', goToNextFloor));
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

  elements.phase.textContent = state.phase;
  elements.floor.textContent = String(state.floor);
  elements.turn.textContent = String(state.turn);

  if (state.player) {
    elements.playerName.textContent = state.player.name;
    elements.playerLevel.textContent = String(state.player.level);
    elements.playerHp.textContent = `${state.player.hp} / ${state.player.maxHp}`;
    elements.playerMp.textContent = `${state.player.mp} / ${state.player.maxMp}`;
    elements.playerStats.textContent = `${state.player.stats.strength} / ${state.player.stats.agility} / ${state.player.stats.wisdom}`;
    elements.playerStatPoints.textContent = String(state.player.statPoints);
    elements.playerCoins.textContent = String(state.player.coins);
  }

  if (state.enemy) {
    elements.enemyName.textContent = state.enemy.name;
    elements.enemyHp.textContent = `${state.enemy.hp} / ${state.enemy.maxHp}`;
  } else {
    elements.enemyName.textContent = '없음';
    elements.enemyHp.textContent = '-';
  }

  renderActions(state);
  renderLogs(state);
}

render();
