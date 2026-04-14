require("dotenv/config");

const prisma = require("../db/prisma");

const users = [
  {
    email: "admin@techstore.local",
    password: "Admin@123",
    fullName: "System Admin",
    role: "ADMIN",
  },
  {
    email: "warehouse@techstore.local",
    password: "Warehouse@123",
    fullName: "Warehouse Staff",
    role: "WAREHOUSE_STAFF",
  },
];

const customers = [
  {
    phone: "0900000001",
    fullName: "Nguyen Van A",
    email: "customer1@example.com",
  },
  {
    phone: "0900000002",
    fullName: "Tran Thi B",
    email: "customer2@example.com",
  },
];

const brands = [
  { name: "Apple", slug: "apple", description: "Premium devices and accessories." },
  { name: "Samsung", slug: "samsung", description: "Smartphones, tablets, and electronics." },
  { name: "Xiaomi", slug: "xiaomi", description: "Phones and smart ecosystem products." },
  { name: "Asus", slug: "asus", description: "Laptops, components, and gaming devices." },
  { name: "Dell", slug: "dell", description: "Business and consumer computing devices." },
];

const categories = [
  {
    name: "Điện thoại",
    slug: "dien-thoai",
    description: "Smartphone và phụ kiện liên quan.",
  },
  {
    name: "Laptop",
    slug: "laptop",
    description: "Laptop phục vụ học tập, văn phòng và gaming.",
  },
  {
    name: "Tablet",
    slug: "tablet",
    description: "Máy tính bảng cho giải trí và công việc.",
  },
];

const warehouses = [
  {
    name: "Kho trung tâm",
    code: "WH-HCM-01",
    location: "Thu Duc, Ho Chi Minh City",
  },
  {
    name: "Kho Hà Nội",
    code: "WH-HN-01",
    location: "Cau Giay, Ha Noi",
  },
];

const specGroups = [
  { name: "Màn hình", sortOrder: 1 },
  { name: "Hiệu năng", sortOrder: 2 },
  { name: "Camera", sortOrder: 3 },
  { name: "Pin & Sạc", sortOrder: 4 },
  { name: "Thiết kế", sortOrder: 5 },
];

const specDefinitions = [
  {
    code: "screen_size",
    name: "Kích thước màn hình",
    valueType: "TEXT",
    unit: "inch",
    isHighlighted: true,
    groupName: "Màn hình",
    sortOrder: 1,
  },
  {
    code: "screen_technology",
    name: "Công nghệ màn hình",
    valueType: "TEXT",
    groupName: "Màn hình",
    sortOrder: 2,
  },
  {
    code: "refresh_rate",
    name: "Tần số quét",
    valueType: "NUMBER",
    unit: "Hz",
    groupName: "Màn hình",
    sortOrder: 3,
  },
  {
    code: "chipset",
    name: "Chip xử lý",
    valueType: "TEXT",
    isHighlighted: true,
    groupName: "Hiệu năng",
    sortOrder: 1,
  },
  {
    code: "ram",
    name: "RAM",
    valueType: "TEXT",
    isHighlighted: true,
    groupName: "Hiệu năng",
    sortOrder: 2,
  },
  {
    code: "storage",
    name: "Bộ nhớ trong",
    valueType: "TEXT",
    isHighlighted: true,
    groupName: "Hiệu năng",
    sortOrder: 3,
  },
  {
    code: "rear_camera",
    name: "Camera sau",
    valueType: "TEXT",
    groupName: "Camera",
    sortOrder: 1,
  },
  {
    code: "front_camera",
    name: "Camera trước",
    valueType: "TEXT",
    groupName: "Camera",
    sortOrder: 2,
  },
  {
    code: "battery_capacity",
    name: "Dung lượng pin",
    valueType: "NUMBER",
    unit: "mAh",
    isHighlighted: true,
    groupName: "Pin & Sạc",
    sortOrder: 1,
  },
  {
    code: "fast_charging",
    name: "Sạc nhanh",
    valueType: "TEXT",
    groupName: "Pin & Sạc",
    sortOrder: 2,
  },
  {
    code: "weight",
    name: "Khối lượng",
    valueType: "NUMBER",
    unit: "g",
    groupName: "Thiết kế",
    sortOrder: 1,
  },
  {
    code: "material",
    name: "Chất liệu",
    valueType: "TEXT",
    groupName: "Thiết kế",
    sortOrder: 2,
  },
];

const categorySpecMap = {
  "dien-thoai": [
    "screen_size",
    "screen_technology",
    "refresh_rate",
    "chipset",
    "ram",
    "storage",
    "rear_camera",
    "front_camera",
    "battery_capacity",
    "fast_charging",
    "weight",
    "material",
  ],
  laptop: [
    "screen_size",
    "screen_technology",
    "refresh_rate",
    "chipset",
    "ram",
    "storage",
    "battery_capacity",
    "weight",
    "material",
  ],
  tablet: [
    "screen_size",
    "screen_technology",
    "refresh_rate",
    "chipset",
    "ram",
    "storage",
    "rear_camera",
    "front_camera",
    "battery_capacity",
    "weight",
    "material",
  ],
};

