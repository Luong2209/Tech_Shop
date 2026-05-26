import React from 'react';
import { formatCurrency } from '../../utils/store';
import { getCouponClaimStatus } from '../../utils/couponUtils';
import { cn } from '../../utils/cn';

const getScopeLabel = (coupon) => (coupon.couponType === 'shipping' ? 'Vận chuyển' : 'Sản phẩm');

const getShortCondition = (coupon, claimStatus) => {
    if (claimStatus?.missingAmount > 0) return `Còn thiếu ${formatCurrency(claimStatus.missingAmount)}`;
    if (claimStatus?.missingQuantity > 0) return `Cần thêm ${claimStatus.missingQuantity} sản phẩm`;
    if (Number(coupon.minOrder || 0) > 0) return `Đơn từ ${formatCurrency(coupon.minOrder)}`;
    if (coupon.unlockCondition?.type === 'flash_time') return `Mở ${coupon.unlockCondition.startHour}h-${coupon.unlockCondition.endHour}h`;
    return 'Không yêu cầu điều kiện';
};

const getDiscountText = (coupon) => {
    if (coupon.discountType === 'freeship') return 'Miễn phí vận chuyển';
    if (coupon.discountType === 'fixed') return `Giảm ${formatCurrency(coupon.value || 0)}`;
    if (coupon.discountType === 'percent') return `Giảm ${coupon.value}%`;
    return coupon.title;
};

const getStatusText = (status, claimStatus) => {
    if (status === 'available') return 'Có thể nhận';
    if (status === 'claimed') return 'Đã nhận';
    if (status === 'expired') return 'Hết hạn';
    if (status === 'out_of_stock') return 'Hết lượt';
    if (status === 'locked') return 'Chưa đủ điều kiện';
    return claimStatus?.message || 'Chưa đủ điều kiện';
};

const statusStyles = {
    available: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    claimed: 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]',
    expired: 'border-red-500/40 bg-red-500/10 text-red-300',
    out_of_stock: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    locked: 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-fg-dim)]',
};

const CouponCard = ({ coupon, status, claimed, onClaim, onCopy, compact = false, context = {} }) => {
    const claimStatus = getCouponClaimStatus(coupon, context);
    const currentStatus = claimed ? 'claimed' : (status || claimStatus.status);
    const isClaimed = currentStatus === 'claimed';
    const canClaim = currentStatus === 'available';
    const disabled = ['expired', 'out_of_stock'].includes(currentStatus);
    const statusText = getStatusText(currentStatus, claimStatus);

    return (
        <div
            className={cn(
                "relative flex overflow-hidden rounded-md border bg-[var(--color-surface)] transition-all",
                disabled ? "border-[var(--color-border)] opacity-60" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
            )}
        >
            {/* Tear-off code box */}
            <div className="relative flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-[var(--color-border)] bg-gradient-to-br from-[var(--color-accent)]/15 to-[var(--color-primary)]/15 p-3 text-center">
                <span aria-hidden className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--color-background)]" />
                <span aria-hidden className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--color-background)]" />
                <strong className="ts-mono text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)]">{coupon.code}</strong>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-fg-dim)]">{getScopeLabel(coupon)}</span>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-[var(--color-fg)]">{getDiscountText(coupon)}</h5>
                        <p className={cn("mt-0.5 text-xs text-[var(--color-fg-muted)]", compact && "line-clamp-1")}>
                            {coupon.description || getShortCondition(coupon, claimStatus)}
                        </p>
                    </div>
                    <span className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        statusStyles[currentStatus] || statusStyles.locked
                    )}>
                        {statusText}
                    </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-fg-dim)]">
                    <span>{getShortCondition(coupon, claimStatus)}</span>
                    <span className="text-[var(--color-border-strong)]">·</span>
                    <span>HSD: {coupon.expiresAt ? coupon.expiresAt.split('-').reverse().join('/') : 'Không giới hạn'}</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!canClaim}
                        onClick={() => onClaim?.(coupon)}
                        className={cn(
                            "ts-btn px-3 py-1.5 text-[11px]",
                            isClaimed && "ts-btn-outline",
                            canClaim && "ts-btn-primary",
                            !canClaim && !isClaimed && "ts-btn-outline opacity-60"
                        )}
                    >
                        {isClaimed ? 'Đã nhận' : canClaim ? 'Nhận phiếu' : disabled ? statusText : 'Chưa đủ điều kiện'}
                    </button>
                    {isClaimed ? (
                        <button
                            type="button"
                            onClick={() => onCopy?.(coupon)}
                            className="ts-btn ts-btn-ghost px-3 py-1.5 text-[11px]"
                        >
                            <i className="fas fa-copy text-[10px]"></i>
                            Sao chép
                        </button>
                    ) : (
                        <span className="text-[11px] text-[var(--color-fg-dim)] underline-offset-2 hover:underline">Xem điều kiện</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CouponCard;
