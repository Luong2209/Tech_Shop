const prisma = require("../db/prisma");
const { badRequest } = require("../utils/http");

const warrantyInclude = {
  customer: true,
  inventoryItem: {
    include: {
      identifiers: true,
      warehouse: true,
      batch: true,
      productVariant: {
        include: {
          product: true,
        },
      },
      orderItem: {
        include: {
          order: true,
        },
      },
    },
  },
  claims: {
    orderBy: { createdAt: "desc" },
  },
};

const warrantyActivationOrderInclude = {
  orderItems: {
    include: {
      productVariant: {
        include: {
          product: true,
        },
      },
      inventoryItem: {
        include: {
          identifiers: true,
          warranty: true,
          productVariant: {
            include: {
              product: true,
            },
          },
          orderItem: {
            include: {
              order: true,
            },
          },
        },
      },
    },
  },
};

const warrantyActivationInventoryItemInclude = {
  identifiers: true,
  warranty: true,
  productVariant: {
    include: {
      product: true,
    },
  },
  orderItem: {
    include: {
      order: true,
    },
  },
};

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getWarrantyPeriod(item) {
  const startDate = item.soldAt || item.orderItem?.order?.updatedAt || new Date();
  const warrantyMonths =
    item.productVariant?.product?.warrantyMonths ||
    item.orderItem?.productVariant?.product?.warrantyMonths ||
    12;

  return {
    startDate,
    endDate: addMonths(startDate, warrantyMonths),
  };
}

async function createWarrantyForSoldItem(tx, item, customerId) {
  if (item.status !== "SOLD") {
    throw badRequest(`Inventory item ${item.id} must be SOLD before warranty activation`);
  }
  if (!item.orderItem?.order) {
    throw badRequest(`Inventory item ${item.id} is not linked to an order`);
  }
  if (item.orderItem.order.status !== "COMPLETED") {
    throw badRequest(
      `Order ${item.orderItem.order.id} must be COMPLETED before warranty activation`
    );
  }

  const existingWarranty = await tx.warranty.findUnique({
    where: { inventoryItemId: item.id },
    include: warrantyInclude,
  });
  if (existingWarranty) {
    return { warranty: existingWarranty, created: false };
  }

  const { startDate, endDate } = getWarrantyPeriod(item);
  const warranty = await tx.warranty.create({
    data: {
      inventoryItemId: item.id,
      customerId,
      startDate,
      endDate,
      status: "ACTIVE",
    },
    include: warrantyInclude,
  });

  return { warranty, created: true };
}

module.exports = {
  warrantyInclude,
  warrantyActivationOrderInclude,
  warrantyActivationInventoryItemInclude,
  createWarrantyForSoldItem,
};

