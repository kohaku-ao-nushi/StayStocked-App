'use strict';
/**
 * pages/register.js — 備蓄品の登録・編集画面
 *
 * 3つのモードがある：
 *   A. 備蓄リストの「＋追加」ボタンから来た場合
 *      → 品目名・単位がプリセットされ、商品名・数量・期限だけ入力
 *   B. 既存の備蓄品をタップして編集する場合
 *      → すべての値がプリセットされ、削除ボタンも表示
 *   C. 「リストにない品目を追加」から来た場合
 *      → 品目名・カテゴリも手動入力
 *
 * sessionStorage でモードを区別する：
 *   'newItemFromTodo' : モードA
 *   'editItemId'      : モードB
 *   なし              : モードC
 */
import { storage }                from '../storage.js';
import { showToast, showConfirm } from '../ui.js';
import { CATEGORIES, todoMasterList } from '../masterData.js';

export const registerPage = {
  template() {
    const catOptions = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    return `
      <div class="form-section">
        <!-- 写真登録エリア -->
        <div class="form-group" id="photoGroup">
          <label>写真（任意）</label>
          <div class="photo-area" id="photoArea">
            <img id="photoPreview" class="photo-preview" style="display:none">
            <div class="photo-placeholder" id="photoPlaceholder">
              <div class="photo-placeholder__icon">📷</div>
              <div class="photo-placeholder__text">パッケージを撮影する</div>
              <div class="photo-placeholder__sub">または写真を選択</div>
            </div>
          </div>
          <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none">
          <div class="photo-actions" id="photoActions" style="display:none">
            <button type="button" class="btn btn-secondary btn-sm" id="photoRetakeBtn">撮り直す</button>
            <button type="button" class="btn btn-secondary btn-sm" id="photoRemoveBtn">削除</button>
          </div>
        </div>
        <div class="form-group" id="itemNameGroup">
          <label for="itemName">品目名</label>
          <input type="text" id="itemName" placeholder="例：水">
        </div>
        <div class="form-group" id="itemCategoryGroup" style="display:none">
          <label for="itemCategory">カテゴリ</label>
          <select id="itemCategory">
            <option value="">カテゴリを選択してください</option>
            ${catOptions}
            <option value="その他">その他</option>
          </select>
        </div>
        <div class="form-group">
          <label for="productName">商品名</label>
          <input type="text" id="productName" placeholder="例：サントリー天然水 2L">
        </div>
        <div class="form-group form-group--inline">
          <div>
            <label for="itemQty">数量</label>
            <input type="number" id="itemQty" min="0" step="any" value="1">
          </div>
          <div>
            <label for="itemUnit">単位</label>
            <input type="text" id="itemUnit" placeholder="例：本、個、L">
          </div>
        </div>
        <div class="form-group">
          <label for="itemExpiry">期限（任意）</label>
          <input type="date" id="itemExpiry">
        </div>
      </div>
      <div class="form-actions">
        <button id="saveBtn" class="btn btn-primary btn-full">登録する</button>
        <a href="#stock" class="btn btn-secondary btn-full">キャンセル</a>
        <button id="deleteBtn" class="btn btn-danger btn-full" style="display:none">この備蓄品を削除する</button>
      </div>
    `;
  },

  init() {
    const editId     = sessionStorage.getItem('editItemId');
    const newItemRaw = sessionStorage.getItem('newItemFromTodo');
    const data       = storage.get();

    // DOM 要素
    const itemNameEl      = document.getElementById('itemName');
    const itemNameGroupEl = document.getElementById('itemNameGroup');
    const catGroupEl      = document.getElementById('itemCategoryGroup');
    const productNameEl   = document.getElementById('productName');
    const itemQtyEl       = document.getElementById('itemQty');
    const itemUnitEl      = document.getElementById('itemUnit');
    const itemExpiryEl    = document.getElementById('itemExpiry');
    const saveBtn         = document.getElementById('saveBtn');
    const deleteBtn       = document.getElementById('deleteBtn');
    const headerTitle     = document.getElementById('header-title');

    let masterId     = null;
    let existingItem = null;
    let photoBase64  = null; // 写真データ（Base64 or null）

    // ── モードA：既存品目への追加 ────────────────────
    if (newItemRaw) {
      sessionStorage.removeItem('newItemFromTodo');
      const newItem = JSON.parse(newItemRaw);
      masterId        = newItem.masterId;
      itemNameEl.value    = newItem.name;
      itemNameEl.readOnly = true;
      itemUnitEl.value    = newItem.unit;
      itemUnitEl.readOnly = true;
      headerTitle.textContent = '備蓄品を追加';
      saveBtn.textContent     = '追加する';

    // ── モードB：編集 ────────────────────────────────
    } else if (editId) {
      sessionStorage.removeItem('editItemId');
      existingItem = data.stockItems.find(i => i.id === editId);
      if (existingItem) {
        masterId            = existingItem.masterId;
        itemNameEl.value    = existingItem.itemName || '';
        itemNameEl.readOnly = true;
        productNameEl.value = existingItem.productName || '';
        itemQtyEl.value     = existingItem.qty;
        itemUnitEl.value    = existingItem.unit;
        itemExpiryEl.value  = existingItem.expiry || '';
        headerTitle.textContent = '備蓄品を編集';
        saveBtn.textContent     = '更新する';
        deleteBtn.style.display = 'block';
        // 既存の写真をプレビュー
        if (existingItem.photo) {
          photoBase64 = existingItem.photo;
          this._showPhotoPreview(existingItem.photo);
        }
      }

    // ── モードC：完全新規 ────────────────────────────
    } else {
      itemNameEl.readOnly      = false;
      catGroupEl.style.display = 'block';
      headerTitle.textContent  = '新しい備蓄品を登録';
    }

    // ── 写真エリア：タップでファイル選択 ────────────
    document.getElementById('photoArea').addEventListener('click', () => {
      if (!photoBase64) {
        document.getElementById('photoInput').click();
      }
    });

    document.getElementById('photoInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this._resizeAndSetPhoto(file, (base64) => {
        photoBase64 = base64;
        this._showPhotoPreview(base64);
      });
    });

    document.getElementById('photoRetakeBtn').addEventListener('click', () => {
      document.getElementById('photoInput').click();
    });

    document.getElementById('photoRemoveBtn').addEventListener('click', () => {
      photoBase64 = null;
      this._clearPhotoPreview();
    });

    // ── 保存ボタン ───────────────────────────────────
    saveBtn.addEventListener('click', () => {
      const itemName    = itemNameEl.value.trim();
      const productName = productNameEl.value.trim();
      const qty         = parseFloat(itemQtyEl.value);
      const unit        = itemUnitEl.value.trim();
      const expiry      = itemExpiryEl.value;

      if (!itemName || !productName || isNaN(qty) || qty < 0 || !unit) {
        showToast('品目名・商品名・数量・単位は必須です', 'error');
        return;
      }

      // カテゴリ特定（モードABはマスターから、モードCはセレクトから）
      let category = existingItem?.category || '';
      if (!category) {
        if (masterId) {
          const master = [...todoMasterList, ...data.customMasterItems].find(i => i.id === masterId);
          category = master?.category || '';
        } else {
          category = document.getElementById('itemCategory')?.value || '';
          if (!category) {
            showToast('カテゴリを選択してください', 'error');
            return;
          }
        }
      }

      const current = storage.get();

      if (existingItem) {
        // 更新
        const idx = current.stockItems.findIndex(i => i.id === existingItem.id);
        if (idx > -1) {
          current.stockItems[idx] = {
            ...existingItem,
            productName, qty, unit, expiry, itemName,
            photo: photoBase64 ?? null
          };
        }
        showToast('更新しました');
      } else {
        // モードC：マスター未登録品目 → customMasterItem も自動作成してリンク
        let resolvedMasterId = masterId;
        if (!resolvedMasterId) {
          resolvedMasterId = `custom_${Date.now()}`;
          if (!current.customMasterItems) current.customMasterItems = [];
          current.customMasterItems.push({
            id:       resolvedMasterId,
            name:     itemName,
            category,
            unit,
            dailyQty: null,   // 目標量なし（自由登録）
            note:     ''
          });
        }
        current.stockItems.push({
          id:          `${Date.now()}_s`,
          masterId:    resolvedMasterId,
          customId:    resolvedMasterId,
          itemName,
          category,
          productName,
          qty,
          unit,
          expiry,
          photo: photoBase64 ?? null
        });
        showToast('登録しました');
      }

      storage.save(current);
      window.location.hash = '#stock';
    });

    // ── 削除ボタン ───────────────────────────────────
    deleteBtn.addEventListener('click', async () => {
      const ok = await showConfirm('この備蓄品を削除しますか？');
      if (!ok || !existingItem) return;
      const current = storage.get();
      current.stockItems = current.stockItems.filter(i => i.id !== existingItem.id);
      storage.save(current);
      showToast('削除しました', 'info');
      window.location.hash = '#stock';
    });
  },

  // ── 写真ヘルパー ─────────────────────────────────

  /**
   * ファイルを読み込み、長辺800px以内にリサイズしてJPEG Base64に変換。
   * @param {File}     file     入力ファイル
   * @param {Function} callback (base64: string) => void
   */
  _resizeAndSetPhoto(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round(height * MAX / width);
            width  = MAX;
          } else {
            width  = Math.round(width * MAX / height);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  _showPhotoPreview(base64) {
    const preview     = document.getElementById('photoPreview');
    const placeholder = document.getElementById('photoPlaceholder');
    const actions     = document.getElementById('photoActions');
    const area        = document.getElementById('photoArea');
    if (!preview) return;
    preview.src               = base64;
    preview.style.display     = 'block';
    placeholder.style.display = 'none';
    actions.style.display     = 'flex';
    area.classList.add('has-photo');
  },

  _clearPhotoPreview() {
    const preview     = document.getElementById('photoPreview');
    const placeholder = document.getElementById('photoPlaceholder');
    const actions     = document.getElementById('photoActions');
    const area        = document.getElementById('photoArea');
    if (!preview) return;
    preview.src               = '';
    preview.style.display     = 'none';
    placeholder.style.display = 'flex';
    actions.style.display     = 'none';
    area.classList.remove('has-photo');
    document.getElementById('photoInput').value = '';
  }
};
