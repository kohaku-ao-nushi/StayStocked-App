'use strict';

/**
 * =================================================================
 * アプリケーションのデータ管理 (ストレージ層)
 * localStorageへのデータの読み書きを抽象化する
 * =================================================================
 */
const storage = {
  // アプリのデータを一元的に取得する
  getAppData() {
    const data = localStorage.getItem('bosaistockApp');
    // データがなければ初期値を返す
    return data ? JSON.parse(data) : { settings: {}, items: [] };
  },
  // アプリのデータを保存する
  saveAppData(data) {
    localStorage.setItem('bosaistockApp', JSON.stringify(data));
  }
};

/**
 * =================================================================
 * 各ページのHTMLテンプレート
 * ページの内容を文字列として保持する
 * =================================================================
 */
const templates = {
  home: `
    <h2>ホーム</h2>
    <p>日々の備えを、ここから始めましょう。</p>
    <div class="grid-menu">
      <a href="#suggest"><img src="icons/todo.png" alt="">備蓄提案</a>
      <a href="#stock"><img src="icons/stock.png" alt="">備蓄管理</a>
      <a href="#settings"><img src="icons/setting.png" alt="">家族設定</a>
      <a href="#register"><img src="icons/register.png" alt="">備蓄品登録</a>
    </div>
  `,
  settings: `
    <h2>家族・ペット構成の設定</h2>
    <p>備蓄提案の精度を上げるために、家族構成を入力してください。</p>
    <div class="form-group">
      <label for="adultCount">大人（13歳以上）</label>
      <input type="number" id="adultCount" min="0" value="1">
    </div>
    <div class="form-group">
      <label for="childCount">子ども（3〜12歳）</label>
      <input type="number" id="childCount" min="0" value="0">
    </div>
    <div class="form-group">
      <label for="infantCount">乳幼児（0〜2歳）</label>
      <input type="number" id="infantCount" min="0" value="0">
    </div>
    <div class="form-group">
      <label for="petCount">ペットの頭数</label>
      <input type="number" id="petCount" min="0" value="0">
    </div>
    <button id="saveSettingsBtn" class="btn">この内容で保存する</button>
  `,
  suggest: `
    <h2>備蓄提案</h2>
    <div id="suggestions-output"></div>
  `,
  stock: `
    <h2>備蓄品リスト</h2>
    <a href="#register" class="btn">新しく備蓄品を登録する</a>
    <div id="stock-list-output" class="stock-list"></div>
  `,
  register: `
    <h2>備蓄品を登録</h2>
    <div class="form-group">
      <label for="itemName">品名</label>
      <input type="text" id="itemName" placeholder="例：水 2L">
    </div>
    <div class="form-group">
      <label for="itemQty">数量</label>
      <input type="number" id="itemQty" min="1" value="1">
    </div>
    <div class="form-group">
      <label for="itemExpiry">賞味期限（任意）</label>
      <input type="date" id="itemExpiry">
    </div>
    <button id="saveItemBtn" class="btn">＋ この内容で登録する</button>
  `
};

/**
 * =================================================================
 * ページごとのロジック (コントローラー層)
 * ページの描画後にイベントを設定したり、データを表示したりする
 * =================================================================
 */
