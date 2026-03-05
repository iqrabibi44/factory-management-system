import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
API.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('fms_user') || 'null');
    if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
});

// Handle 401 globally
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('fms_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const getUsers = () => API.get('/auth/users');

// Products
export const getProducts = (params) => API.get('/products', { params });
export const getProduct = (id) => API.get(`/products/${id}`);
export const createProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const getProductModels = (id) => API.get(`/products/${id}/models`);

// Models
export const getAllModels = () => API.get('/models');
export const getModel = (id) => API.get(`/models/${id}`);
export const createModel = (data) => API.post('/models', data);
export const updateModel = (id, data) => API.put(`/models/${id}`, data);
export const deleteModel = (id) => API.delete(`/models/${id}`);

// Inventory
export const getRawMaterials = (params) => API.get('/inventory/raw-materials', { params });
export const getRawMaterial = (id) => API.get(`/inventory/raw-materials/${id}`);
export const createRawMaterial = (data) => API.post('/inventory/raw-materials', data);
export const updateRawMaterial = (id, data) => API.put(`/inventory/raw-materials/${id}`, data);
export const deleteRawMaterial = (id) => API.delete(`/inventory/raw-materials/${id}`);
export const getFinishedGoods = () => API.get('/inventory/finished-goods');

// Purchases
export const getPurchases = (params) => API.get('/purchases', { params });
export const getPurchase = (id) => API.get(`/purchases/${id}`);
export const createPurchase = (data) => API.post('/purchases', data);
export const deletePurchase = (id) => API.delete(`/purchases/${id}`);

// Production
export const getProductions = (params) => API.get('/production', { params });
export const createProduction = (data) => API.post('/production', data);
export const checkMaterialAvailability = (data) => API.post('/production/check', data);

// Sales
export const getSales = (params) => API.get('/sales', { params });
export const getSale = (id) => API.get(`/sales/${id}`);
export const createSale = (data) => API.post('/sales', data);

// Reports
export const getDashboard = () => API.get('/reports/dashboard');
export const getSalesReport = (params) => API.get('/reports/sales', { params });
export const getProductionReport = (params) => API.get('/reports/production', { params });
export const getFullReport = (params) => API.get('/reports/full', { params });

export default API;
