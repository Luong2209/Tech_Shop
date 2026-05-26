import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderApi } from '../services/api';
import { cn } from '../utils/cn';

const LAST_SEEN_ORDER_KEY = 'admin_last_seen_order_at';

const navGroups = [
    {
        title: 'Tổng quan',
        items: [
            { to: '/admin', label: 'Dashboard', icon: 'fas fa-chart-line' },
        ],
    },
    {
        title: 'Cửa hàng',
        items: [
            { to: '/admin/orders', label: 'Đơn hàng', icon: 'fas fa-shopping-cart' },
            { to: '/admin/products', label: 'Sản phẩm', icon: 'fas fa-box' },
            { to: '/admin/categories', label: 'Danh mục', icon: 'fas fa-tags' },
            { to: '/admin/suppliers', label: 'Nhà cung cấp', icon: 'fas fa-truck' },
            { to: '/admin/coupons', label: 'Phiếu giảm giá', icon: 'fas fa-ticket-alt' },
        ],
    },
    {
        title: 'Kho hàng',
        items: [
            { to: '/admin/inventory/receipts', label: 'Nhập/xuất kho', icon: 'fas fa-warehouse' },
            { to: '/admin/inventory/returns', label: 'Trả hàng', icon: 'fas fa-rotate-left' },
        ],
    },
    {
        title: 'Hỗ trợ',
        items: [
            { to: '/admin/warranty', label: 'Bảo hành', icon: 'fas fa-shield-alt' },
            { to: '/admin/repairs', label: 'Sửa chữa', icon: 'fas fa-screwdriver-wrench' },
            { to: '/admin/tickets', label: 'Ticket hỗ trợ', icon: 'fas fa-headset' },
        ],
    },
];

const MainLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [hasNewOrderNotification, setHasNewOrderNotification] = useState(false);
    const [latestOrderTime, setLatestOrderTime] = useState(0);
    const adminAccess = isAdmin();
    const role = user?.role || '';
    const canManageStock = ['Admin', 'Warehouse'].includes(role);
    const canManageReturns = ['Admin', 'Technical'].includes(role);
    const canViewOrders = ['Admin', 'Warehouse'].includes(role);
    const shouldLoadOrderNotification = adminAccess &&
        (location.pathname === '/admin' || location.pathname.startsWith('/admin/orders'));

    const groups = adminAccess
        ? [
            ...navGroups,
            {
                title: 'Hệ thống',
                items: [
                    { to: '/admin/users', label: 'Người dùng', icon: 'fas fa-users' },
                    { to: '/admin/roles', label: 'Vai trò / Phân quyền', icon: 'fas fa-user-shield' },
                    { to: '/admin/settings', label: 'Cấu hình', icon: 'fas fa-cog' },
                ],
            },
        ]
        : navGroups;

    const visibleGroups = groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (item.to === '/admin/inventory/receipts') return canManageStock;
                if (item.to === '/admin/inventory/returns') return canManageReturns;
                if (item.to === '/admin/inventory/serials') return canManageStock || canManageReturns;
                if (item.to === '/admin/suppliers') return canManageStock;
                if (item.to === '/admin/orders') return canViewOrders;
                if (item.to === '/admin/categories') return adminAccess;
                if (item.to === '/admin/coupons') return adminAccess;
                return true;
            }),
        }))
        .filter((group) => group.items.length > 0);

    const isActive = (path) => {
        if (path === '/admin' || path === '/admin/inventory') return location.pathname === path;
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const userName = user?.name || user?.username || 'Administrator';
    const initials = String(userName)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'AD';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNotificationClick = () => {
        if (latestOrderTime) {
            localStorage.setItem(LAST_SEEN_ORDER_KEY, String(latestOrderTime));
            setHasNewOrderNotification(false);
        }
        navigate('/admin/orders');
    };

    useEffect(() => {
        let cancelled = false;

        const loadOrderNotification = async () => {
            if (!shouldLoadOrderNotification) return;

            try {
                const response = await orderApi.getAll({ page: 1, pageSize: 1, sortBy: 'newest' });
                const latestTime = (response.data || []).reduce((latest, order) => {
                    const time = new Date(order.orderDate || order.createdAt || order.updatedAt || 0).getTime();
                    return Number.isFinite(time) ? Math.max(latest, time) : latest;
                }, 0);

                if (cancelled || latestTime === 0) return;

                const lastSeenTime = Number(localStorage.getItem(LAST_SEEN_ORDER_KEY) || 0);
                setLatestOrderTime(latestTime);

                if (!lastSeenTime) {
                    localStorage.setItem(LAST_SEEN_ORDER_KEY, String(latestTime));
                    setHasNewOrderNotification(false);
                    return;
                }

                setHasNewOrderNotification(latestTime > lastSeenTime);
            } catch (error) {
                console.error('Failed to load order notification:', error);
            }
        };

        if (!shouldLoadOrderNotification) {
            setHasNewOrderNotification(false);
            return undefined;
        }

        loadOrderNotification();
        const intervalId = window.setInterval(loadOrderNotification, 30000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [shouldLoadOrderNotification]);

    useEffect(() => {
        if (location.pathname === '/admin/orders' && latestOrderTime) {
            localStorage.setItem(LAST_SEEN_ORDER_KEY, String(latestOrderTime));
            setHasNewOrderNotification(false);
        }
    }, [latestOrderTime, location.pathname]);

    return (
        <div className="relative isolate min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-fg)]">
            {isSidebarOpen && (
                <button
                    type="button"
                    aria-label="Đóng menu"
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-200 lg:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-20 items-center gap-3 border-b border-[var(--color-border)] px-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white">
                        <i className="fas fa-bolt text-sm"></i>
                    </div>
                    <div className="min-w-0 leading-tight">
                        <Link to="/admin" className="ts-display block truncate text-base text-[var(--color-fg)] no-underline">
                            TechStore <span className="ts-gradient-text">Admin</span>
                        </Link>
                        <p className="ts-eyebrow mt-0.5 text-[9px]">Khu vực quản trị</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-5">
                    {visibleGroups.map((group) => (
                        <div key={group.title} className="mb-6">
                            <p className="ts-eyebrow mb-2 px-3">{group.title}</p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const active = isActive(item.to);
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={cn(
                                                "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                                                active
                                                    ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
                                                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-fg)]"
                                            )}
                                        >
                                            {active && (
                                                <span className="absolute inset-y-1.5 left-0 w-0.5 bg-gradient-to-b from-[var(--color-accent)] to-[var(--color-primary)]" />
                                            )}
                                            <i className={cn(item.icon, "w-5 text-center text-xs", active ? "text-[var(--color-accent)]" : "text-[var(--color-fg-dim)] group-hover:text-[var(--color-fg-muted)]")}></i>
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-[var(--color-border)] p-3">
                    <Link
                        to="/"
                        className="mb-2 flex items-center gap-3 rounded-sm px-2 py-2 no-underline transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-xs font-bold text-white">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--color-fg)]">{userName}</p>
                            <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-dim)]">{adminAccess ? 'Quản trị' : 'Nhân viên'}</p>
                        </div>
                        <i className="fas fa-arrow-up-right-from-square text-[10px] text-[var(--color-fg-dim)]"></i>
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                    >
                        <i className="fas fa-sign-out-alt w-5 text-center text-xs"></i>
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            <div className="min-h-screen lg:pl-64">
                <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur-xl">
                    <div className="flex h-14 items-center px-4 lg:px-8">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Mở menu"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] lg:hidden"
                        >
                            <i className="fas fa-bars text-sm"></i>
                        </button>
                        <div className="ml-auto flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleNotificationClick}
                                aria-label="Thông báo"
                                className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
                            >
                                <i className="fas fa-bell text-sm"></i>
                                {hasNewOrderNotification && (
                                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-primary)] ts-anim-pulse" />
                                )}
                            </button>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-accent)]">
                                {initials}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="relative z-10">{children}</main>

                <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-xs text-[var(--color-fg-dim)] lg:px-8">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span>© {new Date().getFullYear()} BaseCore TechStore — Khu vực quản trị</span>
                        <span className="ts-mono">v1.0.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default MainLayout;
