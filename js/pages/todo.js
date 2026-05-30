'use strict';
/**
 * pages/todo.js — びちくえ！画面（備蓄クエスト）
 *
 * 役割：利用者が「次にやるべき備蓄行動」を確認・実行する場所
 *
 * 3セクション構成：
 *   1. 優先アクション  — 不足上位3件＋期限間近上位2件を1画面でサマリー
 *   2. 不足している備蓄 — 全不足品目（「追加する」→ 登録画面へ）
 *   3. 期限が近いもの  — 30日以内の品目（「使った」→ 数量モーダル）
 *
 * データは stockItems × masterList から都度生成（永続保存なし）。
 * TODO: 将来的には questHistory を保存し、週次クエストの達成履歴を管理する
 */
import { storage }                               from '../storage.js';
import { buildCalcParams, getFilteredMasterList } from '../masterData.js';
import { showToast }                             from '../ui.js';

/** 期限アイテム抽出のしきい値（日） */
const EXPIRY_WINDOW = 30;

export const todoPage = {
  template() {
    return `
      <div id="todo-priority"></div>
      <div id="todo-shortfall"></div>
      <div id="todo-expiry"></div>
    `;
  },

  init() {
    this.render();
  },

  render() {
    const data = storage.get();

    if (data.profiles.length === 0) {
      document.getElementById('todo-priority').innerHTML = `
        <div class="empty-state">
          <p>「くらし方」が未設定のため、推奨量を計算できません。</p>
          <a href="#lifestyle" class="btn btn-primary">くらし方を設定する</a>
        </div>
      `;
      ['todo-shortfall', 'todo-expiry'].forEach(id => {
        document.getElementById(id).innerHTML = '';
      });
      return;
    }

    const params     = buildCalcParams(data);
    const days       = data.settings.stockpileDays;
    const masterList = getFilteredMasterList(data.customMasterItems, data.settings);
    const today      = new Date();

    // ── 在庫を ID でまとめる ────────────────────────
    const stockById = {};
    data.stockItems.forEach(s => {
      const key = s.masterId || s.customId;
      if (!key) return;
      stockById[key] = (stockById[key] || 0) + (parseFloat(s.qty) || 0);
    });

    // ── 不足リストを生成 ────────────────────────────
    const shortfalls = [];
    masterList.forEach(item => {
      if (!item.calc || !item.isNeeded(params)) return;
      const required = item.calc(params, days);
      if (required <= 0) return;
      const current  = stockById[item.id] || 0;
      const shortage = required - current;
      if (shortage > 0) {
        shortfalls.push({ ...item, required, current, shortage });
      }
    });
    // 不足率が高い順に並べる
    shortfalls.sort((a, b) => (b.shortage / b.required) - (a.shortage / a.required));

    // ── 期限アイテムを生成 ──────────────────────────
    const expiryItems = [];
    data.stockItems.forEach(s => {
      if (!s.expiry) return;
      const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
      if (diff <= EXPIRY_WINDOW) {
        expiryItems.push({ ...s, diff });
      }
    });
    expiryItems.sort((a, b) => a.diff - b.diff);

    // ── 各セクションを描画 ──────────────────────────
    this._renderPriority(shortfalls, expiryItems);
    this._renderShortfall(shortfalls);
    this._renderExpiry(expiryItems);

    // ── イベント委譲（追加・使った） ────────────────
    this._attachEvents();
  },

  // ─────────────────────────────────────────────────
  //  セクション描画メソッド
  // ─────────────────────────────────────────────────

  _renderPriority(shortfalls, expiryItems) {
    const el          = document.getElementById('todo-priority');
    const topShort    = shortfalls.slice(0, 3);
    const topExpiry   = expiryItems.slice(0, 2);

    if (topShort.length === 0 && topExpiry.length === 0) {
      el.innerHTML = `
        <div class="todo-section">
          <h3 class="todo-section__title">優先アクション</h3>
          <div class="todo-empty">
            <div class="todo-empty__icon">✓</div>
            <p class="todo-empty__msg">今すぐやることはありません<br>備えは順調です！</p>
          </div>
        </div>
      `;
      return;
    }

    const cards = [
      ...topShort.map(item => this._shortfallCard(item, true)),
      ...topExpiry.map(s    => this._expiryCard(s,    true)),
    ].join('');

    el.innerHTML = `
      <div class="todo-section">
        <h3 class="todo-section__title">優先アクション</h3>
        ${cards}
      </div>
    `;
  },

  _renderShortfall(shortfalls) {
    const el = document.getElementById('todo-shortfall');
    if (shortfalls.length === 0) {
      el.innerHTML = `
        <div class="todo-section">
          <h3 class="todo-section__title">
            不足している備蓄
          </h3>
          <p class="todo-empty-text">不足している品目はありません 🎉</p>
        </div>
      `;
      return;
    }
    el.innerHTML = `
      <div class="todo-section">
        <h3 class="todo-section__title">
          不足している備蓄
          <span class="todo-count">${shortfalls.length}</span>
        </h3>
        ${shortfalls.map(item => this._shortfallCard(item, false)).join('')}
      </div>
    `;
  },

  _renderExpiry(expiryItems) {
    const el = document.getElementById('todo-expiry');
    if (expiryItems.length === 0) {
      el.innerHTML = `
        <div class="todo-section">
          <h3 class="todo-section__title">期限が近いもの</h3>
          <p class="todo-empty-text">期限が近い品目はありません</p>
        </div>
      `;
      return;
    }
    el.innerHTML = `
      <div class="todo-section">
        <h3 class="todo-section__title">
          期限が近いもの
          <span class="todo-count">${expiryItems.length}</span>
        </h3>
        ${expiryItems.map(s => this._expiryCard(s, false)).join('')}
      </div>
    `;
  },

  // ─────────────────────────────────────────────────
  //  カードHTML生成ヘルパー
  // ─────────────────────────────────────────────────

  _shortfallCard(item, compact) {
    const pct = Math.round((item.current / item.required) * 100);
    return `
      <div class="todo-card todo-card--shortfall">
        <span class="todo-badge todo-badge--high">補充</span>
        <div class="todo-card__body">
          <div class="todo-card__title">
            ${item.name}
            ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
          </div>
          ${compact ? '' : `
            <div class="todo-card__progress">
              <div class="progress-bar progress-bar--sm">
                <div class="progress-bar__inner ${pct >= 50 ? 'is-medium' : 'is-low'}"
                  style="width:${pct}%"></div>
              </div>
              <span class="todo-card__pct">${pct}%</span>
            </div>
          `}
          <div class="todo-card__meta">
            あと <strong>${Math.ceil(item.shortage).toLocaleString()} ${item.unit}</strong> 不足
          </div>
        </div>
        <button class="btn btn-sm btn-primary js-todo-add"
          data-master-id="${item.id}"
          data-name="${item.name}"
          data-unit="${item.unit}">追加する</button>
      </div>
    `;
  },

  _expiryCard(s, compact) {
    const diff     = s.diff;
    const expired  = diff <= 0;
    const label    = expired ? '期限切れ' : `あと${diff}日`;
    const badgeCls = expired ? 'todo-badge--expired' : 'todo-badge--warn';
    const badgeTxt = expired ? '期限切れ'           : '期限間近';
    return `
      <div class="todo-card todo-card--expiry ${expired ? 'is-expired' : ''}">
        <span class="todo-badge ${badgeCls}">${badgeTxt}</span>
        <div class="todo-card__body">
          <div class="todo-card__title">${s.productName || s.itemName}</div>
          <div class="todo-card__meta">
            ${label}
            ${compact ? '' : ` / ${s.qty} ${s.unit}`}
          </div>
        </div>
        <button class="btn btn-sm btn-secondary js-todo-use"
          data-id="${s.id}"
          data-name="${s.productName || s.itemName}"
          data-master-id="${s.masterId || s.customId || ''}"
          data-unit="${s.unit}">使った</button>
      </div>
    `;
  },

  // ─────────────────────────────────────────────────
  //  イベント処理
  // ─────────────────────────────────────────────────

  _attachEvents() {
    // 「追加する」— 全セクションに委譲
    ['todo-priority', 'todo-shortfall'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        const btn = e.target.closest('.js-todo-add');
        if (!btn) return;
        sessionStorage.setItem('newItemFromTodo', JSON.stringify({
          masterId: btn.dataset.masterId,
          name:     btn.dataset.name,
          unit:     btn.dataset.unit,
        }));
        window.location.hash = '#register';
      });
    });

    // 「使った」— 期限セクション＋優先アクションに委譲
    ['todo-priority', 'todo-expiry'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        const btn = e.target.closest('.js-todo-use');
        if (!btn) return;
        e.stopPropagation();
        this._showUseModal(btn.dataset);
      });
    });
  },

  _showUseModal({ id, name, masterId, unit }) {
    document.getElementById('use-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id        = 'use-modal';
    overlay.innerHTML = `
      <div class="modal">
        <p class="modal__message">「${name}」を何${unit}使いましたか？</p>
        <div class="form-group" style="margin-top:12px;">
          <input type="number" id="use-qty" min="0.1" step="0.1"
            style="font-size:20px;text-align:center;padding:12px;"
            placeholder="数量を入力">
        </div>
        <div class="modal__actions" style="margin-top:12px;">
          <button class="btn btn-secondary" id="use-cancel">キャンセル</button>
          <button class="btn btn-primary"   id="use-confirm">記録する</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('use-qty');
    input.focus();

    document.getElementById('use-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('use-confirm').addEventListener('click', () => {
      const usedQty = parseFloat(input.value);
      if (!usedQty || usedQty <= 0) {
        input.classList.add('input-error');
        return;
      }
      this._recordConsumption({ id, name, masterId, unit, usedQty });
      overlay.remove();
    });
  },

  _recordConsumption({ id, name, masterId, unit, usedQty }) {
    const data = storage.get();
    const idx  = data.stockItems.findIndex(s => s.id === id);
    if (idx === -1) return;

    const item   = data.stockItems[idx];
    const newQty = Math.max(0, (parseFloat(item.qty) || 0) - usedQty);

    if (!data.consumptionLog) data.consumptionLog = [];
    data.consumptionLog.push({
      id:       `log_${Date.now()}`,
      stockId:  id,
      masterId,
      itemName: name,
      usedQty,
      unit,
      date:     new Date().toISOString().slice(0, 10),
    });

    if (newQty <= 0) {
      data.stockItems.splice(idx, 1);
      showToast(`${name} を使い切りました。リストから削除しました`, 'info');
    } else {
      data.stockItems[idx] = { ...item, qty: newQty };
      showToast(`${name} を ${usedQty}${unit} 使用記録しました（残 ${newQty}${unit}）`);
    }

    storage.save(data);
    this.render();
  },
};
