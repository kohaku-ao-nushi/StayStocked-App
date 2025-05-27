function saveSettings() {
  const settings = {
    adults: parseInt(document.getElementById('adultCount').value),
    children: parseInt(document.getElementById('childCount').value),
    infants: parseInt(document.getElementById('infantCount').value),
    hasElderly: document.getElementById('hasElderly').checked,
    petType: document.getElementById('petType').value,
    petCount: parseInt(document.getElementById('petCount').value)
  };

  localStorage.setItem('familySettings', JSON.stringify(settings));
  alert('家族とペットの構成を保存しました！');
  showCurrentSettings();
}

function showCurrentSettings() {
  const settings = JSON.parse(localStorage.getItem('familySettings'));
  const box = document.getElementById('currentSettings');
  if (!settings) {
    box.innerHTML = '<p>設定はまだありません。</p>';
    return;
  }
  box.innerHTML = `
    <p>大人：${settings.adults}人</p>
    <p>子ども：${settings.children}人</p>
    <p>乳幼児：${settings.infants}人</p>
    <p>高齢者：${settings.hasElderly ? 'いる' : 'いない'}</p>
    <p>ペット：${settings.petType}（${settings.petCount}匹）</p>
  `;

  // 入力欄に値を反映
  document.getElementById('adultCount').value = settings.adults;
  document.getElementById('childCount').value = settings.children;
  document.getElementById('infantCount').value = settings.infants;
  document.getElementById('hasElderly').checked = settings.hasElderly;
  document.getElementById('petType').value = settings.petType;
  document.getElementById('petCount').value = settings.petCount;
}

window.onload = showCurrentSettings;
