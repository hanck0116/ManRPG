import { IMAGINATION_STEPS, PHASES } from './data.js';
import {
  allocateStat,
  buyShopItem,
  finishShop,
  finishStatDistribution,
  getSerializableState,
  goToNextFloor,
  proceedImaginationStep,
  selectSkill,
  selectSpellbook,
  setupFloor,
  skipSpellbookSelection,
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
  playerSkills: document.getElementById('player-skills'),
  playerSpellbooks: document.getElementById('player-spellbooks'),
  enemyName: document.getElementById('enemy-name'),
  enemyHp: document.getElementById('enemy-hp'),
  logList: document.getElementById('log-list'),
  actionButtons: document.getElementById('action-buttons'),
};

function button(label, onClick, className = '', disabled = false, title = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `action-btn ${className}`.trim();
  btn.textContent = label;
  btn.disabled = disabled;
  if (title) btn.title = title;

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
    elements.actionButtons.appendChild(button('게임 시작', () => { startGame(); setupFloor(); }));
    return;
  }

  if (state.session.phase === PHASES.FLOOR_SETUP) {
    if (state.entities.enemy && state.entities.enemy.isAlive) {
      elements.actionButtons.appendChild(button('전투 시작', startBattle));
    } else {
      elements.actionButtons.appendChild(button('적 생성 대기중', () => {}, 'secondary', true));
    }
    return;
  }

  if (state.session.phase === PHASES.BATTLE) {
    elements.actionButtons.appendChild(
      state.battle.result.playerDefeated
        ? button('행동 불가', () => {}, 'secondary', true)
        : button('기본 공격', useBasicAttack),
    );
    return;
  }

  if (state.session.phase !== PHASES.IMAGINATION_WORLD) return;

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
    elements.actionButtons.appendChild(button('힘 +1', () => allocateStat('strength'), '', !canAllocate));
    elements.actionButtons.appendChild(button('민첩 +1', () => allocateStat('agility'), '', !canAllocate));
    elements.actionButtons.appendChild(button('지혜 +1', () => allocateStat('wisdom'), '', !canAllocate));
    elements.actionButtons.appendChild(button('분배 완료', finishStatDistribution, 'secondary'));
    return;
  }

  if (step === IMAGINATION_STEPS.SKILL_CREATE) {
    const choices = state.world.skillChoices || [];
    if (choices.length === 0) {
      elements.actionButtons.appendChild(button('후보 준비', proceedImaginationStep));
      return;
    }
    choices.forEach((skill) => {
      elements.actionButtons.appendChild(button(skill.name, () => selectSkill(skill.id), '', false, skill.description));
    });
    return;
  }

  if (step === IMAGINATION_STEPS.SPELLBOOK_ACTION) {
    const choices = state.world.spellbookChoices || [];
    if (choices.length === 0) {
      elements.actionButtons.appendChild(button('후보 준비', proceedImaginationStep));
      return;
    }
    choices.forEach((book) => {
      elements.actionButtons.appendChild(button(book.name, () => selectSpellbook(book.id), '', false, book.description));
    });
    elements.actionButtons.appendChild(button('건너뛰기', skipSpellbookSelection, 'secondary'));
    return;
  }

  if (step === IMAGINATION_STEPS.SHOP) {
    const choices = state.world.shopChoices || [];
    const purchased = state.world.purchasedShopItemIds || [];

    if (choices.length === 0) {
      elements.actionButtons.appendChild(button('상품 준비', proceedImaginationStep));
      return;
    }

    choices.forEach((item) => {
      const isPurchased = purchased.includes(item.id);
      const disabled = isPurchased;
      const label = `${item.name} (${item.price}코인)${isPurchased ? ' - 구매 완료' : ''}`;
      const title = `${item.description} / 가격: ${item.price}`;
      elements.actionButtons.appendChild(
        button(label, () => buyShopItem(item.id), isPurchased ? 'secondary' : '', disabled, title),
      );
    });

    elements.actionButtons.appendChild(button('상점 종료', finishShop, 'secondary'));
    return;
  }

  if (step === IMAGINATION_STEPS.READY_FOR_NEXT_FLOOR) {
    elements.actionButtons.appendChild(button('다음 층으로', goToNextFloor));
    return;
  }

  elements.actionButtons.appendChild(button('진행 불가', () => {}, 'secondary', true));
}

function renderLogs(state) {
  elements.logList.innerHTML = '';
  state.logs.slice(0, 15).forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.message;
    if (entry.isError) li.classList.add('error');
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
    elements.playerSkills.textContent = player.skills.length ? player.skills.map((s) => s.name).join(', ') : '없음';
    elements.playerSpellbooks.textContent = player.spellbooks.length ? player.spellbooks.map((b) => b.name).join(', ') : '없음';
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
