'use strict';
/**
 * pages/stock.js — 備蓄リスト画面
 *
 * 品目の非表示：左スワイプで「非表示」ボタンが滑り出るiOSメール風UI。
 * <details> を .stock-item-wrap でラップし、ラップ内に絶対配置した
 * .stock-item__swipe-btn を左スワイプで露出させる。
 */
import { storage }                               from '../storage.js';
import { buildCalcParams, getFilteredMasterList } from '../masterData.js';
import { showToast, showConfirm }                from '../ui.js';

export const stockPage = {
  _filterShortfall: false,
  _filterKeyword:   '',
  _filterReady:     false,
  _listAbort:       null,   // AbortController — リスナー多重登録防止
  _swipedWrap:      null,   // 現在スワイプ中の .stock-item-wrap

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
    this._listAbort       = null;
    this._swipedWrap      = null;
    this.render();
  },

  render() {
    const data   = storage.get();
    const days   = data.settings.stockpileDays;
    const listEl = document.getElementById('stock-list');

    this._renderModeSelector(days);
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
    const masterList = getFilteredMasterList(data.customMasterItems, data.settings);
    const noticeDays = data.settings.noticeDays[days] ?? 7;
    const stockLevel = data.settings.stockLevel ?? 'starter';
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

    const overallPct  = totalItems > 0 ? Math.round((achievedItems / totalItems) * 100) : 0;
    const showUpgrade = stockLevel === 'starter' && overallPct >= 80;
    const levelLabel  = stockLevel === 'starter' ? 'スターターセット' : '本格備蓄';

    let html = `
      <div class="overall-progress">
        <div class="overall-progress__header">
          <span>
            <span class="level-badge level-badge--${stockLevel}">${levelLabel}</span>
            達成率
          </span>
          <span class="overall-progress__pct">${overallPct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__inner ${this._statusClass(overallPct)}" style="width:${overallPct}%"></div>
        </div>
        <div class="overall-progress__sub">${achievedItems} / ${totalItems} 品目 達成</div>
      </div>
      ${showUpgrade ? `
        <div class="upgrade-banner">
          <div class="upgrade-banner__body">
            <strong>スターターセット達成！🎉</strong>
            <p>行政推奨の本格備蓄リストに移行しますか？</p>
          </div>
          <button class="btn btn-primary btn-sm js-upgrade-level">移行する</button>
        </div>
      ` : ''}
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

        // .stock-item-wrap でラップ → 左スワイプで .stock-item__swipe-btn が露出
        html += `
          <div class="stock-item-wrap">
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
            <button class="stock-item__swipe-btn js-hide-item" data-id="${item.id}">
              非表示
            </button>
          </div>
        `;
      });

      html += `</div>`;
    }

    // ── 自由登録品目（目標量なしのカスタム品目）────────────
    const masterIds  = new Set(masterList.filter(m => m.calc && m.isNeeded(params)).map(m => m.id));
    const freeStocks = data.stockItems.filter(s => {
      const key = s.masterId || s.customId;
      return key && !masterIds.has(key);
    });

    if (freeStocks.length > 0 && !this._filterShortfall) {
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
        <a href="#custom-list-editor" class="btn btn-secondary">リストにない品目を追加・管理</a>
      </div>
    `;

    listEl.innerHTML = html;
    this._swipedWrap = null;

    // ── イベントリスナー（AbortController で多重登録防止）────
    if (this._listAbort) this._listAbort.abort();
    this._listAbort = new AbortController();
    const sig = this._listAbort.signal;

    // キャプチャ：スワイプ中のサマリークリックで details トグルをキャンセル
    listEl.addEventListener('click', e => {
      if (this._swipedWrap && e.target.closest('summary')) {
        e.stopPropagation();
        this._closeSwipe(this._swipedWrap);
        this._swipedWrap = null;
      }
    }, { capture: true, signal: sig });

    // バブル：各アクション
    listEl.addEventListener('click', async e => {
      // スワイプ中に他の場所をタップ → 閉じる
      if (this._swipedWrap && !e.target.closest('.js-hide-item')) {
        this._closeSwipe(this._swipedWrap);
        this._swipedWrap = null;
        return;
      }

      // 昇格バナー
      if (e.target.closest('.js-upgrade-level')) {
        const ok = await showConfirm(
          '行政推奨の本格備蓄リストに移行します。\nスターターセット以外の品目も表示されるようになります。',
          { confirmLabel: '移行する', confirmClass: 'btn-primary' }
        );
        if (!ok) return;
        const current = storage.get();
        current.settings.stockLevel = 'full';
        storage.save(current);
        showToast('本格備蓄モードに移行しました 🎉');
        this._filterReady = false;
        this.render();
        return;
      }

      // 非表示（スワイプで露出したボタン）
      const hideBtn = e.target.closest('.js-hide-item');
      if (hideBtn) {
        const ok = await showConfirm(
          'この品目を備蓄リストから非表示にしますか？\n設定画面からいつでも再表示できます。',
          { confirmLabel: '非表示にする', confirmClass: 'btn-secondary' }
        );
        if (!ok) {
          this._closeSwipe(hideBtn.closest('.stock-item-wrap'));
          this._swipedWrap = null;
          return;
        }
        const current = storage.get();
        if (!current.settings.hiddenMasterIds) current.settings.hiddenMasterIds = [];
        current.settings.hiddenMasterIds.push(hideBtn.dataset.id);
        storage.save(current);
        showToast('非表示にしました', 'info');
        this.render();
        return;
      }

      // ＋ この品目を追加
      const addBtn = e.target.closest('.js-add-item');
      if (addBtn) {
        const { id, name, unit } = addBtn.dataset;
        sessionStorage.setItem('newItemFromTodo', JSON.stringify({ masterId: id, name, unit }));
        window.location.hash = '#register';
        return;
      }

      // 使った
      const useBtn = e.target.closest('.js-use-item');
      if (useBtn) {
        e.stopPropagation();
        this._showUseModal(useBtn.dataset);
        return;
      }

      // サブアイテムタップで編集
      const subItem = e.target.closest('.stock-sub-item[data-id]');
      if (subItem && !e.target.closest('.js-use-item')) {
        sessionStorage.setItem('editItemId', subItem.dataset.id);
        window.location.hash = '#register';
      }
    }, { signal: sig });

    // スワイプ処理
    this._attachSwipe(listEl, sig);
  },

  // ── スワイプで非表示ボタンを露出させる ──────────────────
  _attachSwipe(listEl, signal) {
    const SWIPE_THRESHOLD = 60;  // px：これ以上左に引いたら確定
    const SWIPE_WIDTH     = 80;  // px：露出するボタン幅
    let startX, startY, activeWrap, dragging = false;

    listEl.addEventListener('touchstart', e => {
      const wrap = e.target.closest('.stock-item-wrap');
      if (!wrap) return;
      startX     = e.touches[0].clientX;
      startY     = e.touches[0].clientY;
      activeWrap = wrap;
      dragging   = false;
    }, { passive: true, signal });

    listEl.addEventListener('touchmove', e => {
      if (!activeWrap) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      // 縦スクロールが主なら中断
      if (!dragging && Math.abs(dy) > Math.abs(dx) + 5) {
        activeWrap = null;
        return;
      }
      // 右スワイプは無視（ただし既に開いている場合は閉じる）
      if (!dragging && dx > 10) {
        if (activeWrap.classList.contains('is-swiped')) {
          this._closeSwipe(activeWrap);
          this._swipedWrap = null;
        }
        activeWrap = null;
        return;
      }

      dragging = true;
      const details  = activeWrap.querySelector('.stock-item');
      const base     = activeWrap.classList.contains('is-swiped') ? -SWIPE_WIDTH : 0;
      const clamped  = Math.max(-SWIPE_WIDTH, Math.min(0, base + dx));
      details.style.transition = 'none';
      details.style.transform  = `translateX(${clamped}px)`;
    }, { passive: true, signal });

    listEl.addEventListener('touchend', e => {
      if (!activeWrap || !dragging) { activeWrap = null; return; }
      const dx      = e.changedTouches[0].clientX - startX;
      const details = activeWrap.querySelector('.stock-item');
      details.style.transition = '';

      const wasOpen = activeWrap.classList.contains('is-swiped');
      const open    = wasOpen ? dx > -SWIPE_WIDTH + SWIPE_THRESHOLD : dx < -SWIPE_THRESHOLD;

      if (open && !wasOpen) {
        // 開く：他に開いているものを閉じる
        if (this._swipedWrap && this._swipedWrap !== activeWrap) {
          this._closeSwipe(this._swipedWrap);
        }
        details.style.transform = `translateX(-${SWIPE_WIDTH}px)`;
        activeWrap.classList.add('is-swiped');
        this._swipedWrap = activeWrap;
      } else {
        // 閉じる
        this._closeSwipe(activeWrap);
        if (this._swipedWrap === activeWrap) this._swipedWrap = null;
      }
      activeWrap = null;
      dragging   = false;
    }, { signal });
  },

  _closeSwipe(wrap) {
    if (!wrap) return;
    const details = wrap.querySelector('.stock-item');
    if (details) {
      details.style.transition = '';
      details.style.transform  = '';
    }
    wrap.classList.remove('is-swiped');
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
            style="font-size:20px;text-align:center;padding:12px;" placeholder="数量を入力">
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
      this._filterReady = false;
      this.render();
    });
    let t;
    document.getElementById('filter-keyword').addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => {
        this._filterKeyword = e.target.value.trim();
        this._filterReady = true;
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
    container.onclick = e => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      const current = storage.get();
      current.settings.stockpileDays = parseInt(btn.dataset.days);
      storage.save(current);
      this._filterReady = false;
      this.render();
    };
  },

  _statusClass(pct) {
    if (pct >= 100) return 'is-sufficient';
    if (pct >= 50)  return 'is-medium';
    return 'is-low';
  }
};
