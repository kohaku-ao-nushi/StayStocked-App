'use strict';

/**
 * =================================================================
 * アプリケーションのデータ管理 (ストレージ層)
 * localStorageへのデータの読み書きを抽象化します。
 * =================================================================
 */
const storage = {
  getAppData() {
    const data = localStorage.getItem('bosaistockApp');
    return data ? JSON.parse(data) : { profiles: [], pets: { count: 0 }, stockItems: [], settings: {} };
  },
  saveAppData(data) {
    localStorage.setItem('bosaistockApp', JSON.stringify(data));
  }
};

/**
 * =================================================================
 * 各ページのHTMLテンプレート
 * ページの内容を文字列として保持します。
 * =================================================================
 */
const templates = {
  home: `
    <h2>ホーム</h2>
    <p>日々の備えを、ここから始めましょう。</p>
    <div class="grid-menu">
      <a href="#lifestyle"><img src="icons/lifestyle.png" alt="">あなたのくらし方</a>
      <a href="#todo"><img src="icons/todo.png" alt="">ToDo備蓄</a>
      <a href="#stock"><img src="icons/stock.png" alt="">備蓄管理</a>
      <a href="#settings"><img src="icons/setting.png" alt="">設定</a>
      <a href="#how-to"><img src="icons/manual.png" alt="">使い方</a>
      <a href="#help"><img src="icons/help.png" alt="">ヘルプ</a>
    </div>
  `,
  lifestyle: `
    <h2>あなたのくらし方</h2>
    <div class="form-group">
      <label for="peopleCountSelect">一緒に住んでいる人数を選んでください：</label>
      <select id="peopleCountSelect">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}人</option>`).join('')}
      </select>
    </div>
    <div id="profiles-container"></div>
    <hr>
    <h3>ペットについて</h3>
    <div class="form-group">
      <label for="petCount">ペットの頭数</label>
      <input type="number" id="petCount" min="0" value="0">
    </div>
    <button id="saveLifestyleBtn" class="btn">この内容で保存する</button>
  `,
  todo: `
    <h2>ToDo備蓄</h2>
    <div id="todo-output"></div>
  `,
  stock: `
    <h2>備蓄管理</h2>
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
  `,
  settings: `
    <h2>設定</h2>
    <p>アプリケーションのデータを管理します。</p>
    <button id="resetDataBtn" class="btn" style="background-color: #d9534f;">全データをリセットする</button>
  `,
  'how-to': `
    <h2>使い方</h2>
    <p>1. 「あなたのくらし方」で家族構成を設定します。</p>
    <p>2. 「ToDo備蓄」で必要な備蓄量の目安を確認します。</p>
    <p>3. 購入した備蓄品を「備蓄管理」から登録します。</p>
    <p>定期的にリストを見直して、いざという時に備えましょう！</p>
  `,
  help: `
    <h2>ヘルプ</h2>
    <p>このアプリは、あなたの防災備蓄をサポートするためのツールです。</p>
    <p>データはすべてお使いのブラウザ内（localStorage）に保存され、外部に送信されることはありません。</p>
    <p>お問い合わせや不具合の報告は、〇〇までお願いします。（連絡先を記載）</p>
  `
};

/**
 * =================================================================
 * ページごとのロジック (コントローラー層)
 * ページの描画後にイベントを設定したり、データを表示したりします。
 * =================================================================
 */
const pages = {
  lifestyle() {
    const data = storage.getAppData();
    const profilesContainer = document.getElementById('profiles-container');
    const peopleCountSelect = document.getElementById('peopleCountSelect');
    const petCountInput = document.getElementById('petCount');

    // プロフィールカードを生成する関数
    const renderProfileCards = (num, profiles = []) => {
      profilesContainer.innerHTML = '';
      for (let i = 0; i < num; i++) {
        const profile = profiles[i] || {};
        const cardHTML = `
          <div class="profile-card" data-index="${i}">
            <h4>${i + 1}人目の情報</h4>
            <div class="form-group">
              <label>性別</label>
              <select class="gender-select">
                <option value="男性" ${profile.gender === '男性' ? 'selected' : ''}>男性</option>
                <option value="女性" ${profile.gender === '女性' ? 'selected' : ''}>女性</option>
              </select>
            </div>
            <div class="form-group">
              <label>年代</label>
              <select class="age-group-select">
                <option value="乳幼児" ${profile.ageGroup === '乳幼児' ? 'selected' : ''}>乳幼児 (0-2歳)</option>
                <option value="子ども" ${profile.ageGroup === '子ども' ? 'selected' : ''}>子ども (3-17歳)</option>
                <option value="成人" ${profile.ageGroup === '成人' ? 'selected' : ''}>成人 (18-64歳)</option>
                <option value="高齢者" ${profile.ageGroup === '高齢者' ? 'selected' : ''}>高齢者 (65歳以上)</option>
              </select>
            </div>
          </div>
        `;
        profilesContainer.insertAdjacentHTML('beforeend', cardHTML);
      }
    };
    
    // 人数選択リストボックスの変更イベント
    peopleCountSelect.addEventListener('change', (e) => {
      const num = parseInt(e.target.value);
      renderProfileCards(num, storage.getAppData().profiles);
    });

    // 保存ボタンのクリックイベント
    document.getElementById('saveLifestyleBtn').addEventListener('click', () => {
        const newProfiles = [];
        const profileCards = document.querySelectorAll('.profile-card');
        
        for (let i = 0; i < profileCards.length; i++) {
            newProfiles.push({
                gender: profileCards[i].querySelector('.gender-select').value,
                ageGroup: profileCards[i].querySelector('.age-group-select').value
            });
        }
        
        const currentData = storage.getAppData();
        currentData.profiles = newProfiles;
        currentData.pets.count = parseInt(petCountInput.value) || 0;
        storage.saveAppData(currentData);
        
        alert('くらし方を保存しました！');
        window.location.hash = '#home';
    });

    // 初期表示処理
    petCountInput.value = data.pets.count || 0;
    const initialNum = data.profiles.length || 1;
    peopleCountSelect.value = initialNum;
    renderProfileCards(initialNum, data.profiles);
  },

  todo() {
    const data = storage.getAppData();
    const output = document.getElementById('todo-output');

    if (data.profiles.length === 0) {
      output.innerHTML = '<p>先に「あなたのくらし方」で家族構成を設定してください。</p><a href="#lifestyle" class="btn">設定ページへ</a>';
      return;
    }
    
    // 年代ごとの人数を初期化
    let totalAdults = 0;
    let totalChildren = 0;
    let totalInfants = 0;

    // プロフィールから各年代の人数を計算
    data.profiles.forEach(p => {
        switch (p.ageGroup) {
            case '乳幼児':
                totalInfants++;
                break;
            case '子ども':
                totalChildren++;
                break;
            case '成人':
            case '高齢者':
                totalAdults++;
                break;
            default: // 想定外のカテゴリは大人としてカウント
                totalAdults++;
        }
    });

    const totalPeople = totalAdults + totalChildren + totalInfants;
    const waterNeeded = totalPeople * 3 * 3; // 1人1日3L × 3日分
    // 食料は乳幼児を除く
    const foodMealsNeeded = (totalAdults + totalChildren) * 3 * 3;

    let todoHTML = `
      <p>あなたの家族構成に基づくと、最低でも以下の備蓄が推奨されます（3日分目安）。</p>
      <ul class="stock-list">
        <li class="stock-item">💧 飲料水：約 <strong>${waterNeeded}L</strong></li>
        <li class="stock-item">🍱 食料：約 <strong>${foodMealsNeeded}食</strong></li>
    `;
    if (totalInfants > 0) {
      todoHTML += `<li class="stock-item">🍼 ミルク・おむつ類：乳幼児 <strong>${totalInfants}人分</strong></li>`;
    }
    if (data.pets.count > 0) {
      todoHTML += `<li class="stock-item">🐾 ペットフード・水：<strong>${data.pets.count}頭分</strong></li>`;
    }
    todoHTML += '</ul>';
    output.innerHTML = todoHTML;
  },
  
  stock() {
    const data = storage.getAppData();
    const output = document.getElementById('stock-list-output');
    output.innerHTML = '';

    if (data.stockItems.length === 0) {
      output.innerHTML = `
        <p>登録されている備蓄品はありません。</p>
        <a href="#register" class="btn">最初の備蓄品を登録してみる</a>
      `;
      return;
    }

    data.stockItems.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'stock-item';
      
      let expiryText = '';
      if (item.expiry) {
        const expiryDate = new Date(item.expiry);
        const diff = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)); // 切り上げで日数計算
        
        if (diff < 0) {
          li.classList.add('is-expired');
          expiryText = ` (期限切れ)`;
        } else if (diff <= 30) {
          li.classList.add('is-near-expiry');
          expiryText = ` (残り${diff}日)`;
        } else {
          expiryText = ` (期限: ${item.expiry})`;
        }
      }
      
      li.textContent = `・${item.name} (${item.qty}個)${expiryText}`;
      output.appendChild(li);
    });
  },

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
      // 簡単なIDを生成
      const newItem = { id: Date.now().toString(), name, qty, expiry };
      currentData.stockItems.push(newItem);
      storage.saveAppData(currentData);
      
      alert('登録しました！');
      window.location.hash = '#stock';
    });
  },

  settings() {
      document.getElementById('resetDataBtn').addEventListener('click', () => {
          if (confirm('本当にすべてのデータをリセットしますか？この操作は元に戻せません。')) {
              localStorage.removeItem('bosaistockApp');
              alert('データをリセットしました。');
              window.location.hash = '#home';
              location.reload(); // ページをリロードして完全に初期化
          }
      });
  }
};

/**
 * =================================================================
 * SPAルーター機能
 * URLのハッシュに応じてページを切り替えます。
 * =================================================================
 */
const router = {
  render() {
    const hash = window.location.hash || '#home';
    const pageKey = hash.substring(1);
    
    const appRoot = document.getElementById('app-root');
    const headerTitle = document.getElementById('header-title');

    if (templates[pageKey]) {
      appRoot.innerHTML = templates[pageKey];
      headerTitle.textContent = this.getHeaderTitle(pageKey);
      if (pages[pageKey]) {
        pages[pageKey]();
      }
    } else {
      window.location.hash = '#home';
    }
  },
  
  getHeaderTitle(key) {
    const titles = {
      home: 'bosaistock ホーム',
      lifestyle: 'あなたのくらし方',
      todo: 'ToDo備蓄',
      stock: '備蓄管理',
      register: '備蓄品登録',
      settings: '設定',
      'how-to': '使い方',
      help: 'ヘルプ'
    };
    return titles[key] || 'bosaistock';
  }
};

/**
 * =================================================================
 * アプリケーションの初期化
 * =================================================================
 */
// DOMの読み込み完了時とURLハッシュ変更時にルーターを実行
document.addEventListener('DOMContentLoaded', () => router.render());
window.addEventListener('hashchange', () => router.render());
