'use strict';
/**
 * pages/how-to.js — 使い方ガイド
 *
 * 各機能をフォン画面モックUI付きで説明する静的ページ。
 * アプリの実デザイントークン（CSS変数）をそのまま使用しているため
 * 本体UIと見た目が統一されている。
 *
 * 構成：
 *   STEP 1  くらし方を設定する
 *   STEP 2  今ある備蓄を登録する
 *   STEP 3  備蓄リストで達成率を確認する
 *   STEP 4  備蓄クエストで補充・管理する
 *   BONUS   ホームで全体を把握する
 *
 * ※ 将来的にソナーくん（マスコット）を各STEPに差し込む余地を
 *    .ht-mascot クラスで確保している。
 */

export const howToPage = {
  template() {
    return `
<style>
.ht-wrap        { font-family: -apple-system,"Hiragino Sans",sans-serif; color: var(--c-text); padding-bottom: 2rem; }
.ht-intro       { padding: 4px 0 20px; }
.ht-intro__title{ font-size: 18px; font-weight: 800; color: var(--c-primary-dk); margin-bottom: 6px; }
.ht-intro__sub  { font-size: 13px; color: var(--c-text-2); line-height: 1.6; }
.ht-step        { margin-bottom: 28px; }
.ht-step__label { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ht-step__num   {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--c-primary-dk); color: #fff;
  font-size: 13px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ht-step__num--done { background: var(--c-ok); }
.ht-step__title { font-size: 15px; font-weight: 800; color: var(--c-primary-dk); }
.ht-step__title--done { color: var(--c-ok); }
.ht-step__desc  { font-size: 13px; color: var(--c-text-2); line-height: 1.6; margin-bottom: 12px; padding-left: 36px; }
.ht-tip         {
  background: var(--c-primary-lt);
  border-left: 3px solid var(--c-primary-dk);
  border-radius: 0 8px 8px 0;
  padding: 10px 12px;
  font-size: 12px; color: var(--c-text-2); line-height: 1.5;
  margin: 12px 0 0 36px;
}
.ht-divider     { border: none; border-top: 1px solid var(--c-border); margin: 0 0 28px; }
.ht-mascot      { display: none; } /* 将来：ソナーくん差し込み用 */

/* ── Phone mock ─────────────────────────────── */
.mock-phone     {
  background: var(--c-bg);
  border-radius: 18px;
  border: 1.5px solid var(--c-border);
  overflow: hidden;
  margin-left: 36px;
  box-shadow: var(--shadow-md);
}
.mock-header    {
  background: var(--c-primary); color: #fff;
  padding: 10px 16px;
  font-size: 14px; font-weight: 700;
  text-align: center; letter-spacing: .03em;
}
.mock-body      { padding: 12px; }

/* ── Shared parts ───────────────────────────── */
.m-label        { font-size: 11px; font-weight: 700; color: var(--c-text-muted); letter-spacing: .05em; margin-bottom: 6px; }
.m-bar          { background: var(--c-border-lt, #DDD8D0); border-radius: 9999px; height: 7px; overflow: hidden; }
.m-bar__inner   { height: 100%; border-radius: 9999px; }
.m-bar__inner--ok   { background: var(--c-ok); }
.m-bar__inner--warn { background: var(--c-warn); }
.m-bar__inner--ng   { background: var(--c-ng); }
.m-card         {
  background: var(--c-surface);
  border-radius: 12px; padding: 12px 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-sm);
}
.m-card__title  { font-size: 12px; font-weight: 800; color: var(--c-text-2); margin-bottom: 8px; letter-spacing: .03em; }
.m-row          { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--c-border); }
.m-row:last-child { border-bottom: none; }
.m-row__name    { flex: 1; font-size: 12px; color: var(--c-text); }
.m-row__sub     { font-size: 11px; color: var(--c-text-muted); white-space: nowrap; }
.m-badge        { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; white-space: nowrap; }
.m-badge--ng    { background: var(--c-ng);   color: #fff; }
.m-badge--warn  { background: var(--c-warn); color: #fff; }
.m-mini-bar     { width: 44px; }
.m-btn          { font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 9999px; white-space: nowrap; }
.m-btn--primary { background: var(--c-primary-dk); color: #fff; }
.m-btn--use     { background: var(--c-bg); color: var(--c-text-2); border: 1px solid var(--c-border); }
.m-btn--full    {
  background: var(--c-primary-dk); color: #fff;
  border-radius: 10px; padding: 11px;
  text-align: center; font-size: 14px; font-weight: 700;
  margin-top: 4px;
}

/* ── STEP 1: lifestyle ──────────────────────── */
.m-counter      {
  background: var(--c-surface); border-radius: 10px;
  padding: 10px 14px; margin-bottom: 10px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: var(--shadow-sm);
}
.m-counter__btn {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--c-bg); border: 1px solid var(--c-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: var(--c-primary-dk);
}
.m-counter__val { font-size: 22px; font-weight: 800; color: var(--c-primary-dk); flex: 1; text-align: center; }
.m-counter__unit{ font-size: 13px; color: var(--c-text-muted); }
.m-profile      {
  background: var(--c-surface-2);
  border-radius: 10px; padding: 11px 12px; margin-bottom: 8px;
  border-left: 3px solid var(--c-accent);
}
.m-profile__title { font-size: 10px; font-weight: 700; letter-spacing: .07em; color: var(--c-accent); margin-bottom: 8px; text-transform: uppercase; }
.m-radio-group  { display: flex; gap: 5px; margin-bottom: 7px; }
.m-radio        {
  flex: 1; text-align: center; padding: 6px 4px;
  border-radius: 8px; font-size: 11px; font-weight: 600;
  background: var(--c-surface); border: 1.5px solid var(--c-border); color: var(--c-text-2);
}
.m-radio--on    { border-color: var(--c-accent); background: var(--c-primary-lt); color: var(--c-primary-dk); }
.m-age-group    { display: flex; gap: 4px; }
.m-age-btn      {
  flex: 1; text-align: center; padding: 5px 2px;
  border-radius: 8px; font-size: 10px; font-weight: 600;
  background: var(--c-surface); border: 1.5px solid var(--c-border); color: var(--c-text-2);
}
.m-age-btn--on  { border-color: var(--c-accent); background: var(--c-primary-lt); color: var(--c-primary-dk); }

/* ── STEP 2: register ───────────────────────── */
.m-camera       {
  background: var(--c-surface-2);
  border: 2px dashed var(--c-border);
  border-radius: 10px; padding: 16px;
  text-align: center; margin-bottom: 10px;
}
.m-camera__icon { font-size: 26px; margin-bottom: 5px; }
.m-camera__text { font-size: 12px; color: var(--c-text-muted); }
.m-form-group   { margin-bottom: 9px; }
.m-form-label   { font-size: 11px; color: var(--c-text-muted); font-weight: 600; margin-bottom: 4px; }
.m-form-input   {
  background: var(--c-surface); border: 1.5px solid var(--c-border);
  border-radius: 8px; padding: 8px 11px;
  font-size: 13px; color: var(--c-text-muted); width: 100%;
}
.m-form-input--filled { color: var(--c-text); border-color: var(--c-accent); }
.m-form-row     { display: flex; gap: 8px; }

/* ── STEP 3: stock list ─────────────────────── */
.m-mode-sel     {
  display: flex; background: var(--c-surface);
  border-radius: 9999px; padding: 3px; margin-bottom: 10px;
  box-shadow: var(--shadow-sm);
}
.m-mode-btn     { flex: 1; padding: 7px; text-align: center; font-size: 11px; font-weight: 700; border-radius: 9999px; color: var(--c-text-muted); }
.m-mode-btn--on { background: var(--c-primary-dk); color: #fff; box-shadow: var(--shadow-sm); }
.m-overall      { background: var(--c-surface); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; box-shadow: var(--shadow-sm); }
.m-overall__row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.m-overall__pct { font-size: 22px; font-weight: 800; color: var(--c-accent); }
.m-overall__sub { font-size: 11px; color: var(--c-text-muted); margin-top: 5px; }
.m-category     { background: var(--c-surface); border-radius: 10px; margin-bottom: 8px; box-shadow: var(--shadow-sm); overflow: hidden; }
.m-cat-header   { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border-bottom: 1px solid var(--c-border); }
.m-cat-name     { font-size: 13px; font-weight: 700; color: var(--c-text-2); }
.m-cat-badge    { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: var(--c-bg); color: var(--c-text-muted); }

/* ── STEP 4: quest ──────────────────────────── */
.m-priority     {
  border-radius: 8px; padding: 9px 10px; margin-bottom: 7px;
  border-left: 3px solid var(--c-primary-dk);
  background: var(--c-primary-lt);
  display: flex; align-items: center; gap: 8px;
}
.m-priority--warn { border-left-color: var(--c-warn); background: var(--c-warn-bg, #FEF9C3); }
.m-priority__icon { font-size: 14px; }
.m-priority__text { flex: 1; font-size: 12px; color: var(--c-text-2); }

/* ── HOME bonus ─────────────────────────────── */
.m-grid         { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.m-grid-item    {
  background: var(--c-surface); border-radius: 10px;
  padding: 10px 6px;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  box-shadow: var(--shadow-sm);
}
.m-grid-icon    { font-size: 20px; }
.m-grid-label   { font-size: 10px; font-weight: 600; color: var(--c-text-2); }
.m-alert-item   { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--c-text-2); padding: 5px 0; border-bottom: 1px solid var(--c-border); }
.m-alert-item:last-child { border-bottom: none; }
</style>

<div class="ht-wrap">

  <div class="ht-intro">
    <div class="ht-intro__title">クラソナの使い方</div>
    <div class="ht-intro__sub">4ステップで、家族に合った備蓄管理が始められます。</div>
  </div>

  <!-- ── STEP 1 ── -->
  <div class="ht-step">
    <div class="ht-step__label">
      <div class="ht-step__num">1</div>
      <div class="ht-step__title">くらし方を設定する</div>
    </div>
    <div class="ht-step__desc">家族の人数・年齢・ペットを登録します。これをもとに、あなたの家族に必要な備蓄量が自動で計算されます。</div>
    <div class="mock-phone">
      <div class="mock-header">くらし方</div>
      <div class="mock-body">
        <div class="m-label">一緒に住んでいる人数</div>
        <div class="m-counter">
          <div class="m-counter__btn">−</div>
          <div class="m-counter__val">3</div>
          <div class="m-counter__unit">人</div>
          <div class="m-counter__btn">＋</div>
        </div>
        <div class="m-profile">
          <div class="m-profile__title">Person 1</div>
          <div class="m-label" style="margin-bottom:5px;">性別</div>
          <div class="m-radio-group">
            <div class="m-radio m-radio--on">男性</div>
            <div class="m-radio">女性</div>
            <div class="m-radio">その他</div>
          </div>
          <div class="m-label" style="margin-top:6px;margin-bottom:5px;">年代</div>
          <div class="m-age-group">
            <div class="m-age-btn">0〜2歳</div>
            <div class="m-age-btn">3〜17歳</div>
            <div class="m-age-btn m-age-btn--on">18〜64歳</div>
            <div class="m-age-btn">65歳〜</div>
          </div>
        </div>
      </div>
    </div>
    <div class="ht-tip">ペットもここで登録できます。犬・猫・鳥など種類に応じた備蓄量も計算されます。</div>
  </div>
  <hr class="ht-divider">

  <!-- ── STEP 2 ── -->
  <div class="ht-step">
    <div class="ht-step__label">
      <div class="ht-step__num">2</div>
      <div class="ht-step__title">今ある備蓄を登録する</div>
    </div>
    <div class="ht-step__desc">備蓄リストから品目を選んで、今ある数量と消費期限を登録します。パッケージを撮影するとスムーズです。</div>
    <div class="mock-phone">
      <div class="mock-header">備蓄品登録</div>
      <div class="mock-body">
        <div class="m-camera">
          <div class="m-camera__icon">📷</div>
          <div class="m-camera__text">パッケージを撮影して登録</div>
        </div>
        <div class="m-form-group">
          <div class="m-form-label">品目</div>
          <div class="m-form-input m-form-input--filled">飲料水（ペットボトル）</div>
        </div>
        <div class="m-form-row">
          <div class="m-form-group" style="flex:1">
            <div class="m-form-label">数量</div>
            <div class="m-form-input m-form-input--filled">12</div>
          </div>
          <div class="m-form-group" style="flex:1">
            <div class="m-form-label">消費期限</div>
            <div class="m-form-input m-form-input--filled">2027/03</div>
          </div>
        </div>
        <div class="m-btn--full">登録する</div>
      </div>
    </div>
    <div class="ht-tip">最初はスターターセット8品目から。少しずつ登録するだけで達成率が上がっていきます。</div>
  </div>
  <hr class="ht-divider">

  <!-- ── STEP 3 ── -->
  <div class="ht-step">
    <div class="ht-step__label">
      <div class="ht-step__num">3</div>
      <div class="ht-step__title">備蓄リストで達成率を確認する</div>
    </div>
    <div class="ht-step__desc">カテゴリ別に備蓄の充足状況が一覧できます。プログレスバーで何が足りないか一目でわかります。</div>
    <div class="mock-phone">
      <div class="mock-header">備蓄リスト</div>
      <div class="mock-body">
        <div class="m-mode-sel">
          <div class="m-mode-btn">3日分</div>
          <div class="m-mode-btn m-mode-btn--on">1週間</div>
          <div class="m-mode-btn">2週間</div>
        </div>
        <div class="m-overall">
          <div class="m-overall__row">
            <div class="m-label" style="margin:0">全体達成率</div>
            <div class="m-overall__pct">42%</div>
          </div>
          <div class="m-bar"><div class="m-bar__inner m-bar__inner--warn" style="width:42%"></div></div>
          <div class="m-overall__sub">12 / 28 品目 達成</div>
        </div>
        <div class="m-category">
          <div class="m-cat-header">
            <div class="m-cat-name">💧 水・飲料</div>
            <div class="m-cat-badge">3/4</div>
          </div>
          <div class="m-row">
            <div class="m-row__name">飲料水（ペットボトル）</div>
            <div class="m-mini-bar m-bar"><div class="m-bar__inner m-bar__inner--ok" style="width:100%"></div></div>
            <div class="m-row__sub">12本</div>
          </div>
          <div class="m-row">
            <div class="m-row__name">経口補水液</div>
            <div class="m-mini-bar m-bar"><div class="m-bar__inner m-bar__inner--warn" style="width:40%"></div></div>
            <div class="m-row__sub">2本</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <hr class="ht-divider">

  <!-- ── STEP 4 ── -->
  <div class="ht-step">
    <div class="ht-step__label">
      <div class="ht-step__num">4</div>
      <div class="ht-step__title">備蓄クエストで補充・管理する</div>
    </div>
    <div class="ht-step__desc">「次にやるべきこと」が自動でリストアップされます。不足品目の補充や期限間近の消費を促します。「使った」を記録することでローリングストックが自然に回ります。</div>
    <div class="mock-phone">
      <div class="mock-header">備蓄クエスト</div>
      <div class="mock-body">
        <div class="m-card">
          <div class="m-card__title">⚡ 優先アクション</div>
          <div class="m-priority">
            <div class="m-priority__icon">📦</div>
            <div class="m-priority__text">乾パン・クラッカーが不足しています</div>
            <div class="m-btn m-btn--primary">追加する</div>
          </div>
          <div class="m-priority m-priority--warn">
            <div class="m-priority__icon">⏰</div>
            <div class="m-priority__text">缶詰（魚）の期限まで残り14日</div>
            <div class="m-btn m-btn--primary" style="background:var(--c-warn)">使った</div>
          </div>
        </div>
        <div class="m-card">
          <div class="m-card__title">📋 不足している備蓄</div>
          <div class="m-row">
            <div class="m-row__name">カセットコンロ用ガス</div>
            <div class="m-btn m-btn--primary">追加する</div>
          </div>
          <div class="m-row">
            <div class="m-row__name">携帯トイレ</div>
            <div class="m-btn m-btn--primary">追加する</div>
          </div>
        </div>
      </div>
    </div>
    <div class="ht-tip">使ったら記録→補充するサイクルを繰り返すことで、備蓄が自然と新鮮な状態で保たれます。</div>
  </div>
  <hr class="ht-divider">

  <!-- ── BONUS: HOME ── -->
  <div class="ht-step">
    <div class="ht-step__label">
      <div class="ht-step__num ht-step__num--done">✓</div>
      <div class="ht-step__title ht-step__title--done">ホームで全体を把握する</div>
    </div>
    <div class="ht-step__desc">ホーム画面には達成率・期限アラート・優先アクションが集約されています。毎日開くだけで備蓄の状況が一目でわかります。</div>
    <div class="mock-phone">
      <div class="mock-header">クラソナ</div>
      <div class="mock-body">
        <div class="m-overall">
          <div class="m-overall__row">
            <div class="m-label" style="margin:0">備蓄達成率（1週間）</div>
            <div class="m-overall__pct">85%</div>
          </div>
          <div class="m-bar"><div class="m-bar__inner m-bar__inner--ok" style="width:85%"></div></div>
          <div class="m-overall__sub">24 / 28 品目 達成</div>
        </div>
        <div class="m-card">
          <div class="m-card__title">期限アラート</div>
          <div class="m-alert-item">
            <div class="m-badge m-badge--ng">期限切れ</div>
            <div>缶詰（野菜）</div>
          </div>
          <div class="m-alert-item">
            <div class="m-badge m-badge--warn">残り8日</div>
            <div>缶詰（魚）</div>
          </div>
        </div>
        <div class="m-grid">
          <div class="m-grid-item"><div class="m-grid-icon">👨‍👩‍👧</div><div class="m-grid-label">くらし方</div></div>
          <div class="m-grid-item"><div class="m-grid-icon">📦</div><div class="m-grid-label">備蓄リスト</div></div>
          <div class="m-grid-item"><div class="m-grid-icon">⚡</div><div class="m-grid-label">備蓄クエスト</div></div>
        </div>
      </div>
    </div>
  </div>

</div>
    `;
  },

  init() {}
};
