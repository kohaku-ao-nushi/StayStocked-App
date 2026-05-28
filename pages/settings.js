'use strict';
/**
 * pages/settings.js — 設定画面
 */
import { storage }                from '../storage.js';
import { showToast, showConfirm } from '../ui.js';

export const settingsPage = {
  template() {
    return `
      <div class="form-section">
        <h3 class="section-title">通知設定</h3>
        <p class="section-desc">期限が近づいた際にアラートを表示するまでの日数を設定します。</p>
        <div class="form-group">
          <label for="notice3">3日分モード（期限の何日前から表示するか）</label>
          <input type="number" id="notice3" min="1" max="90">
        </div>
        <div class="form-group">
          <label for="notice7">1週間モード</label>
          <input type="number" id="notice7" min="1" max="90">
        </div>
        <div class="form-group">
          <label for="notice14">2週間モード</label>
          <input type="number" id="notice14" min="1" max="90">
        </div>
        <button id="saveSettingsBtn" class="btn btn-primary">設定を保存する</button>
      </div>

      <div class="form-section">
        <h3 class="section-title">品目リスト</h3>
        <a href="#custom-list-editor" class="btn btn-secondary btn-full">品目リストを編集する</a>
      </div>

      <div class="form-section form-section--danger">
        <h3 class="section-title">データ管理</h3>
        <p class="section-desc">登録した備蓄品・くらし方設定をすべて削除します。</p>
        <button id="resetBtn" class="btn btn-danger btn-full">全データをリセットする</button>
      </div>
    `;
  },

  init() {
    const data = storage.get();
    const nd   = data.settings.noticeDays;

    document.getElementById('notice3').value  = nd[3]  ?? 7;
    document.getElementById('notice7').value  = nd[7]  ?? 14;
    document.getElementById('notice14').value = nd[14] ?? 30;

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      const current = storage.get();
      current.settings.noticeDays = {
        3:  parseInt(document.getElementById('notice3').value)  || 7,
        7:  parseInt(document.getElementById('notice7').value)  || 14,
        14: parseInt(document.getElementById('notice14').value) || 30
      };
      storage.save(current);
      showToast('設定を保存しました');
    });

    document.getElementById('resetBtn').addEventListener('click', async () => {
      const ok = await showConfirm(
        'すべてのデータを削除します。\nこの操作は元に戻せません。',
        { confirmLabel: 'リセットする', confirmClass: 'btn-danger' }
      );
      if (!ok) return;
      storage.reset();
      showToast('データをリセットしました', 'info');
      // リセット後はページをリロードして初期状態に戻す
      setTimeout(() => { window.location.hash = '#home'; location.reload(); }, 800);
    });
  }
};
