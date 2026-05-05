const adminKeyInput = document.getElementById("admin-key");
const saveKeyButton = document.getElementById("save-key");
const saveSettingsButton = document.getElementById("save-settings");
const whatsappPhoneInput = document.getElementById("whatsapp-phone");
const addCategoryBtn = document.getElementById("add-category-btn");
const newCategoryInput = document.getElementById("new-category");
const categoriesList = document.getElementById("categories-list");
const categorySelect = document.getElementById("category");
const addForm = document.getElementById("add-form");
const adminProducts = document.getElementById("admin-products");

const keyStorageName = "toy_store_admin_key";
adminKeyInput.value = localStorage.getItem(keyStorageName) || "1234";
let categories = [];

function getAdminKey() {
  const keyFromInput = adminKeyInput.value.trim();
  if (keyFromInput) {
    localStorage.setItem(keyStorageName, keyFromInput);
    return keyFromInput;
  }
  return localStorage.getItem(keyStorageName) || "";
}

saveKeyButton.addEventListener("click", () => {
  localStorage.setItem(keyStorageName, adminKeyInput.value.trim());
  alert("מפתח נשמר בדפדפן");
});

saveSettingsButton.addEventListener("click", async () => {
  const phone = whatsappPhoneInput.value.trim();
  const response = await adminFetch("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ whatsappPhone: phone, categories }),
  });

  if (!response.ok) {
    alert("שמירת מספר הוואטסאפ נכשלה");
    return;
  }
  const settings = await response.json();
  whatsappPhoneInput.value = settings.whatsappPhone || "";
  categories = Array.isArray(settings.categories) ? settings.categories : [];
  renderCategories();
  renderCategoryOptions();
  alert("מספר וואטסאפ נשמר");
});

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryInput.value.trim();
  if (!name) {
    return;
  }
  if (categories.includes(name)) {
    alert("קטגוריה כבר קיימת");
    return;
  }
  const nextCategories = [...categories, name];
  await saveCategories(nextCategories);
  newCategoryInput.value = "";
});

async function saveCategories(nextCategories) {
  const response = await adminFetch("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      whatsappPhone: whatsappPhoneInput.value.trim(),
      categories: nextCategories,
    }),
  });
  if (!response.ok) {
    alert("שמירת קטגוריות נכשלה");
    return;
  }
  const settings = await response.json();
  categories = Array.isArray(settings.categories) ? settings.categories : [];
  renderCategories();
  renderCategoryOptions();
  await loadAdminProducts();
}

function adminFetch(url, options = {}) {
  const key = getAdminKey();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
      ...(options.headers || {}),
    },
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderCategoryOptions() {
  categorySelect.innerHTML = '<option value="">ללא קטגוריה</option>';
  categories.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });
}

