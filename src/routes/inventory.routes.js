const express = require("express");

const { asyncHandler } = require("../utils/http");
const {
  checkImei,
  getInventoryByProduct,
  getInventoryItem,
  getInventorySummary,
  importOneInventoryItem,
  listInventory,
  receiveStockLegacy,
  updateInventoryStatus,
} = require("../controllers/inventory.controller");

const router = express.Router();

router.get(
  "/summary",
  asyncHandler(getInventorySummary)
);

router.get(
  "/",
  asyncHandler(listInventory)
);

router.get(
  "/items",
  asyncHandler(listInventory)
);

router.get(
  "/check-imei/:imei",
  asyncHandler(checkImei)
);

router.get(
  "/product/:productId",
  asyncHandler(getInventoryByProduct)
);

router.post(
  "/import",
  asyncHandler(importOneInventoryItem)
);

router.post(
  "/receive",
  asyncHandler(receiveStockLegacy)
);

router.patch(
  "/:id/status",
  asyncHandler(updateInventoryStatus)
);

router.patch(
  "/items/:id/status",
  asyncHandler(updateInventoryStatus)
);

router.get(
  "/:id",
  asyncHandler(getInventoryItem)
);

router.get(
  "/items/:id",
  asyncHandler(getInventoryItem)
);

module.exports = router;
