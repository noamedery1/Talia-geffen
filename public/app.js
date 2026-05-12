const categoriesMenuEl = document.getElementById("categories-menu");
const productsSectionsEl = document.getElementById("products-sections");
const emptyState = document.getElementById("empty-state");
const heroCarouselEl = document.getElementById("hero-carousel");
const carouselTrackEl = document.getElementById("carousel-track");
const carouselDotsEl = document.getElementById("carousel-dots");
const carouselPrevBtn = document.getElementById("carousel-prev");
const carouselNextBtn = document.getElementById("carousel-next");
const toggleProductsBtn = document.getElementById("toggle-products-btn");
const productsContentEl = document.getElementById("products-content");
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
const confettiCanvas = document.getElementById("confetti-canvas");

let products = [];
let whatsappPhone = "";
let storeCategories = [];
let selectedCategory = "all";
let featuredProducts = [];
let currentSlideIndex = 0;
let carouselTimer = null;
let productsExpanded = false;
const cart = new Map();

const FAV_KEY = "talia_geffen_favorites";
const favorites = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));

function formatPrice(value) {
  return `${Number(value).toFixed(2)} ₪`;
}

function getProductStock(product) {
  const parsed = Number(product?.stock ?? 1);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 1;
}

function showStockMessage(message) {
  checkoutNote.textContent = message;
  window.setTimeout(() => {
    if (checkoutNote.textContent === message) {
      renderCart();
    }
  }, 2200);
}

function isFavorite(productId) {
  return favorites.has(productId);
}

function toggleFavorite(productId) {
  if (favorites.has(productId)) {
    favorites.delete(productId);
  } else {
    favorites.add(productId);
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favorites)));
  if (selectedCategory === "favorites" && favorites.size === 0) {
    selectedCategory = "all";
  }
  renderProducts();
}

function badgesHtml(product) {
  const list = Array.isArray(product.badges) ? product.badges : [];
  const stock = getProductStock(product);
  const outOfStock = stock <= 0;
  if (!list.length && !outOfStock) {
    return "";
  }
  const map = {
    new: { label: "חדש", cls: "badge-new" },
    best: { label: "הכי נמכר", cls: "badge-best" },
    sale: { label: "מבצע", cls: "badge-sale" },
  };
  const productBadges = list
    .filter((tag) => map[tag])
    .map((tag) => `<span class="badge ${map[tag].cls}">${map[tag].label}</span>`)
    .join("");
  const stockBadge = outOfStock ? '<span class="badge badge-out">חסר במלאי</span>' : "";
  return `<div class="product-badges">${stockBadge}${productBadges}</div>`;
}

function favBtnHtml(product) {
  const active = isFavorite(product.id) ? "active" : "";
  const label = isFavorite(product.id) ? "♥" : "♡";
  return `<button class="fav-btn ${active}" data-fav-id="${product.id}" type="button" aria-label="הוסף למועדפים">${label}</button>`;
}

function addToCart(productId, anchorEl) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return;
  }
  const stock = getProductStock(product);
  if (stock <= 0) {
    showStockMessage("המוצר חסר במלאי.");
    return;
  }
  const current = cart.get(productId) || 0;
  if (current >= stock) {
    showStockMessage("אין עוד במלאי.");
    return;
  }
  cart.set(productId, current + 1);
  renderCart();
  burstConfettiAt(anchorEl);
}

function updateQty(productId, change) {
  const current = cart.get(productId) || 0;
  const next = current + change;
  if (next <= 0) {
    cart.delete(productId);
  } else {
    const product = products.find((item) => item.id === productId);
    if (change > 0 && product && next > getProductStock(product)) {
      showStockMessage("אין עוד במלאי.");
      return;
    }
    cart.set(productId, next);
  }
  renderCart();
}

function renderCategoryMenu() {
  const categories = storeCategories.filter(Boolean);
  const hasFavorites = favorites.size > 0;
  if (!categories.length && !hasFavorites) {
    categoriesMenuEl.classList.add("hidden");
    categoriesMenuEl.innerHTML = "";
    return;
  }

  categoriesMenuEl.classList.remove("hidden");
  const favChip = hasFavorites
    ? `<button class="category-chip fav-chip ${selectedCategory === "favorites" ? "active" : ""}" data-category="favorites">♥ מועדפים</button>`
    : "";
  categoriesMenuEl.innerHTML = `
    <button class="category-chip ${selectedCategory === "all" ? "active" : ""}" data-category="all">הכל</button>
    ${favChip}
    ${categories
      .map(
        (category) =>
          `<button class="category-chip ${selectedCategory === category ? "active" : ""}" data-category="${category}">${category}</button>`
      )
      .join("")}
  `;
}

