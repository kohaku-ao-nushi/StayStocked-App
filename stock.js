'use strict';
/**
 * pages/stock.js — 備蓄リスト画面
 *
 * 機能：
 *   - 3日分 / 1週間 / 2週間 のモード切り替え
 *   - 必要量 vs 現在の備蓄量をカテゴリ別に表示
 *   - 全体の達成率プログレスバー
 *   - 期限切れ・期限間近のアイテムを強調表示
 *   - アイテムをタップして編集・追加画面へ遷移
 *
 * 設計メモ：
 *   render() を独立したメソッドにしているのは、モード変更時に
 *   init() を経由せず render() だけ呼び直せるようにするため。
 *   イベント委譲（addEventListener を listEl 一か所にまとめる）で
 *   動的に生成したボタンにもイベントが届く。
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

  init() {
    this.render();
  },

  render() {
    const data   = storage.get();
    const days   = data.settings.stockpileDays;
    const listEl = document.getElementById('stock-list');

    this._renderModeSelector(days);

    // くらし方未設定の場合
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

    // ── HTML 組み立て ──────────────────────────────────
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

    for (const [catName, cat] of Object.entries(categories)) {
      html += `
        <div class="stock-category">
          <div class="category-header">
            <h3 class="category-header__name">${catName}</h3>
            <span class="category-badge">${cat.achieved} / ${cat.total}</span>
          </div>
      `;

      cat.items.forEach(item => {
        // 期限状態を確認
        let hasExpired = false, hasExpiring = false;
        item.stocks.forEach(s => {
          if (!s.expiry) return;
          const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
          if (diff <= 0) hasExpired = true;
          else if (diff <= noticeDays) hasExpiring = true;
        });

        const itemClass = hasExpired ? 'is-expired' : hasExpiring ? 'is-expiring' : '';

        // サブアイテムリスト（登録済み備蓄品）
        const subItemsHTML = item.stocks.length > 0
          ? item.stocks.map(s => {
              let subClass = '';
              if (s.expiry) {
                const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
                if (diff <= 0)             subClass = 'is-expired-sub';
                else if (diff <= noticeDays) subClass = 'is-expiring-sub';
              }
              return `
                <li class="stock-sub-item ${subClass}" data-id="${s.id}">
                  <span class="stock-sub-item__name">${s.productName || item.name}</span>
                  <span class="stock-sub-item__qty">${s.qty} ${s.unit}</span>
                  <span class="stock-sub-item__expiry">${s.expiry || '期限なし'}</span>
                </li>
              `;
            }).join('')
          : '<li class="stock-sub-item--empty">まだ登録されていません</li>';

        html += `
          <details class="stock-item ${itemClass}" ${(hasExpired || hasExpiring) ? 'open' : ''}>
            <summary class="stock-item__summary">
              <div class="stock-item__row">
                <span class="stock-item__name">
                  ${item.name}
                  ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
                </span>
                <span class="stock-item__amount">
                  ${item.current.toLocaleString()} / ${item.required.toLocaleString()} ${item.unit}
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar__inner ${this._statusClass(item.pct)}" style="width:${item.pct}%"></div>
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

      html += `</div>`; // .stock-category
    }

    html += `
      <div class="stock-footer">
        <a href="#register" class="btn btn-secondary">リストにない品目を追加</a>
      </div>
    `;

    listEl.innerHTML = html;

    // ── イベント委譲（listEl 1か所で処理する）──────────
    listEl.addEventListener('click', e => {
      // 「この品目を追加」ボタン
      const addBtn = e.target.closest('.js-add-item');
      if (addBtn) {
        const { id, name, unit } = addBtn.dataset;
        sessionStorage.setItem('newItemFromTodo', JSON.stringify({ masterId: id, name, unit }));
        window.location.hash = '#register';
        return;
      }
      // サブアイテムをタップ → 編集
      const subItem = e.target.closest('.stock-sub-item[data-id]');
      if (subItem) {
        sessionStorage.setItem('editItemId', subItem.dataset.id);
        window.location.hash = '#register';
      }
    });
  },

  /** モード切り替えボタンを描画する */
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
    // モード変更時：設定を保存してこのページを再描画
    container.addEventListener('click', e => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      const current = storage.get();
      current.settings.stockpileDays = parseInt(btn.dataset.days);
      storage.save(current);
      this.render(); // ページ全体を再描画
    });
  },

  /** 達成率に応じた CSS クラスを返す */
  _statusClass(pct) {
    if (pct >= 100) return 'is-sufficient';
    if (pct >= 50)  return 'is-medium';
    return 'is-low';
  }
};
