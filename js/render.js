function renderItems() {
  const list = document.getElementById('itemList');
  const items = getItems();
  list.innerHTML = '';

  items.forEach((item, index) => {
    const div = document.createElement('div');
    const expiry = item.expiry ? new Date(item.expiry) : null;
    const now = new Date();
    let color = 'black';
    if (expiry) {
      const diff = (expiry - now) / (1000 * 60 * 60 * 24);
      if (diff < 0) color = 'red';
      else if (diff < 3) color = 'orange';
    }
    div.style.color = color;
    div.textContent = `・${item.name}（${item.qty}個）${item.expiry ? ' - ' + item.expiry : ''}`;
    list.appendChild(div);
  });
}

window.onload = renderItems;
