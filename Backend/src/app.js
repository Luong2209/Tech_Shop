const express = require("express");
const cors = require("cors");

const productRoutes = require("./routes/product.routes");
const specTemplateRoutes = require("./routes/spec-template.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const orderRoutes = require("./routes/order.routes");
const warrantyRoutes = require("./routes/warranty.routes");
const { responseFormat } = require("./middlewares/response-format");
const { errorHandler } = require("./middlewares/error-handler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(responseFormat);

app.get("/", (req, res) => {
  res.json({
    message: "Tech Store backend is running",
  });
});

app.use("/api/products", productRoutes);
app.use("/api/spec-templates", specTemplateRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/warranties", warrantyRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;
