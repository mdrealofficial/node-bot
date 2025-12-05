import prisma from '../config/database.js';
import { ApiResponse, NotFoundError, ForbiddenError } from '../utils/apiResponse.js';

/**
 * Get all products
 * GET /api/products
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      storeId, 
      categoryId, 
      search,
      isActive,
      minPrice,
      maxPrice 
    } = req.query;
    
    const skip = (page - 1) * limit;

    const where = {
      ...(storeId && { storeId }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            orderBy: { position: 'asc' },
          },
          variations: true,
          attributes: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json(
      ApiResponse.success('Products retrieved successfully', {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 * GET /api/products/:productId
 */
export const getProductById = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: true,
        images: {
          orderBy: { position: 'asc' },
        },
        variations: true,
        attributes: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json(ApiResponse.success('Product retrieved successfully', product));
  } catch (error) {
    next(error);
  }
};

/**
 * Create product
 * POST /api/products
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      storeId,
      categoryId,
      name,
      description,
      price,
      comparePrice,
      cost,
      sku,
      barcode,
      stock,
      trackStock,
      imageUrl,
      isActive,
      weight,
      weightUnit,
      images,
      variations,
      attributes,
    } = req.body;

    // Verify store ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    if (store.userId !== req.userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to add products to this store');
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        categoryId,
        name,
        description,
        price,
        comparePrice,
        cost,
        sku,
        barcode,
        stock: stock || 0,
        trackStock: trackStock !== false,
        imageUrl,
        isActive: isActive !== false,
        weight,
        weightUnit,
        images: images?.length
          ? {
              create: images.map((img, index) => ({
                url: img.url,
                altText: img.altText,
                position: img.position || index,
              })),
            }
          : undefined,
        variations: variations?.length
          ? {
              create: variations.map((variation) => ({
                name: variation.name,
                price: variation.price,
                stock: variation.stock,
                sku: variation.sku,
              })),
            }
          : undefined,
        attributes: attributes?.length
          ? {
              create: attributes.map((attr) => ({
                name: attr.name,
                value: attr.value,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        variations: true,
        attributes: true,
      },
    });

    res.status(201).json(ApiResponse.success('Product created successfully', product));
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 * PUT /api/products/:productId
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    // Get product with store
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Check ownership
    if (existingProduct.store.userId !== req.userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to update this product');
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.price && { price: updateData.price }),
        ...(updateData.comparePrice !== undefined && { comparePrice: updateData.comparePrice }),
        ...(updateData.cost !== undefined && { cost: updateData.cost }),
        ...(updateData.sku !== undefined && { sku: updateData.sku }),
        ...(updateData.barcode !== undefined && { barcode: updateData.barcode }),
        ...(updateData.stock !== undefined && { stock: updateData.stock }),
        ...(updateData.trackStock !== undefined && { trackStock: updateData.trackStock }),
        ...(updateData.imageUrl !== undefined && { imageUrl: updateData.imageUrl }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
        ...(updateData.weight !== undefined && { weight: updateData.weight }),
        ...(updateData.weightUnit !== undefined && { weightUnit: updateData.weightUnit }),
        ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId }),
      },
      include: {
        images: true,
        variations: true,
        attributes: true,
      },
    });

    res.json(ApiResponse.success('Product updated successfully', product));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product
 * DELETE /api/products/:productId
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Get product with store
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Check ownership
    if (existingProduct.store.userId !== req.userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to delete this product');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    res.json(ApiResponse.success('Product deleted successfully'));
  } catch (error) {
    next(error);
  }
};
