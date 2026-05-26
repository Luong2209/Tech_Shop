import React, { useEffect, useState } from 'react';
import { orderApi } from '../../services/api';
import { formatCurrency, setPageMeta, t, toast } from '../../utils/store';
import PageHero from '../../components/store/PageHero';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const statusStyles = {
    Completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    Cancelled: 'border-red-500/40 bg-red-500/10 text-red-300',
    Shipped: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    Shipping: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    Processing: 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
    Confirmed: 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]',
    Pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

const getStatusStyle = (status = '') => {
    if (status.includes('Cancel')) return statusStyles.Cancelled;
    return statusStyles[status] || statusStyles.Pending;
};

const OrderTimeline = ({ timeline = [], status }) => {
    const steps = ['Pending', 'Confirmed', 'Processing', 'Shipping', 'Completed'];
    const isCancelled = status?.includes('Cancel');

    if (isCancelled) {
        return (
            <div className="my-4 inline-flex items-center gap-2 rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <i className="fas fa-times-circle"></i>{status}
            </div>
        );
    }

    const currentIdx = (() => {
        for (let i = steps.length - 1; i >= 0; i--) {
            if (timeline?.some((tl) => tl.status === steps[i]) || status === steps[i]) return i;
        }
        return 0;
    })();

    return (
        <div className="my-5 flex items-center gap-1">
            {steps.map((step, idx) => {
                const done = idx <= currentIdx;
                return (
                    <React.Fragment key={step}>
                        <div className="flex min-w-[64px] flex-col items-center">
                            <div className={cn(
                                "mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border text-[10px]",
                                done
                                    ? "border-[var(--color-primary)] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white"
                                    : "border-[var(--color-border)] text-[var(--color-fg-dim)]"
                            )}>
                                <i className={`fas ${idx < currentIdx ? 'fa-check' : 'fa-circle text-[6px]'}`}></i>
                            </div>
                            <small className={cn("text-center text-[10px]", done ? "text-[var(--color-fg)] font-medium" : "text-[var(--color-fg-dim)]")}>
                                {step}
                            </small>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={cn("mb-5 h-px flex-1", done && idx < currentIdx ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]" : "bg-[var(--color-border)]")} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const ORDERS_PER_PAGE = 8;

const normalizeOrderDetailResponse = (payload) => {
    if (payload?.order) {
        return {
            order: { ...payload.order, timeline: payload.order.timeline || payload.order.timelines || [] },
            details: payload.details || payload.items || [],
        };
    }
    return {
        order: { ...payload, timeline: payload?.timeline || payload?.timelines || payload?.Timeline || [] },
        details: payload?.items || payload?.details || payload?.Items || [],
    };
};

const paymentLabel = (method) => ({
    COD: 'COD', cod: 'COD',
    StorePayment: 'Tại cửa hàng',
    BankTransfer: 'Chuyển khoản', bank: 'Chuyển khoản',
    Momo: 'MoMo', ShopeePay: 'ShopeePay', ApplePay: 'Apple Pay',
    paypal: 'PayPal', check: 'Séc',
}[method] || method || 'Không xác định');

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    const loadOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await orderApi.getMyOrders();
            const raw = response.data || [];
            raw.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            setOrders(raw);
        } catch (e) {
            const data = e.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Không tải được danh sách đơn hàng.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPageMeta({ title: `${t('Order History')} | TechStore`, description: 'Xem và quản lý đơn hàng của bạn.' });
        loadOrders();
    }, []);

    useEffect(() => { setPage(1); }, [statusFilter]);

    const handleViewDetails = async (orderId) => {
        setDetailLoading(true);
        setSelectedOrder(null);
        try {
            const response = await orderApi.getById(orderId);
            if (!response.data) throw new Error('empty');
            setSelectedOrder(normalizeOrderDetailResponse(response.data));
        } catch {
            const basicOrder = orders.find((o) => o.id === orderId);
            if (basicOrder) setSelectedOrder({ order: basicOrder, details: [] });
            else toast('Không thể tải chi tiết đơn hàng.', 'danger');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!cancelReason.trim()) return toast(t('Cancel reason is required'), 'danger');
        setCancelling(true);
        try {
            await orderApi.cancel(selectedOrder.order.id, { reason: cancelReason });
            setShowCancelModal(false);
            setCancelReason('');
            setSelectedOrder(null);
            await loadOrders();
            toast('Gửi yêu cầu hủy đơn thành công!', 'success');
        } catch (e) {
            toast(e.response?.data?.message || 'Không thể gửi yêu cầu hủy.', 'danger');
        } finally {
            setCancelling(false);
        }
    };

    const filteredOrders = statusFilter
        ? orders.filter((o) => {
            if (statusFilter === 'cancelled') return o.status.toLowerCase().includes('cancel');
            return o.status.toLowerCase() === statusFilter.toLowerCase();
        })
        : orders;

    const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1;
    const pagedOrders = filteredOrders.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE);

    const statusOptions = [
        { value: '', label: 'Tất cả' },
        { value: 'Pending', label: 'Chờ xác nhận' },
        { value: 'Confirmed', label: 'Đã xác nhận' },
        { value: 'Processing', label: 'Đang xử lý' },
        { value: 'Shipped', label: 'Đang giao' },
        { value: 'Completed', label: 'Hoàn thành' },
        { value: 'cancelled', label: 'Đã hủy' },
    ];

    return (
        <>
            <PageHero title={t('Order History')} current={t('Order History')} kicker="My Orders" />

            <section className="ts-container py-12">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="ts-eyebrow text-[var(--color-accent)]">My account</p>
                        <h2 className="ts-display mt-2 text-3xl">Đơn hàng của tôi</h2>
                        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{loading ? 'Đang tải...' : `${orders.length} đơn hàng`}</p>
                    </div>
                    <Link to="/shop" className="ts-btn ts-btn-outline text-xs">
                        <i className="fas fa-shopping-bag"></i>Tiếp tục mua sắm
                    </Link>
                </div>

                <div className="mb-6 flex flex-wrap gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatusFilter(opt.value)}
                            className={cn(
                                "rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                                statusFilter === opt.value
                                    ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] text-white"
                                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                            )}
                        >
                            {opt.label}
                            {opt.value === '' && orders.length > 0 && (
                                <span className="ts-mono ml-1.5 text-[10px] opacity-70">{orders.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center py-16">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                        <p className="mt-3 text-sm text-[var(--color-fg-muted)]">Đang tải...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-3 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{error}</span>
                        <button onClick={loadOrders} className="ml-auto ts-btn ts-btn-outline px-3 py-1 text-xs">Thử lại</button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--color-border)] py-20 text-center">
                        <i className="fas fa-shopping-bag text-4xl text-[var(--color-fg-dim)]"></i>
                        <h4 className="ts-display mt-6 text-xl">Bạn chưa có đơn hàng nào</h4>
                        <Link to="/shop" className="ts-btn ts-btn-primary mt-6">Bắt đầu mua sắm</Link>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[var(--color-border)] p-12 text-center text-sm text-[var(--color-fg-dim)]">
                        Không có đơn hàng nào với trạng thái này.
                    </p>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3 md:grid md:grid-cols-[1fr_140px_160px_140px_100px] md:gap-4">
                                <p className="ts-eyebrow text-[10px]">Mã đơn</p>
                                <p className="ts-eyebrow text-[10px]">Ngày đặt</p>
                                <p className="ts-eyebrow text-[10px]">Trạng thái</p>
                                <p className="ts-eyebrow text-[10px]">Tổng</p>
                                <p className="ts-eyebrow text-[10px] text-right">Action</p>
                            </div>
                            <ul className="divide-y divide-[var(--color-border)]">
                                {pagedOrders.map((order) => (
                                    <li key={order.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_140px_160px_140px_100px] md:items-center md:gap-4">
                                        <div>
                                            <p className="ts-mono text-sm font-semibold text-[var(--color-fg)]">#{order.orderCode || order.id}</p>
                                        </div>
                                        <p className="text-xs text-[var(--color-fg-muted)]">{new Date(order.orderDate).toLocaleString('vi-VN')}</p>
                                        <span className={cn("inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", getStatusStyle(order.status))}>
                                            {order.status}
                                        </span>
                                        <p className="ts-mono text-sm font-semibold text-[var(--color-accent)]">{formatCurrency(order.totalAmount)}</p>
                                        <button onClick={() => handleViewDetails(order.id)} className="ts-btn ts-btn-outline justify-self-end px-3 py-1.5 text-xs">
                                            <i className="fas fa-eye text-[10px]"></i>Chi tiết
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-1">
                                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)] disabled:opacity-40">
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={cn(
                                            "h-9 min-w-9 rounded-sm border px-2 text-xs",
                                            p === page ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                                        )}
                                    >{p}</button>
                                ))}
                                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)] disabled:opacity-40">
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Detail loading overlay */}
            {detailLoading && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                </div>
            )}

            {/* Detail Modal */}
            {selectedOrder && !showCancelModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                            <h5 className="ts-display text-lg"><i className="fas fa-receipt mr-2 text-[var(--color-accent)]"></i>Đơn #{selectedOrder.order.id}</h5>
                            <button onClick={() => setSelectedOrder(null)} aria-label="Đóng" className="text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-6">
                            <OrderTimeline timeline={selectedOrder.order.timeline} status={selectedOrder.order.status} />

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                                    <p className="ts-eyebrow mb-2 text-[10px] text-[var(--color-accent)]"><i className="fas fa-map-marker-alt mr-1"></i>Giao hàng</p>
                                    <p className="text-sm font-medium text-[var(--color-fg)]">{selectedOrder.order.customerName || '—'}</p>
                                    <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{selectedOrder.order.shippingAddress || '—'}</p>
                                    {selectedOrder.order.customerPhone && <p className="mt-1 text-xs text-[var(--color-fg-muted)]"><i className="fas fa-phone mr-1"></i>{selectedOrder.order.customerPhone}</p>}
                                    <p className="mt-1 text-xs text-[var(--color-fg-muted)]"><i className="fas fa-credit-card mr-1"></i>{paymentLabel(selectedOrder.order.paymentMethod)}</p>
                                    {selectedOrder.order.notes && <p className="mt-2 text-xs italic text-[var(--color-fg-dim)]">"{selectedOrder.order.notes}"</p>}
                                </div>
                                <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                                    <p className="ts-eyebrow mb-2 text-[10px] text-[var(--color-accent)]"><i className="fas fa-info-circle mr-1"></i>Tình trạng</p>
                                    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", getStatusStyle(selectedOrder.order.status))}>
                                        {selectedOrder.order.status}
                                    </span>
                                    <p className="mt-3 text-xs text-[var(--color-fg-muted)]">Đặt: {new Date(selectedOrder.order.orderDate).toLocaleString('vi-VN')}</p>
                                    {selectedOrder.order.paymentStatus && (
                                        <p className="mt-1 text-xs">Thanh toán: <span className={cn("font-semibold", selectedOrder.order.paymentStatus === 'Paid' && "text-emerald-400", selectedOrder.order.paymentStatus === 'Refunded' && "text-sky-400", selectedOrder.order.paymentStatus === 'Unpaid' && "text-amber-400")}>{selectedOrder.order.paymentStatus}</span></p>
                                    )}
                                </div>
                            </div>

                            {selectedOrder.details.length > 0 ? (
                                <div className="mt-6 overflow-hidden rounded-sm border border-[var(--color-border)]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--color-surface-2)]">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Sản phẩm</th>
                                                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">SL</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Đơn giá</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">Tổng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {selectedOrder.details.map((d) => (
                                                <tr key={d.id}>
                                                    <td className="px-3 py-3">
                                                        <p className="font-medium text-[var(--color-fg)]">{d.product?.name || d.productName || `#${d.productId}`}</p>
                                                        {d.product?.category?.name && <p className="ts-eyebrow text-[10px]">{d.product.category.name}</p>}
                                                    </td>
                                                    <td className="ts-mono px-3 py-3 text-center text-[var(--color-fg-muted)]">×{d.quantity}</td>
                                                    <td className="ts-mono px-3 py-3 text-right text-[var(--color-fg-muted)]">{formatCurrency(d.unitPrice)}</td>
                                                    <td className="ts-mono px-3 py-3 text-right font-semibold text-[var(--color-fg)]">{formatCurrency(d.totalPrice ?? d.unitPrice * d.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-[var(--color-surface-2)]">
                                            <tr>
                                                <th colSpan="3" className="px-3 py-3 text-right text-xs uppercase tracking-wider text-[var(--color-fg-dim)]">Tổng cộng</th>
                                                <th className="ts-mono px-3 py-3 text-right text-base text-[var(--color-accent)]">{formatCurrency(selectedOrder.order.totalAmount)}</th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <p className="mt-6 rounded-sm border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-fg-dim)]">Không tải được chi tiết sản phẩm.</p>
                            )}

                            {selectedOrder.order.status.includes('Cancel') && selectedOrder.order.cancelReason && (
                                <div className="mt-4 rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                                    <strong><i className="fas fa-ban mr-1"></i>Lý do hủy:</strong> {selectedOrder.order.cancelReason}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-6 py-4">
                            {['Pending', 'Confirmed', 'Processing', 'Shipped'].includes(selectedOrder.order.status) && (
                                <button onClick={() => setShowCancelModal(true)} className="ts-btn ts-btn-outline text-xs">
                                    <i className="fas fa-times text-[10px]"></i>Yêu cầu hủy
                                </button>
                            )}
                            <button onClick={() => setSelectedOrder(null)} className="ts-btn ts-btn-ghost text-xs">Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowCancelModal(false)}>
                    <div className="w-full max-w-md overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <h5 className="ts-display text-lg text-[var(--color-danger)]"><i className="fas fa-exclamation-triangle mr-2"></i>Xác nhận hủy</h5>
                            <button onClick={() => setShowCancelModal(false)} className="text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm">Bạn đang yêu cầu hủy đơn <strong className="ts-mono text-[var(--color-accent)]">#{selectedOrder?.order?.id}</strong>.</p>
                            <div className="my-4 rounded-sm border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                                <i className="fas fa-info-circle mr-1"></i>
                                Nếu đơn chưa giao, yêu cầu sẽ được xử lý trong 5 phút. Nếu đã thanh toán, sẽ hoàn tiền trong 24h.
                            </div>
                            <label>
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">Lý do hủy *</span>
                                <textarea
                                    rows="3"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Đổi ý, muốn mua sản phẩm khác..."
                                    className="ts-input resize-none"
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                            <button onClick={() => setShowCancelModal(false)} className="ts-btn ts-btn-ghost text-xs">Quay lại</button>
                            <button
                                onClick={handleCancelOrder}
                                disabled={cancelling || !cancelReason.trim()}
                                className="ts-btn ts-btn-primary text-xs"
                                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                            >
                                {cancelling ? <><i className="fas fa-spinner fa-spin"></i>Đang gửi...</> : <><i className="fas fa-paper-plane"></i>Gửi yêu cầu</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Orders;
