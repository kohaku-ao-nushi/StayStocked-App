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
 * 全角数字・小数点を半角に変換する
 * @param {string} str
 * @returns {string}
 */
export function toHalfWidthNumber(str) {
  return str
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[．。]/g, '.');
}

/**
 * number 型 input に対して全角→半角変換 + 不正値の赤枠表示を設定する。
 * main.js でアプリ全体の #app-root に対してイベント委譲で呼ぶ想定。
 *
 * @param {Event} e — input イベント
 */
export function handleNumberInput(e) {
  const el = e.target;
  if (el.tagName !== 'INPUT' || el.type !== 'number') return;

  // 全角→半角変換（type=number は value に全角が残らないため一時的に text として扱う）
  const raw       = el.value;
  const converted = toHalfWidthNumber(raw);
  if (converted !== raw) el.value = converted;

  // バリデーション：空 or 有効な数値ならOK、それ以外は赤枠
  const val = el.value;
  const isEmpty    = val === '';
  const isValid    = !isNaN(parseFloat(val)) && isFinite(val);
  const minOk      = el.min === '' || parseFloat(val) >= parseFloat(el.min);
  const maxOk      = el.max === '' || parseFloat(val) <= parseFloat(el.max);

  if (!isEmpty && (!isValid || !minOk || !maxOk)) {
    el.classList.add('input-error');
  } else {
    el.classList.remove('input-error');
  }
}

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
