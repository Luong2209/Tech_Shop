import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi, userApi, categoryApi, orderApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/store';
import { cn } from '../utils/cn';

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const isCompletedOrder = (o) => ['Completed', 'Shipped', 'Confirmed', 'Processing'].includes(o.status);

const statusLabels = {
    Pending: 'Chờ xác nhận', Confirmed: 'Đã xác nhận', Processing: 'Đang xử lý',
    Shipped: 'Đang giao', Completed: 'Hoàn tất', Cancelled: 'Đã hủy',
    'Cancel Requested': 'Yêu cầu hủy', 'Cancelled & Refunded': 'Đã hủy & hoàn tiền',
};
const statusLabel = (s) => statusLabels[s] || s || 'Chờ xác nhận';

const statusStyles = {
    Completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    Cancelled: 'border-red-500/40 bg-red-500/10 text-red-300',
    Shipped: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    Processing: 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
    Confirmed: 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]',
    Pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};
const getStatusStyle = (s = '') => {
    if (s.includes('Cancel')) return statusStyles.Cancelled;
    return statusStyles[s] || statusStyles.Pending;
};

const StatCard = ({ label, value, hint, icon, tone = 'accent', to }) => {
    const tones = {
        accent: 'from-[var(--color-accent)]/15 to-transparent text-[var(--color-accent)]',
        primary: 'from-[var(--color-primary)]/15 to-transparent text-[var(--color-primary)]',
        success: 'from-emerald-500/15 to-transparent text-emerald-400',
        warning: 'from-amber-500/15 to-transparent text-amber-400',
        danger: 'from-red-500/15 to-transparent text-red-400',
        gold: 'from-[var(--color-gold)]/15 to-transparent text-[var(--color-gold)]',
    };
    const content = (
        <div className="group rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:border-[var(--color-border-strong)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="ts-eyebrow text-[10px]">{label}</p>
                    <p className="ts-display mt-2 text-2xl font-bold text-[var(--color-fg)]">{value}</p>
                    {hint && <p className="mt-2 text-[11px] text-[var(--color-fg-dim)]">{hint}</p>}
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br", tones[tone])}>
                    <i className={icon}></i>
                </div>
            </div>
        </div>
    );
    return to ? <Link to={to} className="block no-underline">{content}</Link> : content;
};

