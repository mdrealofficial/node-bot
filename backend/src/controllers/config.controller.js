import prisma from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getConfig = async (req, res, next) => {
  try {
    let config = await prisma.adminConfig.findFirst();
    
    if (!config) {
      config = await prisma.adminConfig.create({
        data: {
          appName: 'Lovable',
          defaultCurrency: 'BDT',
        },
      });
    }

    res.json(ApiResponse.success('Config retrieved successfully', config));
  } catch (error) {
    next(error);
  }
};

export const updateConfig = async (req, res, next) => {
  try {
    let config = await prisma.adminConfig.findFirst();

    if (!config) {
      config = await prisma.adminConfig.create({ data: req.body });
    } else {
      config = await prisma.adminConfig.update({
        where: { id: config.id },
        data: req.body,
      });
    }

    res.json(ApiResponse.success('Config updated successfully', config));
  } catch (error) {
    next(error);
  }
};
