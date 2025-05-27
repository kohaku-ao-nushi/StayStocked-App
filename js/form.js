function saveItem() {
  const name = document.getElementById('itemName').value;
  const qty = parseInt(document.getElementById('itemQty').value);
  const expiry = document.getElementById('itemExpiry').value;
  const category = document.getElementById('itemCategory').value;
  const target = document.querySelector('input[name="target"]:checked').value;

  if (!name || !qty) {
    alert('品名と数量は必須です');
    return;
  }

  const item = { name, qty, expiry, category, target };
  let items = getItems();
  items.push(item);
  saveItems(items);

  alert('登録しました！');
  document.getElementById('itemName').value = '';
  document.getElementById('itemQty').value = '1';
  document.getElementById('itemExpiry').value = '';
}
