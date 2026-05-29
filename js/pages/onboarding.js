'use strict';
/**
 * pages/onboarding.js — 初回起動ガイド（3ステップ）
 *
 * 表示条件: data.onboarding.completed === false のとき main.js から遷移
 * 完了後  : #lifestyle へ遷移し、onboarding.completed = true を保存
 */
import { storage } from '../storage.js';

const STEPS = [
  {
    icon: '🏠',
    title: '家族を守る、日常の備蓄管理',
    desc: '「えらぶ・そなえる・つかう」のサイクルで\n備蓄を無理なく日常に取り入れるアプリです。'
  },
  {
    icon: '👨‍👩‍👧',
    title: 'まず「くらし方」を設定',
    desc: '家族の人数・年齢・ペットを登録すると\nあなたの家族に必要な量が自動で計算されます。'
  },
  {
    icon: '📦',
    title: '備蓄を記録して達成率を確認',
    desc: '今ある備蓄を登録して達成率をチェック。\n使ったら記録してローリングストックを習慣にしましょう。'
  }
];

export const onboardingPage = {
  template() {
    const stepsHTML = STEPS.map((s, i) => `
      <div class="ob-step ${i === 0 ? 'is-active' : ''}" data-step="${i}">
        <div class="ob-step__icon">${s.icon}</div>
        <h2 class="ob-step__title">${s.title}</h2>
        <p class="ob-step__desc">${s.desc.replace(/\n/g, '<br>')}</p>
      </div>
    `).join('');

    const dotsHTML = STEPS.map((_, i) => `
      <span class="ob-dot ${i === 0 ? 'is-active' : ''}" data-step="${i}"></span>
    `).join('');

    return `
      <div class="ob-wrap">
        <div class="ob-steps">${stepsHTML}</div>
        <div class="ob-dots">${dotsHTML}</div>
        <div class="ob-actions">
          <button class="btn btn-primary btn-full" id="ob-next">次へ</button>
          <button class="btn-text-link" id="ob-skip">スキップして始める</button>
        </div>
      </div>
    `;
  },

  init() {
    let current = 0;

    const show = (n) => {
      document.querySelectorAll('.ob-step').forEach(el =>
        el.classList.toggle('is-active', parseInt(el.dataset.step) === n));
      document.querySelectorAll('.ob-dot').forEach(el =>
        el.classList.toggle('is-active', parseInt(el.dataset.step) === n));
      document.getElementById('ob-next').textContent =
        n === STEPS.length - 1 ? 'はじめる →' : '次へ';
    };

    document.getElementById('ob-next').addEventListener('click', () => {
      if (current < STEPS.length - 1) {
        current++;
        show(current);
      } else {
        this._complete();
      }
    });

    document.getElementById('ob-skip').addEventListener('click', () => {
      this._complete();
    });
  },

  _complete() {
    const data = storage.get();
    data.onboarding.completed = true;
    storage.save(data);
    window.location.hash = '#lifestyle';
  }
};
