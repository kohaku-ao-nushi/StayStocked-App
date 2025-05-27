function getItems() {
  return JSON.parse(localStorage.getItem('stockItems') || '[]');
}

function saveItems(items) {
  localStorage.setItem('stockItems', JSON.stringify(items));
}
