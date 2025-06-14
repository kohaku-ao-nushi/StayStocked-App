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
 * ToDo備蓄のマスターデータ
 * 東京備蓄ナビを参考に、品目、カテゴリ、計算ロジックを定義します。
 * =================================================================
 */
const todoMasterList = [
  // 食品・飲料
  { id: 'water', name: '水', category: '食品・飲料', unit: 'L', calc: p => p.totalPeople * 3 * 3, isNeeded: p => p.totalPeople > 0 },
  { id: 'staple_food', name: 'レトルトご飯・乾麺など', category: '食品・飲料', unit: '食', calc: p => (p.adults + p.children) * 3 * 3, isNeeded: p => (p.adults + p.children) > 0 },
  { id: 'side_dish', name: '缶詰・レトルト食品', category: '食品・飲料', unit: '食', calc: p => (p.adults + p.children) * 3 * 3, isNeeded: p => (p.adults + p.children) > 0 },
  { id: 'baby_food', name: '粉ミルク・液体ミルク', category: '食品・飲料', unit: '日分', calc: p => p.infants * 3, isNeeded: p => p.infants > 0 },
  { id: 'baby_bottle', name: '哺乳瓶', category: '衛生用品', unit: '本', calc: p => p.infants > 0 ? 1 : 0, isNeeded: p => p.infants > 0 },
  { id: 'sweets', name: 'お菓子類', category: '食品・飲料', unit: '袋', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0 },
  // 衛生用品
  { id: 'portable_toilet', name: '携帯トイレ・簡易トイレ', category: '衛生用品', unit: '回分', calc: p => p.totalPeople * 5 * 3, isNeeded: p => p.totalPeople > 0 },
  { id: 'wet_tissue', name: '除菌ウェットティッシュ', category: '衛生用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0 },
  { id: 'diapers', name: 'おむつ', category: '衛生用品', unit: '日分', calc: p => p.infants * 3, isNeeded: p => p.infants > 0 },
  { id: 'sanitary_pads', name: '生理用品', category: '衛生用品', unit: '日分', calc: p => p.females * 3, isNeeded: p => p.females > 0 },
  // 生活用品
  { id: 'cassette_stove', name: 'カセットコンロ', category: '生活用品', unit: '台', calc: p => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'cassette_gas', name: 'カセットボンベ', category: '生活用品', unit: '本', calc: p => 6, isNeeded: p => p.totalPeople > 0 },
  { id: 'flashlight', name: '懐中電灯・ランタン', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0 },
  { id: 'batteries', name: '乾電池', category: '生活用品', unit: 'セット', calc: p => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'mobile_battery', name: '携帯充電器', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0 },
  // ペット用品
  { id: 'pet_food', name: 'ペットフード', category: 'ペット用品', unit: '日分', calc: p => p.pets * 3, isNeeded: p => p.pets > 0 },
  { id: 'pet_toilet', name: 'ペット用トイレ用品', category: 'ペット用品', unit: '日分', calc: p => p.pets * 3, isNeeded: p => p.pets > 0 },
];

/**
 * =================================================================
 * 各ページのHTMLテンプレート
 * =================================================================
 */
const templates = {
  home: `
    <h2>ホーム</h2>
    <p>日々の備えを、ここから始めましょう。</p>
    <div class="grid-menu">
      <a href="#lifestyle"><img src="icons/lifestyle.png" alt="">くらし方</a>
      <a href="#todo"><img src="icons/todo.png" alt="">ToDo備蓄</a>
      <a href="#stock"><img src="icons/stock.png" alt="">備蓄管理</a>
      <a href="#settings"><img src="icons/setting.png" alt="">設定</a>
      <a href="#how-to"><img src="icons/manual.png" alt="">使い方</a>
      <a href="#help"><img src="icons/help.png" alt="">ヘルプ</a>
    </div>
  `,
  lifestyle: `
    <h2>くらし方</h2>
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
    <p>1. 「くらし方」で家族構成を設定します。</p>
    <p>2. 「ToDo備蓄」で必要な備蓄量の目安を確認します。</p>
    <p>3. ToDoリストの項目をタップして、「備蓄管理」に登録します。</p>
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
 * =================================================================
 */
const pages = {
  lifestyle() {
    const data = storage.getAppData();
    const profilesContainer = document.getElementById('profiles-container');
    const peopleCountSelect = document.getElementById('peopleCountSelect');
    const petCountInput = document.getElementById('petCount');

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
    
    peopleCountSelect.addEventListener('change', (e) => {
      const num = parseInt(e.target.value);
      renderProfileCards(num, storage.getAppData().profiles);
    });

    document.getElementById('saveLifestyleBtn').addEventListener('click', () => {
        const newProfiles = [];
        const profileCards = document.querySelectorAll('.profile-card');
        
        profileCards.forEach(card => {
            newProfiles.push({
                gender: card.querySelector('.gender-select').value,
                ageGroup: card.querySelector('.age-group-select').value
            });
        });
        
        const currentData = storage.getAppData();
        currentData.profiles = newProfiles;
        currentData.pets.count = parseInt(petCountInput.value) || 0;
        storage.saveAppData(currentData);
        
        alert('くらし方を保存しました！');
        window.location.hash = '#home';
    });

    petCountInput.value = data.pets.count || 0;
    const initialNum = data.profiles.length || 1;
    peopleCountSelect.value = initialNum;
    renderProfileCards(initialNum, data.profiles);
  },

  todo() {
    const data = storage.getAppData();
    const output = document.getElementById('todo-output');

    if (data.profiles.length === 0) {
      output.innerHTML = '<p>先に「くらし方」で家族構成を設定してください。</p><a href="#lifestyle" class="btn">設定ページへ</a>';
      return;
    }
    
    const params = {
      adults: 0, children: 0, infants: 0,
      totalPeople: data.profiles.length,
      females: 0, elderly: 0, pets: data.pets.count || 0
    };
    
    data.profiles.forEach(p => {
        if (p.gender === '女性') params.females++;
        switch (p.ageGroup) {
            case '乳幼児': params.infants++; break;
            case '子ども': params.children++; break;
            case '成人': params.adults++; break;
            case '高齢者': params.elderly++; params.adults++; break;
        }
    });

    const categories = {};
    todoMasterList.forEach(item => {
        if (item.isNeeded(params)) {
            const quantity = item.calc(params);
            if (quantity > 0) {
                if (!categories[item.category]) {
                    categories[item.category] = [];
                }
                categories[item.category].push({ ...item, quantity });
            }
        }
    });

    let todoHTML = '<p>あなたの世帯で推奨される備蓄リストです。項目をタップして備蓄品を登録しましょう。</p>';
    for (const categoryName in categories) {
        todoHTML += `<div class="todo-category"><h3>${categoryName}</h3><ul class="stock-list">`;
        categories[categoryName].forEach(item => {
            todoHTML += `
                <li class="todo-item" data-name="${item.name}" data-qty="${item.quantity}">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty"><strong>${item.quantity}</strong> ${item.unit}</span>
                </li>
            `;
        });
        todoHTML += `</ul></div>`;
    }
    output.innerHTML = todoHTML;

    // イベントリスナーを設定
    output.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (todoItem) {
            const itemName = todoItem.dataset.name;
            const itemQty = todoItem.dataset.qty;
            
            sessionStorage.setItem('newItemFromTodo', JSON.stringify({ name: itemName, qty: itemQty }));
            window.location.hash = '#register';
        }
    });
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
        const diff = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
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
    const itemNameInput = document.getElementById('itemName');
    const itemQtyInput = document.getElementById('itemQty');

    // ToDoページから渡されたデータがあればフォームに設定
    const newItemData = sessionStorage.getItem('newItemFromTodo');
    if (newItemData) {
        const item = JSON.parse(newItemData);
        itemNameInput.value = item.name;
        itemQtyInput.value = item.qty;
        sessionStorage.removeItem('newItemFromTodo'); // 使ったら消す
    }

    document.getElementById('saveItemBtn').addEventListener('click', () => {
      const name = itemNameInput.value;
      const qty = parseInt(itemQtyInput.value);
      const expiry = document.getElementById('itemExpiry').value;

      if (!name || !qty) {
        alert('品名と数量は必須です。');
        return;
      }
      
      const currentData = storage.getAppData();
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
              location.reload();
          }
      });
  }
};

/**
 * =================================================================
 * SPAルーター機能
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
      lifestyle: 'くらし方',
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
document.addEventListener('DOMContentLoaded', () => router.render());
window.addEventListener('hashchange', () => router.render());
