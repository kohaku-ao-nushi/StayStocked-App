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
        <h3 class="section-title">棚卸しリマインダー</h3>
        <p class="section-desc">備蓄の棚卸し日をホーム画面でお知らせします。</p>
        <div class="form-group">
          <label for="next-check-date">次回棚卸し予定日</label>
          <input type="date" id="next-check-date">
        </div>
        <div class="form-group">
          <label for="check-interval">棚卸し間隔（日）</label>
          <input type="number" id="check-interval" min="1" max="365" placeholder="30">
        </div>
        <button id="saveReminderBtn" class="btn btn-primary">リマインダーを保存</button>
      </div>

      <div class="form-section">
        <h3 class="section-title">品目リスト</h3>
        <a href="#custom-list-editor" class="btn btn-secondary btn-full">品目リストを編集する</a>
      </div>

      <div class="form-section">
        <h3 class="section-title">データのバックアップ</h3>
        <p class="section-desc">備蓄データをJSONファイルとして書き出し・読み込みできます。<br>機種変更や引き継ぎにご利用ください。</p>
        <div class="settings-backup-row">
          <button id="exportBtn" class="btn btn-secondary btn-full">📤 エクスポート（書き出し）</button>
          <label class="btn btn-secondary btn-full" style="cursor:pointer;display:block;text-align:center;margin-top:8px;">
            📥 インポート（読み込み）
            <input type="file" id="importFile" accept=".json" style="display:none;">
          </label>
        </div>
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

    // 通知設定
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

    // 棚卸しリマインダー
    document.getElementById('next-check-date').value   = data.settings.nextCheckDate   || '';
    document.getElementById('check-interval').value    = data.settings.checkIntervalDays || 30;

    document.getElementById('saveReminderBtn').addEventListener('click', () => {
      const current = storage.get();
      current.settings.nextCheckDate      = document.getElementById('next-check-date').value || null;
      current.settings.checkIntervalDays  = parseInt(document.getElementById('check-interval').value) || 30;
      storage.save(current);
      showToast('リマインダーを保存しました');
    });

    // エクスポート
    document.getElementById('exportBtn').addEventListener('click', () => {
      const json     = JSON.stringify(storage.get(), null, 2);
      const blob     = new Blob([json], { type: 'application/json' });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href         = url;
      a.download     = `staystocked_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('エクスポートしました');
    });

    // インポート
    document.getElementById('importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text   = await file.text();
        const parsed = JSON.parse(text);
        // 最低限のバリデーション
        if (!parsed.profiles || !parsed.stockItems || !parsed.settings) {
          throw new Error('invalid format');
        }
        const ok = await showConfirm(
          `「${file.name}」のデータを読み込みます。\n現在のデータは上書きされます。よろしいですか？`,
          { confirmLabel: 'インポートする', confirmClass: 'btn-primary' }
        );
        if (!ok) return;
        storage.save(parsed);
        showToast('インポートしました', 'info');
        setTimeout(() => { window.location.hash = '#home'; location.reload(); }, 800);
      } catch {
        showToast('ファイルの形式が正しくありません', 'error');
      }
      e.target.value = ''; // 同一ファイル再選択を許可
    });

    // リセット
    document.getElementById('resetBtn').addEventListener('click', async () => {
      const ok = await showConfirm(
        'すべてのデータを削除します。\nこの操作は元に戻せません。',
        { confirmLabel: 'リセットする', confirmClass: 'btn-danger' }
      );
      if (!ok) return;
      storage.reset();
      showToast('データをリセットしました', 'info');
      setTimeout(() => { window.location.hash = '#home'; location.reload(); }, 800);
    });
  }
};
