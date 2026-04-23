const express = require("express");

const { asyncHandler } = require("../utils/http");
const {
  compareProducts,
  createProduct,
  getBootstrap,
  getProduct,
  listProducts,
  softDeleteProduct,
  updateProduct,
  updateProductStatus,
} = require("../controllers/product.controller");

const router = express.Router();

router.get(
  "/meta/bootstrap",
  asyncHandler(getBootstrap)
);

router.get(
  "/",
  asyncHandler(listProducts)
);

router.get(
  "/compare",
  asyncHandler(compareProducts)
);

router.get(
  "/:id",
  asyncHandler(getProduct)
);

router.post(
  "/",
  asyncHandler(createProduct)
);

router.patch(
  "/:id/status",
  asyncHandler(updateProductStatus)
);

router.put("/:id", asyncHandler(updateProduct));

router.patch(
  "/:id",
  asyncHandler(updateProduct)
);

router.delete(
  "/:id",
  asyncHandler(softDeleteProduct)
);

module.exports = router;