const Dashboard = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);
    const [usersCount, setUsersCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user, isAdmin } = useAuth();
    const canViewOrders = ['Admin', 'Warehouse'].includes(user?.role);

    useEffect(() => { loadDashboard(); }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [productsRes, categoriesRes, ordersRes] = await Promise.all([
                productApi.getAll({ page: 1, pageSize: 200 }),
                categoryApi.getAll(),
                canViewOrders ? orderApi.getAll() : Promise.resolve({ data: [] }),
            ]);
            setProducts(productsRes.data?.items || productsRes.data?.data || productsRes.data || []);
            setCategories(categoriesRes.data || []);
            setOrders(ordersRes.data || []);

            if (isAdmin()) {
                try {
                    const usersRes = await userApi.getAll({ page: 1, pageSize: 1 });
                    setUsersCount(usersRes.data.totalCount || 0);
                } catch { setUsersCount(0); }
            }
        } catch (e) {
            console.error('Failed to load dashboard:', e);
        } finally { setLoading(false); }
    };

    const metrics = useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);
        const month = startOfMonth(now);
        const active = orders.filter(isCompletedOrder);
        return {
            revenueToday: active.filter((o) => new Date(o.orderDate) >= today).reduce((s, o) => s + Number(o.totalAmount || 0), 0),
            revenueMonth: active.filter((o) => new Date(o.orderDate) >= month).reduce((s, o) => s + Number(o.totalAmount || 0), 0),
            pendingOrders: orders.filter((o) => ['Pending', 'Confirmed', 'Processing', 'Cancel Requested'].includes(o.status)),
            lowStock: products.filter((p) => Number(p.stock || 0) <= 10),
        };
    }, [orders, products]);

    const statusCounts = useMemo(() => orders.reduce((acc, o) => {
        const s = o.status || 'Pending';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {}), [orders]);

    const topProducts = useMemo(() => {
        const sales = {};
        orders.forEach((o) => {
            (o.details || o.orderDetails || []).forEach((item) => {
                sales[item.productId] = (sales[item.productId] || 0) + Number(item.quantity || 0);
            });
        });
        return products
            .map((p) => ({ ...p, sold: sales[p.id] || 0 }))
            .sort((a, b) => b.sold - a.sold || Number(b.price || 0) - Number(a.price || 0))
            .slice(0, 5);
    }, [orders, products]);

    const recentOrders = useMemo(() => orders.slice().sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)).slice(0, 6), [orders]);

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            </div>
        );
    }

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="ts-eyebrow text-[var(--color-accent)]">Dashboard</p>
                    <h2 className="ts-display mt-2 text-3xl text-[var(--color-fg)]">Tổng quan bán hàng</h2>
                </div>
                <Link to="/admin/orders" className="ts-btn ts-btn-primary text-xs">
                    <i className="fas fa-clipboard-list"></i>Xem đơn hàng
                </Link>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Doanh thu hôm nay" value={formatCurrency(metrics.revenueToday)} hint="Đơn đã xác nhận, xử lý, hoàn tất" icon="fas fa-coins" tone="success" />
                <StatCard label="Doanh thu tháng" value={formatCurrency(metrics.revenueMonth)} hint={`${orders.length} đơn hàng`} icon="fas fa-chart-line" tone="accent" />
                <StatCard label="Đơn cần xử lý" value={metrics.pendingOrders.length} hint="Đang chờ, xử lý" icon="fas fa-bell" tone="warning" to="/admin/orders" />
                <StatCard label="Sản phẩm sắp hết" value={metrics.lowStock.length} hint="≤ 10 sản phẩm" icon="fas fa-triangle-exclamation" tone="danger" to="/admin/products" />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <StatCard label="Sản phẩm" value={products.length} hint={`${categories.length} danh mục`} icon="fas fa-box" tone="primary" to="/admin/products" />
                <StatCard label="Danh mục" value={categories.length} hint="Nhóm sản phẩm" icon="fas fa-tags" tone="accent" to="/admin/categories" />
                {isAdmin() && <StatCard label="Tài khoản" value={usersCount} hint="Khách & nhân viên" icon="fas fa-users" tone="gold" to="/admin/users" />}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                <section className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div className="border-b border-[var(--color-border)] px-5 py-4">
                        <h3 className="ts-display text-lg">Đơn hàng gần đây</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--color-surface-2)]">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Đơn</th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Ngày</th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Giá trị</th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {recentOrders.map((o) => (
                                <tr key={o.id} className="hover:bg-[var(--color-surface-2)]/60">
                                    <td className="ts-mono px-5 py-3 font-semibold text-[var(--color-fg)]">#{o.id}</td>
                                    <td className="px-5 py-3 text-[var(--color-fg-dim)]">{new Date(o.orderDate).toLocaleString('vi-VN')}</td>
                                    <td className="ts-mono px-5 py-3 font-semibold text-[var(--color-accent)]">{formatCurrency(o.totalAmount)}</td>
                                    <td className="px-5 py-3">
                                        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", getStatusStyle(o.status))}>
                                            {statusLabel(o.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <div className="space-y-6">
                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                        <h3 className="ts-display mb-4 text-lg">Phân bố trạng thái</h3>
                        <div className="space-y-3">
                            {Object.entries(statusCounts).map(([s, count]) => (
                                <div key={s}>
                                    <div className="mb-1 flex justify-between text-xs">
                                        <span className="text-[var(--color-fg-muted)]">{statusLabel(s)}</span>
                                        <span className="ts-mono text-[var(--color-fg)]">{count}</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]"
                                            style={{ width: `${Math.max(6, (count / Math.max(orders.length, 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                        <h3 className="ts-display mb-4 text-lg">Tồn kho cảnh báo</h3>
                        <div className="space-y-2">
                            {metrics.lowStock.slice(0, 5).map((p) => (
                                <div key={p.id} className="flex items-center justify-between rounded-sm bg-[var(--color-surface-2)] px-3 py-2 text-sm">
                                    <span className="truncate text-[var(--color-fg)]">{p.name}</span>
                                    <span className="ts-mono rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-400">{p.stock}</span>
                                </div>
                            ))}
                            {!metrics.lowStock.length && <p className="text-xs text-[var(--color-fg-dim)]">Không có sản phẩm sắp hết.</p>}
                        </div>
                    </section>

                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                        <h3 className="ts-display mb-4 text-lg">Sản phẩm bán chạy</h3>
                        <div className="space-y-3">
                            {topProducts.map((p) => (
                                <div key={p.id} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[var(--color-fg)]">{p.name}</p>
                                        <p className="ts-mono mt-0.5 text-xs text-[var(--color-fg-dim)]">{formatCurrency(p.price)}</p>
                                    </div>
                                    <span className="ts-mono text-sm font-bold text-[var(--color-accent)]">{p.sold} bán</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
