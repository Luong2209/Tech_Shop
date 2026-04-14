const express = require("express");

const prisma = require("../db/prisma");
const {
  asyncHandler,
  badRequest,
  createOrderCode,
  getPagination,
  notFound,
  toInt,
  toNumber,
  uniqueBy,
} = require("../utils/http");

const router = express.Router();

async function resolveCoupon(tx, couponCode, subtotal) {
  if (!couponCode) {
    return { coupon: null, discountAmount: 0 };
  }

  const coupon = await tx.coupon.findUnique({
    where: { code: couponCode },
  });

  if (!coupon) {
    throw badRequest("Coupon code is invalid");
  }

  const now = new Date();

  if (coupon.status !== "ACTIVE" || coupon.startDate > now || coupon.endDate < now) {
    throw badRequest("Coupon is not active");
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw badRequest("Coupon usage limit reached");
  }

  if (coupon.minOrderAmount !== null && subtotal < Number(coupon.minOrderAmount)) {
    throw badRequest("Order does not meet coupon minimum amount");
  }

  let discountAmount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (subtotal * Number(coupon.discountValue)) / 100;

    if (coupon.maxDiscount !== null) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    coupon,
    discountAmount,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = getPagination(req.query);
    const where = {};

    const customerId = toInt(req.query.customerId);
    if (customerId) {
      where.customerId = customerId;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          user: true,
          payment: true,
          shipping: true,
          orderDiscounts: {
            include: {
              coupon: true,
            },
          },
          orderItems: {
            include: {
              productVariant: {
                include: {
                  product: true,
                },
              },
              inventoryItem: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
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
  "/:id",
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);

    if (!id) {
      throw badRequest("Invalid order id");
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        payment: true,
        shipping: true,
        orderDiscounts: {
          include: {
            coupon: true,
          },
        },
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
              },
            },
            reviews: true,
          },
        },
      },
    });

    if (!order) {
      throw notFound("Order not found");
    }

    res.json(order);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      customerId,
      userId,
      inventoryItemIds,
      couponCode,
      shipping,
      payment,
      status,
    } = req.body;

    if (!customerId) {
      throw badRequest("customerId is required");
    }

    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0) {
      throw badRequest("inventoryItemIds must be a non-empty array");
    }

    const uniqueInventoryItemIds = uniqueBy(inventoryItemIds, (itemId) => Number(itemId)).map(Number);

    if (uniqueInventoryItemIds.length !== inventoryItemIds.length) {
      throw badRequest("inventoryItemIds must be unique");
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: Number(customerId) },
      });

      if (!customer) {
        throw badRequest("customerId is invalid");
      }

      if (userId) {
        const user = await tx.user.findUnique({
          where: { id: Number(userId) },
        });

        if (!user) {
          throw badRequest("userId is invalid");
        }
      }

      const inventoryItems = await tx.inventoryItem.findMany({
        where: {
          id: {
            in: uniqueInventoryItemIds,
          },
        },
        include: {
          productVariant: true,
          orderItem: true,
        },
      });

      if (inventoryItems.length !== uniqueInventoryItemIds.length) {
        throw badRequest("Some inventory items do not exist");
      }

      for (const item of inventoryItems) {
        if (item.status !== "IN_STOCK") {
          throw badRequest(`Inventory item ${item.id} is not available`);
        }

        if (item.orderItem) {
          throw badRequest(`Inventory item ${item.id} is already linked to an order`);
        }
      }

      const subtotal = inventoryItems.reduce(
        (sum, item) => sum + Number(item.productVariant.price),
        0
      );

      const { coupon, discountAmount } = await resolveCoupon(tx, couponCode, subtotal);
      const shippingCost = shipping ? Number(shipping.cost || 0) : 0;
      const totalAmount = subtotal - discountAmount + shippingCost;

      const order = await tx.order.create({
        data: {
          orderCode: createOrderCode(),
          customerId: Number(customerId),
          userId: userId ? Number(userId) : null,
          status: status || "PENDING",
          totalAmount,
        },
      });

      for (const item of inventoryItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productVariantId: item.productVariantId,
            inventoryItemId: item.id,
            quantity: 1,
            unitPrice: item.productVariant.price,
          },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: "RESERVED",
            reservedAt: new Date(),
          },
        });
      }

      if (coupon) {
        await tx.orderDiscount.create({
          data: {
            orderId: order.id,
            couponId: coupon.id,
            discountAmount,
            reason: "COUPON",
          },
        });

        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      if (payment) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: payment.amount ?? totalAmount,
            method: payment.method || "CASH",
            status: payment.status || "PENDING",
            transactionId: payment.transactionId || null,
            paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
            notes: payment.notes || null,
          },
        });
      }

      if (shipping) {
        await tx.shipping.create({
          data: {
            orderId: order.id,
            recipientName: shipping.recipientName,
            phone: shipping.phone,
            address: shipping.address,
            ward: shipping.ward || null,
            district: shipping.district,
            province: shipping.province,
            method: shipping.method || "STANDARD",
            carrier: shipping.carrier || null,
            trackingCode: shipping.trackingCode || null,
            cost: shippingCost,
            estimatedDays: shipping.estimatedDays ?? null,
            status: shipping.status || "PENDING",
          },
        });
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          customer: true,
          payment: true,
          shipping: true,
          orderDiscounts: {
            include: {
              coupon: true,
            },
          },
          orderItems: {
            include: {
              inventoryItem: true,
              productVariant: true,
            },
          },
        },
      });
    });

    res.status(201).json(result);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status } = req.body;

    if (!id) {
      throw badRequest("Invalid order id");
    }

    if (!status) {
      throw badRequest("status is required");
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          orderItems: true,
        },
      });

      if (!order) {
        throw notFound("Order not found");
      }

      await tx.order.update({
        where: { id },
        data: { status },
      });

      if (status === "CANCELLED") {
        for (const item of order.orderItems) {
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              status: "IN_STOCK",
              reservedAt: null,
            },
          });
        }
      }

      if (status === "COMPLETED") {
        for (const item of order.orderItems) {
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              status: "SOLD",
              soldAt: new Date(),
            },
          });
        }
      }

      return tx.order.findUnique({
        where: { id },
        include: {
          payment: true,
          shipping: true,
          orderItems: {
            include: {
              inventoryItem: true,
            },
          },
        },
      });
    });

    res.json(updatedOrder);
  })
);

router.patch(
  "/:id/payment",
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { status, transactionId, paidAt, notes, amount, method } = req.body;

    if (!id) {
      throw badRequest("Invalid order id");
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw notFound("Order not found");
    }

    const payment = order.payment
      ? await prisma.payment.update({
          where: { orderId: id },
          data: {
            status: status || order.payment.status,
            transactionId: transactionId ?? order.payment.transactionId,
            paidAt: paidAt ? new Date(paidAt) : order.payment.paidAt,
            notes: notes ?? order.payment.notes,
            amount: amount ?? order.payment.amount,
            method: method ?? order.payment.method,
          },
        })
      : await prisma.payment.create({
          data: {
            orderId: id,
            amount: amount ?? order.totalAmount,
            method: method || "CASH",
            status: status || "PENDING",
            transactionId: transactionId || null,
            paidAt: paidAt ? new Date(paidAt) : null,
            notes: notes || null,
          },
        });

    res.json(payment);
  })
);

module.exports = router;
