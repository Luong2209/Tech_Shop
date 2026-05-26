# BaseCore Frontend Integration Notes

## Muc tieu

- Giu frontend quan tri tach rieng de de nhan biet.
- Them frontend nguoi dung Electro vao cung du an.
- Dung chung backend va gateway san co.
- Dieu huong sau dang nhap theo role.

## Cau truc frontend hien tai

- Frontend nguoi dung Electro:
  - `/`
  - `/shop`
  - `/cart`
  - `/checkout`
  - `/orders`
  - `/contact`

- Frontend quan tri:
  - `/admin`
  - `/admin/products`
  - `/admin/categories`
  - `/admin/users`

## Phan quyen dang nhap

- `Admin`:
  - Dang nhap xong se vao `/admin`

- `User`:
  - Dang nhap xong se vao `/orders`

## Gateway va API

- Gateway: `http://localhost:5000`
- API Service: `http://localhost:5001`
- Auth Service: `http://localhost:5002`

Frontend React goi API qua gateway bang prefix `/api`.

## Chay development

### Cach 1: chay frontend rieng bang Vite

1. Chay `BaseCore.APIService`
2. Chay `BaseCore.AuthService`
3. Chay `BaseCore.ApiGateway`
4. Chay trong thu muc `BaseCore.WebClient`:

```powershell
npm install
npm run dev
```

Mo: `http://localhost:3000`

### Cach 2: build frontend vao gateway

Trong thu muc `BaseCore.WebClient`:

```powershell
npm run build
```

Frontend se build vao:

```text
BaseCore.ApiGateway/wwwroot
```

Sau do chay `BaseCore.ApiGateway` va mo:

```text
http://localhost:5000
```

## Ghi chu ky thuat

- Anh cua template Electro da duoc dua vao `BaseCore.WebClient/public/electro/img`.
- Frontend admin cu van duoc giu nguyen logic CRUD va role check.
- Cac route cu `/products`, `/categories`, `/users` duoc redirect sang `/admin/...` de tranh vo luong cu.
- `checkout` va `orders` dung API `api/orders`.
- Dang ky tai khoan moi mac dinh tao role `User`.

## Luu y

- Neu build .NET bi loi `NU1301` thi do may dang khong truy cap duoc `nuget.org`.
- Frontend React da build thanh cong; phan build .NET can internet hoac cache package day du de xac nhan lai.
