'use strict';
/**
 * pages/stock.js — 備蓄リスト画面
 *
 * 機能：
 *   - 3日分 / 1週間 / 2週間 のモード切り替え
 *   - 必要量 vs 現在の備蓄量をカテゴリ別に表示
 *   - 全体の達成率プログレスバー
 *   - 期限切れ・期限間近のアイテムを強調表示
 *   - フィルタ（不足のみ表示 / キーワード検索）
 *   - アイテムをタップして編集・追加画面へ遷移
 *   - 「使った」ボタンでローリングストック消費を記録
 */
import { storage }                               from '../storage.js';
import { buildCalcParams, getCombinedMasterList } from '../masterData.js';
import { showToast }                             from '../ui.js';

export const stockPage = {
  _filterShortfall: false,
  _filterKeyword:   '',

  template() {
    return `
      <div id="mode-selector"></div>
      <div id="stock-filter"></div>
      <div id="stock-list"></div>
    `;
  },

  init() {
    this._filterShortfall = false;
    this._filterKeyword   = '';
    this._filterReady     = false;
    this.render();
  },

  render() {
    const data   = storage.get();
    const days   = data.settings.stockpileDays;
    const listEl = document.getElementById('stock-list');

    this._renderModeSelector(days);
    // フィルタバーは初回のみ描画（再描画するとフォーカスが外れる）
    if (!this._filterReady) {
      this._renderFilter();
      this._filterReady = true;
    }

    if (data.profiles.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>「くらし方」が未設定のため、推奨量を計算できません。</p>
          <a href="#lifestyle" class="btn btn-primary">くらし方を設定する</a>
        </div>
      `;
      return;
    }

    const params     = buildCalcParams(data);
    const masterList = getCombinedMasterList(data.customMasterItems);
    const noticeDays = data.settings.noticeDays[days] ?? 7;
    const today      = new Date();

    const stockById = {};
    data.stockItems.forEach(item => {
      const key = item.masterId || item.customId;
      if (!key) return;
      if (!stockById[key]) stockById[key] = [];
      stockById[key].push(item);
    });

    const categories = {};
    let totalItems = 0, achievedItems = 0;

    masterList.forEach(item => {
      if (!item.calc || !item.isNeeded(params)) return;
      const required = item.calc(params, days);
      if (required <= 0) return;

      const stocks  = stockById[item.id] || [];
      const current = stocks.reduce((sum, s) => sum + (parseFloat(s.qty) || 0), 0);
      const pct     = Math.min((current / required) * 100, 100);

      totalItems++;
      if (current >= required) achievedItems++;

      if (this._filterShortfall && current >= required) return;
      if (this._filterKeyword) {
        const kw = this._filterKeyword.toLowerCase();
        if (!item.name.toLowerCase().includes(kw)) return;
      }

      if (!categories[item.category]) {
        categories[item.category] = { items: [], total: 0, achieved: 0 };
      }
      categories[item.category].items.push({ ...item, stocks, current, required, pct });
      categories[item.category].total++;
      if (current >= required) categories[item.category].achieved++;
    });

    const overallPct = totalItems > 0 ? Math.round((achievedItems / totalItems) * 100) : 0;

    let html = `
      <div class="overall-progress">
        <div class="overall-progress__header">
          <span>全体の達成率</span>
          <span class="overall-progress__pct">${overallPct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__inner ${this._statusClass(overallPct)}" style="width:${overallPct}%"></div>
        </div>
        <div class="overall-progress__sub">${achievedItems} / ${totalItems} 品目 達成</div>
      </div>
    `;

    if (Object.keys(categories).length === 0) {
      html += `<p class="empty-text" style="text-align:center;padding:24px 0">該当する品目がありません</p>`;
    }

    for (const [catName, cat] of Object.entries(categories)) {
      html += `
        <div class="stock-category">
          <div class="category-header">
            <h3 class="category-header__name">${catName}</h3>
            <span class="category-badge">${cat.achieved} / ${cat.total}</span>
          </div>
      `;

      cat.items.forEach(item => {
        let hasExpired = false, hasExpiring = false;
        item.stocks.forEach(s => {
          if (!s.expiry) return;
          const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
          if (diff <= 0) hasExpired = true;
          else if (diff <= noticeDays) hasExpiring = true;
        });

        const itemClass = hasExpired ? 'is-expired' : hasExpiring ? 'is-expiring' : '';

        const subItemsHTML = item.stocks.length > 0
          ? item.stocks.map(s => {
              let subClass = '';
              if (s.expiry) {
                const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
                if (diff <= 0)               subClass = 'is-expired-sub';
                else if (diff <= noticeDays) subClass = 'is-expiring-sub';
              }
              return `
                <li class="stock-sub-item ${subClass}" data-id="${s.id}">
                  <span class="stock-sub-item__name">${s.productName || item.name}</span>
                  <span class="stock-sub-item__qty">${s.qty} ${s.unit}</span>
                  <span class="stock-sub-item__expiry">${s.expiry || '期限なし'}</span>
                  <button class="btn-use js-use-item"
                    data-id="${s.id}"
                    data-name="${s.productName || item.name}"
                    data-master-id="${item.id}"
                    data-unit="${s.unit}"
                    title="使った">使った</button>
                </li>
              `;
            }).join('')
          : '<li class="stock-sub-item--empty">まだ登録されていません</li>';

        html += `
          <details class="stock-item ${itemClass}" ${(hasExpired || hasExpiring) ? 'open' : ''}>
            <summary class="stock-item__summary">
              <div class="stock-item__row">
                <span class="stock-item__name">${item.name}</span>
                ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
              </div>
              <div class="stock-item__progress-row">
                <div class="progress-bar">
                  <div class="progress-bar__inner ${this._statusClass(item.pct)}" style="width:${item.pct}%"></div>
                </div>
                <span class="stock-item__amount">
                  ${item.current.toLocaleString()} / ${item.required.toLocaleString()} ${item.unit}
                </span>
              </div>
            </summary>
            <div class="stock-item__detail">
              <ul class="stock-sub-list">${subItemsHTML}</ul>
              <button class="btn btn-sm btn-add js-add-item"
                data-id="${item.id}"
                data-name="${item.name}"
                data-unit="${item.unit}">
                ＋ この品目を追加
              </button>
            </div>
          </details>
        `;
      });

      html += `</div>`;
    }

    // ── 自由登録品目（目標量なしのカスタム品目）────────────
    const masterIds = new Set(masterList.filter(m => m.calc && m.isNeeded(params)).map(m => m.id));
    const freeStocks = data.stockItems.filter(s => {
      const key = s.masterId || s.customId;
      return key && !masterIds.has(key);
    });

    if (freeStocks.length > 0 &&
        (!this._filterKeyword || freeStocks.some(s =>
          (s.itemName || s.productName || '').toLowerCase().includes(this._filterKeyword.toLowerCase())
        ))) {
      const filtered = this._filterKeyword
        ? freeStocks.filter(s =>
            (s.itemName || s.productName || '').toLowerCase().includes(this._filterKeyword.toLowerCase()))
        : freeStocks;

      if (filtered.length > 0) {
        html += `
          <div class="stock-category">
            <div class="category-header">
              <h3 class="category-header__name">自由登録品目</h3>
              <span class="category-badge">${filtered.length}</span>
            </div>
        `;
        filtered.forEach(s => {
          const diff = s.expiry
            ? Math.ceil((new Date(s.expiry) - today) / 86400000) : null;
          const subClass = diff !== null
            ? (diff <= 0 ? 'is-expired-sub' : diff <= noticeDays ? 'is-expiring-sub' : '')
            : '';
          html += `
            <details class="stock-item">
              <summary class="stock-item__summary">
                <div class="stock-item__row">
                  <span class="stock-item__name">${s.itemName || s.productName}</span>
                  <span class="target-badge">目標なし</span>
                </div>
                <div class="stock-item__progress-row">
                  <div class="progress-bar" style="opacity:.3">
                    <div class="progress-bar__inner is-sufficient" style="width:100%"></div>
                  </div>
                  <span class="stock-item__amount">${s.qty} ${s.unit}</span>
                </div>
              </summary>
              <div class="stock-item__detail">
                <ul class="stock-sub-list">
                  <li class="stock-sub-item ${subClass}" data-id="${s.id}">
                    <span class="stock-sub-item__name">${s.productName || s.itemName || ''}</span>
                    <span class="stock-sub-item__qty">${s.qty} ${s.unit}</span>
                    <span class="stock-sub-item__expiry">${s.expiry || '期限なし'}</span>
                    <button class="btn-use js-use-item"
                      data-id="${s.id}"
                      data-name="${s.itemName || s.productName}"
                      data-master-id="${s.masterId || s.customId}"
                      data-unit="${s.unit}">使った</button>
                  </li>
                </ul>
              </div>
            </details>
          `;
        });
        html += `</div>`;
      }
    }

    html += `
      <div class="stock-footer">
        <a href="#register" class="btn btn-secondary">リストにない品目を追加</a>
      </div>
    `;

    listEl.innerHTML = html;

    listEl.addEventListener('click', e => {
      const addBtn = e.target.closest('.js-add-item');
      if (addBtn) {
        const { id, name, unit } = addBtn.dataset;
        sessionStorage.setItem('newItemFromTodo', JSON.stringify({ masterId: id, name, unit }));
        window.location.hash = '#register';
        return;
      }
      const useBtn = e.target.closest('.js-use-item');
      if (useBtn) {
        e.stopPropagation();
        this._showUseModal(useBtn.dataset);
        return;
      }
      const subItem = e.target.closest('.stock-sub-item[data-id]');
      if (subItem && !e.target.closest('.js-use-item')) {
        sessionStorage.setItem('editItemId', subItem.dataset.id);
        window.location.hash = '#register';
      }
    });
  },

  _showUseModal({ id, name, masterId, unit }) {
    document.getElementById('use-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'use-modal';
    overlay.innerHTML = `
      <div class="modal">
        <p class="modal__message">「${name}」を何${unit}使いましたか？</p>
        <div class="form-group" style="margin-top:12px;">
          <input type="number" id="use-qty" min="0.1" step="0.1"
            style="font-size:20px;text-align:center;padding:12px;" placeholder="数量を入力">
        </div>
        <div class="modal__actions" style="margin-top:12px;">
          <button class="btn btn-secondary" id="use-cancel">キャンセル</button>
          <button class="btn btn-primary" id="use-confirm">記録する</button>
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
        input.style.borderColor = 'var(--c-ng)';
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
      date:     new Date().toISOString().slice(0, 10)
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

  _renderFilter() {
    const el = document.getElementById('stock-filter');
    el.innerHTML = `
      <div class="stock-filter-bar">
        <button class="filter-chip ${this._filterShortfall ? 'is-active' : ''}" id="filter-shortfall">
          不足のみ
        </button>
        <div class="filter-search">
          <input type="search" id="filter-keyword"
            placeholder="品目を検索…"
            value="${this._filterKeyword}">
        </div>
      </div>
    `;
    document.getElementById('filter-shortfall').addEventListener('click', () => {
      this._filterShortfall = !this._filterShortfall;
      // 「不足のみ」トグルはフィルタチップの見た目も変わるので全体再描画
      this._filterReady = false;
      this.render();
    });
    let t;
    document.getElementById('filter-keyword').addEventListener('input', e => {
      clearTimeout(t);
      // キーワード変更はリストのみ再描画（フィルタバーは維持してフォーカス保持）
      t = setTimeout(() => {
        this._filterKeyword = e.target.value.trim();
        this._filterReady = true;  // フィルタバーを再描画させない
        this.render();
      }, 250);
    });
  },

  _renderModeSelector(currentDays) {
    const container = document.getElementById('mode-selector');
    const modes = [
      { days: 3,  label: '3日分' },
      { days: 7,  label: '1週間' },
      { days: 14, label: '2週間' },
    ];
    container.innerHTML = `
      <div class="mode-selector">
        ${modes.map(m => `
          <button class="mode-btn ${currentDays === m.days ? 'is-active' : ''}" data-days="${m.days}">
            ${m.label}
          </button>
        `).join('')}
      </div>
    `;
    container.addEventListener('click', e => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      const current = storage.get();
      current.settings.stockpileDays = parseInt(btn.dataset.days);
      storage.save(current);
      this._filterReady = false;  // モード切替時はフィルタも再描画
      this.render();
    });
  },

  _statusClass(pct) {
    if (pct >= 100) return 'is-sufficient';
    if (pct >= 50)  return 'is-medium';
    return 'is-low';
  }
};
