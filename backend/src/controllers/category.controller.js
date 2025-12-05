import prisma from '../config/database.js';
import { ApiResponse, NotFoundError } from '../utils/apiResponse.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const categories = await prisma.category.findMany({
      where: { ...(storeId && { storeId }) },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    res.json(ApiResponse.success('Categories retrieved successfully', categories));
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.categoryId },
      include: { products: { where: { isActive: true } } },
    });

    if (!category) throw new NotFoundError('Category not found');
    res.json(ApiResponse.success('Category retrieved successfully', category));
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { storeId, name, description, imageUrl, displayOrder } = req.body;

    const category = await prisma.category.create({
      data: { storeId, name, description, imageUrl, displayOrder },
    });

    res.status(201).json(ApiResponse.success('Category created successfully', category));
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.categoryId },
      data: req.body,
    });

    res.json(ApiResponse.success('Category updated successfully', category));
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.categoryId } });
    res.json(ApiResponse.success('Category deleted successfully'));
  } catch (error) {
    next(error);
  }
};
