# Frontend Integration Guide

This guide explains how to update your React frontend to use the new Node.js backend instead of Supabase.

## 📦 Install Dependencies

```bash
npm install axios
# or
yarn add axios
```

## 🔧 Configuration

### 1. Create API Client

Create `src/lib/apiClient.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Environment Variables

Add to your `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

For production:
```env
VITE_API_URL=https://your-replit-backend.repl.co/api
```

## 🔄 Update AuthContext

Replace `src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: 'ADMIN' | 'USER' | 'CUSTOMER';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const { data } = await apiClient.get('/auth/me');
      setUser(data.data);
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      setUser(data.data.user);
      
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Login failed',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      const { data } = await apiClient.post('/auth/register', {
        email,
        password,
        fullName,
      });
      
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      setUser(data.data.user);
      
      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Registration failed',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## 📝 API Service Examples

### Products Service

Create `src/services/productService.js`:

```javascript
import apiClient from '@/lib/apiClient';

export const productService = {
  // Get all products
  getAll: async (params = {}) => {
    const { data } = await apiClient.get('/products', { params });
    return data.data;
  },

  // Get product by ID
  getById: async (productId) => {
    const { data } = await apiClient.get(`/products/${productId}`);
    return data.data;
  },

  // Create product
  create: async (productData) => {
    const { data } = await apiClient.post('/products', productData);
    return data.data;
  },

  // Update product
  update: async (productId, productData) => {
    const { data } = await apiClient.put(`/products/${productId}`, productData);
    return data.data;
  },

  // Delete product
  delete: async (productId) => {
    const { data } = await apiClient.delete(`/products/${productId}`);
    return data.data;
  },
};
```

### Orders Service

```javascript
import apiClient from '@/lib/apiClient';

export const orderService = {
  getAll: async (params = {}) => {
    const { data } = await apiClient.get('/orders', { params });
    return data.data;
  },

  getById: async (orderId) => {
    const { data } = await apiClient.get(`/orders/${orderId}`);
    return data.data;
  },

  create: async (orderData) => {
    const { data } = await apiClient.post('/orders', orderData);
    return data.data;
  },

  update: async (orderId, orderData) => {
    const { data } = await apiClient.put(`/orders/${orderId}`, orderData);
    return data.data;
  },
};
```

### Stores Service

```javascript
import apiClient from '@/lib/apiClient';

export const storeService = {
  getAll: async (params = {}) => {
    const { data } = await apiClient.get('/stores', { params });
    return data.data;
  },

  getBySlug: async (slug) => {
    const { data } = await apiClient.get(`/stores/slug/${slug}`);
    return data.data;
  },

  create: async (storeData) => {
    const { data } = await apiClient.post('/stores', storeData);
    return data.data;
  },

  update: async (storeId, storeData) => {
    const { data } = await apiClient.put(`/stores/${storeId}`, storeData);
    return data.data;
  },
};
```

## 🔄 Migration Examples

### Before (Supabase):
```typescript
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('store_id', storeId);
```

### After (REST API):
```typescript
const { products } = await productService.getAll({ storeId });
```

### Before (Supabase Auth):
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### After (Custom Auth):
```typescript
await login(email, password);
```

## 🎣 Using with React Query (Recommended)

```bash
npm install @tanstack/react-query
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';

// Fetch products
export function useProducts(params = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.getAll(params),
  });
}

// Create product
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Usage in component
function ProductList() {
  const { data, isLoading } = useProducts({ storeId: '123' });
  const createProduct = useCreateProduct();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data.products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

## ✅ Migration Checklist

- [ ] Install axios
- [ ] Create API client with interceptors
- [ ] Update .env with API URL
- [ ] Replace AuthContext with custom auth
- [ ] Create service files for each resource
- [ ] Update all Supabase queries to REST API calls
- [ ] Test authentication flow
- [ ] Test CRUD operations
- [ ] Update error handling
- [ ] Deploy backend to Replit
- [ ] Update frontend env for production

## 🚨 Common Issues

### CORS Errors
Make sure backend `CORS_ORIGIN` includes your frontend URL.

### 401 Unauthorized
Check that access token is being sent in Authorization header.

### Token Refresh Loop
Ensure refresh token endpoint doesn't require authentication.

## 📚 Additional Resources

- [Axios Documentation](https://axios-http.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
