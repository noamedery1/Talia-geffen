# Toy Store (No DB)

Simple toy store website with:

- Kids-facing store screen
- Separate admin screen for managing products
- Virtual cart with quantities
- WhatsApp checkout message with full order summary
- JSON file storage (`data/products.json`)
- Image upload saved as base64 string

## Local Run

1. Install dependencies:
   - `npm install`
2. (Optional) set admin key:
   - PowerShell: `$env:ADMIN_KEY="1234"`
3. Start:
   - `npm start`
4. Open:
   - Store: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`

## Admin Usage

- Default admin key is `1234` (unless `ADMIN_KEY` env var is set).
- On `/admin`, enter the key and click "save key".
- Set WhatsApp destination number (international format, only digits).
- Add products, update price/name/description, or delete.

## Customer Checkout

- Customers add products to the virtual cart on the store page.
- Clicking checkout opens WhatsApp with a prebuilt order message:
  - product lines
  - quantities
  - per item price
  - line totals and final total

## Railway Deploy

1. Push this project to GitHub.
2. In Railway create a new project from the repo.
3. Add environment variable:
   - `ADMIN_KEY` = your secret key
4. Railway will run `npm start`.

The app uses `process.env.PORT`, so it is Railway-ready.
