const prisma = require("../db/prisma");
const { badRequest, notFound, toInt } = require("../utils/http");
const {
  createWarrantyForSoldItem,
  warrantyActivationInventoryItemInclude,
  warrantyActivationOrderInclude,
  warrantyInclude,
} = require("../services/warranty.service");

async function activateWarranty(req, res) {
  const orderId = toInt(req.body.orderId);
  const inventoryItemId = toInt(req.body.inventoryItemId);

  if (!orderId && !inventoryItemId) {
    throw badRequest("orderId or inventoryItemId is required");
  }

  const result = await prisma.$transaction(async (tx) => {
    if (orderId) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: warrantyActivationOrderInclude,
      });

      if (!order) {
        throw notFound("Order not found");
      }

      if (order.status !== "COMPLETED") {
        throw badRequest("Order must be COMPLETED before warranty activation");
      }

      const activations = [];

      for (const orderItem of order.orderItems) {
        activations.push(
          await createWarrantyForSoldItem(tx, orderItem.inventoryItem, order.customerId)
        );
      }

      return {
        orderId: order.id,
        warranties: activations,
      };
    }

    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: warrantyActivationInventoryItemInclude,
    });

    if (!item) {
      throw notFound("Inventory item not found");
    }

    if (!item.orderItem?.order) {
      throw badRequest("Inventory item is not linked to an order");
    }

    return createWarrantyForSoldItem(tx, item, item.orderItem.order.customerId);
  });

  return res.status(201).success(result);
}

async function getWarrantyBySerial(req, res) {
  const identifier = await prisma.inventoryIdentifier.findUnique({
    where: { value: req.params.imeiSerial },
    include: {
      inventoryItem: {
        include: {
          warranty: {
            include: warrantyInclude,
          },
        },
      },
    },
  });

  if (!identifier) {
    throw notFound("IMEI/serial not found");
  }

  if (!identifier.inventoryItem.warranty) {
    throw notFound("Warranty not found for this IMEI/serial");
  }

  return res.success(identifier.inventoryItem.warranty);
}

async function getWarranty(req, res) {
  const id = toInt(req.params.id);

  if (!id) {
    throw badRequest("Invalid warranty id");
  }

  const warranty = await prisma.warranty.findUnique({
    where: { id },
    include: warrantyInclude,
  });

  if (!warranty) {
    throw notFound("Warranty not found");
  }

  return res.success(warranty);
}

async function updateWarrantyStatus(req, res) {
  const id = toInt(req.params.id);
  const { status } = req.body;

  if (!id) {
    throw badRequest("Invalid warranty id");
  }

  if (!status) {
    throw badRequest("status is required");
  }

  const existingWarranty = await prisma.warranty.findUnique({
    where: { id },
  });

  if (!existingWarranty) {
    throw notFound("Warranty not found");
  }

  const warranty = await prisma.warranty.update({
    where: { id },
    data: { status },
    include: warrantyInclude,
  });

  return res.success(warranty);
}

module.exports = {
  activateWarranty,
  getWarrantyBySerial,
  getWarranty,
  updateWarrantyStatus,
};

