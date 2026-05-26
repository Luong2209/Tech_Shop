import axios from 'axios';
import { BYPASS_AUTH } from '../config/authBypass';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !BYPASS_AUTH) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath.startsWith('/admin')) {
                window.location.assign('/login');
            }
        }

        return Promise.reject(error);
    }
);

const unwrapPagedItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    return payload?.items || payload?.Items || payload?.data || payload?.Data || [];
};

const normalizeLoginResponse = (response) => {
    const data = response.data || {};
    return {
        data: {
            token: data.Token || data.token,
            userId: data.UserId || data.userId,
            username: data.Username || data.username,
            name: data.Name || data.name,
            email: data.Email || data.email,
            dateOfBirth: data.DateOfBirth || data.dateOfBirth || data.User?.DateOfBirth || data.user?.dateOfBirth,
            role: data.Role || data.role,
            expiresIn: data.ExpiresIn || data.expiresIn,
        },
    };
};

const multipart = (files, fieldName) => {
    const form = new FormData();
    Array.from(files || []).forEach((file) => form.append(fieldName, file));
    return form;
};

const withItems = (request) => request.then((res) => ({ ...res, data: unwrapPagedItems(res.data) }));

export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }).then(normalizeLoginResponse),
    register: (data) => api.post('/auth/register', data).then((response) => {
        const payload = response.data || {};
        return {
            data: {
                message: payload.message || payload.Message,
                userId: payload.userId || payload.UserId,
            },
        };
    }),
};

export const userApi = {
    getAll: (params = {}) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    updateRole: (id, data) => api.put(`/users/${id}/role`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

export const roleApi = {
    getAll: () => api.get('/roles'),
    getById: (id) => api.get(`/roles/${id}`),
    create: (data) => api.post('/roles', data),
    update: (id, data) => api.put(`/roles/${id}`, data),
    delete: (id) => api.delete(`/roles/${id}`),
};

export const settingsApi = {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
};

export const couponApi = {
    getAll: (params = {}) => api.get('/coupons', { params }),
    getById: (id) => api.get(`/coupons/${id}`),
    create: (data) => api.post('/coupons', data),
    update: (id, data) => api.put(`/coupons/${id}`, data),
    delete: (id) => api.delete(`/coupons/${id}`),
    toggle: (id) => api.put(`/coupons/${id}/toggle`),
    getUsers: (id) => api.get(`/coupons/${id}/users`),
    getStats: () => api.get('/coupons/stats'),
    getPublic: (params = {}) => api.get('/coupons/public', { params }),
    getMy: (params = {}) => api.get('/coupons/my', { params }),
    claim: (id) => api.post(`/coupons/${id}/claim`),
    validate: (data) => api.post('/coupons/validate', data),
    applyPreview: (data) => api.post('/coupons/apply-preview', data),
    spin: () => api.post('/coupons/spin'),
};

export const uploadApi = {
    uploadProductImages: (files) => api.post('/uploads/product-images', multipart(files, 'files'), {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    uploadTicketAttachments: (files) => api.post('/uploads/ticket-attachments', multipart(files, 'files'), {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const productApi = {
    getAllRemote: (params = {}) => api.get('/products', { params }),
    getAll: (params = {}) => api.get('/products', { params }),
    search: (params = {}) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    getLocalCatalog: () => [],
};

export const categoryApi = {
    getAll: () => api.get('/categories'),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

export const orderApi = {
    create: (data) => api.post('/orders', data),
    getMyOrders: () => api.get('/orders/my'),
    getAll: (params = {}) => withItems(api.get('/orders/all', { params })),
    getById: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
    cancel: (id, data) => api.put(`/orders/${id}/cancel`, data),
    reviewCancellation: (id, data) => api.put(`/orders/${id}/cancellation-review`, data),
};

export const specApi = {
    getDefinitions: (categoryId) => api.get('/specs/definitions', { params: { categoryId } }),
    createDefinition: (data) => api.post('/specs/definitions', data),
    updateDefinition: (id, data) => api.put(`/specs/definitions/${id}`, data),
    deleteDefinition: (id) => api.delete(`/specs/definitions/${id}`),
    createOption: (data) => api.post('/specs/options', data),
    updateOption: (id, data) => api.put(`/specs/options/${id}`, data),
    deleteOption: (id) => api.delete(`/specs/options/${id}`),
    getProductSpecs: (productId) => api.get(`/specs/products/${productId}`),
    updateProductSpecs: (productId, values = []) => api.put(`/specs/products/${productId}`, values),
};

export const warrantyApi = {
    lookup: (serialOrImei) => api.get('/warranty/lookup', { params: { serialOrImei } }),
    getMy: () => api.get('/warranty/my'),
};

export const notificationApi = {
    getMy: (params = {}) => api.get('/notifications/my', { params }),
    getUnreadCount: () => api.get('/notifications/my/unread-count'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/my/read-all'),
};

export const ticketApi = {
    getMy: () => api.get('/tickets/my'),
    getAll: (params = {}) => withItems(api.get('/tickets/all', { params })),
    create: (data) => api.post('/tickets', data),
    addUpdate: (id, data) => api.post(`/tickets/${id}/updates`, data),
};

export const repairApi = {
    getAll: (params = {}) => withItems(api.get('/repairs', { params })),
    intake: (data) => api.post('/repairs/intake', data),
    update: (id, data) => {
        if (data?.statusAfter) {
            return api.put(`/repairs/${id}/status`, {
                status: data.statusAfter,
                note: data.message || data.note || null,
            });
        }
        return api.put(`/repairs/${id}`, data);
    },
};

export const financeApi = {
    getPartners: () => api.get('/finance/partners'),
};

export const inventoryApi = {
    createReceipt: (data) => api.post('/inventory/receipts', data),
    getSuppliers: (params = {}) => withItems(api.get('/suppliers', { params })),
    createSupplier: (data) => api.post('/suppliers', data),
    updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
    deleteSupplier: (id) => api.delete(`/suppliers/${id}`),
    getStockItems: (params = {}) => api.get('/inventory/stock-items', { params }),
    getAgedStock: (daysThreshold = 90) => api.get('/inventory/aged-stock', { params: { minDays: daysThreshold } }),
    lookupStockItem: (serial) => api.get('/inventory/stock-items/lookup', { params: { serialOrImei: serial } }),
    returnItem: (data) => api.post('/inventory/returns', data),
    reviewReturn: (id, data) => api.put(`/inventory/returns/${id}/review`, {
        approved: true,
        reviewNote: data?.reviewNote || 'Admin duyet tra hang',
    }),
    restockReturn: (id, data) => api.put(`/inventory/returns/${id}/restock`, {
        restockStatus: data?.statusAfter || 'InStock',
        note: data?.note || null,
    }),
};

export const supplierApi = {
    getAll: (params = {}) => withItems(api.get('/suppliers', { params })),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    toggleActive: (id) => api.put(`/suppliers/${id}/toggle-active`),
};

export const categorySupplierApi = {
    getAll: () => api.get('/category-suppliers'),
    getByCategory: (categoryId) => api.get(`/category-suppliers/category/${categoryId}`),
};

export const recommendationApi = {
    getCrossSell: (productId, maxItems = 6) => api.get('/recommendations/cross-sell', { params: { productId, maxItems } }),
    getAutoCrossSell: (productId, maxItems = 6) => api.get('/recommendations/auto-cross-sell', { params: { productId, maxItems } }),
    setCrossSell: (productId, productIds = []) => api.put('/recommendations/cross-sell', { productIds }, { params: { productId } }),
};

export default api;
