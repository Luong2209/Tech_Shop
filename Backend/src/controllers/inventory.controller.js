const prisma = require("../db/prisma");
const { badRequest, getPagination, notFound, toInt } = require("../utils/http");
const {
  buildInventoryFilters,
  getInventoryItemOrThrow,
  inventoryInclude,
  resolveImportVariant,
  resolveImportWarehouse,
  summarizeByVariant,
} = require("../services/inventory.service");

async function updateInventoryStatus(req, res) {
  const id = toInt(req.params.id);
  const { status } = req.body;

  if (!id) {
    throw badRequest("Invalid inventory item id");
  }

  if (!status) {
    throw badRequest("status is required");
  }

  const existing = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      orderItem: true,
    },
  });

  if (!existing) {
    throw notFound("Inventory item not found");
  }

  if (existing.orderItem && status === "IN_STOCK") {
    throw badRequest(
      "Cannot set item back to IN_STOCK while linked to an order. Cancel the order to release this item."
    );
  }

  const data = {
    status,
    reservedAt: status === "RESERVED" ? new Date() : undefined,
    soldAt: status === "SOLD" ? new Date() : undefined,
  };

  const item = await prisma.inventoryItem.update({
    where: { id },
    data,
    include: inventoryInclude,
  });

  return res.success(item);
}

async function listInventory(req, res, overrideQuery = {}) {
  const query = {
    ...req.query,
    ...overrideQuery,
  };
  const { page, pageSize, skip, take } = getPagination(query);
  const where = buildInventoryFilters(query);

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: inventoryInclude,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return res.success({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

async function getInventorySummary(req, res) {
  const where = {};
  const warehouseId = toInt(req.query.warehouseId);
  const productVariantId = toInt(req.query.productVariantId);

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  if (productVariantId) {
    where.productVariantId = productVariantId;
  }

  const [byStatus, items] = await Promise.all([
    prisma.inventoryItem.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.inventoryItem.findMany({
      where,
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        warehouse: true,
      },
    }),
  ]);

  return res.success({
    byStatus,
    byVariant: summarizeByVariant(items),
  });
}

async function checkImei(req, res) {
  const identifier = await prisma.inventoryIdentifier.findUnique({
    where: { value: req.params.imei },
    include: {
      inventoryItem: {
        include: inventoryInclude,
      },
    },
  });

  return res.success({
    imei: req.params.imei,
    exists: Boolean(identifier),
    item: identifier?.inventoryItem || null,
  });
}

async function getInventoryByProduct(req, res) {
  const productId = toInt(req.params.productId);

  if (!productId) {
    throw badRequest("Invalid product id");
  }

  return listInventory(req, res, { productId });
}

async function importOneInventoryItem(req, res) {
  const {
    productId,
    productVariantId,
    batchId,
    imeiSerial,
    serial,
    location,
    warehouseId,
    purchasePrice,
    receivedAt,
    status,
    identifierType,
  } = req.body;
  const identifierValue = imeiSerial || serial;
  const parsedBatchId = toInt(batchId);

  if (!parsedBatchId) {
    throw badRequest("batchId is required");
  }

  if (!identifierValue) {
    throw badRequest("imeiSerial is required");
  }

  const existingIdentifier = await prisma.inventoryIdentifier.findUnique({
    where: { value: identifierValue },
  });

  if (existingIdentifier) {
    throw badRequest("IMEI/serial already exists");
  }

  const [variant, batch] = await Promise.all([
    resolveImportVariant({ productId, productVariantId }),
    prisma.inventoryBatch.findUnique({
      where: { id: parsedBatchId },
    }),
  ]);

  if (!batch) {
    throw badRequest("batchId is invalid");
  }

  const warehouse = await resolveImportWarehouse({ warehouseId, location });

  const item = await prisma.inventoryItem.create({
    data: {
      productVariantId: variant.id,
      warehouseId: warehouse.id,
      batchId: batch.id,
      purchasePrice: purchasePrice ?? null,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      status: status || "IN_STOCK",
      identifiers: {
        create: {
          type: identifierType || (serial && !imeiSerial ? "SERIAL" : "IMEI"),
          value: identifierValue,
        },
      },
    },
    include: inventoryInclude,
  });

  return res.status(201).success(item);
}

async function receiveStockLegacy(req, res) {
  const { productVariantId, warehouseId, supplierName, note, items } = req.body;

  if (!productVariantId || !warehouseId) {
    throw badRequest("productVariantId and warehouseId are required");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items must be a non-empty array");
  }

  const [variant, warehouse] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: Number(productVariantId) },
    }),
    prisma.warehouse.findUnique({
      where: { id: Number(warehouseId) },
    }),
  ]);

  if (!variant) {
    throw badRequest("productVariantId is invalid");
  }

  if (!warehouse) {
    throw badRequest("warehouseId is invalid");
  }

  const identifierValues = items
    .flatMap((entry) => entry.identifiers || [])
    .map((identifier) => identifier.value)
    .filter(Boolean);
  const uniqueIdentifierValues = new Set(identifierValues);

  if (uniqueIdentifierValues.size !== identifierValues.length) {
    throw badRequest("Identifier values must be unique within the request");
  }

  if (identifierValues.length > 0) {
    const existingIdentifier = await prisma.inventoryIdentifier.findFirst({
      where: {
        value: {
          in: identifierValues,
        },
      },
    });

    if (existingIdentifier) {
      throw badRequest("IMEI/serial already exists");
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const batch = await tx.inventoryBatch.create({
      data: {
        batchCode: `BATCH-${Date.now()}`,
        supplierName: supplierName || null,
        note: note || null,
      },
    });

    const inventoryItems = [];

    for (const entry of items) {
      const createdItem = await tx.inventoryItem.create({
        data: {
          productVariantId: Number(productVariantId),
          warehouseId: Number(warehouseId),
          batchId: batch.id,
          purchasePrice: entry.purchasePrice ?? null,
          receivedAt: entry.receivedAt ? new Date(entry.receivedAt) : new Date(),
          status: entry.status || "IN_STOCK",
          identifiers: Array.isArray(entry.identifiers)
            ? {
                create: entry.identifiers.map((identifier) => ({
                  type: identifier.type,
                  value: identifier.value,
                })),
              }
            : undefined,
        },
        include: {
          identifiers: true,
        },
      });

      inventoryItems.push(createdItem);
    }

    return { batch, items: inventoryItems };
  });

  return res.status(201).success(created);
}

async function getInventoryItem(req, res) {
  const id = toInt(req.params.id);

  if (!id) {
    throw badRequest("Invalid inventory item id");
  }

  const item = await getInventoryItemOrThrow(id);
  return res.success(item);
}

module.exports = {
  getInventorySummary,
  listInventory,
  checkImei,
  getInventoryByProduct,
  importOneInventoryItem,
  receiveStockLegacy,
  updateInventoryStatus,
  getInventoryItem,
};

