import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { t } from '../../utils/store';
import { cn } from '../../utils/cn';

const productTabs = ['All Products', 'New Arrivals', 'Featured', 'Top Selling'];

const OurProductsSection = ({ products, loading, onAddToCart }) => {
    const [selectedTab, setSelectedTab] = useState('All Products');

    const visibleProducts = useMemo(() => {
        const filteredProducts = selectedTab === 'All Products'
            ? products
            : products.filter((product) => product.tab === selectedTab);

        return filteredProducts.slice(0, 8);
    }, [products, selectedTab]);

    return (
        <section className="ts-container py-16" id="featured-products">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="mb-12 flex flex-wrap items-end justify-between gap-6"
            >
                <div>
                    <p className="ts-eyebrow text-[var(--color-accent)]">Curated</p>
                    <h2 className="ts-display mt-3 text-3xl md:text-4xl text-[var(--color-fg)]">{t('Our Products')}</h2>
                    <div className="mt-3 h-px w-16 bg-gradient-to-r from-[var(--color-accent)] to-transparent" />
                </div>

                <div className="relative flex flex-wrap items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-soft)]">
                    {productTabs.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setSelectedTab(tab)}
                            className="relative rounded-sm px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors"
                        >
                            {selectedTab === tab && (
                                <motion.span
                                    layoutId="tab-pill"
                                    className="absolute inset-0 rounded-sm bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] shadow-[0_2px_8px_rgba(230,126,34,0.3)]"
                                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                                />
                            )}
                            <span className={cn(
                                "relative z-10",
                                selectedTab === tab ? "text-white" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                            )}>
                                {t(tab)}
                            </span>
                        </button>
                    ))}
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedTab}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                    className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4"
                >
                    {loading ? (
                        <div className="col-span-full flex justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                        </div>
                    ) : visibleProducts.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-sm text-[var(--color-fg-dim)]">
                            Không có sản phẩm.
                        </div>
                    ) : (
                        visibleProducts.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: (idx % 4) * 0.08, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                            >
                                <ProductCard product={product} onAddToCart={onAddToCart} />
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </AnimatePresence>
        </section>
    );
};

export default OurProductsSection;
