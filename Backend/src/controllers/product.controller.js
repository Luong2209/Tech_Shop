const prisma = require("../db/prisma");
const {
  badRequest,
  getPagination,
  notFound,
  slugify,
  toInt,
} = require("../utils/http");
const {
  buildComparisonSpecs,
  buildProductFilters,
  ensureJsonObject,
  ensureProductRelations,
  getDefaultVariant,
  getTemplateFields,
  normalizeProductCreatePayload,
  parseCompareIds,
  productCompareInclude,
  productDetailInclude,
  productListInclude,
} = require("../services/product.service");

// Controller is intentionally thin: it parses input, calls Prisma, and delegates complex logic
// (compare specs, filters, validation helpers, include configs) to `src/services/product.service.js`.

async function getBootstrap(req, res) {
  const [categories, brands, specGroups, specTemplates] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.specGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        specs: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    }),
    prisma.specTemplate.findMany({
      orderBy: { name: "asc" },
      include: {
        category: true,
      },
    }),
  ]);

  return res.success({ categories, brands, specGroups, specTemplates });
}

async function listProducts(req, res) {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const where = buildProductFilters(req.query);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: productListInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return res.success({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

async function compareProducts(req, res) {
  const ids = parseCompareIds(req.query.ids);

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    include: productCompareInclude,
  });

  if (products.length !== ids.length) {
    const foundIds = new Set(products.map((product) => product.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    throw notFound(`Products not found: ${missingIds.join(", ")}`);
  }

  const orderedProducts = ids.map((id) => products.find((product) => product.id === id));
  const specCodes = new Set();

  for (const product of orderedProducts) {
    for (const field of getTemplateFields(product.specTemplate)) {
      specCodes.add(field.code);
    }

    for (const code of Object.keys(product.technicalSpecsJson || {})) {
      specCodes.add(code);
    }

    for (const specValue of getDefaultVariant(product)?.specValues || []) {
      if (specValue.specDefinition?.code) {
        specCodes.add(specValue.specDefinition.code);
      }
    }
  }

  const specDefinitions = specCodes.size
    ? await prisma.specDefinition.findMany({
        where: {
          code: {
            in: [...specCodes],
          },
        },
      })
    : [];

  return res.success({
    products: orderedProducts,
    comparisonSpecs: buildComparisonSpecs(orderedProducts, specDefinitions),
  });
}

async function getProduct(req, res) {
  const id = toInt(req.params.id);

  if (!id) {
    throw badRequest("Invalid product id");
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: productDetailInclude,
  });

  if (!product) {
    throw notFound("Product not found");
  }

  return res.success(product);
}

async function createProduct(req, res) {
  const payload = normalizeProductCreatePayload(req.body);
  const relations = await ensureProductRelations(payload);

  const product = await prisma.product.create({
    data: {
      categoryId: relations.categoryId,
      brandId: relations.brandId,
      specTemplateId: relations.specTemplateId,
      name: payload.name,
      slug: payload.productSlug,
      shortDescription: payload.shortDescription || null,
      description: payload.description || null,
      technicalSpecsJson: payload.technicalSpecsJson ?? null,
      warrantyMonths: payload.warrantyMonths ? Number(payload.warrantyMonths) : 12,
      status: payload.status || "DRAFT",
      variants: payload.requestVariants.length
        ? {
            create: payload.requestVariants.map((variant, index) => ({
              sku: variant.sku,
              name: variant.name,
              slug: variant.slug || slugify(`${payload.productSlug}-${variant.sku}`),
              color: variant.color || null,
              storageLabel: variant.storageLabel || null,
              ramLabel: variant.ramLabel || null,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice || null,
              isDefault: Boolean(variant.isDefault ?? index === 0),
              status: variant.status || "ACTIVE",
              images: Array.isArray(variant.images)
                ? {
                    create: variant.images.map((image, imageIndex) => ({
                      url: image.url,
                      altText: image.altText || null,
                      sortOrder: image.sortOrder ?? imageIndex,
                      isDefault: Boolean(image.isDefault ?? imageIndex === 0),
                    })),
                  }
                : undefined,
              specValues: Array.isArray(variant.specValues)
                ? {
                    create: variant.specValues.map((specValue) => ({
                      specDefinitionId: Number(specValue.specDefinitionId),
                      valueText: specValue.valueText ?? null,
                      valueNumber: specValue.valueNumber ?? null,
                      valueBoolean: specValue.valueBoolean ?? null,
                      displayValue: specValue.displayValue ?? null,
                    })),
                  }
                : undefined,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      brand: true,
      specTemplate: true,
      variants: {
        include: {
          images: true,
          specValues: true,
        },
      },
    },
  });

  return res.status(201).success(product);
}

async function updateProduct(req, res) {
  const id = toInt(req.params.id);
  const {
    categoryId,
    brandId,
    specTemplateId,
    name,
    slug,
    shortDescription,
    description,
    technicalSpecsJson,
    warrantyMonths,
    status,
  } = req.body;

  if (!id) {
    throw badRequest("Invalid product id");
  }

  ensureJsonObject(technicalSpecsJson, "technicalSpecsJson");

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw notFound("Product not found");
  }

  const nextCategoryId = categoryId !== undefined ? categoryId : existingProduct.categoryId;
  const nextSpecTemplateId =
    specTemplateId !== undefined ? specTemplateId : existingProduct.specTemplateId;
  const shouldValidateTemplate = categoryId !== undefined || specTemplateId !== undefined;

  const relations = await ensureProductRelations({
    categoryId: shouldValidateTemplate ? nextCategoryId : undefined,
    brandId,
    specTemplateId: shouldValidateTemplate && nextSpecTemplateId ? nextSpecTemplateId : undefined,
  });

  if (specTemplateId !== undefined && !nextSpecTemplateId) {
    throw badRequest("specTemplateId is invalid");
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      categoryId: categoryId ? relations.categoryId : undefined,
      brandId: brandId ? relations.brandId : undefined,
      specTemplateId: specTemplateId !== undefined ? relations.specTemplateId : undefined,
      name,
      slug: slug || (name ? slugify(name) : undefined),
      shortDescription,
      description,
      technicalSpecsJson,
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
      status,
    },
    include: {
      category: true,
      brand: true,
      specTemplate: true,
    },
  });

  return res.success(product);
}

async function updateProductStatus(req, res) {
  const id = toInt(req.params.id);
  const { status } = req.body;

  if (!id) {
    throw badRequest("Invalid product id");
  }

  if (!status) {
    throw badRequest("status is required");
  }

  const product = await prisma.product.update({
    where: { id },
    data: { status },
  });

  return res.success(product);
}

async function softDeleteProduct(req, res) {
  const id = toInt(req.params.id);

  if (!id) {
    throw badRequest("Invalid product id");
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          variants: true,
        },
      },
    },
  });

  if (!existingProduct) {
    throw notFound("Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      status: "INACTIVE",
      variants: {
        updateMany: {
          where: {},
          data: {
            status: "INACTIVE",
          },
        },
      },
    },
  });

  return res.success({
    product,
    deleted: false,
    reason: "Soft deleted by setting product and variants to INACTIVE",
  });
}

module.exports = {
  getBootstrap,
  listProducts,
  compareProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateProductStatus,
  softDeleteProduct,
};

