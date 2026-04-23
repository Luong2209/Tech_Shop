const { badRequest } = require("../utils/http");

function normalizeOrderStatus(status, fallback = "PENDING") {
  return status || fallback;
}

function inventoryStatusForOrderStatus(orderStatus) {
  if (orderStatus === "COMPLETED") return "SOLD";
  if (orderStatus === "CANCELLED") return "IN_STOCK";
  return "RESERVED";
}

async function loadInventoryItemsForOrder(tx, inventoryItemIds) {
  const items = await tx.inventoryItem.findMany({
    where: { id: { in: inventoryItemIds } },
    include: {
      productVariant: true,
      orderItem: true,
    },
  });

  if (items.length !== inventoryItemIds.length) {
    throw badRequest("Some inventory items do not exist");
  }

  for (const item of items) {
    if (item.orderItem) {
      throw badRequest(`Inventory item ${item.id} is already linked to an order`);
    }
  }

  return items;
}

function assertItemsReservable(items) {
  for (const item of items) {
    if (item.status !== "IN_STOCK") {
      throw badRequest(`Inventory item ${item.id} is not available`);
    }
  }
}

async function reserveItems(tx, items) {
  for (const item of items) {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: "RESERVED",
        reservedAt: new Date(),
        soldAt: null,
      },
    });
  }
}

async function markItemsSold(tx, items) {
  for (const item of items) {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        status: "SOLD",
        soldAt: new Date(),
        reservedAt: item.reservedAt ?? null,
      },
    });
  }
}

async function releaseItemsToStock(tx, inventoryItemIds) {
  await tx.inventoryItem.updateMany({
    where: { id: { in: inventoryItemIds } },
    data: {
      status: "IN_STOCK",
      reservedAt: null,
      soldAt: null,
    },
  });
}

module.exports = {
  normalizeOrderStatus,
  inventoryStatusForOrderStatus,
  loadInventoryItemsForOrder,
  assertItemsReservable,
  reserveItems,
  markItemsSold,
  releaseItemsToStock,
};

