const grid = document.getElementById("products-grid");
const emptyState = document.getElementById("empty-state");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const sheetCartTotalEl = document.getElementById("sheet-cart-total");
const cartCountEl = document.getElementById("cart-count");
const checkoutBtn = document.getElementById("checkout-btn");
const checkoutNote = document.getElementById("checkout-note");
const cartDock = document.getElementById("cart-dock");
const cartSheet = document.getElementById("cart-sheet");
const closeCartBtn = document.getElementById("close-cart-btn");
const cartBackdrop = document.getElementById("cart-backdrop");

let products = [];
let whatsappPhone = "";
const cart = new Map();

function formatPrice(value) {
  return `${Number(value).toFixed(2)} ₪`;
}

function addToCart(productId) {
  const current = cart.get(productId) || 0;
  cart.set(productId, current + 1);
  renderCart();
}

function updateQty(productId, change) {
  const current = cart.get(productId) || 0;
  const next = current + change;
  if (next <= 0) {
    cart.delete(productId);
  } else {
    cart.set(productId, next);
  }
  renderCart();
}

function renderProducts() {
  grid.innerHTML = "";
  if (!products.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "card";
    const imageHtml = product.imageBase64
      ? `<img alt="${product.name}" src="${product.imageBase64}" />`
      : `<div class="placeholder">🧸</div>`;

    card.innerHTML = `
      ${imageHtml}
      <div class="card-content">
        <h3>${product.name}</h3>
        <p>${product.description || ""}</p>
        <div class="card-actions">
          <div class="price">${formatPrice(product.price)}</div>
          <button class="btn-add" data-product-id="${product.id}">הוספה לסל</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderCart() {
  const entries = Array.from(cart.entries());
  const totalItems = entries.reduce((sum, [, qty]) => sum + qty, 0);

  if (totalItems === 0) {
    cartItemsEl.innerHTML = '<p class="muted">הסל שלך ריק כרגע.</p>';
  } else {
    cartItemsEl.innerHTML = "";
    entries.forEach(([id, qty]) => {
      const product = products.find((item) => item.id === id);
      if (!product) {
        return;
      }
      const line = document.createElement("div");
      line.className = "cart-line";
      line.innerHTML = `
        <div>
          <strong>${product.name}</strong>
          <div class="muted small">${formatPrice(product.price)} ליחידה</div>
        </div>
        <div class="qty-actions">
          <button data-cart-action="minus" data-product-id="${id}">-</button>
          <span>${qty}</span>
          <button data-cart-action="plus" data-product-id="${id}">+</button>
        </div>
      `;
      cartItemsEl.appendChild(line);
    });
  }

  const totalPrice = entries.reduce((sum, [id, qty]) => {
    const product = products.find((item) => item.id === id);
    return sum + (product ? product.price * qty : 0);
  }, 0);

  cartTotalEl.textContent = formatPrice(totalPrice);
  sheetCartTotalEl.textContent = formatPrice(totalPrice);
  cartCountEl.textContent = `${totalItems} פריטים`;

  if (!whatsappPhone) {
    checkoutBtn.disabled = true;
    checkoutNote.textContent = "כרגע לא הוגדר מספר וואטסאפ בחנות.";
  } else if (totalItems === 0) {
    checkoutBtn.disabled = true;
    checkoutNote.textContent = "הוסף מוצרים לסל כדי לבצע הזמנה.";
  } else {
    checkoutBtn.disabled = false;
    checkoutNote.textContent = "";
  }
}

function openCartSheet() {
  cartSheet.classList.remove("hidden");
  cartSheet.setAttribute("aria-hidden", "false");
}

function closeCartSheet() {
  cartSheet.classList.add("hidden");
  cartSheet.setAttribute("aria-hidden", "true");
}

function buildWhatsAppMessage() {
  const entries = Array.from(cart.entries());
  const lines = ["שלום, אני רוצה לבצע הזמנה מהחנות:", ""];
  let total = 0;

  entries.forEach(([id, qty], index) => {
    const product = products.find((item) => item.id === id);
    if (!product) {
      return;
    }
    const lineTotal = product.price * qty;
    total += lineTotal;
    lines.push(
      `${index + 1}. ${product.name} | כמות: ${qty} | מחיר יחידה: ${formatPrice(product.price)} | סה"כ: ${formatPrice(lineTotal)}`
    );
  });

  lines.push("", `סה"כ להזמנה: ${formatPrice(total)}`);
  return lines.join("\n");
}

function checkoutViaWhatsApp() {
  if (checkoutBtn.disabled) {
    return;
  }
  const message = encodeURIComponent(buildWhatsAppMessage());
  const url = `https://wa.me/${whatsappPhone}?text=${message}`;
  window.open(url, "_blank");
}

async function initStore() {
  const [productsResponse, configResponse] = await Promise.all([
    fetch("/api/products"),
    fetch("/api/store-config"),
  ]);
  products = await productsResponse.json();
  const config = await configResponse.json();
  whatsappPhone = String(config.whatsappPhone || "");

  renderProducts();
  renderCart();
}

grid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const id = target.getAttribute("data-product-id");
  if (target.classList.contains("btn-add") && id) {
    addToCart(id);
  }
});

cartItemsEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const action = target.getAttribute("data-cart-action");
  const id = target.getAttribute("data-product-id");
  if (!action || !id) {
    return;
  }
  if (action === "plus") {
    updateQty(id, 1);
  }
  if (action === "minus") {
    updateQty(id, -1);
  }
});

checkoutBtn.addEventListener("click", checkoutViaWhatsApp);
cartDock.addEventListener("click", openCartSheet);
closeCartBtn.addEventListener("click", closeCartSheet);
cartBackdrop.addEventListener("click", closeCartSheet);

initStore().catch((error) => {
  console.error("Failed to initialize store", error);
});
