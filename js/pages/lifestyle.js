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
  { value: '乳幼児', label: '0〜2歳',   sub: '乳幼児' },
  { value: '子ども', label: '3〜17歳',  sub: '子ども' },
  { value: '成人',   label: '18〜64歳', sub: '成人'   },
  { value: '高齢者', label: '65歳以上', sub: '高齢者' },
];

// ペットプリセット（種類 → デフォルト助数詞）
const PET_PRESETS = [
  { type: '犬',       unit: '匹' },
  { type: '猫',       unit: '匹' },
  { type: '鳥',       unit: '羽' },
  { type: 'うさぎ',   unit: '羽' },
  { type: 'ハムスター', unit: '匹' },
  { type: '魚',       unit: '匹' },
  { type: 'その他',   unit: '頭' },
];

export const lifestylePage = {
  _people:  1,
  _petList: [],   // [{ type, unit, count }]

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
        <div id="pet-list"></div>
        <button class="ls-pet-add-btn" id="pet-add">＋ ペットを追加</button>
      </div>

      <button id="saveLifestyleBtn" class="btn btn-primary btn-full" style="margin-top:8px;">保存する</button>
    `;
  },

  init() {
    const data    = storage.get();
    this._people  = data.profiles.length || 1;

    // 旧データ（count のみ）との後方互換
    if (data.pets.entries?.length > 0) {
      this._petList = data.pets.entries.map(e => ({ ...e }));
    } else if (data.pets.count > 0) {
      this._petList = [{ type: 'その他', unit: '頭', count: data.pets.count }];
    } else {
      this._petList = [];
    }

    this._updateCounter('people', this._people);
    this._renderProfiles(data.profiles);
    this._renderPetList();

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

    // ペット追加
    document.getElementById('pet-add').addEventListener('click', () => {
      this._petList.push({ type: '犬', unit: '匹', count: 1 });
      this._renderPetList();
    });

    // 保存
    document.getElementById('saveLifestyleBtn').addEventListener('click', () => {
      const current    = storage.get();
      current.profiles = this._collectProfiles();
      current.pets     = {
        entries: this._petList,
        count:   this._petList.reduce((s, e) => s + e.count, 0)
      };
      storage.save(current);
      showToast('くらし方を保存しました');
      window.location.hash = '#home';
    });
  },

  _updateCounter(key, val) {
    document.getElementById(`${key}-val`).textContent = val;
    const minusBtn = document.getElementById(`${key}-minus`);
    const plusBtn  = document.getElementById(`${key}-plus`);
    if (minusBtn) minusBtn.disabled = (val <= 1);
    if (plusBtn)  plusBtn.disabled  = (val >= 9);
  },

  _renderPetList() {
    const container = document.getElementById('pet-list');
    if (this._petList.length === 0) {
      container.innerHTML = `<p class="ls-pet-empty">ペットがいる場合は追加してください</p>`;
      return;
    }
    container.innerHTML = this._petList.map((pet, i) => `
      <div class="ls-pet-row" data-idx="${i}">
        <div class="ls-pet-row__left">
          <select class="ls-pet-type" data-idx="${i}">
            ${PET_PRESETS.map(p =>
              `<option value="${p.type}" data-unit="${p.unit}" ${pet.type === p.type ? 'selected' : ''}>${p.type}</option>`
            ).join('')}
          </select>
          <div class="ls-pet-unit-wrap">
            <input class="ls-pet-unit" type="text" maxlength="3"
              value="${pet.unit}" data-idx="${i}" placeholder="匹">
          </div>
        </div>
        <div class="ls-pet-row__right">
          <button class="ls-counter__btn ls-pet-minus" data-idx="${i}">−</button>
          <span class="ls-pet-count">${pet.count}</span>
          <button class="ls-counter__btn ls-pet-plus" data-idx="${i}">＋</button>
          <button class="ls-pet-del" data-idx="${i}" title="削除">✕</button>
        </div>
      </div>
    `).join('');

    // 種類変更 → 助数詞を自動セット
    container.querySelectorAll('.ls-pet-type').forEach(sel => {
      sel.addEventListener('change', e => {
        const idx      = parseInt(e.target.dataset.idx);
        const selected = e.target.options[e.target.selectedIndex];
        this._petList[idx].type = selected.value;
        this._petList[idx].unit = selected.dataset.unit;
        this._renderPetList();
      });
    });

    // 助数詞の自由入力
    container.querySelectorAll('.ls-pet-unit').forEach(inp => {
      inp.addEventListener('input', e => {
        this._petList[parseInt(e.target.dataset.idx)].unit = e.target.value;
      });
    });

    // ± ボタン
    container.querySelectorAll('.ls-pet-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (this._petList[idx].count <= 1) return;
        this._petList[idx].count--;
        this._renderPetList();
      });
    });
    container.querySelectorAll('.ls-pet-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (this._petList[idx].count >= 9) return;
        this._petList[idx].count++;
        this._renderPetList();
      });
    });

    // 削除
    container.querySelectorAll('.ls-pet-del').forEach(btn => {
      btn.addEventListener('click', () => {
        this._petList.splice(parseInt(btn.dataset.idx), 1);
        this._renderPetList();
      });
    });
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
          data-field="gender" data-value="${g}">${g}
        </button>
      `).join('');

      const ageBtns = AGE_GROUPS.map(g => `
        <button class="ls-age-btn ${p.ageGroup === g.value ? 'is-active' : ''}"
          data-field="ageGroup" data-value="${g.value}">
          <span class="ls-age-btn__sub">${g.sub}</span>
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
          <div class="ls-age-pills">${ageBtns}</div>
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
