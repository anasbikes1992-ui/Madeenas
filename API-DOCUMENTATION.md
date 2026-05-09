# Madeena Textile Stock API Documentation

**Version:** 1.0.0  
**Base URL:** `https://madeenas.vercel.app/api`  
**Authentication:** NextAuth v5 JWT + NextAuth.js session

---

## Table of Contents

1. [Authentication](#authentication)
2. [Products](#products)
3. [Stock Management](#stock-management)
4. [Sales](#sales)
5. [Inventory](#inventory)
6. [Dashboard & KPIs](#dashboard--kpis)
7. [Error Responses](#error-responses)

---

## Authentication

All API endpoints require authentication. The app uses NextAuth.js v5 with JWT tokens and session cookies.

### Login (Mobile JWT)

```http
POST /api/mobile/login
Content-Type: application/json

{
  "email": "user@madeena.com",
  "password": "password123",
  "mode": "staff"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "mode": "staff",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "email": "user@madeena.com",
      "name": "Store Keeper",
      "role": "STORE_KEEPER",
      "locationId": "loc_id",
      "locationName": "Main Warehouse"
    }
  }
}
```

### Get Current User

```http
GET /api/mobile/me?mode=staff
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "mode": "staff",
    "user": {
      "id": "user_id",
      "email": "user@madeena.com",
      "name": "Store Keeper",
      "role": "STORE_KEEPER",
      "locationId": "loc_id"
    }
  }
}
```

### Internal Hourly Backup Trigger (Cron)

```http
GET /api/internal/backup/hourly
Authorization: Bearer {BACKUP_CRON_SECRET}
```

**Response (200):**
```json
{
  "success": true,
  "generatedAt": "2026-05-09T17:00:00.000Z",
  "fileName": "madeena-backup-2026-05-09T17-00-00-000Z.json.gz",
  "tables": 11,
  "rows": 1234,
  "bytes": {
    "raw": 204800,
    "compressed": 34567
  },
  "mail": {
    "sent": true,
    "id": "email_provider_message_id"
  }
}
```

---

## Products

### List All Products

```http
GET /api/products?category=catId&active=true
```

**Query Parameters:**
- `category` (optional): Filter by category ID
- `active` (optional): `true` | `false` - Filter by active status
- `search` (optional): Search by name or SKU

**Response (200):**
```json
[
  {
    "id": "prod_id",
    "name": "Premium Silk Saree",
    "sku": "SILK-SAREE-001",
    "design": "Traditional",
    "color": "Maroon",
    "colorHex": "#800000",
    "category": {
      "id": "cat_id",
      "name": "Sarees",
      "slug": "sarees"
    },
    "unit": "pieces",
    "lowStockAt": 10,
    "costPrice": 1500,
    "isActive": true,
    "images": ["url1", "url2"],
    "barcodeType": "CODE128",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  }
]
```

### Get Product Details

```http
GET /api/products/{productId}
```

**Response (200):**
```json
{
  "id": "prod_id",
  "name": "Premium Silk Saree",
  "sku": "SILK-SAREE-001",
  "category": {...},
  "stocks": [
    {
      "id": "stock_id",
      "quantity": 45,
      "location": {
        "id": "loc_id",
        "name": "Main Warehouse",
        "type": "warehouse"
      }
    }
  ],
  "stockIns": [
    {
      "id": "si_id",
      "quantity": 100,
      "costPrice": 1500,
      "createdAt": "2026-01-10T09:00:00Z",
      "location": {...},
      "user": {...}
    }
  ],
  "stockOutRequests": [...]
}
```

### Create Product

```http
POST /api/products
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Cotton Saree",
  "design": "Check",
  "color": "Blue",
  "colorHex": "#0000FF",
  "sku": "COTTON-SAREE-001",
  "categoryId": "cat_id",
  "unit": "pieces",
  "lowStockAt": 10,
  "costPrice": 800,
  "description": "High-quality cotton saree",
  "images": ["url1", "url2"],
  "barcodeType": "CODE128"
}
```

**Response (201):**
```json
{
  "id": "prod_id",
  "name": "Cotton Saree",
  "sku": "COTTON-SAREE-001",
  "category": {...},
  ...
}
```

### Update Product

```http
PUT /api/products/{productId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Premium Cotton Saree",
  "lowStockAt": 15,
  "costPrice": 850
}
```

**Response (200):** Updated product object

### Delete Product (Soft Delete)

```http
DELETE /api/products/{productId}
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Stock Management

### Get Low Stock Items

```http
GET /api/inventory/low-stock
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "lowStockCount": 5,
  "items": [
    {
      "id": "stock_id",
      "product": {
        "id": "prod_id",
        "name": "Gold Saree",
        "sku": "GOLD-SAREE-001",
        "category": "Sarees"
      },
      "location": "Main Shop",
      "currentQuantity": 3,
      "lowStockThreshold": 10,
      "status": "CRITICAL"
    }
  ]
}
```

### Create Reorder

```http
POST /api/inventory
Content-Type: application/json
Authorization: Bearer {token}

{
  "productId": "prod_id",
  "locationId": "loc_id",
  "reorderQuantity": 100,
  "supplierId": "supp_id"
}
```

**Response (200):**
```json
{
  "success": true,
  "reorderRecord": {
    "id": "reorder_id",
    "productName": "Gold Saree",
    "quantity": 100,
    "location": "Main Shop",
    "createdAt": "2026-05-09T10:00:00Z"
  }
}
```

### Record Stock In

```http
POST /api/stock-in
Content-Type: application/json
Authorization: Bearer {token}

{
  "productId": "prod_id",
  "locationId": "loc_id",
  "quantity": 50,
  "batchNumber": "BATCH-2026-001",
  "supplierId": "supp_id",
  "costPrice": 1500,
  "note": "New shipment from supplier"
}
```

**Response (201):**
```json
{
  "id": "stockin_id",
  "product": {...},
  "quantity": 50,
  "location": {...},
  "createdAt": "2026-05-09T10:00:00Z"
}
```

### Transfer Stock Between Locations

```http
POST /api/stock-out
Content-Type: application/json
Authorization: Bearer {token}

{
  "productId": "prod_id",
  "fromLocationId": "warehouse_id",
  "toLocationId": "shop_id",
  "quantityRequested": 20,
  "referenceInvoice": "INV-2026-001"
}
```

**Response (201):**
```json
{
  "id": "request_id",
  "status": "PENDING",
  "product": {...},
  "quantityRequested": 20,
  "fromLocation": "Warehouse",
  "toLocation": "Shop",
  "createdAt": "2026-05-09T10:00:00Z"
}
```

---

## Sales

### Create Sale (POS Checkout)

```http
POST /api/sales
Content-Type: application/json
Authorization: Bearer {token}

{
  "locationId": "loc_id",
  "items": [
    {
      "productId": "prod_id_1",
      "quantity": 2,
      "price": 1500
    },
    {
      "productId": "prod_id_2",
      "quantity": 1,
      "price": 2000
    }
  ],
  "totalAmount": 5000,
  "paymentMode": "CASH",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "isCreditEligible": false
}
```

**Response (201):**
```json
{
  "id": "sale_id",
  "receiptNo": "REC-123456-789",
  "items": [
    {
      "productId": "prod_id_1",
      "productName": "Gold Saree",
      "quantity": 2,
      "price": 1500,
      "subtotal": 3000
    }
  ],
  "totalAmount": 5000,
  "paymentMode": "CASH",
  "customerId": "cust_id",
  "createdAt": "2026-05-09T10:00:00Z"
}
```

### Get Sales Report

```http
GET /api/sales?startDate=2026-05-01&endDate=2026-05-09&locationId=loc_id
Authorization: Bearer {token}
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `locationId` (optional): Filter by location
- `channel` (optional): `retail` | `wholesale` | `ecommerce`

**Response (200):**
```json
{
  "totalSales": 15,
  "totalRevenue": 125000,
  "totalQuantity": 450,
  "averageTransactionValue": 8333.33,
  "sales": [
    {
      "id": "sale_id",
      "receiptNo": "REC-123456-789",
      "totalAmount": 5000,
      "itemCount": 3,
      "paymentMode": "CASH",
      "customerName": "John Doe",
      "createdAt": "2026-05-09T10:00:00Z"
    }
  ]
}
```

---

## Dashboard & KPIs

### Get Dashboard Overview

```http
GET /api/dashboard
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "totalProducts": 450,
  "totalLocations": 5,
  "pendingRequests": 12,
  "newCustomerOrders": 8,
  "lowStockCount": 15,
  "totalStockUnits": 5400,
  "recentStockIns": [...],
  "recentStockOuts": [...],
  "lowStockItems": [...]
}
```

### Get KPI Data

```http
GET /api/kpis?timeframe=7d
Authorization: Bearer {token}
```

**Query Parameters:**
- `timeframe`: `7d` | `30d` | `90d` - Time period for KPIs

**Response (200):**
```json
{
  "revenue": [
    {
      "date": "May 09",
      "amount": 125000,
      "byChannel": {
        "retail": 75000,
        "wholesale": 35000,
        "ecommerce": 15000
      }
    }
  ],
  "stockoutRate": [
    {
      "date": "May 09",
      "rate": 2.5,
      "affected_skus": 3
    }
  ],
  "margins": [
    {
      "date": "May 09",
      "margin_percent": 38.5,
      "gross_margin": 48125,
      "byChannel": {
        "retail": 40,
        "wholesale": 32,
        "ecommerce": 36
      }
    }
  ],
  "fillRate": [
    {
      "date": "May 09",
      "rate": 95.2,
      "fulfilled": 200,
      "total": 210
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks permission for this action |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate SKU or other constraint violation |
| 422 | Unprocessable Entity | Validation error in request body |
| 500 | Internal Server Error | Server error |

### Example Error Response

```json
{
  "error": "Invalid product",
  "details": {
    "sku": ["SKU must be at least 3 characters"],
    "categoryId": ["Category is required"]
  }
}
```

---

## Rate Limiting

All endpoints are rate-limited using Upstash Redis:
- **Tier:** Store Keeper - 100 requests/minute
- **Tier:** Finance - 200 requests/minute
- **Tier:** Admin - 500 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1620000000
```

---

## Webhooks (Coming Soon)

Planned webhook events:
- `sale.created` - New sale transaction
- `stock.low` - Low stock alert
- `order.status.changed` - Customer order status change
- `reorder.triggered` - Automatic reorder triggered

---

## SDK Examples

### JavaScript/Node.js

```javascript
const API_BASE = 'https://madeenas.vercel.app/api'
const token = localStorage.getItem('authToken')

// List products
async function listProducts(query) {
  const response = await fetch(`${API_BASE}/products?search=${query}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return response.json()
}

// Create sale
async function completeSale(checkout) {
  const response = await fetch(`${API_BASE}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(checkout)
  })
  return response.json()
}
```

### Flutter/Dart

```dart
final dio = Dio();
dio.options.headers['Authorization'] = 'Bearer $token';

// List products
Future<List<Product>> listProducts(String query) async {
  final response = await dio.get(
    '/api/products',
    queryParameters: {'search': query}
  );
  return (response.data as List)
    .map((p) => Product.fromJson(p))
    .toList();
}

// Create sale
Future<SaleResponse> completeSale(CheckoutData checkout) async {
  final response = await dio.post('/api/sales', data: checkout);
  return SaleResponse.fromJson(response.data);
}
```

---

**Last Updated:** May 9, 2026  
**Maintained By:** Development Team  
**Support:** dev@madeena.com
