'use strict';
/**
 * sw.js — Service Worker
 *
 * 戦略：アプリシェル キャッシュ優先（Cache First）
 *   - インストール時にアプリ全体をキャッシュ
 *   - ネットワーク不要でオフライン動作
 *   - CACHE_VERSION を上げると古いキャッシュを自動削除
 *
 * データ（localStorage）は Service Worker の管轄外のため、
 * オフラインでも引き続き読み書きできる。
 */

const CACHE_VERSION = 'v5';
const CACHE_NAME    = `crasona-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './css/additions.css',
  './js/main.js',
  './js/router.js',
  './js/storage.js',
  './js/masterData.js',
  './js/ui.js',
  './js/pages/home.js',
  './js/pages/lifestyle.js',
  './js/pages/stock.js',
  './js/pages/register.js',
  './js/pages/settings.js',
  './js/pages/customListEditor.js',
  './js/pages/onboarding.js',
  './js/pages/todo.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/family.png',
  './icons/stock.png',
  './icons/setting.png',
  './icons/manual.png',
  './icons/menu.png',
  './icons/todo.png',
  './icons/help.png',
  './icons/suggest.png',
];

// ── インストール：アプリシェルをすべてキャッシュ ──────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── アクティベート：古いキャッシュを削除 ────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── フェッチ：キャッシュ優先、なければネットワーク ──
self.addEventListener('fetch', event => {
  // POST などは対象外
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // キャッシュにない場合はネットワークから取得してキャッシュに追加
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
