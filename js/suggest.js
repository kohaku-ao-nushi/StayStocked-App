function generateSuggestions() {
  const settings = JSON.parse(localStorage.getItem('familySettings'));
  if (!settings) {
    document.getElementById('suggestions').innerHTML = '<p>家族構成の設定が必要です。</p>';
    return;
  }

  const { adults, children, infants, petType, petCount } = settings;
  const totalPeople = adults + children + infants;

  const waterNeeded = totalPeople * 3 * 3; // 1人1日3L × 3日分
  const foodMealsNeeded = adults * 3 * 3 + children * 2 * 3 + infants * 1 * 3;

  let suggestions = `
    <p>💧 飲料水：約 <strong>${waterNeeded}L</strong>（3日分）</p>
    <p>🍱 食料：約 <strong>${foodMealsNeeded}食</strong>（3日分）</p>
  `;

  if (infants > 0) {
    suggestions += `<p>🍼 ミルク・おむつ類：乳幼児 <strong>${infants}人分</strong></p>`;
  }

  if (petType !== "none" && petCount > 0) {
    const petWater = petCount * 1 * 3;
    suggestions += `<p>🐾 ペット用水：約 <strong>${petWater}L</strong>（3日分）</p>`;
    suggestions += `<p>🐶 ペットフード：最低 <strong>3日分</strong> 備蓄を推奨</p>`;
  }

  document.getElementById('suggestions').innerHTML = suggestions;
}

window.onload = generateSuggestions;
