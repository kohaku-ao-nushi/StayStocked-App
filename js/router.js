'use strict';
/**
 * router.js — ハッシュベースのSPAルーター
 *
 * 仕組み：
 *   URL の # 以降（ハッシュ）が変わると hashchange イベントが発火する。
 *   Router はそれを受けて該当ページの template() を描画し、init() を呼ぶ。
 *
 *   各ページは { template(), init() } の形で渡す：
 *     template() : ページのHTML文字列を返す関数
 *     init()     : イベントリスナー設定・データ取得など初期化処理
 */

const PAGE_TITLES = {
  home:                 'StayStocked',
  lifestyle:            'くらし方',
  stock:                '備蓄リスト',
  register:             '備蓄品登録',
  settings:             '設定',
  'how-to':             '使い方',
  help:                 'ヘルプ',
  'custom-list-editor': '品目リストの編集',
  onboarding:           'ようこそ',
  todo:                 'ToDo備蓄',
};

export class Router {
  constructor(pages) {
    this.pages = pages;
  }

  render() {
    const pageKey = (window.location.hash || '#home').slice(1);
    const page    = this.pages[pageKey];

    // 存在しないページキーなら home に戻す
    if (!page) {
      window.location.hash = '#home';
      return;
    }

    // テンプレートを描画（ページ遷移のたびに先頭へスクロール）
    window.scrollTo(0, 0);
    document.getElementById('app-root').innerHTML  = page.template();
    document.getElementById('header-title').textContent = PAGE_TITLES[pageKey] ?? 'StayStocked';

    // オンボーディング中はヘッダー・ナビを非表示
    const isOnboarding = pageKey === 'onboarding';
    document.getElementById('app-header')?.classList.toggle('is-hidden', isOnboarding);
    document.getElementById('bottom-nav')?.classList.toggle('is-hidden',  isOnboarding);

    // ボトムナビのアクティブ状態を更新
    document.querySelectorAll('.bottom-nav__item').forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${pageKey}`);
    });

    // ページ固有の初期化
    if (page.init) page.init();
  }

  /** hashchange を監視してルーターを起動する */
  start() {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
}
