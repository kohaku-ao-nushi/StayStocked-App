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
    this._editingId = null;
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

    // カスタム品目の操作（編集・保存・キャンセル・削除）— イベント委譲
    document.getElementById('customListOutput').addEventListener('click', async e => {
      // 削除
      const delBtn = e.target.closest('.js-delete-custom');
      if (delBtn) {
        const ok = await showConfirm(
          'この品目を削除しますか？\n関連する在庫データもすべて削除されます。'
        );
        if (!ok) return;
        const data = storage.get();
        data.customMasterItems = data.customMasterItems.filter(i => i.id !== delBtn.dataset.id);
        data.stockItems        = data.stockItems.filter(i => i.customId !== delBtn.dataset.id);
        storage.save(data);
        showToast('削除しました', 'info');
        this._editingId = null;
        this._renderCustomList();
        return;
      }

      // 編集ボタン → インライン編集フォームを展開
      const editBtn = e.target.closest('.js-edit-custom');
      if (editBtn) {
        this._editingId = editBtn.dataset.id;
        this._renderCustomList();
        return;
      }

      // キャンセル
      const cancelBtn = e.target.closest('.js-edit-cancel');
      if (cancelBtn) {
        this._editingId = null;
        this._renderCustomList();
        return;
      }

      // 保存
      const saveBtn = e.target.closest('.js-edit-save');
      if (saveBtn) {
        const id       = saveBtn.dataset.id;
        const row      = document.querySelector(`.custom-edit-form[data-id="${id}"]`);
        const name     = row.querySelector('.edit-name').value.trim();
        const category = row.querySelector('.edit-category').value;
        const unit     = row.querySelector('.edit-unit').value.trim();
        const dailyQty = parseFloat(row.querySelector('.edit-daily-qty').value);

        if (!name || !category || !unit) {
          showToast('品目名・カテゴリ・単位は必須です', 'error');
          return;
        }

        const data = storage.get();
        const idx  = data.customMasterItems.findIndex(i => i.id === id);
        if (idx > -1) {
          data.customMasterItems[idx] = {
            ...data.customMasterItems[idx],
            name, category, unit,
            ...( (!isNaN(dailyQty) && dailyQty > 0) ? { dailyQty } : { dailyQty: undefined } )
          };
          // stockItems の itemName / unit も同期
          data.stockItems = data.stockItems.map(s =>
            (s.masterId === id || s.customId === id)
              ? { ...s, itemName: name, unit }
              : s
          );
          storage.save(data);
          showToast('更新しました');
        }
        this._editingId = null;
        this._renderCustomList();
        return;
      }
    });
  },

  /** カスタム品目リストを再描画する（追加・削除・編集後に呼ぶ） */
  _renderCustomList() {
    const output = document.getElementById('customListOutput');
    if (!output) return;
    const data = storage.get();
    const catOptions = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

    if (data.customMasterItems.length === 0) {
      output.innerHTML = '<p class="empty-text">追加した品目はまだありません。</p>';
      return;
    }

    output.innerHTML = `
      <ul class="master-list master-list--custom">
        ${data.customMasterItems.map(item => {
          if (this._editingId === item.id) {
            // インライン編集フォーム
            return `
              <li class="master-list__item master-list__item--editing">
                <div class="custom-edit-form" data-id="${item.id}">
                  <div class="form-group" style="margin-bottom:8px">
                    <label>品目名</label>
                    <input class="edit-name" type="text" value="${item.name}">
                  </div>
                  <div class="form-group" style="margin-bottom:8px">
                    <label>カテゴリ</label>
                    <select class="edit-category">
                      <option value="">選択してください</option>
                      ${catOptions}
                      <option value="その他">その他</option>
                    </select>
                  </div>
                  <div class="form-group form-group--inline" style="margin-bottom:8px">
                    <div>
                      <label>単位</label>
                      <input class="edit-unit" type="text" value="${item.unit}">
                    </div>
                    <div>
                      <label>1人1日の目標量（任意）</label>
                      <input class="edit-daily-qty" type="number" min="0"
                        value="${item.dailyQty ?? ''}" placeholder="なし">
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:4px">
                    <button class="btn btn-primary btn-sm js-edit-save" data-id="${item.id}">保存</button>
                    <button class="btn btn-secondary btn-sm js-edit-cancel">キャンセル</button>
                  </div>
                </div>
              </li>
            `;
          }
          return `
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
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm btn-secondary js-edit-custom" data-id="${item.id}">編集</button>
                <button class="btn btn-sm btn-danger js-delete-custom" data-id="${item.id}">削除</button>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;

    // 編集フォームのカテゴリを現在値にセット
    if (this._editingId) {
      const item = data.customMasterItems.find(i => i.id === this._editingId);
      if (item) {
        const sel = output.querySelector('.edit-category');
        if (sel) sel.value = item.category;
      }
    }
  }
};
