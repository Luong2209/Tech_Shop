const prisma = require("../db/prisma");
const { badRequest, slugify, toInt, uniqueBy } = require("../utils/http");

const productListInclude = {
  category: true,
  brand: true,
  specTemplate: true,
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
};

const productDetailInclude = {
  category: true,
  brand: true,
  specTemplate: true,
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
};

const productCompareInclude = {
  category: true,
  brand: true,
  specTemplate: true,
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
    },
  },
};

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

  const specTemplateId = toInt(query.specTemplateId);
  if (specTemplateId) {
    where.specTemplateId = specTemplateId;
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

function ensureJsonObject(value, fieldName) {
  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== "object" || Array.isArray(value))
  ) {
    throw badRequest(`${fieldName} must be a JSON object`);
  }
}

function parseCompareIds(ids) {
  if (!ids) {
    throw badRequest("ids query parameter is required");
  }

  const parsedIds = uniqueBy(
    String(ids)
      .split(",")
      .map((id) => toInt(id))
      .filter(Boolean),
    (id) => id
  );

  if (parsedIds.length < 2) {
    throw badRequest("ids must include at least 2 product ids");
  }

  if (parsedIds.length > 4) {
    throw badRequest("Compare supports up to 4 products");
  }

  return parsedIds;
}

function getTemplateFields(specTemplate) {
  const fields = specTemplate?.specsJson?.fields;

  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field, index) => {
      if (typeof field === "string") {
        return {
          code: field,
          label: field,
          sortOrder: index,
        };
      }

      if (field && typeof field === "object" && field.code) {
        return {
          code: field.code,
          label: field.label || field.name || field.code,
          sortOrder: field.sortOrder ?? index,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function formatSpecValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object") {
    if (value.displayValue !== undefined) {
      return formatSpecValue(value.displayValue);
    }

    if (value.valueText !== undefined) {
      return formatSpecValue(value.valueText);
    }

    if (value.valueNumber !== undefined) {
      return formatSpecValue(value.valueNumber);
    }

    if (value.valueBoolean !== undefined) {
      return formatSpecValue(value.valueBoolean);
    }

    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatVariantSpecValue(specValue) {
  if (specValue.displayValue) {
    return specValue.displayValue;
  }

  if (specValue.valueText !== null && specValue.valueText !== undefined) {
    return specValue.valueText;
  }

  if (specValue.valueNumber !== null && specValue.valueNumber !== undefined) {
    const numberValue = String(specValue.valueNumber);
    return specValue.specDefinition?.unit
      ? `${numberValue}${specValue.specDefinition.unit}`
      : numberValue;
  }

  if (specValue.valueBoolean !== null && specValue.valueBoolean !== undefined) {
    return specValue.valueBoolean ? "Yes" : "No";
  }

  return null;
}

function getDefaultVariant(product) {
  return (
    product.variants.find((variant) => variant.isDefault) || product.variants[0] || null
  );
}

function buildComparisonSpecs(products, specDefinitions) {
  const specMetaByCode = new Map();
  const definitionByCode = new Map(
    specDefinitions.map((definition) => [definition.code, definition])
  );

  for (const product of products) {
    for (const field of getTemplateFields(product.specTemplate)) {
      const definition = definitionByCode.get(field.code);
      const existing = specMetaByCode.get(field.code);

      specMetaByCode.set(field.code, {
        code: field.code,
        label: definition?.name || field.label,
        sortOrder: existing?.sortOrder ?? definition?.sortOrder ?? field.sortOrder,
      });
    }

    for (const code of Object.keys(product.technicalSpecsJson || {})) {
      const definition = definitionByCode.get(code);

      if (!specMetaByCode.has(code)) {
        specMetaByCode.set(code, {
          code,
          label: definition?.name || code,
          sortOrder: definition?.sortOrder ?? specMetaByCode.size + 1000,
        });
      }
    }

    const defaultVariant = getDefaultVariant(product);

    for (const specValue of defaultVariant?.specValues || []) {
      const definition = specValue.specDefinition;

      if (definition && !specMetaByCode.has(definition.code)) {
        specMetaByCode.set(definition.code, {
          code: definition.code,
          label: definition.name,
          sortOrder: definition.sortOrder ?? specMetaByCode.size + 1000,
        });
      }
    }
  }

  return [...specMetaByCode.values()]
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)
    )
    .map((meta) => {
      const values = {};

      for (const product of products) {
        const defaultVariant = getDefaultVariant(product);
        const variantSpecValue = defaultVariant?.specValues.find(
          (specValue) => specValue.specDefinition?.code === meta.code
        );

        values[product.id] =
          formatSpecValue(product.technicalSpecsJson?.[meta.code]) ||
          (variantSpecValue ? formatVariantSpecValue(variantSpecValue) : null) ||
          null;
      }

      return {
        code: meta.code,
        label: meta.label,
        values,
      };
    })
    .filter((spec) => Object.values(spec.values).some((value) => value !== null && value !== ""));
}

async function ensureProductRelations({ categoryId, brandId, specTemplateId }) {
  const parsedCategoryId = toInt(categoryId);
  const parsedBrandId = toInt(brandId);
  const parsedSpecTemplateId = toInt(specTemplateId);

  const [category, brand, specTemplate] = await Promise.all([
    parsedCategoryId
      ? prisma.category.findUnique({ where: { id: parsedCategoryId } })
      : null,
    parsedBrandId ? prisma.brand.findUnique({ where: { id: parsedBrandId } }) : null,
    parsedSpecTemplateId
      ? prisma.specTemplate.findUnique({ where: { id: parsedSpecTemplateId } })
      : null,
  ]);

  if (categoryId !== undefined && !category) {
    throw badRequest("categoryId is invalid");
  }

  if (brandId !== undefined && !brand) {
    throw badRequest("brandId is invalid");
  }

  if (specTemplateId !== undefined && !specTemplate) {
    throw badRequest("specTemplateId is invalid");
  }

  if (category && specTemplate && Number(specTemplate.categoryId) !== Number(category.id)) {
    throw badRequest("specTemplateId must belong to the selected categoryId");
  }

  return {
    categoryId: parsedCategoryId,
    brandId: parsedBrandId,
    specTemplateId: parsedSpecTemplateId,
  };
}

function normalizeProductCreatePayload(body) {
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
    variants,
  } = body;

  if (!categoryId || !brandId || !specTemplateId || !name) {
    throw badRequest("categoryId, brandId, specTemplateId and name are required");
  }

  if (variants !== undefined) {
    ensureVariantPayload(variants);
  }

  ensureJsonObject(technicalSpecsJson, "technicalSpecsJson");

  const productSlug = slug || slugify(name);
  const requestVariants = Array.isArray(variants) ? variants : [];
  const uniqueVariants = uniqueBy(requestVariants, (variant) => variant.sku);

  if (uniqueVariants.length !== requestVariants.length) {
    throw badRequest("Variant SKU values must be unique within the request");
  }

  return {
    categoryId,
    brandId,
    specTemplateId,
    name,
    productSlug,
    shortDescription,
    description,
    technicalSpecsJson,
    warrantyMonths,
    status,
    requestVariants,
  };
}

module.exports = {
  productListInclude,
  productDetailInclude,
  productCompareInclude,
  buildProductFilters,
  parseCompareIds,
  getTemplateFields,
  getDefaultVariant,
  buildComparisonSpecs,
  ensureProductRelations,
  normalizeProductCreatePayload,
  ensureJsonObject,
};

