const prisma = require("../db/prisma");
const {
  badRequest,
  createOrderCode,
  getPagination,
  notFound,
  toInt,
  toNumber,
  uniqueBy,
} = require("../utils/http");
const {
  assertItemsReservable,
  loadInventoryItemsForOrder,
  markItemsSold,
  normalizeOrderStatus,
  reserveItems,
  releaseItemsToStock,
} = require("../services/order.service");

const orderInclude = {
  customer: true,
  user: true,
  payment: true,
  paymentPlan: true,
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
          warehouse: true,
          batch: true,
        },
      },
      reviews: true,
    },
  },
};

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

function buildPaymentPlanData(paymentPlan, totalAmount) {
  if (!paymentPlan || typeof paymentPlan !== "object" || Array.isArray(paymentPlan)) {
    throw badRequest("paymentPlan is required for installment orders");
  }

  const termMonths = toInt(paymentPlan.termMonths);

  if (!termMonths || termMonths < 1) {
    throw badRequest("paymentPlan.termMonths is required for installment orders");
  }

  const downPayment = toNumber(paymentPlan.downPayment, 0);
  const interestRate = paymentPlan.interestRate;
  const totalPayable = toNumber(paymentPlan.totalPayable, totalAmount);

  if (downPayment < 0 || downPayment > totalPayable) {
    throw badRequest("paymentPlan.downPayment must be between 0 and totalPayable");
  }

  const monthlyAmount = toNumber(
    paymentPlan.monthlyAmount,
    (totalPayable - downPayment) / termMonths
  );

  if (monthlyAmount <= 0) {
    throw badRequest("paymentPlan.monthlyAmount must be greater than 0");
  }

  return {
    provider: paymentPlan.provider || null,
    termMonths,
    interestRate: interestRate ?? null,
    downPayment,
    monthlyAmount,
    totalPayable,
    status: paymentPlan.status || "PENDING",
    notes: paymentPlan.notes || null,
  };
}

async function listOrders(req, res) {
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
      include: orderInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return res.success(
    {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    { message: "OK" }
  );
}

async function getOrder(req, res) {
  const id = toInt(req.params.id);

  if (!id) {
    throw badRequest("Invalid order id");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) {
    throw notFound("Order not found");
  }

  return res.success(order);
}

async function createOrder(req, res) {
  const {
    customerId,
    userId,
    inventoryItemIds,
    couponCode,
    shipping,
    payment,
    paymentPlan,
    status,
  } = req.body;

  if (!customerId) {
    throw badRequest("customerId is required");
  }

  if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0) {
    throw badRequest("inventoryItemIds must be a non-empty array");
  }

  const uniqueInventoryItemIds = uniqueBy(inventoryItemIds, (itemId) =>
    Number(itemId)
  ).map(Number);

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

    const inventoryItems = await loadInventoryItemsForOrder(tx, uniqueInventoryItemIds);
    assertItemsReservable(inventoryItems);

    const subtotal = inventoryItems.reduce(
      (sum, item) => sum + Number(item.productVariant.price),
      0
    );

    const { coupon, discountAmount } = await resolveCoupon(tx, couponCode, subtotal);
    const shippingCost = shipping ? Number(shipping.cost || 0) : 0;
    const totalAmount = subtotal - discountAmount + shippingCost;
    const paymentMethod = payment?.method || (paymentPlan ? "INSTALLMENT" : "CASH");
    const shouldCreatePaymentPlan = paymentMethod === "INSTALLMENT" || paymentPlan;

    const orderStatus = normalizeOrderStatus(status);
    const order = await tx.order.create({
      data: {
        orderCode: createOrderCode(),
        customerId: Number(customerId),
        userId: userId ? Number(userId) : null,
        status: orderStatus,
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
    }

    if (orderStatus === "COMPLETED") {
      await markItemsSold(tx, inventoryItems);
    } else if (orderStatus === "CANCELLED") {
      await releaseItemsToStock(tx, uniqueInventoryItemIds);
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    } else {
      await reserveItems(tx, inventoryItems);
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

    if (payment || shouldCreatePaymentPlan) {
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount:
            payment?.amount ??
            (paymentMethod === "INSTALLMENT" &&
            paymentPlan?.downPayment !== undefined
              ? paymentPlan.downPayment
              : totalAmount),
          method: paymentMethod,
          status:
            payment?.status || (paymentMethod === "INSTALLMENT" ? "PARTIAL" : "PENDING"),
          transactionId: payment?.transactionId || null,
          paidAt: payment?.paidAt ? new Date(payment.paidAt) : null,
          notes: payment?.notes || null,
        },
      });
    }

    if (shouldCreatePaymentPlan) {
      await tx.paymentPlan.create({
        data: {
          orderId: order.id,
          ...buildPaymentPlanData(paymentPlan, totalAmount),
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
      include: orderInclude,
    });
  });

  return res.status(201).success(result);
}

async function updateOrderStatus(req, res) {
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
      const inventoryItemIds = order.orderItems.map((item) => item.inventoryItemId);
      await releaseItemsToStock(tx, inventoryItemIds);
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    }

    if (status === "COMPLETED") {
      const inventoryItemIds = order.orderItems.map((item) => item.inventoryItemId);
      const inventoryItems = inventoryItemIds.length
        ? await tx.inventoryItem.findMany({
            where: { id: { in: inventoryItemIds } },
          })
        : [];
      await markItemsSold(tx, inventoryItems);
    }

    return tx.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  });

  return res.success(updatedOrder);
}

async function upsertOrderPayment(req, res) {
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

  return res.success(payment);
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  upsertOrderPayment,
};

