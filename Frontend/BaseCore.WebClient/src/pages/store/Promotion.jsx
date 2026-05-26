import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CouponCard from '../../components/store/CouponCard';
import VoucherSpinWheel from '../../components/store/VoucherSpinWheel';
import PageHero from '../../components/store/PageHero';
import { useCart } from '../../contexts/CartContext';
import coupons from '../../data/coupons';
import { canClaimCoupon, claimCoupon, getClaimedCoupons, getCouponClaimStatus, isCouponClaimed } from '../../utils/couponUtils';
import { setPageMeta } from '../../utils/store';
import { cn } from '../../utils/cn';

const filters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'product', label: 'Sản phẩm' },
    { id: 'shipping', label: 'Vận chuyển' },
    { id: 'available', label: 'Có thể nhận' },
    { id: 'claimed', label: 'Đã nhận' },
    { id: 'locked', label: 'Chưa đủ điều kiện' },
];

const Promotion = () => {
    const { items, totalAmount } = useCart();
    const [activeFilter, setActiveFilter] = useState('all');
    const [claimedIds, setClaimedIds] = useState([]);
    const [message, setMessage] = useState('');

    const claimableCoupons = useMemo(() => coupons.filter((coupon) => coupon.code), []);
    const spinRewards = useMemo(() => coupons.filter((coupon) => coupon.spinWeight > 0), []);
    const context = useMemo(() => ({ currentHour: new Date().getHours(), subtotal: totalAmount, cartItems: items }), [items, totalAmount]);
    const claimedCoupons = useMemo(() => claimableCoupons.filter((c) => claimedIds.includes(c.id)), [claimableCoupons, claimedIds]);
    const availableCount = useMemo(
        () => claimableCoupons.filter((c) => getCouponClaimStatus(c, context).status === 'available').length,
        [claimableCoupons, context]
    );

    useEffect(() => {
        setPageMeta({
            title: 'Phiếu giảm giá | TechStore',
            description: 'Nhận phiếu mua hàng và phiếu vận chuyển để tiết kiệm hơn khi thanh toán.',
        });
        setClaimedIds(getClaimedCoupons());
    }, []);

    const showMessage = (text) => {
        setMessage(text);
        setTimeout(() => setMessage(''), 2500);
    };

    const handleClaim = (coupon) => {
        if (!canClaimCoupon(coupon, context)) {
            showMessage(getCouponClaimStatus(coupon, context).message || 'Chưa đủ điều kiện');
            return;
        }
        const result = claimCoupon(coupon.id);
        setClaimedIds(getClaimedCoupons());
        showMessage(result.success ? 'Đã lưu phiếu vào ví' : result.message);
    };

    const handleCopy = async (coupon) => {
        if (!isCouponClaimed(coupon.id)) {
            showMessage('Bạn cần nhận phiếu trước khi sử dụng');
            return;
        }
        await navigator.clipboard?.writeText(coupon.code);
        showMessage('Đã sao chép');
    };

    const handleSpinReward = (reward) => {
        setClaimedIds(getClaimedCoupons());
        showMessage(reward.rewardType === 'empty' ? 'Chúc bạn may mắn lần sau' : `Đã lưu phiếu ${reward.code} vào ví`);
    };

    const getCouponStatus = (coupon) => (
        claimedIds.includes(coupon.id) ? 'claimed' : getCouponClaimStatus(coupon, context).status
    );

    const filteredCoupons = claimableCoupons.filter((coupon) => {
        const status = getCouponStatus(coupon);
        if (activeFilter === 'all') return true;
        if (activeFilter === 'shipping') return coupon.couponType === 'shipping';
        if (activeFilter === 'product') return coupon.couponType === 'product';
        if (activeFilter === 'available') return status === 'available';
        if (activeFilter === 'locked') return status === 'locked';
        if (activeFilter === 'claimed') return status === 'claimed';
        return true;
    });

    return (
        <>
            <PageHero title="Phiếu giảm giá" current="Promotion" kicker="Vouchers" />

            <section className="ts-container py-12">
                <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-3">
                    <div className="flex items-center gap-3 bg-[var(--color-surface)] p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-gold)]/10 text-[var(--color-gold)]">
                            <i className="fas fa-wallet"></i>
                        </div>
                        <div>
                            <p className="ts-eyebrow text-[10px]">Ví của tôi</p>
                            <p className="ts-mono mt-1 text-lg font-semibold">{claimedCoupons.length} <span className="text-xs text-[var(--color-fg-dim)]">phiếu</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[var(--color-surface)] p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                            <i className="fas fa-gift"></i>
                        </div>
                        <div>
                            <p className="ts-eyebrow text-[10px]">Có thể nhận</p>
                            <p className="ts-mono mt-1 text-lg font-semibold">{availableCount}</p>
                        </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-3 bg-[var(--color-surface)] p-5 md:col-span-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                            <i className="fas fa-tags"></i>
                        </div>
                        <div>
                            <p className="ts-eyebrow text-[10px]">Tổng phiếu</p>
                            <p className="ts-mono mt-1 text-lg font-semibold">{claimableCoupons.length}</p>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mb-6 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-fg)]"
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mb-10">
                    <VoucherSpinWheel rewards={spinRewards} onReward={handleSpinReward} />
                </div>

                <div className="mb-6 flex flex-wrap gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            type="button"
                            onClick={() => setActiveFilter(filter.id)}
                            className={cn(
                                "rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                                activeFilter === filter.id
                                    ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] text-white"
                                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                <motion.div
                    key={activeFilter}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    {filteredCoupons.length === 0 ? (
                        <p className="col-span-full rounded-md border border-dashed border-[var(--color-border)] p-12 text-center text-sm text-[var(--color-fg-dim)]">
                            Không có phiếu phù hợp.
                        </p>
                    ) : (
                        filteredCoupons.map((coupon) => {
                            const status = getCouponStatus(coupon);
                            return (
                                <CouponCard
                                    key={coupon.id}
                                    coupon={coupon}
                                    status={status}
                                    claimed={status === 'claimed'}
                                    onClaim={handleClaim}
                                    onCopy={handleCopy}
                                    context={context}
                                />
                            );
                        })
                    )}
                </motion.div>
            </section>
        </>
    );
};

export default Promotion;
