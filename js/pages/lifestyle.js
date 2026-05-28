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

export const lifestylePage = {
  template() {
    const nums    = [1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}人</option>`).join('');
    const petNums = [0,1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}頭</option>`).join('');
    return `
      <div class="form-section">
        <div class="form-group">
          <label for="peopleCount">一緒に住んでいる人数</label>
          <select id="peopleCount">${nums}</select>
        </div>
        <div id="profiles-container"></div>
      </div>
      <div class="form-section">
        <h3 class="section-title">ペット</h3>
        <div class="form-group">
          <label for="petCount">ペットの頭数</label>
          <select id="petCount">${petNums}</select>
        </div>
      </div>
      <button id="saveLifestyleBtn" class="btn btn-primary btn-full">保存する</button>
    `;
  },

  init() {
    const data            = storage.get();
    const peopleCountEl   = document.getElementById('peopleCount');
    const petCountEl      = document.getElementById('petCount');
    const profilesContainer = document.getElementById('profiles-container');

    // 人数分のプロフィールカードを描画する
    const renderProfiles = (num, existing = []) => {
      profilesContainer.innerHTML = '';
      for (let i = 0; i < num; i++) {
        const p          = existing[i] || { gender: '男性', ageGroup: '成人' };
        const ageOptions = AGE_GROUPS
          .map(g => `<option value="${g.value}" ${p.ageGroup === g.value ? 'selected' : ''}>${g.label}</option>`)
          .join('');

        const card = document.createElement('div');
        card.className   = 'profile-card';
        card.dataset.idx = i;
        card.innerHTML   = `
          <div class="profile-card__title">${i + 1}人目</div>
          <div class="profile-card__fields">
            <div class="form-group">
              <label>性別</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="gender-${i}" value="男性" ${p.gender !== '女性' ? 'checked' : ''}> 男性
                </label>
                <label class="radio-label">
                  <input type="radio" name="gender-${i}" value="女性" ${p.gender === '女性' ? 'checked' : ''}> 女性
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>年代</label>
              <select class="age-group-select">${ageOptions}</select>
            </div>
          </div>
        `;
        profilesContainer.appendChild(card);
      }
    };

    // 保存済みの値でプリセット
    peopleCountEl.value = data.profiles.length || 1;
    petCountEl.value    = data.pets.count || 0;
    renderProfiles(parseInt(peopleCountEl.value), data.profiles);

    // 人数を変えたときにカードを再描画
    peopleCountEl.addEventListener('change', () => {
      renderProfiles(parseInt(peopleCountEl.value), storage.get().profiles);
    });

    document.getElementById('saveLifestyleBtn').addEventListener('click', () => {
      const profiles = [];
      document.querySelectorAll('.profile-card').forEach((card, i) => {
        profiles.push({
          gender:   card.querySelector(`input[name="gender-${i}"]:checked`)?.value || '男性',
          ageGroup: card.querySelector('.age-group-select').value
        });
      });

      const current = storage.get();
      current.profiles  = profiles;
      current.pets.count = parseInt(petCountEl.value) || 0;
      storage.save(current);

      showToast('くらし方を保存しました');
      window.location.hash = '#home';
    });
  }
};
