'use strict';
/**
 * main.js — アプリケーションのエントリーポイント
 *
 * このファイルの役割は2つだけ：
 *   1. 全ページモジュールを import する
 *   2. Router を初期化して start() を呼ぶ
 *
 * ビジネスロジックはここには書かない。
 * 「どのファイルに何があるか」がひと目でわかる地図の役割。
 */
import { Router }               from './router.js';
import { homePage }             from './pages/home.js';
import { lifestylePage }        from './pages/lifestyle.js';
import { stockPage }            from './pages/stock.js';
import { registerPage }         from './pages/register.js';
import { settingsPage }         from './pages/settings.js';
import { customListEditorPage } from './pages/customListEditor.js';
import { onboardingPage }       from './pages/onboarding.js';
import { todoPage }             from './pages/todo.js';
import { storage }              from './storage.js';
import { handleNumberInput }    from './ui.js';

// 静的ページ（HTMLだけのシンプルなページはここに直接書く）
const howToPage = {
  template: () => `
    <div class="form-section">
      <ol class="how-to-list">
        <li>「くらし方」で家族構成とペットを設定します。</li>
        <li>「備蓄リスト」で推奨量と現在の在庫を確認します。</li>
        <li>品目をタップして備蓄品を追加・編集できます。</li>
        <li>ホーム画面で全体の達成率をひと目で確認できます。</li>
      </ol>
    </div>
  `,
  init: () => {}
};

const helpPage = {
  template: () => `
    <div class="form-section">
      <p>このアプリは防災備蓄をサポートするツールです。</p>
      <p>データはすべてお使いのブラウザ（localStorage）に保存されます。外部には一切送信されません。</p>
    </div>
  `,
  init: () => {}
};

// ルーター初期化
const router = new Router({
  home:                 homePage,
  lifestyle:            lifestylePage,
  stock:                stockPage,
  register:             registerPage,
  settings:             settingsPage,
  'custom-list-editor': customListEditorPage,
  'how-to':             howToPage,
  help:                 helpPage,
  onboarding:           onboardingPage,
  todo:                 todoPage,
});

document.addEventListener('DOMContentLoaded', () => {
  // 初回起動時はオンボーディングへ
  const data = storage.get();
  if (!data.onboarding.completed && !window.location.hash.includes('onboarding')) {
    window.location.hash = '#onboarding';
  }
  router.start();

  // アプリ全体の number input に全角→半角変換とバリデーションを適用
  // compositionend: IME確定時（全角→半角変換のカバー）
  const root = document.getElementById('app-root');
  root.addEventListener('input',          handleNumberInput);
  root.addEventListener('compositionend', handleNumberInput);
});
