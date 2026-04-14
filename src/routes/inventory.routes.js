const express = require("express");

const prisma = require("../db/prisma");
const {
  asyncHandler,
  badRequest,
  getPagination,
  notFound,
  toInt,
  toNumber,
} = require("../utils/http");

const router = express.Router();

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
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

    const totalsByVariant = items.reduce((accumulator, item) => {
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

      if (item.status === "IN_STOCK") {
        accumulator[key].inStock += 1;
      }

      if (item.status === "RESERVED") {
        accumulator[key].reserved += 1;
      }

      if (item.status === "SOLD") {
        accumulator[key].sold += 1;
      }

      return accumulator;
    }, {});

    res.json({
      byStatus,
      byVariant: Object.values(totalsByVariant),
    });
  })
);

router.get(
  "/items",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = getPagination(req.query);
    const where = {};

    const warehouseId = toInt(req.query.warehouseId);
    const productVariantId = toInt(req.query.productVariantId);

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (productVariantId) {
      where.productVariantId = productVariantId;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
          warehouse: true,
          batch: true,
          identifiers: true,
          orderItem: true,
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  })
);

router.get(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);

    if (!id) {
      throw badRequest("Invalid inventory item id");
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        productVariant: {
          include: {
            product: true,
            images: true,
            specValues: {
              include: {
                specDefinition: true,
              },
            },
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
      },
    });

    if (!item) {
      throw notFound("Inventory item not found");
    }

    res.json(item);
  })
);

router.post(
  "/receive",
  asyncHandler(async (req, res) => {
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

    res.status(201).json(created);
  })
);

router.patch(
  "/items/:id/status",
  asyncHandler(async (req, res) => {
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
      throw badRequest("Cannot set item back to IN_STOCK while linked to an order");
    }

    const data = {
      status,
    };

    if (status === "RESERVED") {
      data.reservedAt = new Date();
    }

    if (status === "SOLD") {
      data.soldAt = new Date();
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
    });

    res.json(item);
  })
);

module.exports = router;
