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

const specTemplates = [
  {
    categorySlug: "dien-thoai",
    name: "Phone default spec template",
    slug: "phone-default-spec-template",
    description: "Default technical specs for phone products.",
    specsJson: {
      fields: categorySpecMap["dien-thoai"],
      requiredFields: categorySpecMap["dien-thoai"].slice(0, 5),
    },
  },
  {
    categorySlug: "laptop",
    name: "Laptop default spec template",
    slug: "laptop-default-spec-template",
    description: "Default technical specs for laptop products.",
    specsJson: {
      fields: categorySpecMap.laptop,
      requiredFields: categorySpecMap.laptop.slice(0, 5),
    },
  },
  {
    categorySlug: "tablet",
    name: "Tablet default spec template",
    slug: "tablet-default-spec-template",
    description: "Default technical specs for tablet products.",
    specsJson: {
      fields: categorySpecMap.tablet,
      requiredFields: categorySpecMap.tablet.slice(0, 5),
    },
  },
];

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

const sampleProducts = [
  {
    categorySlug: "dien-thoai",
    brandSlug: "apple",
    name: "iPhone 15",
    slug: "iphone-15",
    specTemplateSlug: "phone-default-spec-template",
    technicalSpecsJson: {
      screen_size: "6.1 inch",
      screen_technology: "Super Retina XDR",
      chipset: "Apple A16 Bionic",
      ram: "6GB",
      storage: "128GB",
      battery_capacity: "3349 mAh",
    },
    shortDescription: "Apple iPhone 15 with Dynamic Island and USB-C.",
    description: "Sample smartphone product for API testing.",
    warrantyMonths: 12,
    status: "ACTIVE",
    variants: [
      {
        sku: "IP15-128-BLK",
        name: "iPhone 15 128GB Black",
        slug: "iphone-15-128gb-black",
        color: "Black",
        storageLabel: "128GB",
        ramLabel: "6GB",
        price: "19990000",
        compareAtPrice: "22990000",
        isDefault: true,
        specs: {
          screen_size: { valueText: "6.1 inch", displayValue: "6.1 inch" },
          screen_technology: { valueText: "Super Retina XDR", displayValue: "Super Retina XDR" },
          chipset: { valueText: "Apple A16 Bionic", displayValue: "Apple A16 Bionic" },
          ram: { valueText: "6GB", displayValue: "6GB" },
          storage: { valueText: "128GB", displayValue: "128GB" },
          battery_capacity: { valueNumber: "3349", displayValue: "3349 mAh" },
        },
        stock: [
          { type: "IMEI", value: "SEED-IP15-IMEI-0001", purchasePrice: "17000000" },
          { type: "IMEI", value: "SEED-IP15-IMEI-0002", purchasePrice: "17000000" },
        ],
      },
    ],
  },
  {
    categorySlug: "laptop",
    brandSlug: "asus",
    name: "Asus Vivobook 15",
    slug: "asus-vivobook-15",
    specTemplateSlug: "laptop-default-spec-template",
    technicalSpecsJson: {
      screen_size: "15.6 inch",
      chipset: "Intel Core i5",
      ram: "16GB",
      storage: "512GB SSD",
      weight: "1.7 kg",
    },
    shortDescription: "Everyday laptop for study and office work.",
    description: "Sample laptop product for inventory and order testing.",
    warrantyMonths: 24,
    status: "ACTIVE",
    variants: [
      {
        sku: "ASUS-VB15-I5-512",
        name: "Asus Vivobook 15 i5 512GB",
        slug: "asus-vivobook-15-i5-512gb",
        color: "Silver",
        storageLabel: "512GB SSD",
        ramLabel: "16GB",
        price: "14990000",
        compareAtPrice: "16990000",
        isDefault: true,
        specs: {
          screen_size: { valueText: "15.6 inch", displayValue: "15.6 inch" },
          chipset: { valueText: "Intel Core i5", displayValue: "Intel Core i5" },
          ram: { valueText: "16GB", displayValue: "16GB" },
          storage: { valueText: "512GB SSD", displayValue: "512GB SSD" },
          weight: { valueNumber: "1700", displayValue: "1.7 kg" },
        },
        stock: [
          { type: "SERIAL", value: "SEED-ASUS-VB15-SN-0001", purchasePrice: "12000000" },
          { type: "SERIAL", value: "SEED-ASUS-VB15-SN-0002", purchasePrice: "12000000" },
        ],
      },
    ],
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

async function seedSpecTemplates() {
  const dbCategories = await prisma.category.findMany();
  const categoryMap = new Map(dbCategories.map((category) => [category.slug, category.id]));

  for (const template of specTemplates) {
    const categoryId = categoryMap.get(template.categorySlug);

    if (!categoryId) {
      continue;
    }

    await prisma.specTemplate.upsert({
      where: { slug: template.slug },
      update: {
        categoryId,
        name: template.name,
        description: template.description,
        specsJson: template.specsJson,
      },
      create: {
        categoryId,
        name: template.name,
        slug: template.slug,
        description: template.description,
        specsJson: template.specsJson,
      },
    });
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

async function seedSampleProductsAndInventory() {
  const [dbCategories, dbBrands, dbSpecs, dbSpecTemplates, warehouse] = await Promise.all([
    prisma.category.findMany(),
    prisma.brand.findMany(),
    prisma.specDefinition.findMany(),
    prisma.specTemplate.findMany(),
    prisma.warehouse.findFirst({
      where: { code: "WH-HCM-01" },
    }),
  ]);

  const categoryMap = new Map(dbCategories.map((category) => [category.slug, category.id]));
  const brandMap = new Map(dbBrands.map((brand) => [brand.slug, brand.id]));
  const specMap = new Map(dbSpecs.map((spec) => [spec.code, spec.id]));
  const specTemplateMap = new Map(
    dbSpecTemplates.map((template) => [template.slug, template.id])
  );

  if (!warehouse) {
    throw new Error("Default warehouse WH-HCM-01 was not found");
  }

  const batch = await prisma.inventoryBatch.upsert({
    where: { batchCode: "SEED-INITIAL-STOCK" },
    update: {
      supplierName: "Seed Supplier",
      note: "Initial sample stock for API testing",
    },
    create: {
      batchCode: "SEED-INITIAL-STOCK",
      supplierName: "Seed Supplier",
      note: "Initial sample stock for API testing",
    },
  });

  for (const sampleProduct of sampleProducts) {
    const categoryId = categoryMap.get(sampleProduct.categorySlug);
    const brandId = brandMap.get(sampleProduct.brandSlug);
    const specTemplateId = specTemplateMap.get(sampleProduct.specTemplateSlug);

    if (!categoryId || !brandId || !specTemplateId) {
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: sampleProduct.slug },
      update: {
        categoryId,
        brandId,
        specTemplateId,
        name: sampleProduct.name,
        shortDescription: sampleProduct.shortDescription,
        description: sampleProduct.description,
        technicalSpecsJson: sampleProduct.technicalSpecsJson,
        warrantyMonths: sampleProduct.warrantyMonths,
        status: sampleProduct.status,
      },
      create: {
        categoryId,
        brandId,
        specTemplateId,
        name: sampleProduct.name,
        slug: sampleProduct.slug,
        shortDescription: sampleProduct.shortDescription,
        description: sampleProduct.description,
        technicalSpecsJson: sampleProduct.technicalSpecsJson,
        warrantyMonths: sampleProduct.warrantyMonths,
        status: sampleProduct.status,
      },
    });

    for (const sampleVariant of sampleProduct.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: sampleVariant.sku },
        update: {
          productId: product.id,
          name: sampleVariant.name,
          slug: sampleVariant.slug,
          color: sampleVariant.color,
          storageLabel: sampleVariant.storageLabel,
          ramLabel: sampleVariant.ramLabel,
          price: sampleVariant.price,
          compareAtPrice: sampleVariant.compareAtPrice,
          isDefault: sampleVariant.isDefault,
          status: "ACTIVE",
        },
        create: {
          productId: product.id,
          sku: sampleVariant.sku,
          name: sampleVariant.name,
          slug: sampleVariant.slug,
          color: sampleVariant.color,
          storageLabel: sampleVariant.storageLabel,
          ramLabel: sampleVariant.ramLabel,
          price: sampleVariant.price,
          compareAtPrice: sampleVariant.compareAtPrice,
          isDefault: sampleVariant.isDefault,
          status: "ACTIVE",
        },
      });

      for (const [specCode, specValue] of Object.entries(sampleVariant.specs)) {
        const specDefinitionId = specMap.get(specCode);

        if (!specDefinitionId) {
          continue;
        }

        await prisma.variantSpecValue.upsert({
          where: {
            productVariantId_specDefinitionId: {
              productVariantId: variant.id,
              specDefinitionId,
            },
          },
          update: {
            valueText: specValue.valueText ?? null,
            valueNumber: specValue.valueNumber ?? null,
            valueBoolean: specValue.valueBoolean ?? null,
            displayValue: specValue.displayValue ?? null,
          },
          create: {
            productVariantId: variant.id,
            specDefinitionId,
            valueText: specValue.valueText ?? null,
            valueNumber: specValue.valueNumber ?? null,
            valueBoolean: specValue.valueBoolean ?? null,
            displayValue: specValue.displayValue ?? null,
          },
        });
      }

      for (const stockItem of sampleVariant.stock) {
        const existingIdentifier = await prisma.inventoryIdentifier.findUnique({
          where: { value: stockItem.value },
        });

        if (existingIdentifier) {
          continue;
        }

        await prisma.inventoryItem.create({
          data: {
            productVariantId: variant.id,
            warehouseId: warehouse.id,
            batchId: batch.id,
            status: "IN_STOCK",
            purchasePrice: stockItem.purchasePrice,
            identifiers: {
              create: {
                type: stockItem.type,
                value: stockItem.value,
              },
            },
          },
        });
      }
    }
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
  await seedSpecTemplates();
  await seedCoupons();
  await seedSampleProductsAndInventory();

  const [
    userCount,
    customerCount,
    brandCount,
    categoryCount,
    warehouseCount,
    specGroupCount,
    specDefinitionCount,
    specTemplateCount,
    couponCount,
    productCount,
    inventoryItemCount,
  ] =
    await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.brand.count(),
      prisma.category.count(),
      prisma.warehouse.count(),
      prisma.specGroup.count(),
      prisma.specDefinition.count(),
      prisma.specTemplate.count(),
      prisma.coupon.count(),
      prisma.product.count(),
      prisma.inventoryItem.count(),
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
    specTemplates: specTemplateCount,
    coupons: couponCount,
    products: productCount,
    inventoryItems: inventoryItemCount,
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
