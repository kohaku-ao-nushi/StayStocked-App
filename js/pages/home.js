'use strict';
/**
 * pages/home.js — ホーム画面
 *
 * 表示するもの：
 *   1. くらし方未設定なら設定を促すメッセージ
 *   2. 期限切れ・期限間近のアラートカード
 *   3. 全体備蓄達成率のプログレスバー
 *   4. 各ページへのグリッドメニュー
 */
import { storage }                              from '../storage.js';
import { buildCalcParams, getCombinedMasterList } from '../masterData.js';

export const homePage = {
  template() {
    return `
      <div id="home-summary"></div>
      <nav class="grid-menu">
        <a href="#lifestyle" class="grid-menu__item">
          <img src="icons/suggest.png" alt="くらし方">
          <span>くらし方</span>
        </a>
        <a href="#stock" class="grid-menu__item">
          <img src="icons/stock.png" alt="備蓄リスト">
          <span>備蓄リスト</span>
        </a>
        <a href="#settings" class="grid-menu__item">
          <img src="icons/setting.png" alt="設定">
          <span>設定</span>
        </a>
        <a href="#how-to" class="grid-menu__item">
          <img src="icons/manual.png" alt="使い方">
          <span>使い方</span>
        </a>
      </nav>
    `;
  },

  init() {
    const data      = storage.get();
    const summaryEl = document.getElementById('home-summary');

    // くらし方が未設定の場合
    if (data.profiles.length === 0) {
      summaryEl.innerHTML = `
        <div class="setup-prompt">
          <p>まず「くらし方」から家族構成を設定しましょう。</p>
          <a href="#lifestyle" class="btn btn-primary">くらし方を設定する →</a>
        </div>
      `;
      return;
    }

    // ── 集計 ──────────────────────────────────────────
    const params     = buildCalcParams(data);
    const days       = data.settings.stockpileDays;
    const masterList = getCombinedMasterList(data.customMasterItems);
    const noticeDays = data.settings.noticeDays[days] ?? 7;
    const today      = new Date();

    // 備蓄品をマスターIDで集計（同一品目に複数の備蓄品が登録できるため合算する）
    const stockById = {};
    const alerts    = [];

    data.stockItems.forEach(item => {
      const key = item.masterId || item.customId;
      if (key) {
        stockById[key] = (stockById[key] || 0) + (parseFloat(item.qty) || 0);
      }
      if (item.expiry) {
        const diff = Math.ceil((new Date(item.expiry) - today) / 86400000);
        if (diff <= 0) {
          alerts.push({ name: item.productName || item.itemName, diff, expired: true });
        } else if (diff <= noticeDays) {
          alerts.push({ name: item.productName || item.itemName, diff });
        }
      }
    });

    let totalItems = 0, achievedItems = 0;
    masterList.forEach(item => {
      if (!item.calc || !item.isNeeded(params)) return;
      const required = item.calc(params, days);
      if (required <= 0) return;
      totalItems++;
      if ((stockById[item.id] || 0) >= required) achievedItems++;
    });

    const pct         = totalItems > 0 ? Math.round((achievedItems / totalItems) * 100) : 0;
    const statusClass = pct >= 100 ? 'is-sufficient' : pct >= 50 ? 'is-medium' : 'is-low';

    // ── アラートカード ──────────────────────────────
    let alertHTML = '';
    if (alerts.length > 0) {
      // 期限切れ → 期限間近 の順、最大3件表示
      const sorted = alerts.sort((a, b) => a.diff - b.diff).slice(0, 3);
      const rows = sorted.map(a => {
        const label = a.expired ? '⚠ 期限切れ' : `残り${a.diff}日`;
        return `<li><span class="alert-label ${a.expired ? 'is-expired' : ''}">${label}</span>${a.name}</li>`;
      }).join('');
      alertHTML = `
        <div class="alert-card">
          <div class="alert-card__title">期限アラート</div>
          <ul class="alert-card__list">${rows}</ul>
          ${alerts.length > 3 ? `<p class="alert-card__more">他 ${alerts.length - 3} 件</p>` : ''}
          <a href="#stock" class="alert-card__link">備蓄リストを確認 →</a>
        </div>
      `;
    }

    // ── 達成率カード ────────────────────────────────
    summaryEl.innerHTML = `
      ${alertHTML}
      <div class="summary-card">
        <div class="summary-card__label">${days}日分モード・備蓄達成率</div>
        <div class="summary-card__pct">${pct}%</div>
        <div class="progress-bar">
          <div class="progress-bar__inner ${statusClass}" style="width:${pct}%"></div>
        </div>
        <div class="summary-card__sub">${achievedItems} / ${totalItems} 品目 達成</div>
      </div>
    `;
  }
};
