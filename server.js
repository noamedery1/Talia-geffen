const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "1234";
const SITE_USER = "talia";
const SITE_PASSWORD = "121314";
const DATA_FILE = path.join(__dirname, "data", "products.json");

function requireSiteAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Skochim Store"');
    return res.status(401).send("Authentication required");
  }

  const encoded = authHeader.slice(6).trim();
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch (_error) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Skochim Store"');
    return res.status(401).send("Invalid authentication");
  }

  const separatorIndex = decoded.indexOf(":");
  const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : "";
  const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

  if (user !== SITE_USER || password !== SITE_PASSWORD) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Skochim Store"');
    return res.status(401).send("Invalid username or password");
  }

  return next();
}

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

function sanitizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeCategoryName(value) {
  return String(value || "").trim();
}

function sanitizeCategories(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const unique = new Set();
  values.forEach((item) => {
    const name = normalizeCategoryName(item);
    if (name) {
      unique.add(name);
    }
  });
  return Array.from(unique);
}

const ALLOWED_BADGES = ["new", "best", "sale"];

function sanitizeBadges(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const unique = new Set();
  values.forEach((item) => {
    const tag = String(item || "").trim().toLowerCase();
    if (ALLOWED_BADGES.includes(tag)) {
      unique.add(tag);
    }
  });
  return Array.from(unique);
}

async function readStoreData() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const products = Array.isArray(parsed.products) ? parsed.products : [];
    const whatsappPhone = sanitizePhone(parsed.settings?.whatsappPhone);
    const categories = sanitizeCategories(parsed.settings?.categories);
    return { products, settings: { whatsappPhone, categories } };
  } catch (error) {
    if (error.code === "ENOENT") {
      const initial = { products: [], settings: { whatsappPhone: "", categories: [] } };
      await writeStoreData(initial);
      return initial;
    }
    throw error;
  }
}

async function writeStoreData(storeData) {
  const payload = JSON.stringify(storeData, null, 2);
  await fs.writeFile(DATA_FILE, payload, "utf8");
}

function toPublicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    price: product.price,
    imageBase64: product.imageBase64 || "",
    category: normalizeCategoryName(product.category),
    badges: sanitizeBadges(product.badges),
  };
}

function checkAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized admin access" });
  }
  next();
}

app.get("/api/products", async (_req, res) => {
  const storeData = await readStoreData();
  res.json(storeData.products.map(toPublicProduct));
});

app.get("/api/store-config", async (_req, res) => {
  const storeData = await readStoreData();
  res.json({
    whatsappPhone: storeData.settings.whatsappPhone || "",
    categories: storeData.settings.categories || [],
  });
});

app.get("/api/admin/products", checkAdmin, async (_req, res) => {
  const storeData = await readStoreData();
  res.json(storeData.products);
});

app.get("/api/admin/settings", checkAdmin, async (_req, res) => {
  const storeData = await readStoreData();
  res.json(storeData.settings);
});

app.put("/api/admin/settings", checkAdmin, async (req, res) => {
  const storeData = await readStoreData();
  const whatsappPhone = sanitizePhone(req.body.whatsappPhone);
  const categories = sanitizeCategories(req.body.categories ?? storeData.settings.categories);
  storeData.settings = { ...storeData.settings, whatsappPhone, categories };
  await writeStoreData(storeData);
  res.json(storeData.settings);
});

app.post("/api/admin/products", checkAdmin, async (req, res) => {
  const { name, price, description, imageBase64, category, badges } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Name is required" });
  }

  const parsedPrice = Number(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: "Price must be a valid number" });
  }

  if (imageBase64 && typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "Image must be a base64 string" });
  }

  const storeData = await readStoreData();
  const products = storeData.products;
  const newProduct = {
    id: Date.now().toString(),
    name: name.trim(),
    description: (description || "").trim(),
    price: parsedPrice,
    imageBase64: imageBase64 || "",
    category: normalizeCategoryName(category),
    badges: sanitizeBadges(badges),
  };

  products.push(newProduct);
  await writeStoreData(storeData);
  res.status(201).json(newProduct);
});

app.put("/api/admin/products/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const storeData = await readStoreData();
  const products = storeData.products;
  const idx = products.findIndex((product) => product.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const product = products[idx];
  const nextName = req.body.name ?? product.name;
  const nextPrice = req.body.price ?? product.price;
  const nextDescription = req.body.description ?? product.description;
  const nextImageBase64 = req.body.imageBase64 ?? product.imageBase64;
  const nextCategory = req.body.category ?? product.category;
  const nextBadges = req.body.badges ?? product.badges ?? [];

  const parsedPrice = Number(nextPrice);
  if (!nextName || typeof nextName !== "string") {
    return res.status(400).json({ error: "Name is required" });
  }
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: "Price must be a valid number" });
  }

  products[idx] = {
    ...product,
    name: nextName.trim(),
    price: parsedPrice,
    description: (nextDescription || "").trim(),
    imageBase64: typeof nextImageBase64 === "string" ? nextImageBase64 : "",
    category: normalizeCategoryName(nextCategory),
    badges: sanitizeBadges(nextBadges),
  };

  await writeStoreData(storeData);
  res.json(products[idx]);
});

app.delete("/api/admin/products/:id", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const storeData = await readStoreData();
  const products = storeData.products;
  const filtered = products.filter((product) => product.id !== id);
  if (filtered.length === products.length) {
    return res.status(404).json({ error: "Product not found" });
  }
  storeData.products = filtered;
  await writeStoreData(storeData);
  res.status(204).send();
});

app.get("/admin", requireSiteAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Toy store server listening on http://localhost:${PORT}`);
});
