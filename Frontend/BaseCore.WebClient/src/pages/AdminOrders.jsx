import React, { useEffect, useMemo, useState } from 'react';
import { orderApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/store';

const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipping', 'Completed', 'CancelRequested', 'Cancelled', 'CancelRejected'];

const statusLabels = {
    Pending: 'Chờ xác nhận',
    Confirmed: 'Đã xác nhận',
    Processing: 'Đang xử lý',
    Shipped: 'Đang giao',
    Completed: 'Hoàn tất',
    Cancelled: 'Đã hủy',
    'Cancel Requested': 'Yêu cầu hủy',
    'Cancelled & Refunded': 'Đã hủy & hoàn tiền',
};

const statusLabel = (status) => statusLabels[status] || status || 'Chờ xác nhận';

statusLabels.Shipping = statusLabels.Shipped;
statusLabels.CancelRequested = statusLabels['Cancel Requested'];
statusLabels.CancelRejected = 'Cancel rejected';

const nextActions = {
    Pending: [{ status: 'Confirmed', label: 'Xác nhận', icon: 'fas fa-check', tone: 'blue' }],
    Confirmed: [{ status: 'Processing', label: 'Xử lý', icon: 'fas fa-box-open', tone: 'amber' }],
    Processing: [{ status: 'Shipped', label: 'Giao hàng', icon: 'fas fa-truck', tone: 'blue' }],
    Shipped: [{ status: 'Completed', label: 'Hoàn tất', icon: 'fas fa-flag-checkered', tone: 'green' }],
    'Cancel Requested': [{ status: 'Cancelled & Refunded', label: 'Hoàn tiền', icon: 'fas fa-rotate-left', tone: 'rose' }],
};

nextActions.Processing = [{ status: 'Shipping', label: 'Giao hang', icon: 'fas fa-truck', tone: 'blue' }];
nextActions.Shipping = nextActions.Shipped;
nextActions.CancelRequested = [{ status: 'Cancelled', label: 'Duyet huy', icon: 'fas fa-rotate-left', tone: 'rose' }];

const statusClass = (status) => {
    if (status?.includes('Cancel')) return 'bg-red-500/10 text-red-300 ring-red-500/30';
    if (status === 'Completed') return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30';
    if (status === 'Shipping' || status === 'Shipped') return 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] ring-blue-100';
    if (status === 'Confirmed' || status === 'Processing') return 'bg-[var(--color-surface-2)] text-amber-300 ring-[var(--color-border)]';
    return 'bg-[var(--color-surface-3)] text-[var(--color-fg)] ring-slate-200';
};

const actionClass = (tone) => {
    const classes = {
        blue: 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] hover:bg-[var(--color-primary)]',
        amber: 'bg-[var(--color-surface-2)]0 hover:bg-amber-600',
        green: 'bg-emerald-600 hover:bg-emerald-700',
        rose: 'bg-rose-600 hover:bg-rose-700',
    };
    return classes[tone] || classes.blue;
};

