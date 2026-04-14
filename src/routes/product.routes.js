const express = require("express");

const prisma = require("../db/prisma");
const {
  asyncHandler,
  badRequest,
  getPagination,
  notFound,
  slugify,
  toInt,
  toNumber,
  uniqueBy,
} = require("../utils/http");

const router = express.Router();

function buildProductFilters(query) {
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  const categoryId = toInt(query.categoryId);
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const brandId = toInt(query.brandId);
  if (brandId) {
    where.brandId = brandId;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { slug: { contains: query.search } },
    ];
  }

  return where;
}

function ensureVariantPayload(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw badRequest("variants must be a non-empty array");
  }

  for (const variant of variants) {
    if (!variant.sku || !variant.name || !variant.price) {
      throw badRequest("Each variant must include sku, name, and price");
    }
  }
}

router.get(
  "/meta/bootstrap",
  asyncHandler(async (req, res) => {
    const [categories, brands, specGroups] = await Promise.all([
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
    ]);

    res.json({ categories, brands, specGroups });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = getPagination(req.query);
    const where = buildProductFilters(req.query);

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          brand: true,
          variants: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            include: {
              images: {
                orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
              },
              _count: {
                select: {
                  inventoryItems: true,
                  reviews: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
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
      throw badRequest("Invalid product id");
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          include: {
            images: {
              orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
            },
            specValues: {
              include: {
                specDefinition: true,
              },
              orderBy: {
                specDefinition: {
                  sortOrder: "asc",
                },
              },
            },
            _count: {
              select: {
                inventoryItems: true,
                reviews: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw notFound("Product not found");
    }

    res.json(product);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      categoryId,
      brandId,
      name,
      slug,
      shortDescription,
      description,
      warrantyMonths,
      status,
      variants,
    } = req.body;

    if (!categoryId || !brandId || !name) {
      throw badRequest("categoryId, brandId and name are required");
    }

    ensureVariantPayload(variants);

    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
    });
    const brand = await prisma.brand.findUnique({
      where: { id: Number(brandId) },
    });

    if (!category) {
      throw badRequest("categoryId is invalid");
    }

    if (!brand) {
      throw badRequest("brandId is invalid");
    }

    const productSlug = slug || slugify(name);
    const uniqueVariants = uniqueBy(variants, (variant) => variant.sku);

    if (uniqueVariants.length !== variants.length) {
      throw badRequest("Variant SKU values must be unique within the request");
    }

    const product = await prisma.product.create({
      data: {
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        name,
        slug: productSlug,
        shortDescription: shortDescription || null,
        description: description || null,
        warrantyMonths: warrantyMonths ? Number(warrantyMonths) : 12,
        status: status || "DRAFT",
        variants: {
          create: variants.map((variant, index) => ({
            sku: variant.sku,
            name: variant.name,
            slug: variant.slug || slugify(`${productSlug}-${variant.sku}`),
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
        },
      },
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            images: true,
            specValues: true,
          },
        },
      },
    });

    res.status(201).json(product);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
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

    res.json(product);
  })
);

module.exports = router;