const coupons = [
  {
    code: "WELCOME10",
    discountType: "PERCENTAGE",
    discountValue: "10",
    minOrderAmount: "500000",
    maxDiscount: "300000",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-12-31T23:59:59.000Z"),
    description: "Giảm 10% cho đơn hàng đầu tiên.",
  },
  {
    code: "FREESHIP50",
    discountType: "FIXED",
    discountValue: "50000",
    minOrderAmount: "1000000",
    maxDiscount: null,
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-12-31T23:59:59.000Z"),
    description: "Giảm trực tiếp 50.000 VND cho đơn từ 1 triệu.",
  },
];

async function seedUsers() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        status: "ACTIVE",
      },
      create: {
        ...user,
        status: "ACTIVE",
      },
    });
  }
}

async function seedCustomers() {
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { phone: customer.phone },
      update: {
        fullName: customer.fullName,
        email: customer.email,
      },
      create: customer,
    });
  }
}

async function seedBrands() {
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        description: brand.description,
      },
      create: brand,
    });
  }
}

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
      },
      create: category,
    });
  }
}

async function seedWarehouses() {
  for (const warehouse of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: warehouse.code },
      update: {
        name: warehouse.name,
        location: warehouse.location,
      },
      create: warehouse,
    });
  }
}

async function seedSpecGroups() {
  for (const group of specGroups) {
    const existing = await prisma.specGroup.findFirst({
      where: { name: group.name },
    });

    if (existing) {
      await prisma.specGroup.update({
        where: { id: existing.id },
        data: { sortOrder: group.sortOrder },
      });
      continue;
    }

    await prisma.specGroup.create({ data: group });
  }
}

async function seedSpecDefinitions() {
  const groups = await prisma.specGroup.findMany();
  const groupMap = new Map(groups.map((group) => [group.name, group.id]));

  for (const spec of specDefinitions) {
    await prisma.specDefinition.upsert({
      where: { code: spec.code },
      update: {
        name: spec.name,
        valueType: spec.valueType,
        unit: spec.unit ?? null,
        isRequiredCore: false,
        isFilterable: true,
        isComparable: true,
        isHighlighted: Boolean(spec.isHighlighted),
        sortOrder: spec.sortOrder,
        specGroupId: groupMap.get(spec.groupName) ?? null,
      },
      create: {
        code: spec.code,
        name: spec.name,
        valueType: spec.valueType,
        unit: spec.unit ?? null,
        isRequiredCore: false,
        isFilterable: true,
        isComparable: true,
        isHighlighted: Boolean(spec.isHighlighted),
        sortOrder: spec.sortOrder,
        specGroupId: groupMap.get(spec.groupName) ?? null,
      },
    });
  }
}

async function seedCategorySpecDefinitions() {
  const dbCategories = await prisma.category.findMany();
  const dbSpecs = await prisma.specDefinition.findMany();

  const categoryMap = new Map(dbCategories.map((category) => [category.slug, category.id]));
  const specMap = new Map(dbSpecs.map((spec) => [spec.code, spec.id]));

  for (const [categorySlug, specCodes] of Object.entries(categorySpecMap)) {
    for (const [index, specCode] of specCodes.entries()) {
      const categoryId = categoryMap.get(categorySlug);
      const specDefinitionId = specMap.get(specCode);

      if (!categoryId || !specDefinitionId) {
        continue;
      }

      await prisma.categorySpecDefinition.upsert({
        where: {
          categoryId_specDefinitionId: {
            categoryId,
            specDefinitionId,
          },
        },
        update: {
          isRequired: index < 5,
          sortOrder: index + 1,
        },
        create: {
          categoryId,
          specDefinitionId,
          isRequired: index < 5,
          sortOrder: index + 1,
        },
      });
    }
  }
}

async function seedCoupons() {
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        status: "ACTIVE",
        description: coupon.description,
      },
      create: {
        ...coupon,
        status: "ACTIVE",
      },
    });
  }
}

async function main() {
  await seedUsers();
  await seedCustomers();
  await seedBrands();
  await seedCategories();
  await seedWarehouses();
  await seedSpecGroups();
  await seedSpecDefinitions();
  await seedCategorySpecDefinitions();
  await seedCoupons();

  const [userCount, customerCount, brandCount, categoryCount, warehouseCount, specGroupCount, specDefinitionCount, couponCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.brand.count(),
      prisma.category.count(),
      prisma.warehouse.count(),
      prisma.specGroup.count(),
      prisma.specDefinition.count(),
      prisma.coupon.count(),
    ]);

  console.log("Seed completed.");
  console.log({
    users: userCount,
    customers: customerCount,
    brands: brandCount,
    categories: categoryCount,
    warehouses: warehouseCount,
    specGroups: specGroupCount,
    specDefinitions: specDefinitionCount,
    coupons: couponCount,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
