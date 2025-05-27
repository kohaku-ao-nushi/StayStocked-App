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
}
