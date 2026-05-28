'use strict';
/**
 * ui.js — alert() / confirm() の代替実装
 *
 * なぜ置き換えるか？
 *   ブラウザ標準の alert/confirm はモバイルでデザインが崩れ、
 *   スタイルを一切カスタマイズできない。
 *   showToast / showConfirm は見た目を CSS で自由に変えられる。
 *
 * 使い方：
 *   showToast('保存しました');              // 成功（緑）
 *   showToast('エラーです', 'error');       // エラー（赤）
 *   showToast('削除しました', 'info');      // 情報（グレー）
 *
 *   const ok = await showConfirm('削除しますか？');
 *   if (ok) { ... }   // await で bool が返るので if で使える
 */

/**
 * 画面下部にトースト通知を2.5秒表示する（alert の代替）
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'success') {
  // 既存のトーストがあれば消す（連打対策）
  document.getElementById('toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 2フレーム待ってからクラスを付けることでCSSトランジションが効く
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('is-visible'));
  });

  setTimeout(() => {
    toast.classList.remove('is-visible');
    // フェードアウトが終わったら要素を削除
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2500);
}

/**
 * 確認モーダルを表示し、ユーザーの選択を Promise<boolean> で返す（confirm の代替）
 *
 * @param {string} message
 * @param {Object} options
 * @param {string} options.confirmLabel  - 確認ボタンのテキスト（デフォルト：「削除する」）
 * @param {string} options.confirmClass  - 確認ボタンのクラス（デフォルト：'btn-danger'）
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, {
  confirmLabel = '削除する',
  confirmClass  = 'btn-danger'
} = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="modal__message">${message}</p>
        <div class="modal__actions">
          <button class="btn btn-secondary js-cancel">キャンセル</button>
          <button class="btn ${confirmClass} js-confirm">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = result => { overlay.remove(); resolve(result); };

    overlay.querySelector('.js-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('.js-confirm').addEventListener('click', () => close(true));
    // オーバーレイ外クリックでキャンセル
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  });
}
