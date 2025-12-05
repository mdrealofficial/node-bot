import prisma from '../config/database.js';
import { ApiResponse, NotFoundError } from '../utils/apiResponse.js';

export const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, storeId, status, customerId } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(storeId && { storeId }),
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(req.user.role !== 'ADMIN' && { store: { userId: req.userId } }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json(ApiResponse.success('Orders retrieved successfully', { orders, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } }));
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        customer: true,
        items: { include: { product: true } },
        store: { select: { id: true, name: true, userId: true } },
        transactions: true,
      },
    });

    if (!order) throw new NotFoundError('Order not found');
    res.json(ApiResponse.success('Order retrieved successfully', order));
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const { storeId, customerId, customerName, customerPhone, customerEmail, shippingAddress, items, subtotal, shippingCharge, discount, tax, total, paymentMethod, notes } = req.body;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        storeId,
        userId: req.userId,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        subtotal,
        shippingCharge: shippingCharge || 0,
        discount: discount || 0,
        tax: tax || 0,
        total,
        paymentMethod,
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price,
            attributes: item.attributes,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(ApiResponse.success('Order created successfully', order));
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: req.body,
    });

    res.json(ApiResponse.success('Order updated successfully', order));
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    await prisma.order.delete({ where: { id: req.params.orderId } });
    res.json(ApiResponse.success('Order deleted successfully'));
  } catch (error) {
    next(error);
  }
};
