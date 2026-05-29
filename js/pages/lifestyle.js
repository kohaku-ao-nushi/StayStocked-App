'use strict';
/**
 * pages/lifestyle.js — くらし方設定画面
 *
 * 人数セレクトを変えると人数分のプロフィールカードが動的に増減する。
 * 既存データがある場合は保存済みの値をプリセットする。
 *
 * 変更点（試作品からの改善）：
 *   - 性別をセレクトボックス → ラジオボタンに変更（タップしやすい）
 *   - alert() → showToast() に置き換え
 */
import { storage }   from '../storage.js';
import { showToast } from '../ui.js';

const AGE_GROUPS = [
  { value: '乳幼児', label: '乳幼児（0〜2歳）' },
  { value: '子ども', label: '子ども（3〜17歳）' },
  { value: '成人',   label: '成人（18〜64歳）' },
  { value: '高齢者', label: '高齢者（65歳以上）' },
];

const GENDER_ICONS = { '男性': '👨', '女性': '👩' };
const AGE_ICONS    = { '乳幼児': '👶', '子ども': '🧒', '成人': '🧑', '高齢者': '🧓' };

export const lifestylePage = {
  _people: 1,
  _pets:   0,

  template() {
    return `
      <div class="ls-section">
        <div class="ls-section__label">一緒に住んでいる人数</div>
        <div class="ls-counter" id="people-counter">
          <button class="ls-counter__btn" id="people-minus">−</button>
          <span class="ls-counter__val" id="people-val">1</span>
          <span class="ls-counter__unit">人</span>
          <button class="ls-counter__btn" id="people-plus">＋</button>
        </div>
      </div>

      <div id="profiles-container"></div>

      <div class="ls-section">
        <div class="ls-section__label">ペット</div>
        <div class="ls-counter" id="pet-counter">
          <button class="ls-counter__btn" id="pet-minus">−</button>
          <span class="ls-counter__val" id="pet-val">0</span>
          <span class="ls-counter__unit">頭</span>
          <button class="ls-counter__btn" id="pet-plus">＋</button>
        </div>
      </div>

      <button id="saveLifestyleBtn" class="btn btn-primary btn-full" style="margin-top:8px;">保存する</button>
    `;
  },

  init() {
    const data = storage.get();
    this._people = data.profiles.length || 1;
    this._pets   = data.pets.count      || 0;

    this._updateCounter('people', this._people);
    this._updateCounter('pet',    this._pets);
    this._renderProfiles(data.profiles);

    // 人数カウンター
    document.getElementById('people-minus').addEventListener('click', () => {
      if (this._people <= 1) return;
      this._people--;
      this._updateCounter('people', this._people);
      this._renderProfiles(this._collectProfiles());
    });
    document.getElementById('people-plus').addEventListener('click', () => {
      if (this._people >= 9) return;
      this._people++;
      this._updateCounter('people', this._people);
      this._renderProfiles(this._collectProfiles());
    });

    // ペットカウンター
    document.getElementById('pet-minus').addEventListener('click', () => {
      if (this._pets <= 0) return;
      this._pets--;
      this._updateCounter('pet', this._pets);
    });
    document.getElementById('pet-plus').addEventListener('click', () => {
      if (this._pets >= 9) return;
      this._pets++;
      this._updateCounter('pet', this._pets);
    });

    // 保存
    document.getElementById('saveLifestyleBtn').addEventListener('click', () => {
      const current      = storage.get();
      current.profiles   = this._collectProfiles();
      current.pets.count = this._pets;
      storage.save(current);
      showToast('くらし方を保存しました');
      window.location.hash = '#home';
    });
  },

  _updateCounter(key, val) {
    document.getElementById(`${key}-val`).textContent = val;
    const minusBtn = document.getElementById(`${key}-minus`);
    const plusBtn  = document.getElementById(`${key}-plus`);
    if (minusBtn) minusBtn.disabled = (val <= (key === 'people' ? 1 : 0));
    if (plusBtn)  plusBtn.disabled  = (val >= 9);
  },

  _renderProfiles(existing = []) {
    const container = document.getElementById('profiles-container');
    container.innerHTML = '';
    for (let i = 0; i < this._people; i++) {
      const p = existing[i] || { gender: '男性', ageGroup: '成人' };
      const card = document.createElement('div');
      card.className   = 'ls-profile-card';
      card.dataset.idx = i;

      const genderBtns = ['男性', '女性'].map(g => `
        <button class="ls-toggle-btn ${p.gender === g ? 'is-active' : ''}"
          data-field="gender" data-value="${g}">
          ${GENDER_ICONS[g]} ${g}
        </button>
      `).join('');

      const ageBtns = AGE_GROUPS.map(g => `
        <button class="ls-age-btn ${p.ageGroup === g.value ? 'is-active' : ''}"
          data-field="ageGroup" data-value="${g.value}">
          <span class="ls-age-btn__icon">${AGE_ICONS[g.value]}</span>
          <span class="ls-age-btn__label">${g.label}</span>
        </button>
      `).join('');

      card.innerHTML = `
        <div class="ls-profile-card__head">
          <span class="ls-profile-card__num">${i + 1}</span>
          <span class="ls-profile-card__title">${i + 1}人目</span>
        </div>
        <div class="ls-field-group">
          <div class="ls-field-label">性別</div>
          <div class="ls-toggle-group">${genderBtns}</div>
        </div>
        <div class="ls-field-group">
          <div class="ls-field-label">年代</div>
          <div class="ls-age-grid">${ageBtns}</div>
        </div>
      `;

      // トグルボタンのクリック処理
      card.addEventListener('click', e => {
        const btn = e.target.closest('[data-field]');
        if (!btn) return;
        const field = btn.dataset.field;
        card.querySelectorAll(`[data-field="${field}"]`).forEach(b =>
          b.classList.toggle('is-active', b === btn));
      });

      container.appendChild(card);
    }
  },

  _collectProfiles() {
    const profiles = [];
    document.querySelectorAll('.ls-profile-card').forEach(card => {
      profiles.push({
        gender:   card.querySelector('[data-field="gender"].is-active')?.dataset.value   || '男性',
        ageGroup: card.querySelector('[data-field="ageGroup"].is-active')?.dataset.value || '成人',
      });
    });
    return profiles;
  }
};
