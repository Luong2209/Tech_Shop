# Tech Store API Testing

Base URL:

```text
http://localhost:3000
```

If `PORT` in `.env` is different, replace `3000` with that value.

## 1. Health Check

```http
GET /
```

## 2. Seed Data

```bash
npm run seed
```

## 3. Product APIs

### Create spec template

```http
POST /api/spec-templates
Content-Type: application/json
```

```json
{
  "categoryId": 1,
  "name": "Phone spec template",
  "specsJson": {
    "fields": ["screen_size", "chipset", "ram", "storage", "battery_capacity"],
    "requiredFields": ["screen_size", "chipset", "ram"]
  }
}
```

### List spec templates

```http
GET /api/spec-templates
```

### Get spec template detail

```http
GET /api/spec-templates/1
```

### List products

```http
GET /api/products
```

### Get product detail

```http
GET /api/products/1
```

### Compare products

```http
GET /api/products/compare?ids=1,2,3
```

Response includes `products` and `comparisonSpecs`, where each spec has `values` keyed by product id.

### Get bootstrap data

```http
GET /api/products/meta/bootstrap
```

### Create product

```http
POST /api/products
Content-Type: application/json
```

```json
{
  "categoryId": 1,
  "brandId": 1,
  "specTemplateId": 1,
  "name": "Sample Phone",
  "shortDescription": "Sample product for testing",
  "description": "Created from Postman",
  "technicalSpecsJson": {
    "screen_size": "6.1 inch",
    "chipset": "Sample chip",
    "ram": "8GB",
    "storage": "128GB"
  },
  "warrantyMonths": 12,
  "status": "ACTIVE",
  "variants": [
    {
      "sku": "SAMPLE-PHONE-001",
      "name": "Sample Phone 128GB",
      "color": "Black",
      "storageLabel": "128GB",
      "ramLabel": "8GB",
      "price": "9990000",
      "isDefault": true
    }
  ]
}
```

### Update product

```http
PUT /api/products/1
Content-Type: application/json
```

```json
{
  "name": "Updated Product Name",
  "status": "ACTIVE"
}
```

### Soft delete product

```http
DELETE /api/products/1
```

## 4. Inventory APIs

### Inventory summary

```http
GET /api/inventory/summary
```

### List inventory

```http
GET /api/inventory
```

Filters:

```http
GET /api/inventory?productId=1&status=IN_STOCK&batchId=1&location=Ho Chi Minh
```

### Get inventory detail

```http
GET /api/inventory/1
```

### Get inventory by product

```http
GET /api/inventory/product/1
```

### Check IMEI/serial

```http
GET /api/inventory/check-imei/POSTMAN-IMEI-0001
```

### Import one inventory item

```http
POST /api/inventory/import
Content-Type: application/json
```

```json
{
  "productId": 1,
  "batchId": 1,
  "imeiSerial": "POSTMAN-IMEI-0001",
  "location": "Ho Chi Minh",
  "purchasePrice": "17000000"
}
```

### Update inventory status

```http
PATCH /api/inventory/1/status
Content-Type: application/json
```

```json
{
  "status": "RESERVED"
}
```

### Receive stock legacy bulk endpoint

```http
POST /api/inventory/receive
Content-Type: application/json
```

```json
{
  "productVariantId": 1,
  "warehouseId": 1,
  "supplierName": "Postman Supplier",
  "note": "Manual stock receive test",
  "items": [
    {
      "purchasePrice": "8000000",
      "identifiers": [
        {
          "type": "SERIAL",
          "value": "POSTMAN-SERIAL-0001"
        }
      ]
    }
  ]
}
```

## 5. Order APIs

### Create order

Use inventory item IDs that are still `IN_STOCK`.

```http
POST /api/orders
Content-Type: application/json
```

```json
{
  "customerId": 1,
  "inventoryItemIds": [1],
  "couponCode": "WELCOME10",
  "payment": {
    "method": "CASH",
    "status": "PENDING"
  },
  "shipping": {
    "recipientName": "Nguyen Van A",
    "phone": "0900000001",
    "address": "123 Nguyen Trai",
    "district": "Quan 1",
    "province": "Ho Chi Minh",
    "cost": "30000"
  }
}
```

After the order is created, selected inventory items are marked as `RESERVED` (they move to `SOLD` when the order status becomes `COMPLETED`).

### Create installment order

```http
POST /api/orders
Content-Type: application/json
```

```json
{
  "customerId": 1,
  "inventoryItemIds": [2],
  "payment": {
    "method": "INSTALLMENT"
  },
  "paymentPlan": {
    "provider": "Demo Finance",
    "termMonths": 6,
    "downPayment": "3000000",
    "totalPayable": "21000000",
    "interestRate": "1.50"
  }
}
```

### List orders

```http
GET /api/orders
```

### Get order detail

```http
GET /api/orders/1
```

### Complete order

```http
PATCH /api/orders/1/status
Content-Type: application/json
```

```json
{
  "status": "COMPLETED"
}
```

## 6. Warranty APIs

### Activate warranty by order

Order must be `COMPLETED`; selected inventory items must already be `SOLD`.

```http
POST /api/warranties/activate
Content-Type: application/json
```

```json
{
  "orderId": 1
}
```

### Activate warranty by inventory item

```http
POST /api/warranties/activate
Content-Type: application/json
```

```json
{
  "inventoryItemId": 1
}
```

### Get warranty detail

```http
GET /api/warranties/1
```

### Lookup warranty by IMEI/serial

```http
GET /api/warranties/by-serial/SEED-IP15-IMEI-0001
```

### Update warranty status

```http
PATCH /api/warranties/1/status
Content-Type: application/json
```

```json
{
  "status": "VOIDED"
}
```

## Response Format

Success:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Request failed",
  "errors": {}
}
```
