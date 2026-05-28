'use strict';
/**
 * pages/stock.js — 備蓄リスト画面
 */
import { storage }                              from '../storage.js';
import { buildCalcParams, getCombinedMasterList } from '../masterData.js';

export const stockPage = {
  template() {
    return `
      <div id="mode-selector"></div>
      <div id="stock-list"></div>
    `;
  },

  init() { this.render(); },

  render() {
    const data   = storage.get();
    const days   = data.settings.stockpileDays;
    const listEl = document.getElementById('stock-list');

    this._renderModeSelector(days);

    if (data.profiles.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>「くらし方」が未設定のため、<br>推奨量を計算できません。</p>
          <a href="#lifestyle" class="btn btn-primary">くらし方を設定する</a>
        </div>
      `;
      return;
    }

    const params     = buildCalcParams(data);
    const masterList = getCombinedMasterList(data.customMasterItems);
    const noticeDays = data.settings.noticeDays[days] ?? 7;
    const today      = new Date();

    // 備蓄品をマスターIDでグループ化
    const stockById = {};
    data.stockItems.forEach(item => {
      const key = item.masterId || item.customId;
      if (!key) return;
      if (!stockById[key]) stockById[key] = [];
      stockById[key].push(item);
    });

    // カテゴリ別に集計
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

      if (!categories[item.category]) {
        categories[item.category] = { achieved: 0, total: 0, items: [] };
      }
      categories[item.category].total++;
      if (current >= required) categories[item.category].achieved++;
      categories[item.category].items.push({ ...item, required, current, pct, stocks });
    });

    const overallPct = totalItems > 0 ? Math.round((achievedItems / totalItems) * 100) : 0;

    // ── HTML 組み立て ──────────────────────────────
    let html = `
      <div class="overall-progress">
        <div class="overall-progress__header">
          <span>全体の備蓄達成率</span>
          <span class="overall-progress__pct">${overallPct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__inner ${this._statusClass(overallPct)}"
               style="width:${overallPct}%"></div>
        </div>
        <div class="overall-progress__sub">${achievedItems} / ${totalItems} 品目 達成</div>
      </div>
    `;

    for (const [catName, cat] of Object.entries(categories)) {
      const catPct = Math.round((cat.achieved / cat.total) * 100);

      html += `
        <div class="stock-category">
          <div class="category-header">
            <h3 class="category-header__name">${catName}</h3>
            <span class="category-badge">${cat.achieved} / ${cat.total} 達成</span>
          </div>
      `;

      cat.items.forEach(item => {
        // 期限状態の確認
        let hasExpired = false, hasExpiring = false;
        item.stocks.forEach(s => {
          if (!s.expiry) return;
          const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
          if (diff <= 0) hasExpired = true;
          else if (diff <= noticeDays) hasExpiring = true;
        });

        const itemClass    = hasExpired ? 'is-expired' : hasExpiring ? 'is-expiring' : '';
        const pctRounded   = Math.round(item.pct);
        const statusClass  = this._statusClass(item.pct);

        // 達成率のテキスト色
        const pctColor = item.pct >= 100
          ? 'style="color:var(--c-ok)"'
          : item.pct >= 50
          ? 'style="color:var(--c-warn)"'
          : 'style="color:var(--c-ng)"';

        // サブアイテムリスト
        const subItemsHTML = item.stocks.length > 0
          ? item.stocks.map(s => {
              let subClass = '';
              if (s.expiry) {
                const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
                if (diff <= 0)             subClass = 'is-expired-sub';
                else if (diff <= noticeDays) subClass = 'is-expiring-sub';
              }
              const expiryText = s.expiry
                ? (() => {
                    const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
                    if (diff <= 0)       return '期限切れ';
                    if (diff <= noticeDays) return `残り${diff}日`;
                    return s.expiry;
                  })()
                : '期限なし';
              return `
                <li class="stock-sub-item ${subClass}" data-id="${s.id}">
                  <span class="stock-sub-item__name">${s.productName || item.name}</span>
                  <span class="stock-sub-item__qty">${s.qty} ${s.unit}</span>
                  <span class="stock-sub-item__expiry">${expiryText}</span>
                </li>
              `;
            }).join('')
          : `<li class="stock-sub-item--empty">まだ登録されていません</li>`;

        html += `
          <details class="stock-item ${itemClass}"
                   ${(hasExpired || hasExpiring) ? 'open' : ''}>
            <summary class="stock-item__summary">
              <div class="stock-item__row">
                <span class="stock-item__name">
                  ${item.name}
                  ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
                </span>
                <span class="stock-item__amount" ${pctColor}>
                  ${pctRounded}%
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar__inner ${statusClass}"
                     style="width:${item.pct}%"></div>
              </div>
              <div class="stock-item__qty-row">
                <span class="stock-item__qty-text">
                  ${item.current.toLocaleString()} / ${item.required.toLocaleString()} ${item.unit}
                </span>
                ${hasExpired ? '<span class="expiry-badge is-expired-badge">期限切れあり</span>'
                  : hasExpiring ? '<span class="expiry-badge is-expiring-badge">期限間近</span>'
                  : ''}
              </div>
            </summary>
            <div class="stock-item__detail">
              <ul class="stock-sub-list">${subItemsHTML}</ul>
              <button class="btn-add js-add-item"
                data-id="${item.id}"
                data-name="${item.name}"
                data-unit="${item.unit}">
                ＋ この品目を追加
              </button>
            </div>
          </details>
        `;
      });

      html += `</div>`; // .stock-category
    }

    html += `
      <div class="stock-footer">
        <a href="#register" class="btn btn-secondary">リストにない品目を追加</a>
      </div>
    `;

    listEl.innerHTML = html;

    // イベント委譲
    listEl.addEventListener('click', e => {
      const addBtn = e.target.closest('.js-add-item');
      if (addBtn) {
        const { id, name, unit } = addBtn.dataset;
        sessionStorage.setItem('newItemFromTodo', JSON.stringify({ masterId: id, name, unit }));
        window.location.hash = '#register';
        return;
      }
      const subItem = e.target.closest('.stock-sub-item[data-id]');
      if (subItem) {
        sessionStorage.setItem('editItemId', subItem.dataset.id);
        window.location.hash = '#register';
      }
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
          <button class="mode-btn ${currentDays === m.days ? 'is-active' : ''}"
                  data-days="${m.days}">${m.label}</button>
        `).join('')}
      </div>
    `;
    container.addEventListener('click', e => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      const current = storage.get();
      current.settings.stockpileDays = parseInt(btn.dataset.days);
      storage.save(current);
      this.render();
    });
  },

  _statusClass(pct) {
    if (pct >= 100) return 'is-sufficient';
    if (pct >= 50)  return 'is-medium';
    return 'is-low';
  }
};