function createProductCard(product) {
  const card = document.createElement("article");
  const stock = getProductStock(product);
  const isOutOfStock = stock <= 0;
  card.className = `card ${isOutOfStock ? "out-of-stock" : ""}`;
  const imageHtml = product.imageBase64
    ? `<img alt="${product.name}" src="${product.imageBase64}" />`
    : `<div class="placeholder">🧸</div>`;

  card.innerHTML = `
    ${badgesHtml(product)}
    ${favBtnHtml(product)}
    ${imageHtml}
    <div class="card-content">
      <h3>${product.name}</h3>
      <p>${product.description || ""}</p>
      <p class="stock-note ${isOutOfStock ? "stock-empty" : ""}">
        ${isOutOfStock ? "חסר במלאי" : `נשארו ${stock} במלאי`}
      </p>
      <div class="card-actions">
        <div class="price">${formatPrice(product.price)}</div>
        <button class="btn-add" data-product-id="${product.id}" ${isOutOfStock ? "disabled" : ""}>
          ${isOutOfStock ? "אזל מהמלאי" : "הוספה לסל"}
        </button>
      </div>
    </div>
  `;
  return card;
}

function renderCarousel() {
  featuredProducts = products.slice(0, 5);
  if (featuredProducts.length < 2) {
    heroCarouselEl.classList.add("hidden");
    if (carouselTimer) {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }
    return;
  }

  heroCarouselEl.classList.remove("hidden");
  currentSlideIndex = Math.min(currentSlideIndex, featuredProducts.length - 1);

  carouselTrackEl.innerHTML = featuredProducts
    .map((product) => {
      const stock = getProductStock(product);
      const isOutOfStock = stock <= 0;
      const media = product.imageBase64
        ? `<img src="${product.imageBase64}" alt="${product.name}" />`
        : `<div class="placeholder">🧸</div>`;
      return `
        <article class="carousel-slide ${isOutOfStock ? "out-of-stock" : ""}">
          <div class="carousel-media">${media}${badgesHtml(product)}${favBtnHtml(product)}</div>
          <div class="carousel-content">
            <p class="carousel-kicker">מוצר חם היום</p>
            <h3>${product.name}</h3>
            <p>${product.description || "סקווש כיפי במיוחד לילדים"}</p>
            <p class="stock-note ${isOutOfStock ? "stock-empty" : ""}">
              ${isOutOfStock ? "חסר במלאי" : `נשארו ${stock} במלאי`}
            </p>
            <div class="carousel-bottom">
              <strong>${formatPrice(product.price)}</strong>
              <button class="btn-add" data-product-id="${product.id}" ${isOutOfStock ? "disabled" : ""}>
                ${isOutOfStock ? "אזל מהמלאי" : "הוספה מהירה"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  carouselDotsEl.innerHTML = featuredProducts
    .map(
      (_, index) =>
        `<button class="carousel-dot ${index === currentSlideIndex ? "active" : ""}" data-slide-index="${index}" type="button"></button>`
    )
    .join("");

  updateCarouselPosition();
  restartCarouselAutoPlay();
}

function updateCarouselPosition() {
  const offset = currentSlideIndex * 100;
  carouselTrackEl.style.transform = `translateX(-${offset}%)`;
  carouselDotsEl.querySelectorAll(".carousel-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlideIndex);
  });
}

function moveSlide(step) {
  if (!featuredProducts.length) {
    return;
  }
  currentSlideIndex = (currentSlideIndex + step + featuredProducts.length) % featuredProducts.length;
  updateCarouselPosition();
}

function restartCarouselAutoPlay() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
  }
  carouselTimer = setInterval(() => {
    moveSlide(1);
  }, 3800);
}

function appendProductSection(title, items) {
  if (!items.length) {
    return;
  }
  const section = document.createElement("section");
  section.className = "products-group";
  if (title) {
    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = title;
    section.appendChild(heading);
  }
  const groupGrid = document.createElement("div");
  groupGrid.className = "grid";
  items.forEach((product) => groupGrid.appendChild(createProductCard(product)));
  section.appendChild(groupGrid);
  productsSectionsEl.appendChild(section);
}

function renderProducts() {
  productsSectionsEl.innerHTML = "";
  renderCategoryMenu();
  renderCarousel();

  if (!products.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  if (selectedCategory === "favorites") {
    const favList = products.filter((product) => favorites.has(product.id));
    if (!favList.length) {
      productsSectionsEl.innerHTML = '<p class="muted">עדיין לא הוספת מוצרים למועדפים.</p>';
    } else {
      appendProductSection("המועדפים שלי", favList);
    }
    return;
  }

  const categories = storeCategories.filter(Boolean);
  const uncategorizedProducts = products.filter((product) => !categories.includes(product.category));

  if (!categories.length) {
    appendProductSection("", products);
    return;
  }

  if (selectedCategory !== "all") {
    const filtered = products.filter((product) => product.category === selectedCategory);
    appendProductSection(selectedCategory, filtered);
    return;
  }

  categories.forEach((category) => {
    const groupedProducts = products.filter((product) => product.category === category);
    appendProductSection(category, groupedProducts);
  });
  appendProductSection("מוצרים בודדים", uncategorizedProducts);
}

function setProductsVisibility(expanded) {
  productsExpanded = expanded;
  productsContentEl.classList.toggle("hidden", !expanded);
  toggleProductsBtn.textContent = expanded ? "הסתר מוצרים" : "הצג את כל המוצרים";
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
      const stock = getProductStock(product);
      const line = document.createElement("div");
      line.className = "cart-line";
      line.innerHTML = `
        <div>
          <strong>${product.name}</strong>
          <div class="muted small">${formatPrice(product.price)} ליחידה · מלאי: ${stock}</div>
        </div>
        <div class="qty-actions">
          <button data-cart-action="minus" data-product-id="${id}">-</button>
          <span>${qty}</span>
          <button data-cart-action="plus" data-product-id="${id}" ${qty >= stock ? "disabled" : ""}>+</button>
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

const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let confettiAnimating = false;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeConfettiCanvas);
resizeConfettiCanvas();

function burstConfettiAt(anchorEl) {
  const rect = anchorEl && anchorEl.getBoundingClientRect
    ? anchorEl.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ["#f43f5e", "#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"];
  for (let i = 0; i < 60; i += 1) {
    confettiPieces.push({
      x: originX,
      y: originY,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -9 - 3,
      gravity: 0.32,
      size: 5 + Math.random() * 5,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 90 + Math.random() * 30,
    });
  }
  if (!confettiAnimating) {
    confettiAnimating = true;
    requestAnimationFrame(stepConfetti);
  }
}

function stepConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces = confettiPieces.filter((piece) => piece.life > 0);
  confettiPieces.forEach((piece) => {
    piece.vy += piece.gravity;
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.rotation += piece.vr;
    piece.life -= 1;
    confettiCtx.save();
    confettiCtx.translate(piece.x, piece.y);
    confettiCtx.rotate((piece.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = piece.color;
    confettiCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.55);
    confettiCtx.restore();
  });
  if (confettiPieces.length) {
    requestAnimationFrame(stepConfetti);
  } else {
    confettiAnimating = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

async function initStore() {
  const [productsResponse, configResponse] = await Promise.all([
    fetch("/api/products"),
    fetch("/api/store-config"),
  ]);
  products = await productsResponse.json();
  const config = await configResponse.json();
  whatsappPhone = String(config.whatsappPhone || "");
  storeCategories = Array.isArray(config.categories) ? config.categories : [];
  renderProducts();
  renderCart();
}

productsSectionsEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const favId = target.getAttribute("data-fav-id") || target.closest("[data-fav-id]")?.getAttribute("data-fav-id");
  if (favId) {
    toggleFavorite(favId);
    return;
  }
  const id = target.getAttribute("data-product-id");
  if (target.classList.contains("btn-add") && id) {
    addToCart(id, target);
  }
});

heroCarouselEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const favId = target.getAttribute("data-fav-id") || target.closest("[data-fav-id]")?.getAttribute("data-fav-id");
  if (favId) {
    toggleFavorite(favId);
    return;
  }
  const productId = target.getAttribute("data-product-id");
  if (productId) {
    addToCart(productId, target);
    return;
  }
  const dotIndex = target.getAttribute("data-slide-index");
  if (dotIndex !== null) {
    currentSlideIndex = Number(dotIndex);
    updateCarouselPosition();
    restartCarouselAutoPlay();
  }
});

categoriesMenuEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const category = target.getAttribute("data-category");
  if (!category) {
    return;
  }
  selectedCategory = category;
  renderProducts();
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
carouselPrevBtn.addEventListener("click", () => {
  moveSlide(-1);
  restartCarouselAutoPlay();
});
carouselNextBtn.addEventListener("click", () => {
  moveSlide(1);
  restartCarouselAutoPlay();
});
toggleProductsBtn.addEventListener("click", () => {
  setProductsVisibility(!productsExpanded);
});

initStore().catch((error) => {
  console.error("Failed to initialize store", error);
});
