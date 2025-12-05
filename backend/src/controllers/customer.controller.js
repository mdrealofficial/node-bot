import prisma from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getAllCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, storeId, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(storeId && { storeId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);

    res.json(ApiResponse.success('Customers retrieved successfully', { customers, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }));
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(ApiResponse.success('Customer created successfully', customer));
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.customerId },
      data: req.body,
    });
    res.json(ApiResponse.success('Customer updated successfully', customer));
  } catch (error) {
    next(error);
  }
};
