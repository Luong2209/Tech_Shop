import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useCompare } from '../../contexts/CompareContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { formatCurrency, getProductCategoryName, resolveProductImage, t } from '../../utils/store';
import coupons from '../../data/coupons';
import { getAvailableCouponsForProduct } from '../../utils/couponUtils';
import { cn } from '../../utils/cn';

const Rating = ({ rating = 5 }) => (
    <div className="flex items-center gap-0.5 text-[10px] text-[var(--color-gold)]" aria-label={`${rating} star rating`}>
        {Array.from({ length: 5 }).map((_, i) => (
            <i key={i} className={i < rating ? 'fas fa-star' : 'far fa-star'}></i>
        ))}
    </div>
);

const ProductCard = ({ product, onAddToCart }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { addItem } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { toggleCompare, isInCompare } = useCompare();
    const badge = product.badge || '';
    const oldPrice = product.oldPrice || Math.round(Number(product.price || 0) * 1.19);
    const hasCoupon = getAvailableCouponsForProduct(product, coupons).length > 0;
    const categoryName = getProductCategoryName(product);
    const outOfStock = !product.stock || product.stock <= 0;
    const handleAdd = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        return onAddToCart ? onAddToCart(product) : addItem(product, 1);
    };

    return (
        <motion.article
            whileHover={{ y: -6 }}
            transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="group relative flex h-full flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] transition-all duration-500 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]"
        >
            {/* Badges */}
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
                {badge && (
                    <span className={cn(
                        "rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        badge === 'Sale'
                            ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] text-white"
                            : "border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                    )}>
                        {t(badge)}
                    </span>
                )}
                {hasCoupon && (
                    <span className="rounded-sm border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                        Voucher
                    </span>
                )}
            </div>

            {/* Image */}
            <Link
                to={`/product/${product.id}`}
                className="relative block aspect-square overflow-hidden bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)]"
            >
                {/* Subtle radial glow on hover */}
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(230,126,34,0.18),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <motion.img
                    src={resolveProductImage(product)}
                    alt={product.name}
                    className="relative h-full w-full object-contain p-6 transition-transform duration-700"
                    animate={{ scale: isHovered ? 1.08 : 1, rotate: isHovered ? -1.5 : 0 }}
                />
                {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                        <span className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 ts-eyebrow text-[var(--color-fg-muted)]">Hết hàng</span>
                    </div>
                )}
                <AnimatePresence>
                    {isHovered && !outOfStock && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
                            transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-fg-muted)] shadow-[var(--shadow-soft)] backdrop-blur-md"
                        >
                            <i className="fas fa-eye text-xs"></i>
                        </motion.span>
                    )}
                </AnimatePresence>
            </Link>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-2 border-t border-[var(--color-border)] p-4">
                <Link
                    to={`/shop?categoryId=${product.categoryId || ''}`}
                    className="ts-eyebrow text-[10px] text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]"
                >
                    {categoryName}
                </Link>

                <Link
                    to={`/product/${product.id}`}
                    className="line-clamp-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:text-[var(--color-accent)]"
                >
                    {product.name}
                </Link>

                <div className="mt-auto flex items-baseline gap-2 pt-2">
                    <span className="ts-mono text-base font-semibold text-[var(--color-fg)]">
                        {formatCurrency(product.price)}
                    </span>
                    {oldPrice > product.price && (
                        <del className="ts-mono text-xs text-[var(--color-fg-dim)]">{formatCurrency(oldPrice)}</del>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1">
                    <Rating />
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label={t('Compare')}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product); }}
                            className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-sm text-xs transition-colors",
                                isInCompare(product.id)
                                    ? "text-[var(--color-primary)]"
                                    : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
                            )}
                        >
                            <i className="fas fa-random"></i>
                        </button>
                        <button
                            type="button"
                            aria-label={t('Wishlist')}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
                            className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-sm text-xs transition-colors",
                                isInWishlist(product.id)
                                    ? "text-[var(--color-primary)]"
                                    : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
                            )}
                        >
                            <i className={isInWishlist(product.id) ? "fas fa-heart" : "far fa-heart"}></i>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={outOfStock}
                    onClick={handleAdd}
                    className={cn(
                        "ts-btn ts-btn-primary group/btn mt-2 w-full text-xs",
                        outOfStock && "from-[var(--color-surface-3)] to-[var(--color-surface-3)] hover:shadow-none"
                    )}
                >
                    <i className="fas fa-shopping-cart text-[11px] transition-transform duration-300 group-hover/btn:-translate-x-0.5 group-hover/btn:rotate-[-8deg]"></i>
                    {t('Add To Cart')}
                </button>
            </div>
        </motion.article>
    );
};

export default ProductCard;
