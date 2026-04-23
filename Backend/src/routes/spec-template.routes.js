const express = require("express");

const { asyncHandler } = require("../utils/http");
const {
  createSpecTemplate,
  getSpecTemplate,
  listSpecTemplates,
} = require("../controllers/spec-template.controller");

const router = express.Router();

router.post(
  "/",
  asyncHandler(createSpecTemplate)
);

router.get(
  "/",
  asyncHandler(listSpecTemplates)
);

router.get(
  "/:id",
  asyncHandler(getSpecTemplate)
);

module.exports = router;
