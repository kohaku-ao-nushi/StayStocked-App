'use strict';
/**
 * pages/onboarding.js — 初回起動ガイド（3ステップ）
 */
import { storage } from '../storage.js';

const STEPS = [
  {
    icon: '🏠',
    title: '家族を守る、\n日常の備蓄管理',
    desc: '「えらぶ・そなえる・つかう」のサイクルで\n備蓄を無理なく日常に取り入れるアプリです。',
    color: '#F0EEEB'
  },
  {
    icon: '👨‍👩‍👧',
    title: 'まず\n「くらし方」を設定',
    desc: '家族の人数・年齢・ペットを登録すると\nあなたの家族に必要な量が自動で計算されます。',
    color: '#EAF0F4'
  },
  {
    icon: '📦',
    title: '備蓄を記録して\n達成率を確認',
    desc: '今ある備蓄を登録して達成率をチェック。\n使ったら記録してローリングストックを習慣に。',
    color: '#F4EFE8'
  }
];

export const onboardingPage = {
  _current: 0,

  template() {
    const s = STEPS[0];
    return `
      <div class="ob-shell" id="ob-shell" style="background:${s.color}">
        <button class="ob-skip" id="ob-skip">スキップ</button>

        <div class="ob-body">
          <div class="ob-icon" id="ob-icon">${s.icon}</div>
          <h2 class="ob-title" id="ob-title">${s.title.replace(/\n/g, '<br>')}</h2>
          <p class="ob-desc" id="ob-desc">${s.desc.replace(/\n/g, '<br>')}</p>
        </div>

        <div class="ob-footer">
          <div class="ob-dots" id="ob-dots">
            ${STEPS.map((_, i) => `<span class="ob-dot ${i === 0 ? 'is-active' : ''}"></span>`).join('')}
          </div>
          <button class="ob-next-btn" id="ob-next">次へ</button>
        </div>
      </div>
    `;
  },

  init() {
    this._current = 0;

    document.getElementById('ob-next').addEventListener('click', () => {
      if (this._current < STEPS.length - 1) {
        this._current++;
        this._show(this._current);
      } else {
        this._complete();
      }
    });

    document.getElementById('ob-skip').addEventListener('click', () => this._complete());
  },

  _show(n) {
    const s     = STEPS[n];
    const shell = document.getElementById('ob-shell');

    shell.style.background = s.color;
    document.getElementById('ob-icon').textContent  = s.icon;
    document.getElementById('ob-title').innerHTML   = s.title.replace(/\n/g, '<br>');
    document.getElementById('ob-desc').innerHTML    = s.desc.replace(/\n/g, '<br>');
    document.getElementById('ob-next').textContent  = n === STEPS.length - 1 ? 'はじめる →' : '次へ';

    document.querySelectorAll('.ob-dot').forEach((el, i) =>
      el.classList.toggle('is-active', i === n));

    // アニメーション
    const body = shell.querySelector('.ob-body');
    body.classList.remove('ob-anim');
    void body.offsetWidth;
    body.classList.add('ob-anim');
  },

  _complete() {
    const data = storage.get();
    data.onboarding.completed = true;
    storage.save(data);
    window.location.hash = '#lifestyle';
  }
};
