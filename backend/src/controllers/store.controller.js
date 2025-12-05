import prisma from '../config/database.js';
import { ApiResponse, NotFoundError, ForbiddenError } from '../utils/apiResponse.js';

export const getAllStores = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, userId, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(userId && { userId }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.store.count({ where }),
    ]);

    res.json(ApiResponse.success('Stores retrieved successfully', { stores, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }));
  } catch (error) {
    next(error);
  }
};

export const getStoreById = async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.params.storeId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    if (!store) throw new NotFoundError('Store not found');
    res.json(ApiResponse.success('Store retrieved successfully', store));
  } catch (error) {
    next(error);
  }
};

export const getStoreBySlug = async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: req.params.slug },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    if (!store) throw new NotFoundError('Store not found');
    res.json(ApiResponse.success('Store retrieved successfully', store));
  } catch (error) {
    next(error);
  }
};

export const createStore = async (req, res, next) => {
  try {
    const { name, slug, description, logo, bannerImage, currency, shippingInside, shippingOutside, minOrderAmount, freeShippingAbove } = req.body;

    const store = await prisma.store.create({
      data: { userId: req.userId, name, slug, description, logo, bannerImage, currency, shippingInside, shippingOutside, minOrderAmount, freeShippingAbove },
    });

    res.status(201).json(ApiResponse.success('Store created successfully', store));
  } catch (error) {
    next(error);
  }
};

export const updateStore = async (req, res, next) => {
  try {
    const existing = await prisma.store.findUnique({ where: { id: req.params.storeId } });
    if (!existing) throw new NotFoundError('Store not found');
    if (existing.userId !== req.userId && req.user.role !== 'ADMIN') throw new ForbiddenError('Permission denied');

    const store = await prisma.store.update({
      where: { id: req.params.storeId },
      data: req.body,
    });

    res.json(ApiResponse.success('Store updated successfully', store));
  } catch (error) {
    next(error);
  }
};

export const deleteStore = async (req, res, next) => {
  try {
    const existing = await prisma.store.findUnique({ where: { id: req.params.storeId } });
    if (!existing) throw new NotFoundError('Store not found');
    if (existing.userId !== req.userId && req.user.role !== 'ADMIN') throw new ForbiddenError('Permission denied');

    await prisma.store.delete({ where: { id: req.params.storeId } });
    res.json(ApiResponse.success('Store deleted successfully'));
  } catch (error) {
    next(error);
  }
};
