function saveSettings() {
  const settings = {
    adults: parseInt(document.getElementById('adultCount').value),
    children: parseInt(document.getElementById('childCount').value),
    infants: parseInt(document.getElementById('infantCount').value),
    hasElderly: document.getElementById('hasElderly').checked,
    petType: document.getElementById('petType').value,
    petCount: parseInt(document.getElementById('petCount').value)
    // ★★★ 新規追加 ★★★
    noticeDays: {
      '3': parseInt(document.getElementById('noticeDays3').value),
      '7': parseInt(document.getElementById('noticeDays7').value),
      '14': parseInt(document.getElementById('noticeDays14').value)
    }
  };

  localStorage.setItem('familySettings', JSON.stringify(settings));
  alert('家族とペットの構成を保存しました！');
}
