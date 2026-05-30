'use strict';
/**
 * pages/home.js — ホーム画面
 *
 * 表示するもの：
 *   1. 棚卸しリマインダーバナー（nextCheckDate が今日以前）
 *   2. くらし方未設定なら設定を促すメッセージ
 *   3. 期限切れ・期限間近のアラートカード
 *   4. 備蓄モード切替スイッチ（3日/1週間/2週間）
 *   5. 全体備蓄達成率のプログレスバー
 *   6. 各ページへのグリッドメニュー
 */
import { storage }                               from '../storage.js';
import { buildCalcParams, getFilteredMasterList } from '../masterData.js';

/** 期限アイテム抽出しきい値（日）— todo.js と統一 */
const EXPIRY_WINDOW = 30;

export const homePage = {
  template() {
    return `
      <div id="home-banner"></div>
      <div id="home-summary"></div>
      <div id="home-quest"></div>
      <nav class="grid-menu" id="home-grid">
        <a href="#lifestyle" class="grid-menu__item">
          <img src="icons/family.png" alt="くらし方">
          <span>くらし方</span>
        </a>
        <a href="#stock" class="grid-menu__item">
          <img src="icons/stock.png" alt="備蓄リスト">
          <span>備蓄リスト</span>
        </a>
        <a href="#todo" class="grid-menu__item">
          <img src="icons/todo.png" alt="備蓄クエスト">
          <span>備蓄クエスト</span>
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
      <div id="home-next-check"></div>
    `;
  },

  init() {
    const data      = storage.get();
    const bannerEl  = document.getElementById('home-banner');
    const summaryEl = document.getElementById('home-summary');

    // ── 棚卸しリマインダーバナー ────────────────────────
    const isAlertActive = this._renderReminder(bannerEl, data);

    // くらし方が未設定の場合
    if (data.profiles.length === 0) {
      summaryEl.innerHTML = `
        <div class="setup-prompt">
          <p>まず「くらし方」から家族構成を設定しましょう。</p>
          <a href="#lifestyle" class="btn btn-primary">くらし方を設定する →</a>
        </div>
      `;
      this._renderNextCheck(data, isAlertActive);
      return;
    }

    // ── 集計 ──────────────────────────────────────────
    const params     = buildCalcParams(data);
    const days       = data.settings.stockpileDays;
    const masterList = getFilteredMasterList(data.customMasterItems, data.settings);
    const noticeDays = data.settings.noticeDays[days] ?? 7;
    const today      = new Date();

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

    // ── モード切替スイッチ ──────────────────────────
    const modes = [
      { days: 3,  label: '3日分' },
      { days: 7,  label: '1週間' },
      { days: 14, label: '2週間' },
    ];
    const modeSwitchHTML = `
      <div class="home-mode-switch">
        ${modes.map(m => `
          <button class="home-mode-btn ${days === m.days ? 'is-active' : ''}" data-days="${m.days}">
            ${m.label}
          </button>
        `).join('')}
      </div>
    `;

    // ── 達成率カード ────────────────────────────────
    const stockLevel = data.settings.stockLevel ?? 'starter';
    const levelLabel = stockLevel === 'starter' ? 'スターターセット' : '本格備蓄';

    summaryEl.innerHTML = `
      ${alertHTML}
      <div class="summary-card">
        <div class="summary-card__label">
          <span class="level-badge level-badge--${stockLevel}">${levelLabel}</span>
          ${days}日分モード・達成率
        </div>
        <div class="summary-card__pct">${pct}%</div>
        <div class="progress-bar">
          <div class="progress-bar__inner ${statusClass}" style="width:${pct}%"></div>
        </div>
        <div class="summary-card__sub">${achievedItems} / ${totalItems} 品目 達成</div>
        ${modeSwitchHTML}
      </div>
    `;

    // モード切替イベント
    summaryEl.querySelectorAll('.home-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = storage.get();
        current.settings.stockpileDays = parseInt(btn.dataset.days);
        storage.save(current);
        this.init(); // ホーム再描画
      });
    });

    // ── 優先アクションカード ────────────────────────
    this._renderQuest(data, params, days, masterList, today, noticeDays, stockById);

    // ── 次回棚卸し日（常設・アラート中は非表示） ────
    this._renderNextCheck(data, isAlertActive);
  },

  _renderQuest(data, params, days, masterList, today, noticeDays, stockById) {
    const questEl = document.getElementById('home-quest');
    if (!questEl) return;

    // 不足上位3件
    const shortfalls = [];
    masterList.forEach(item => {
      if (!item.calc || !item.isNeeded(params)) return;
      const required = item.calc(params, days);
      if (required <= 0) return;
      const current  = stockById[item.id] || 0;
      const shortage = required - current;
      if (shortage > 0) shortfalls.push({ ...item, required, current, shortage });
    });
    shortfalls.sort((a, b) => (b.shortage / b.required) - (a.shortage / a.required));
    const topShort = shortfalls.slice(0, 3);

    // 期限間近上位2件
    const expiryItems = [];
    data.stockItems.forEach(s => {
      if (!s.expiry) return;
      const diff = Math.ceil((new Date(s.expiry) - today) / 86400000);
      if (diff <= EXPIRY_WINDOW) expiryItems.push({ ...s, diff });
    });
    expiryItems.sort((a, b) => a.diff - b.diff);
    const topExpiry = expiryItems.slice(0, 2);

    if (topShort.length === 0 && topExpiry.length === 0) {
      questEl.innerHTML = `
        <div class="home-quest-card home-quest-card--ok">
          <div class="home-quest-card__head">
            <span class="home-quest-card__title">優先アクション</span>
          </div>
          <p class="home-quest-card__empty">今すぐやることはありません。備えは順調です！</p>
        </div>
      `;
      return;
    }

    const rows = [
      ...topShort.map(item => `
        <li class="home-quest-row home-quest-row--shortfall">
          <span class="home-quest-badge home-quest-badge--high">補充</span>
          <span class="home-quest-row__name">${item.name}</span>
          <span class="home-quest-row__meta">あと ${Math.ceil(item.shortage).toLocaleString()} ${item.unit}</span>
        </li>
      `),
      ...topExpiry.map(s => {
        const label = s.diff <= 0 ? '期限切れ' : `あと${s.diff}日`;
        return `
          <li class="home-quest-row home-quest-row--expiry">
            <span class="home-quest-badge ${s.diff <= 0 ? 'home-quest-badge--expired' : 'home-quest-badge--warn'}">${s.diff <= 0 ? '期限切れ' : '期限間近'}</span>
            <span class="home-quest-row__name">${s.productName || s.itemName}</span>
            <span class="home-quest-row__meta">${label}</span>
          </li>
        `;
      }),
    ].join('');

    const remaining = (shortfalls.length - topShort.length) + (expiryItems.length - topExpiry.length);
    questEl.innerHTML = `
      <div class="home-quest-card">
        <div class="home-quest-card__head">
          <span class="home-quest-card__title">優先アクション</span>
          ${remaining > 0 ? `<span class="home-quest-card__more">他 ${remaining} 件</span>` : ''}
        </div>
        <ul class="home-quest-list">${rows}</ul>
        <a href="#todo" class="home-quest-card__link">備蓄クエストをすべて見る →</a>
      </div>
    `;
  },

  /**
   * 棚卸しアラートバナーを描画する。
   * 前日（diff === -1）から当日以降（diff >= 0）を対象にし、
   * 「確認した」が押されるまで消えない。
   * @returns {boolean} アラートを表示した場合 true
   */
  _renderReminder(bannerEl, data) {
    const { nextCheckDate } = data.settings;
    if (!nextCheckDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(nextCheckDate);
    checkDate.setHours(0, 0, 0, 0);

    // 前日より前はバナー不要
    const diffDays = Math.round((checkDate - today) / 86400000); // 正 = まだ先
    if (diffDays > 1) return false;

    let msg, urgent;
    if (diffDays === 1) {
      msg    = '明日は備蓄の棚卸し日です。準備はいいですか？';
      urgent = false;
    } else if (diffDays === 0) {
      msg    = '今日は備蓄の棚卸し日です！';
      urgent = true;
    } else {
      msg    = `棚卸し予定日を ${Math.abs(diffDays)} 日過ぎています`;
      urgent = true;
    }

    bannerEl.innerHTML = `
      <div class="reminder-banner ${urgent ? 'reminder-banner--urgent' : ''}">
        <span class="reminder-banner__icon">📋</span>
        <span class="reminder-banner__msg">${msg}</span>
        <button class="reminder-banner__btn" id="reminder-done">確認した</button>
      </div>
    `;

    document.getElementById('reminder-done').addEventListener('click', () => {
      const current  = storage.get();
      const interval = current.settings.checkIntervalDays || 30;
      const next     = new Date();
      next.setDate(next.getDate() + interval);
      current.settings.nextCheckDate = next.toISOString().slice(0, 10);
      storage.save(current);
      bannerEl.innerHTML = '';
      // 常設表示を再描画（バナーが消えたので表示する）
      this._renderNextCheck(storage.get(), false);
    });

    return true;
  },

  /**
   * グリッドメニューの下に次回棚卸し日を1行で常設表示する。
   * アラートバナーが出ている間は非表示（二重表示を避ける）。
   */
  _renderNextCheck(data, isAlertActive) {
    const el = document.getElementById('home-next-check');
    if (!el) return;

    const { nextCheckDate } = data.settings;
    if (!nextCheckDate || isAlertActive) {
      el.innerHTML = '';
      return;
    }

    // 日本語フォーマット（例：2026年6月29日）
    const d = new Date(nextCheckDate);
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

    el.innerHTML = `
      <p class="home-next-check">
        <span class="home-next-check__label">次回棚卸し</span>
        <span class="home-next-check__date">${label}</span>
        <a href="#settings" class="home-next-check__link">変更</a>
      </p>
    `;
  },
};
