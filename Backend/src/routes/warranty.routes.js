const express = require("express");

const { asyncHandler } = require("../utils/http");
const {
  activateWarranty,
  getWarranty,
  getWarrantyBySerial,
  updateWarrantyStatus,
} = require("../controllers/warranty.controller");

const router = express.Router();

router.post(
  "/activate",
  asyncHandler(activateWarranty)
);

router.get(
  "/by-serial/:imeiSerial",
  asyncHandler(getWarrantyBySerial)
);

router.get(
  "/:id",
  asyncHandler(getWarranty)
);

router.patch(
  "/:id/status",
  asyncHandler(updateWarrantyStatus)
);

module.exports = router;
