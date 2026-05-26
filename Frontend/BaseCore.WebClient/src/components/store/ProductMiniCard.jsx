import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useCompare } from '../../contexts/CompareContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { formatCurrency, getProductCategoryName, resolveProductImage, t } from '../../utils/store';
import { cn } from '../../utils/cn';

const ProductMiniCard = ({ product, onAddToCart }) => {
    const { addItem } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { toggleCompare, isInCompare } = useCompare();
    const rawImage = product.image?.trim();
    const productImage = rawImage
        ? (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('/') ? rawImage : `/${rawImage.replace(/^\/+/, '')}`)
        : resolveProductImage(product);
    const categoryName = getProductCategoryName(product);
    const oldPrice = product.oldPrice || Math.round(Number(product.price || 0) * 1.19);
    const outOfStock = !product.stock || product.stock <= 0;
    const handleAdd = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        return onAddToCart ? onAddToCart(product) : addItem(product, 1);
    };

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="group flex h-full gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-all hover:border-[var(--color-border-strong)]"
        >
            <Link
                to={`/product/${product.id}`}
                className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-[var(--color-background)]"
            >
                <img src={productImage} alt={product.name} className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                    <Link to={`/shop?categoryId=${product.categoryId || ''}`} className="ts-eyebrow text-[10px] text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]">
                        {categoryName}
                    </Link>
                    <Link
                        to={`/product/${product.id}`}
                        className="mt-1 line-clamp-2 block text-sm font-medium text-[var(--color-fg)] transition-colors hover:text-[var(--color-accent)]"
                    >
                        {product.name}
                    </Link>
                    <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="ts-mono text-sm font-semibold text-[var(--color-fg)]">{formatCurrency(product.price)}</span>
                        {oldPrice > product.price && (
                            <del className="ts-mono text-[11px] text-[var(--color-fg-dim)]">{formatCurrency(oldPrice)}</del>
                        )}
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                    <button
                        type="button"
                        disabled={outOfStock}
                        onClick={handleAdd}
                        className={cn(
                            "ts-btn ts-btn-primary flex-1 px-2 py-1.5 text-[11px]",
                            outOfStock && "from-[var(--color-surface-3)] to-[var(--color-surface-3)]"
                        )}
                    >
                        <i className="fas fa-shopping-cart text-[10px]"></i>
                    </button>
                    <button
                        type="button"
                        aria-label={t('Compare')}
                        onClick={(e) => { e.preventDefault(); toggleCompare(product); }}
                        className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--color-border)] text-[10px] transition-colors",
                            isInCompare(product.id)
                                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                                : "text-[var(--color-fg-dim)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                        )}
                    >
                        <i className="fas fa-random"></i>
                    </button>
                    <button
                        type="button"
                        aria-label={t('Wishlist')}
                        onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
                        className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--color-border)] text-[10px] transition-colors",
                            isInWishlist(product.id)
                                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                                : "text-[var(--color-fg-dim)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                        )}
                    >
                        <i className={isInWishlist(product.id) ? "fas fa-heart" : "far fa-heart"}></i>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductMiniCard;
