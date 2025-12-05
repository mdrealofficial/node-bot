import prisma from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getAllForms = async (req, res, next) => {
  try {
    const forms = await prisma.form.findMany({
      where: { userId: req.userId },
      include: { fields: { orderBy: { position: 'asc' } } },
    });
    res.json(ApiResponse.success('Forms retrieved successfully', forms));
  } catch (error) {
    next(error);
  }
};

export const createForm = async (req, res, next) => {
  try {
    const { title, description, settings, fields } = req.body;
    const form = await prisma.form.create({
      data: {
        userId: req.userId,
        title,
        description,
        settings,
        fields: { create: fields || [] },
      },
      include: { fields: true },
    });
    res.status(201).json(ApiResponse.success('Form created successfully', form));
  } catch (error) {
    next(error);
  }
};

export const submitForm = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { data, ipAddress, userAgent } = req.body;

    const submission = await prisma.formSubmission.create({
      data: { formId, data, ipAddress, userAgent },
    });

    res.status(201).json(ApiResponse.success('Form submitted successfully', submission));
  } catch (error) {
    next(error);
  }
};
