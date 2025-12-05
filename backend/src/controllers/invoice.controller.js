import prisma from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getAllInvoices = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const invoices = await prisma.chatInvoice.findMany({
      where: { ...(storeId && { storeId }) },
      orderBy: { createdAt: 'desc' },
    });

    res.json(ApiResponse.success('Invoices retrieved successfully', invoices));
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await prisma.chatInvoice.create({ data: req.body });
    res.status(201).json(ApiResponse.success('Invoice created successfully', invoice));
  } catch (error) {
    next(error);
  }
};
