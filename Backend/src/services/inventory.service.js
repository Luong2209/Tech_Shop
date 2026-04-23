const prisma = require("../db/prisma");
const { badRequest, notFound, slugify, toInt } = require("../utils/http");

const inventoryInclude = {
  productVariant: {
    include: {
      product: true,
      images: true,
    },
  },
  warehouse: true,
  batch: true,
  identifiers: true,
  orderItem: {
    include: {
      order: true,
    },
  },
  warranty: true,
};

function buildInventoryFilters(query) {
  const where = {};
  const productId = toInt(query.productId);
  const productVariantId = toInt(query.productVariantId);
  const batchId = toInt(query.batchId);
  const warehouseId = toInt(query.warehouseId);

  if (productId) where.productVariant = { productId };
  if (productVariantId) where.productVariantId = productVariantId;
  if (batchId) where.batchId = batchId;
  if (warehouseId) where.warehouseId = warehouseId;
  if (query.status) where.status = query.status;

  if (query.location) {
    where.warehouse = {
      OR: [
        { location: { contains: query.location } },
        { name: { contains: query.location } },
        { code: { contains: query.location } },
      ],
    };
  }

  return where;
}

async function resolveImportVariant({ productId, productVariantId }) {
  if (productVariantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: toInt(productVariantId) },
      include: { product: true },
    });
    if (!variant) throw badRequest("productVariantId is invalid");
    return variant;
  }

  const parsedProductId = toInt(productId);
  if (!parsedProductId) throw badRequest("productId is required");

  const product = await prisma.product.findUnique({
    where: { id: parsedProductId },
    include: {
      variants: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });

  if (!product) throw badRequest("productId is invalid");
  if (product.variants.length === 0) {
    throw badRequest("Product must have at least one variant before importing inventory");
  }
  return product.variants[0];
}

async function resolveImportWarehouse({ warehouseId, location }) {
  const parsedWarehouseId = toInt(warehouseId);
  if (parsedWarehouseId) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: parsedWarehouseId },
    });
    if (!warehouse) throw badRequest("warehouseId is invalid");
    return warehouse;
  }

  if (!location) throw badRequest("location is required");

  const existingWarehouse = await prisma.warehouse.findFirst({
    where: {
      OR: [
        { location: { contains: location } },
        { name: { contains: location } },
        { code: { contains: location } },
      ],
    },
  });
  if (existingWarehouse) return existingWarehouse;

  const baseCode = slugify(location).toUpperCase().slice(0, 32) || "LOCATION";
  return prisma.warehouse.create({
    data: {
      name: location,
      code: `${baseCode}-${Date.now()}`.slice(0, 50),
      location,
    },
  });
}

async function getInventoryItemOrThrow(id) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: inventoryInclude,
  });
  if (!item) throw notFound("Inventory item not found");
  return item;
}

function summarizeByVariant(items) {
  return Object.values(
    items.reduce((accumulator, item) => {
      const key = item.productVariantId;
      if (!accumulator[key]) {
        accumulator[key] = {
          productVariantId: item.productVariantId,
          variantName: item.productVariant.name,
          sku: item.productVariant.sku,
          productName: item.productVariant.product.name,
          inStock: 0,
          reserved: 0,
          sold: 0,
        };
      }

      if (item.status === "IN_STOCK") accumulator[key].inStock += 1;
      if (item.status === "RESERVED") accumulator[key].reserved += 1;
      if (item.status === "SOLD") accumulator[key].sold += 1;
      return accumulator;
    }, {})
  );
}

module.exports = {
  inventoryInclude,
  buildInventoryFilters,
  resolveImportVariant,
  resolveImportWarehouse,
  getInventoryItemOrThrow,
  summarizeByVariant,
};

