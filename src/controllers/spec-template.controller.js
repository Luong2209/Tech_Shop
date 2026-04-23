const prisma = require("../db/prisma");
const { badRequest, getPagination, notFound, slugify, toInt } = require("../utils/http");

function ensureSpecsJson(specsJson) {
  if (
    specsJson === undefined ||
    specsJson === null ||
    typeof specsJson !== "object" ||
    Array.isArray(specsJson)
  ) {
    throw badRequest("specsJson must be a JSON object");
  }
}

async function createSpecTemplate(req, res) {
  const { categoryId, name, slug, description, specsJson } = req.body;
  const parsedCategoryId = toInt(categoryId);

  if (!parsedCategoryId || !name) {
    throw badRequest("categoryId and name are required");
  }

  ensureSpecsJson(specsJson);

  const category = await prisma.category.findUnique({
    where: { id: parsedCategoryId },
  });

  if (!category) {
    throw badRequest("categoryId is invalid");
  }

  const template = await prisma.specTemplate.create({
    data: {
      categoryId: parsedCategoryId,
      name,
      slug: slug || slugify(name),
      description: description || null,
      specsJson,
    },
    include: {
      category: true,
    },
  });

  return res.status(201).success(template);
}

async function listSpecTemplates(req, res) {
  const { page, pageSize, skip, take } = getPagination(req.query);
  const where = {};
  const categoryId = toInt(req.query.categoryId);

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search } },
      { slug: { contains: req.query.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.specTemplate.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.specTemplate.count({ where }),
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

async function getSpecTemplate(req, res) {
  const id = toInt(req.params.id);

  if (!id) {
    throw badRequest("Invalid spec template id");
  }

  const template = await prisma.specTemplate.findUnique({
    where: { id },
    include: {
      category: true,
      products: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!template) {
    throw notFound("Spec template not found");
  }

  return res.success(template);
}

module.exports = {
  createSpecTemplate,
  listSpecTemplates,
  getSpecTemplate,
};

