const adminKeyInput = document.getElementById("admin-key");
const saveKeyButton = document.getElementById("save-key");
const saveSettingsButton = document.getElementById("save-settings");
const whatsappPhoneInput = document.getElementById("whatsapp-phone");
const addForm = document.getElementById("add-form");
const adminProducts = document.getElementById("admin-products");

const keyStorageName = "toy_store_admin_key";
adminKeyInput.value = localStorage.getItem(keyStorageName) || "1234";

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
    body: JSON.stringify({ whatsappPhone: phone }),
  });

  if (!response.ok) {
    alert("שמירת מספר הוואטסאפ נכשלה");
    return;
  }
  const settings = await response.json();
  whatsappPhoneInput.value = settings.whatsappPhone || "";
  alert("מספר וואטסאפ נשמר");
});

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
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const price = document.getElementById("price").value;
  const description = document.getElementById("description").value.trim();
  const file = document.getElementById("image").files[0];
  const imageBase64 = await fileToBase64(file);

  const response = await adminFetch("/api/admin/products", {
    method: "POST",
    body: JSON.stringify({ name, price, description, imageBase64 }),
  });

  if (!response.ok) {
    alert("נכשל להוסיף מוצר. בדוק מפתח מנהל (ברירת מחדל: 1234).");
    return;
  }

  addForm.reset();
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

    const body = {
      name: nameEl ? nameEl.value.trim() : "",
      price: priceEl ? priceEl.value : "",
      description: descriptionEl ? descriptionEl.value.trim() : "",
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

loadAdminProducts().catch((error) => {
  console.error("Admin load failed", error);
});

loadSettings().catch((error) => {
  console.error("Settings load failed", error);
});
