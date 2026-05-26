# 🔧 Hướng Dẫn Kết Nối SQL Server - BaseCore Project

## 🔴 Các Vấn Đề Được Phát Hiện

### 1. **DemoMode Đã Được Tắt** ✅
- BaseCore.APIService: `DemoMode: false`
- BaseCore.AuthService: `DemoMode: false`
- **Status**: Đã sửa ✓

### 2. **Seed Data Chưa Được Chạy** ⚠️
- **Problem**: Migrations không chứa seed data cho Products/Categories
- **Solution**: Cập nhật AppDbContext.SeedDataAsync() để seed dữ liệu
- **Status**: Đã sửa ✓

### 3. **Database Migration Chưa Được Gọi** ⚠️
- **Problem**: BaseCore.APIService sử dụng `Database.EnsureCreated()` thay vì `Database.MigrateAsync()`
- **Solution**: Thay đổi thành `MigrateAsync()` để chạy migrations
- **Status**: Đã sửa ✓

---

## 🚀 Bước Chạy Dự Án Đúng Cách

### **Bước 1: Xóa Database Cũ (Nếu cần)**
```sql
-- Chạy trên SQL Server
DROP DATABASE BaseCoreSales;
GO
```

### **Bước 2: Chạy Backend Services**

#### Terminal 1 - AuthService
```powershell
cd BaseCore/BaseCore.AuthService
dotnet run
```
**Output mong muốn:**
```
✓ Database migrated and seeded successfully
✓ Admin user seeded successfully
BaseCore Auth Service running on port 5002 - DemoMode: False
```

#### Terminal 2 - APIService
```powershell
cd BaseCore/BaseCore.APIService
dotnet run
```
**Output mong muốn:**
```
✓ Database migrated and seeded successfully
✓ Categories seeded successfully
✓ Products seeded successfully
BaseCore API Service running on port 5001 - DemoMode: False
```

#### Terminal 3 - AuditLog
```powershell
cd BaseCore/BaseCore.AuditLog
dotnet run
```

#### Terminal 4 - ApiGateway
```powershell
cd BaseCore/BaseCore.ApiGateway
dotnet run
```

### **Bước 3: Chạy Frontend**

#### Terminal 5 - WebClient
```powershell
cd BaseCore/BaseCore.WebClient
npm run dev
```

**Frontend sẽ tự động:**
- Gọi API từ backend (http://localhost:5001, 5002, ...)
- Hiển thị dữ liệu từ SQL Server
- Lưu thay đổi vào SQL Server

---

## 📊 Kiểm Tra Dữ Liệu trong SQL Server

### Kiểm Tra Categories
```sql
SELECT * FROM Categories;
```
**Kết quả mong muốn:**
```
Id | Name           | Description
1  | Electronics    | Electronic devices and gadgets
2  | Clothing       | Apparel and fashion items
3  | Books          | Books and publications
4  | Home & Garden  | Home and garden products
5  | Sports         | Sports equipment and accessories
```

### Kiểm Tra Products
```sql
SELECT * FROM Products;
```
**Kết quả mong muốn:** 5 sản phẩm được seed vào bảng

### Kiểm Tra Users (Admin)
```sql
SELECT UserName, Name, Email FROM Users WHERE UserName = 'admin';
```
**Kết quả mong muốn:**
```
UserName | Name          | Email
admin    | Administrator | admin@basecore.com
```

---

## 🔗 Frontend URL Configuration

Nếu Frontend không kết nối được Backend, hãy kiểm tra:

### File: `BaseCore.WebClient/src/services/api.js`
```javascript
// Hiện tại (dev environment)
const API_BASE_URL = '/api';  // Proxy đến http://localhost:5001/api

// Nếu cần chỉ định rõ ràng:
const API_BASE_URL = 'http://localhost:5001/api';
```

### File: `BaseCore.WebClient/vite.config.js`
```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
}
```

---

## ✅ Kiểm Tra Kết Nối Backend

### Test với curl hoặc Postman

**1. Lấy danh sách sản phẩm:**
```bash
curl http://localhost:5001/api/products
```

**2. Lấy danh mục:**
```bash
curl http://localhost:5001/api/categories
```

**3. Login (Admin):**
```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"admin123"}'
```

---

## 🛠️ Troubleshooting

### Problem: "Backend not available" - Frontend vẫn dùng Demo Data
**Solution:**
1. Kiểm tra Backend services có chạy không
2. Kiểm tra ports: 5001, 5002 có đúng không
3. Kiểm tra Network tab trong DevTools của browser
4. Xoá localStorage: `localStorage.clear()`

### Problem: Database Connection Error
**Solution:**
1. Kiểm tra SQL Server có chạy không: `Services -> SQL Server`
2. Kiểm tra connection string trong `appsettings.json`
3. Chạy: `dotnet ef database update`

### Problem: "Migrations pending"
**Solution:**
```powershell
cd BaseCore/BaseCore.Repository
dotnet ef migrations add InitialMigration
dotnet ef database update
```

---

## 📝 Dữ Liệu Seed Ban Đầu

### Users (AuthService)
- **Username:** admin
- **Password:** admin123
- **Email:** admin@basecore.com

### Products & Categories (APIService)
- **5 Categories** được seed tự động
- **5 Products** được seed tự động
- Tất cả dữ liệu nằm trong SQL Server `BaseCoreSales`

---

## 🎯 Khi Thay Đổi Dữ Liệu trong Frontend

1. Frontend gửi request đến Backend API
2. Backend lưu vào SQL Server Database
3. Dữ liệu được truy vấn từ database cho các request tiếp theo
4. **Không còn sử dụng demo data từ localStorage** ✅

---

**Ngày cập nhật:** 28/04/2026
**Status:** ✅ Dự án đã cấu hình để sử dụng SQL Server hoàn toàn
