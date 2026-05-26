import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, resolveProductImage } from '../../utils/store';
import { useCart } from '../../contexts/CartContext';
import { cn } from '../../utils/cn';

const ProductQuickView = ({ product, onClose }) => {
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [mainImage, setMainImage] = useState('');

    useEffect(() => {
        if (product) {
            setMainImage(resolveProductImage(product));
            setQuantity(1);
        }
    }, [product]);

    if (!product) return null;

    const handleAddToCart = () => {
        addItem(product, quantity);
        if (onClose) onClose();
    };

    const thumbnails = [
        resolveProductImage(product),
        '/electro/img/product-1.png',
        '/electro/img/product-2.png',
        '/electro/img/product-3.png',
        '/electro/img/product-4.png',
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl lg:grid-cols-2"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng"
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)]/80 text-[var(--color-fg-muted)] backdrop-blur-md transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
                >
                    <i className="fas fa-times text-xs"></i>
                </button>

                {/* Left: image */}
                <div className="flex flex-col gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)] p-6 lg:border-b-0 lg:border-r">
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <img src={mainImage} alt={product.name} className="h-full w-full object-contain p-8" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {thumbnails.map((thumb, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setMainImage(thumb)}
                                className={cn(
                                    "h-16 w-16 shrink-0 overflow-hidden rounded-sm border-2 bg-[var(--color-surface)] p-1 transition-all",
                                    mainImage === thumb ? "border-[var(--color-primary)]" : "border-[var(--color-border)] opacity-60 hover:opacity-100"
                                )}
                            >
                                <img src={thumb} alt="thumb" className="h-full w-full object-contain" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: info */}
                <div className="flex max-h-[80vh] flex-col overflow-y-auto p-6 lg:p-8">
                    <p className="ts-eyebrow text-[var(--color-accent)]">{product.category?.name || 'Electronics'}</p>
                    <h2 className="ts-display mt-2 text-2xl text-[var(--color-fg)] md:text-3xl">{product.name}</h2>

                    <div className="mt-3 flex items-center gap-1 text-xs text-[var(--color-gold)]">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <i key={i} className={i < 4 ? 'fas fa-star' : 'far fa-star'}></i>
                        ))}
                        <span className="ml-2 text-[var(--color-fg-dim)]">(4.0)</span>
                    </div>

                    <p className="ts-mono mt-5 text-3xl font-semibold">
                        <span className="ts-gradient-text">{formatCurrency(product.price)}</span>
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-y border-[var(--color-border)] py-4 text-xs">
                        <div>
                            <p className="ts-eyebrow text-[10px]">SKU</p>
                            <p className="mt-1 text-[var(--color-fg-muted)]">{product.sku || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="ts-eyebrow text-[10px]">Tồn kho</p>
                            <p className="mt-1 text-[var(--color-fg)]">{product.stock} sản phẩm</p>
                        </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                        {product.description || "Sản phẩm chính hãng, bảo hành đầy đủ theo tiêu chuẩn nhà sản xuất."}
                    </p>

                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-background)]">
                            <button
                                type="button"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="flex h-10 w-10 items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                                aria-label="Giảm"
                            >
                                <i className="fas fa-minus text-xs"></i>
                            </button>
                            <span className="ts-mono w-10 text-center text-sm text-[var(--color-fg)]">{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity(quantity + 1)}
                                className="flex h-10 w-10 items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                                aria-label="Tăng"
                            >
                                <i className="fas fa-plus text-xs"></i>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="ts-btn ts-btn-primary flex-1"
                        >
                            <i className="fas fa-shopping-cart"></i>
                            Thêm vào giỏ
                        </button>
                    </div>

                    <div className="mt-6 border-t border-[var(--color-border)] pt-5">
                        <div className="flex gap-6 border-b border-[var(--color-border)]">
                            {['description', 'reviews'].map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "relative pb-3 text-xs font-medium uppercase tracking-wider transition-colors",
                                        activeTab === tab ? "text-[var(--color-fg)]" : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)]"
                                    )}
                                >
                                    {tab === 'description' ? 'Mô tả' : 'Đánh giá'}
                                    {activeTab === tab && (
                                        <span className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 text-xs leading-relaxed text-[var(--color-fg-muted)]">
                            {activeTab === 'description'
                                ? 'Sản phẩm được tuyển chọn kỹ càng, đảm bảo nguồn gốc, chất lượng cao và bảo hành chính hãng.'
                                : 'Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!'}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ProductQuickView;