const pages = {
  // 設定ページの処理
  settings() {
    const data = storage.getAppData();
    // 保存されている値をフォームに設定
    document.getElementById('adultCount').value = data.settings.adults || 1;
    document.getElementById('childCount').value = data.settings.children || 0;
    document.getElementById('infantCount').value = data.settings.infants || 0;
    document.getElementById('petCount').value = data.settings.pets || 0;
    
    // 保存ボタンにクリックイベントを設定
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      const adults = parseInt(document.getElementById('adultCount').value);
      const children = parseInt(document.getElementById('childCount').value);
      const infants = parseInt(document.getElementById('infantCount').value);
      const pets = parseInt(document.getElementById('petCount').value);

      const currentData = storage.getAppData();
      currentData.settings = { adults, children, infants, pets };
      storage.saveAppData(currentData);
      alert('設定を保存しました。');
      window.location.hash = '#home'; // ホームに戻る
    });
  },

  // 提案ページの処理
  suggest() {
    const data = storage.getAppData();
    const settings = data.settings;
    const output = document.getElementById('suggestions-output');

    if (!settings || Object.keys(settings).length === 0) {
      output.innerHTML = '<p>先に「家族設定」を行ってください。</p><a href="#settings" class="btn">設定ページへ</a>';
      return;
    }
    
    const totalPeople = (settings.adults || 0) + (settings.children || 0) + (settings.infants || 0);
    const waterNeeded = totalPeople * 3 * 3; // 1人1日3L × 3日分
    const foodMealsNeeded = ((settings.adults || 0) + (settings.children || 0)) * 3 * 3;

    let suggestionsHTML = `
      <p>あなたの家族構成に基づくと、最低でも以下の備蓄が推奨されます（3日分目安）。</p>
      <ul class="stock-list">
        <li class="stock-item">💧 飲料水：約 <strong>${waterNeeded}L</strong></li>
        <li class="stock-item">🍱 食料：約 <strong>${foodMealsNeeded}食</strong></li>
    `;
    if (settings.infants > 0) {
      suggestionsHTML += `<li class="stock-item">🍼 ミルク・おむつ類：乳幼児 <strong>${settings.infants}人分</strong></li>`;
    }
    if (settings.pets > 0) {
      suggestionsHTML += `<li class="stock-item">🐾 ペットフード・水：<strong>${settings.pets}匹分</strong></li>`;
    }
    suggestionsHTML += '</ul>';
    output.innerHTML = suggestionsHTML;
  },
  
  // 在庫リストページの処理
  stock() {
    const data = storage.getAppData();
    const output = document.getElementById('stock-list-output');
    output.innerHTML = ''; // いったん空にする

    if (data.items.length === 0) {
      output.innerHTML = '<p>登録されている備蓄品はありません。</p>';
      return;
    }

    data.items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'stock-item';
      
      let expiryText = '';
      if (item.expiry) {
        const expiryDate = new Date(item.expiry);
        const diff = (expiryDate - new Date()) / (1000 * 60 * 60 * 24);
        if (diff < 0) {
          li.classList.add('is-expired');
        } else if (diff < 30) { // 30日以内
          li.classList.add('is-near-expiry');
        }
        expiryText = ` (期限: ${item.expiry})`;
      }

      li.textContent = `・${item.name} (${item.qty}個)${expiryText}`;
      output.appendChild(li);
    });
  },

  // 登録ページの処理
  register() {
    document.getElementById('saveItemBtn').addEventListener('click', () => {
      const name = document.getElementById('itemName').value;
      const qty = parseInt(document.getElementById('itemQty').value);
      const expiry = document.getElementById('itemExpiry').value;

      if (!name || !qty) {
        alert('品名と数量は必須です。');
        return;
      }
      
      const currentData = storage.getAppData();
      currentData.items.push({ name, qty, expiry });
      storage.saveAppData(currentData);
      
      alert('登録しました！');
      window.location.hash = '#stock'; // 在庫リストページに移動
    });
  }
};


/**
 * =================================================================
 * SPAルーター機能
 * URLのハッシュに応じてページを切り替える
 * =================================================================
 */
const router = {
  render() {
    // URLの#以降を取得 (なければ'#home'をデフォルトとする)
    const hash = window.location.hash || '#home';
    const pageKey = hash.substring(1); // #を取り除く
    
    const appRoot = document.getElementById('app-root');
    const headerTitle = document.getElementById('header-title');

    // テンプレートが存在すればページを描画
    if (templates[pageKey]) {
      appRoot.innerHTML = templates[pageKey];
      headerTitle.textContent = this.getHeaderTitle(pageKey);
      
      // ページごとの初期化処理があれば呼び出す
      if (pages[pageKey]) {
        pages[pageKey]();
      }
    } else {
      // 存在しないページの場合はホームへ
      window.location.hash = '#home';
    }
  },
  
  // ページごとのヘッダータイトルを返す
  getHeaderTitle(key) {
    const titles = {
      home: 'bosaistock',
      settings: '家族設定',
      suggest: '備蓄提案',
      stock: '備蓄管理',
      register: '備蓄品登録'
    };
    return titles[key] || 'bosaistock';
  }
};

/**
 * =================================================================
 * アプリケーションの初期化
 * =================================================================
 */
// DOMの読み込みが完了したら、ルーターを初期化
document.addEventListener('DOMContentLoaded', () => router.render());
// URLのハッシュが変わったら、再度ページを描画
window.addEventListener('hashchange', () => router.render());