function renderCategories() {
  if (!categories.length) {
    categoriesList.innerHTML = '<p class="muted">אין קטגוריות עדיין.</p>';
    return;
  }
  categoriesList.innerHTML = "";
  categories.forEach((name) => {
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <span>${name}</span>
      <button type="button" class="btn-danger" data-remove-category="${name}">מחק</button>
    `;
    categoriesList.appendChild(row);
  });
}

function badgeCheckboxesHtml(productId, currentBadges) {
  const list = Array.isArray(currentBadges) ? currentBadges : [];
  const tags = [
    { value: "new", label: "חדש" },
    { value: "best", label: "הכי נמכר" },
    { value: "sale", label: "מבצע" },
  ];
  return `
    <div class="badges-picker" data-badges-for="${productId}">
      <span class="muted small">תגיות:</span>
      ${tags
        .map(
          (tag) =>
            `<label class="badge-checkbox"><input type="checkbox" data-badge-id="${productId}" value="${tag.value}" ${list.includes(tag.value) ? "checked" : ""} /> ${tag.label}</label>`
        )
        .join("")}
    </div>
  `;
}

async function loadAdminProducts() {
  const response = await adminFetch("/api/admin/products", { method: "GET" });
  if (response.status === 401) {
    adminProducts.innerHTML = "<p>מפתח מנהל לא תקין. ברירת מחדל היא 1234.</p>";
    return;
  }
  const products = await response.json();

  adminProducts.innerHTML = "";
  products.forEach((product) => {
    const item = document.createElement("div");
    item.className = "admin-item";
    item.innerHTML = `
      <strong>${product.name}</strong>
      <input data-id="${product.id}" data-field="name" value="${product.name}" />
      <input data-id="${product.id}" data-field="price" type="number" step="0.1" value="${product.price}" />
      <textarea data-id="${product.id}" data-field="description">${product.description || ""}</textarea>
      <select data-id="${product.id}" data-field="category">
        <option value="">ללא קטגוריה</option>
        ${categories
          .map(
            (name) =>
              `<option value="${name}" ${product.category === name ? "selected" : ""}>${name}</option>`
          )
          .join("")}
      </select>
      ${badgeCheckboxesHtml(product.id, product.badges)}
      <div class="admin-actions">
        <button data-action="save" data-id="${product.id}">שמור שינויים</button>
        <button class="btn-danger" data-action="delete" data-id="${product.id}">מחק</button>
      </div>
    `;
    adminProducts.appendChild(item);
  });
}

async function loadSettings() {
  const response = await adminFetch("/api/admin/settings", { method: "GET" });
  if (!response.ok) {
    return;
  }
  const settings = await response.json();
  whatsappPhoneInput.value = settings.whatsappPhone || "";
  categories = Array.isArray(settings.categories) ? settings.categories : [];
  renderCategories();
  renderCategoryOptions();
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const price = document.getElementById("price").value;
  const description = document.getElementById("description").value.trim();
  const category = categorySelect.value;
  const file = document.getElementById("image").files[0];
  const imageBase64 = await fileToBase64(file);
  const badges = Array.from(addForm.querySelectorAll('input[name="badge"]:checked')).map(
    (input) => input.value
  );

  const response = await adminFetch("/api/admin/products", {
    method: "POST",
    body: JSON.stringify({ name, price, description, imageBase64, category, badges }),
  });

  if (!response.ok) {
    alert("נכשל להוסיף מוצר. בדוק מפתח מנהל (ברירת מחדל: 1234).");
    return;
  }

  addForm.reset();
  renderCategoryOptions();
  await loadAdminProducts();
});

adminProducts.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.getAttribute("data-action");
  const id = target.getAttribute("data-id");
  if (!action || !id) {
    return;
  }

  if (action === "delete") {
    const response = await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("מחיקה נכשלה");
      return;
    }
    await loadAdminProducts();
    return;
  }

  if (action === "save") {
    const nameEl = document.querySelector(`input[data-id="${id}"][data-field="name"]`);
    const priceEl = document.querySelector(`input[data-id="${id}"][data-field="price"]`);
    const descriptionEl = document.querySelector(`textarea[data-id="${id}"][data-field="description"]`);
    const categoryEl = document.querySelector(`select[data-id="${id}"][data-field="category"]`);
    const badges = Array.from(
      document.querySelectorAll(`input[data-badge-id="${id}"]:checked`)
    ).map((el) => el.value);

    const body = {
      name: nameEl ? nameEl.value.trim() : "",
      price: priceEl ? priceEl.value : "",
      description: descriptionEl ? descriptionEl.value.trim() : "",
      category: categoryEl ? categoryEl.value : "",
      badges,
    };

    const response = await adminFetch(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      alert("שמירה נכשלה");
      return;
    }
    await loadAdminProducts();
  }
});

categoriesList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const categoryToRemove = target.getAttribute("data-remove-category");
  if (!categoryToRemove) {
    return;
  }
  const nextCategories = categories.filter((name) => name !== categoryToRemove);
  await saveCategories(nextCategories);
});

async function initAdmin() {
  await loadSettings();
  await loadAdminProducts();
}

renderCategories();
renderCategoryOptions();

initAdmin().catch((error) => {
  console.error("Admin init failed", error);
});
