'use strict';
/**
 * pages/customListEditor.js — 品目リスト編集画面
 *
 * デフォルトのマスターリスト（閲覧のみ）と、
 * ユーザーが追加したカスタム品目（追加・削除可能）を表示する。
 */
import { storage }                from '../storage.js';
import { showToast, showConfirm } from '../ui.js';
import { todoMasterList, CATEGORIES } from '../masterData.js';

export const customListEditorPage = {
  template() {
    const catOptions   = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    const defaultItems = todoMasterList.map(item => `
      <li class="master-list__item master-list__item--accordion">
        <details class="master-list__details">
          <summary class="master-list__summary">
            <span class="master-list__name">${item.name}</span>
            <div class="master-list__badges">
              ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
              <span class="category-badge">${item.category}</span>
            </div>
          </summary>
          <p class="master-list__note">${item.note ?? ''}</p>
        </details>
      </li>
    `).join('');

    return `
      <div class="form-section">
        <h3 class="section-title">デフォルトの推奨品目</h3>
        <ul class="master-list">${defaultItems}</ul>
      </div>

      <div class="form-section">
        <h3 class="section-title">あなたが追加した品目</h3>
        <div id="customListOutput"></div>
      </div>

      <div class="form-section">
        <h3 class="section-title">新しい品目を追加</h3>
        <div class="form-group">
          <label for="customName">品目名</label>
          <input type="text" id="customName" placeholder="例：プロテイン">
        </div>
        <div class="form-group">
          <label for="customCategory">カテゴリ</label>
          <select id="customCategory">
            <option value="">選択してください</option>
            ${catOptions}
            <option value="その他">その他</option>
          </select>
        </div>
        <div class="form-group form-group--inline">
          <div>
            <label for="customUnit">単位</label>
            <input type="text" id="customUnit" placeholder="例：袋">
          </div>
          <div>
            <label for="customDailyQty">1人1日あたりの目標量（任意）</label>
            <input type="number" id="customDailyQty" min="0" placeholder="例：1">
          </div>
        </div>
        <button id="addCustomBtn" class="btn btn-primary">＋ この品目を追加する</button>
      </div>
    `;
  },

  init() {
    this._renderCustomList();

    // カスタム品目の追加
    document.getElementById('addCustomBtn').addEventListener('click', () => {
      const name     = document.getElementById('customName').value.trim();
      const category = document.getElementById('customCategory').value;
      const unit     = document.getElementById('customUnit').value.trim();
      const dailyQty = parseFloat(document.getElementById('customDailyQty').value);

      if (!name || !category || !unit) {
        showToast('品目名・カテゴリ・単位は必須です', 'error');
        return;
      }

      const newItem = {
        id: `custom-${Date.now()}`,
        name, category, unit,
        ...((!isNaN(dailyQty) && dailyQty > 0) ? { dailyQty } : {})
      };

      const data = storage.get();
      data.customMasterItems.push(newItem);
      storage.save(data);

      // 入力をクリア
      ['customName', 'customCategory', 'customUnit', 'customDailyQty']
        .forEach(id => { document.getElementById(id).value = ''; });

      showToast(`「${name}」を追加しました`);
      this._renderCustomList();
    });

    // カスタム品目の削除（イベント委譲）
    document.getElementById('customListOutput').addEventListener('click', async e => {
      const btn = e.target.closest('.js-delete-custom');
      if (!btn) return;
      const ok = await showConfirm(
        'この品目を削除しますか？\n関連する在庫データもすべて削除されます。'
      );
      if (!ok) return;
      const data = storage.get();
      data.customMasterItems = data.customMasterItems.filter(i => i.id !== btn.dataset.id);
      data.stockItems        = data.stockItems.filter(i => i.customId !== btn.dataset.id);
      storage.save(data);
      showToast('削除しました', 'info');
      this._renderCustomList();
    });
  },

  /** カスタム品目リストを再描画する（追加・削除後に呼ぶ） */
  _renderCustomList() {
    const output = document.getElementById('customListOutput');
    if (!output) return;
    const data = storage.get();

    if (data.customMasterItems.length === 0) {
      output.innerHTML = '<p class="empty-text">追加した品目はまだありません。</p>';
      return;
    }

    output.innerHTML = `
      <ul class="master-list master-list--custom">
        ${data.customMasterItems.map(item => `
          <li class="master-list__item">
            <div class="master-list__info">
              <span class="master-list__name">${item.name}</span>
              <div class="master-list__badges">
                <span class="category-badge">${item.category}</span>
                ${item.dailyQty
                  ? `<span class="target-badge">1人1日 ${item.dailyQty}${item.unit}</span>`
                  : ''}
              </div>
            </div>
            <button class="btn btn-sm btn-danger js-delete-custom" data-id="${item.id}">削除</button>
          </li>
        `).join('')}
      </ul>
    `;
  }
};
