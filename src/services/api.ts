import apiClient from '@/lib/apiClient';

// ============================================
// AUTH SERVICE
// ============================================
export const authService = {
  register: async (email: string, password: string, fullName: string) => {
    const { data } = await apiClient.post('/auth/register', { email, password, fullName });
    return data;
  },

  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data;
  },

  logout: async (refreshToken: string) => {
    const { data } = await apiClient.post('/auth/logout', { refreshToken });
    return data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await apiClient.put('/auth/password', { currentPassword, newPassword });
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },
};

// ============================================
// PRODUCT SERVICE
// ============================================
export const productService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    storeId?: string;
    categoryId?: string;
    search?: string;
    isActive?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },

  getById: async (productId: string) => {
    const { data } = await apiClient.get(`/products/${productId}`);
    return data;
  },

  create: async (productData: any) => {
    const { data } = await apiClient.post('/products', productData);
    return data;
  },

  update: async (productId: string, productData: any) => {
    const { data } = await apiClient.put(`/products/${productId}`, productData);
    return data;
  },

  delete: async (productId: string) => {
    const { data } = await apiClient.delete(`/products/${productId}`);
    return data;
  },
};

// ============================================
// STORE SERVICE
// ============================================
export const storeService = {
  getAll: async (params?: { page?: number; limit?: number; userId?: string; search?: string }) => {
    const { data } = await apiClient.get('/stores', { params });
    return data;
  },

  getById: async (storeId: string) => {
    const { data } = await apiClient.get(`/stores/${storeId}`);
    return data;
  },

  getBySlug: async (slug: string) => {
    const { data } = await apiClient.get(`/stores/slug/${slug}`);
    return data;
  },

  create: async (storeData: any) => {
    const { data } = await apiClient.post('/stores', storeData);
    return data;
  },

  update: async (storeId: string, storeData: any) => {
    const { data } = await apiClient.put(`/stores/${storeId}`, storeData);
    return data;
  },

  delete: async (storeId: string) => {
    const { data } = await apiClient.delete(`/stores/${storeId}`);
    return data;
  },
};

// ============================================
// CATEGORY SERVICE
// ============================================
export const categoryService = {
  getAll: async (params?: { storeId?: string }) => {
    const { data } = await apiClient.get('/categories', { params });
    return data;
  },

  getById: async (categoryId: string) => {
    const { data } = await apiClient.get(`/categories/${categoryId}`);
    return data;
  },

  create: async (categoryData: any) => {
    const { data } = await apiClient.post('/categories', categoryData);
    return data;
  },

  update: async (categoryId: string, categoryData: any) => {
    const { data } = await apiClient.put(`/categories/${categoryId}`, categoryData);
    return data;
  },

  delete: async (categoryId: string) => {
    const { data } = await apiClient.delete(`/categories/${categoryId}`);
    return data;
  },
};

// ============================================
// ORDER SERVICE
// ============================================
export const orderService = {
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    storeId?: string; 
    status?: string;
    customerId?: string;
  }) => {
    const { data } = await apiClient.get('/orders', { params });
    return data;
  },

  getById: async (orderId: string) => {
    const { data } = await apiClient.get(`/orders/${orderId}`);
    return data;
  },

  create: async (orderData: any) => {
    const { data } = await apiClient.post('/orders', orderData);
    return data;
  },

  update: async (orderId: string, orderData: any) => {
    const { data } = await apiClient.put(`/orders/${orderId}`, orderData);
    return data;
  },

  delete: async (orderId: string) => {
    const { data } = await apiClient.delete(`/orders/${orderId}`);
    return data;
  },
};

// ============================================
// CUSTOMER SERVICE
// ============================================
export const customerService = {
  getAll: async (params?: { page?: number; limit?: number; storeId?: string; search?: string }) => {
    const { data } = await apiClient.get('/customers', { params });
    return data;
  },

  create: async (customerData: any) => {
    const { data } = await apiClient.post('/customers', customerData);
    return data;
  },

  update: async (customerId: string, customerData: any) => {
    const { data } = await apiClient.put(`/customers/${customerId}`, customerData);
    return data;
  },
};

// ============================================
// USER SERVICE
// ============================================
export const userService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const { data } = await apiClient.get('/users', { params });
    return data;
  },

  getProfile: async (userId: string) => {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data;
  },

  updateProfile: async (userId: string, profileData: any) => {
    const { data } = await apiClient.put(`/users/${userId}`, profileData);
    return data;
  },

  updateSettings: async (userId: string, settings: any) => {
    const { data } = await apiClient.put(`/users/${userId}/settings`, settings);
    return data;
  },
};

// ============================================
// INVOICE SERVICE
// ============================================
export const invoiceService = {
  getAll: async (params?: { storeId?: string }) => {
    const { data } = await apiClient.get('/invoices', { params });
    return data;
  },

  create: async (invoiceData: any) => {
    const { data } = await apiClient.post('/invoices', invoiceData);
    return data;
  },
};

// ============================================
// FORM SERVICE
// ============================================
export const formService = {
  getAll: async () => {
    const { data } = await apiClient.get('/forms');
    return data;
  },

  create: async (formData: any) => {
    const { data } = await apiClient.post('/forms', formData);
    return data;
  },

  submit: async (formId: string, submissionData: any) => {
    const { data } = await apiClient.post(`/forms/${formId}/submit`, submissionData);
    return data;
  },
};

// ============================================
// CONFIG SERVICE
// ============================================
export const configService = {
  get: async () => {
    const { data } = await apiClient.get('/config');
    return data;
  },

  update: async (configData: any) => {
    const { data } = await apiClient.put('/config', configData);
    return data;
  },
};