const AdminOrders = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [customerKeyword, setCustomerKeyword] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortOrder, setSortOrder] = useState('date_desc');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [error, setError] = useState('');
    const [processingActionId, setProcessingActionId] = useState(null);
    const [orderDetails, setOrderDetails] = useState(null);
    const { isAdmin } = useAuth();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [ordersRes, usersRes] = await Promise.all([
                orderApi.getAll(),
                isAdmin() ? userApi.getAll({ page: 1, pageSize: 200 }) : Promise.resolve({ data: [] }),
            ]);
            const usersMap = {};
            const usersData = Array.isArray(usersRes.data)
                ? usersRes.data
                : (usersRes.data.data || usersRes.data.items || usersRes.data.Items || []);
            usersData.forEach((user) => {
                usersMap[user.id] = user;
            });
            setUsers(usersMap);
            setAllOrders(ordersRes.data || []);
        } catch (err) {
            console.error('Failed to load orders:', err);
            setError('Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const getUserName = (userId) => users[userId]?.name || users[userId]?.username || `Người dùng ${userId}`;

    const filteredOrders = useMemo(() => {
        let items = allOrders.slice();
        if (keyword.trim()) {
            items = items.filter((order) => String(order.id).includes(keyword.trim()));
        }
        if (customerKeyword.trim()) {
            const q = customerKeyword.trim().toLowerCase();
            items = items.filter((order) => getUserName(order.userId).toLowerCase().includes(q));
        }
        if (filterStatus) {
            items = items.filter((order) => order.status === filterStatus);
        }
        items.sort((a, b) => {
            if (sortOrder === 'date_asc') return new Date(a.orderDate) - new Date(b.orderDate);
            if (sortOrder === 'amount_desc') return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
            if (sortOrder === 'amount_asc') return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
            return new Date(b.orderDate) - new Date(a.orderDate);
        });
        return items;
    }, [allOrders, keyword, customerKeyword, filterStatus, sortOrder, users]);

    const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
    const orders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

    const statusCounts = useMemo(() => {
        return allOrders.reduce((acc, order) => {
            const status = order.status || 'Pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
    }, [allOrders]);

    const updateFilterStatus = (status) => {
        setFilterStatus(status);
        setPage(1);
    };

    const handleQuickAction = async (orderId, status) => {
        setProcessingActionId(orderId);
        try {
            await orderApi.updateStatus(orderId, { status });
            await loadData();
            if (orderDetails?.order?.id === orderId) {
                const detailRes = await orderApi.getById(orderId);
                setOrderDetails(detailRes.data);
            }
        } catch (err) {
            const data = err.response?.data;
            alert(data?.message || data?.detail || data?.title || 'Không thể cập nhật trạng thái đơn hàng');
        } finally {
            setProcessingActionId(null);
        }
    };

    const handleViewDetails = async (orderId) => {
        try {
            const response = await orderApi.getById(orderId);
            setOrderDetails(response.data);
        } catch (err) {
            alert('Không thể tải chi tiết đơn hàng');
        }
    };

    const canCancel = (order) => !String(order.status || '').includes('Cancel') && order.status !== 'Completed';

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Vận hành</p>
                    <h2 className="mb-0 text-2xl font-bold text-[var(--color-fg)]">Quản lý đơn hàng</h2>
                </div>
                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-fg)]  hover:bg-[var(--color-surface-2)]" onClick={loadData}>
                    <i className="fas fa-rotate"></i>
                    Làm mới
                </button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-4">
                {['Pending', 'Confirmed', 'Processing', 'Shipped'].map((status) => (
                    <button
                        key={status}
                        type="button"
                        className={`rounded-md border p-4 text-left  transition ${filterStatus === status ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent)]/10'}`}
                        onClick={() => updateFilterStatus(filterStatus === status ? '' : status)}
                    >
                        <div className="text-sm font-semibold text-[var(--color-fg-muted)]">{statusLabel(status)}</div>
                        <div className="mt-1 text-2xl font-bold text-[var(--color-fg)]">{statusCounts[status] || 0}</div>
                    </button>
                ))}
            </div>

            <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                <div className="border-b border-[var(--color-border)] p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px_220px]">
                        <input
                            className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
                            placeholder="Tìm mã đơn hàng..."
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setPage(1);
                            }}
                        />
                        <input
                            className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
                            placeholder="Tìm khách hàng..."
                            value={customerKeyword}
                            onChange={(e) => {
                                setCustomerKeyword(e.target.value);
                                setPage(1);
                            }}
                        />
                        <select
                            className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
                            value={filterStatus}
                            onChange={(e) => updateFilterStatus(e.target.value)}
                        >
                            <option value="">Tất cả trạng thái</option>
                            {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                        <select
                            className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="date_desc">Mới nhất trước</option>
                            <option value="date_asc">Cũ nhất trước</option>
                            <option value="amount_desc">Giá trị cao nhất</option>
                            <option value="amount_asc">Giá trị thấp nhất</option>
                        </select>
                    </div>
                </div>

                <div className="p-4">
                    {error && <div className="mb-4 rounded-md border border-rose-200 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                    {loading ? (
                        <div className="py-12 text-center text-sm font-medium text-[var(--color-fg-muted)]">Đang tải đơn hàng...</div>
                    ) : orders.length === 0 ? (
                        <div className="rounded-md border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-fg-muted)]">Không tìm thấy đơn hàng.</div>
                    ) : (
                        <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                    <tr>
                                         <th className="px-4 py-3">Đơn hàng</th>
                                        <th className="px-4 py-3">Khách hàng</th>
                                        <th className="px-4 py-3">Ngày đặt</th>
                                        <th className="px-4 py-3">Giá trị</th>
                                        <th className="px-4 py-3">Trạng thái</th>
                                        <th className="px-4 py-3">Địa chỉ</th>
                                        <th className="px-4 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-[var(--color-surface-2)]">
                                            <td className="px-4 py-3 font-bold text-[var(--color-fg)]">#{order.id}</td>
                                            <td className="px-4 py-3 text-[var(--color-fg)]">{getUserName(order.userId)}</td>
                                            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{new Date(order.orderDate).toLocaleString('vi-VN')}</td>
                                            <td className="px-4 py-3 font-semibold text-[var(--color-fg)]">{formatCurrency(order.totalAmount)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(order.status)}`}>
                                                    {statusLabel(order.status)}
                                                </span>
                                            </td>
                                             <td className="max-w-[220px] truncate px-4 py-3 text-[var(--color-fg-muted)]">{order.shippingAddress || order.deliveryAddress || 'Chưa có địa chỉ'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] hover:bg-[var(--color-surface-3)]" onClick={() => handleViewDetails(order.id)} title="Xem chi tiết">
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    {(nextActions[order.status] || []).map((action) => (
                                                        <button
                                                            key={action.status}
                                                            type="button"
                                                            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-white ${actionClass(action.tone)}`}
                                                            onClick={() => handleQuickAction(order.id, action.status)}
                                                            disabled={processingActionId === order.id}
                                                        >
                                                            <i className={processingActionId === order.id ? 'fas fa-spinner fa-spin' : action.icon}></i>
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                    {canCancel(order) && (
                                                        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleQuickAction(order.id, 'Cancelled')} disabled={processingActionId === order.id} title="Hủy đơn">
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-fg-muted)] sm:flex-row sm:items-center sm:justify-between">
                    <span>Hiển thị {orders.length ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, filteredOrders.length)} trong {filteredOrders.length} đơn hàng</span>
                    <div className="flex items-center gap-2">
                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-semibold disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
                        <span>Trang {page}/{totalPages}</span>
                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-semibold disabled:opacity-50" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Sau</button>
                    </div>
                </div>
            </section>

            {orderDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-md bg-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <div>
                                <h3 className="mb-0 text-lg font-bold text-[var(--color-fg)]">Đơn hàng #{orderDetails.order.id}</h3>
                                <p className="mb-0 text-sm text-[var(--color-fg-muted)]">{new Date(orderDetails.order.orderDate).toLocaleString('vi-VN')}</p>
                            </div>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]" onClick={() => setOrderDetails(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-5">
                            <div className="mb-5 grid gap-4 md:grid-cols-3">
                                <div className="rounded-md bg-[var(--color-surface-2)] p-4">
                                    <h4 className="text-sm font-bold text-[var(--color-fg)]">Khách hàng</h4>
                                    <p className="mb-1 text-sm">{orderDetails.order.customerName || getUserName(orderDetails.order.userId)}</p>
                                    <p className="mb-1 text-sm text-[var(--color-fg-muted)]">{orderDetails.order.customerPhone || 'Không có'}</p>
                                    <p className="mb-0 text-sm text-[var(--color-fg-muted)]">{orderDetails.order.customerEmail || 'Không có'}</p>
                                </div>
                                <div className="rounded-md bg-[var(--color-surface-2)] p-4">
                                    <h4 className="text-sm font-bold text-[var(--color-fg)]">Giao hàng</h4>
                                    <p className="mb-0 text-sm text-[var(--color-fg-muted)]">{orderDetails.order.shippingAddress || orderDetails.order.deliveryAddress || 'Chưa có địa chỉ'}</p>
                                </div>
                                <div className="rounded-md bg-[var(--color-surface-2)] p-4">
                                    <h4 className="text-sm font-bold text-[var(--color-fg)]">Thanh toán</h4>
                                    <p className="mb-1 text-sm">{orderDetails.order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Online / Chuyển khoản'}</p>
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(orderDetails.order.status)}`}>
                                        {statusLabel(orderDetails.order.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                        <tr>
                                            <th className="px-4 py-3">Sản phẩm</th>
                                            <th className="px-4 py-3 text-center">SL</th>
                                            <th className="px-4 py-3 text-right">Đơn giá</th>
                                            <th className="px-4 py-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {(orderDetails.details || []).map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td className="px-4 py-3 font-semibold text-[var(--color-fg)]">{item.productName || item.product?.name || `Sản phẩm #${item.productId}`}</td>
                                                <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-[var(--color-surface-2)]">
                                        <tr>
                                            <th colSpan="3" className="px-4 py-3 text-right">Tổng cộng</th>
                                            <th className="px-4 py-3 text-right text-lg text-[var(--color-accent)]">{formatCurrency(orderDetails.order.totalAmount)}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                            <button type="button" className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]" onClick={() => window.print()}>
                                <i className="fas fa-print mr-2"></i>In hóa đơn
                            </button>
                            <button type="button" className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)]" onClick={() => setOrderDetails(null)}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
