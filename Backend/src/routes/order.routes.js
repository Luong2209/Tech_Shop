const express = require("express");

const { asyncHandler } = require("../utils/http");
const {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
  upsertOrderPayment,
} = require("../controllers/order.controller");

const router = express.Router();

router.get(
  "/",
  asyncHandler(listOrders)
);

router.get(
  "/:id",
  asyncHandler(getOrder)
);

router.post(
  "/",
  asyncHandler(createOrder)
);

router.patch(
  "/:id/status",
  asyncHandler(updateOrderStatus)
);

router.patch(
  "/:id/payment",
  asyncHandler(upsertOrderPayment)
);

module.exports = router;
