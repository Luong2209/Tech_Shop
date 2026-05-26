import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { productApi } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import AllProductItemsCarousel from '../../components/store/AllProductItemsCarousel';
import OurProductsSection from '../../components/store/OurProductsSection';
import ProductMiniCard from '../../components/store/ProductMiniCard';
import { setPageMeta, t } from '../../utils/store';

const productTags = ['New Arrivals', 'Top Selling', 'Featured'];

const normalizeHomeProduct = (product, index) => ({
    ...product,
    oldPrice: product.oldPrice || Math.round(Number(product.price || 26250000) * 1.19),
    badge: product.badge || (index % 3 === 0 ? 'New' : index % 3 === 1 ? 'Sale' : ''),
    tab: product.tab || productTags[index % productTags.length],
    category: product.category || (product.categoryName ? { name: product.categoryName } : undefined),
    imageUrl: product.imageUrl || `/electro/img/product-${(index % 8) + 1}.png`,
});

const getImmediateProducts = () => {
    try { return productApi.getLocalCatalog?.() || []; } catch { return []; }
};

const getCategoryKey = (product) => String(product?.categoryId || product?.category?.name || product?.categoryName || 'other');

const spreadByCategory = (products = [], limit = 12) => {
    const buckets = new Map();
    products.forEach((product) => {
        const key = getCategoryKey(product);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(product);
    });

    const spread = [];
    while (spread.length < limit && Array.from(buckets.values()).some((bucket) => bucket.length)) {
        buckets.forEach((bucket) => {
            if (bucket.length && spread.length < limit) spread.push(bucket.shift());
        });
    }
    return spread;
};

const getFeaturedProducts = (products) => {
    const preferred = products.filter((p) => p.isFeatured || p.IsFeatured);
    return spreadByCategory(preferred.length ? preferred : products, 6);
};

const getBestsellerProducts = (products) => {
    const preferred = products.filter((p) => p.isBestSeller || p.IsBestSeller);
    const featuredIds = new Set(getFeaturedProducts(products).map((p) => p.id));
    const source = preferred.length ? preferred : products.filter((p) => !featuredIds.has(p.id));
    return spreadByCategory(source.length ? source : products, 6);
};

const fetchHomeCatalog = async () => {
    const first = await productApi.getAll({ page: 1, pageSize: 100 });
    const data = first.data || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const totalPages = Number(data.totalPages || 1);
    const pageSize = Number(data.pageSize || items.length || 100);
    if (totalPages <= 1) return items;

    const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => productApi.getAll({ page: i + 2, pageSize }))
    );
    return [...items, ...rest.flatMap((r) => Array.isArray(r.data?.items) ? r.data.items : [])];
};

const heroSlides = [
    {
        kicker: 'Save up to $400',
        title: <>Tech tuyển chọn — <span className="ts-gradient-text">refined</span> & chính hãng.</>,
        sub: 'Áp dụng cho dòng laptop, máy bàn và smartphone được lựa chọn.',
        cta: { label: t('Shop Laptops'), to: '/shop?categoryId=2' },
        image: '/electro/img/carousel-1.png',
    },
    {
        kicker: 'Save up to $200',
        title: <>Smartphone tinh tế. <span className="ts-gradient-text">Hiệu năng đỉnh.</span></>,
        sub: 'Khám phá bộ sưu tập điện thoại cao cấp được bảo hành chính hãng.',
        cta: { label: t('Shop Smartphones'), to: '/shop?categoryId=1' },
        image: '/electro/img/carousel-2.png',
    },
];

const serviceItems = [
    { icon: 'fas fa-sync-alt', title: 'Free Return', text: '30 days money back guarantee!' },
    { icon: 'fab fa-telegram-plane', title: 'Free Shipping', text: 'Free shipping on all order' },
    { icon: 'fas fa-life-ring', title: 'Support 24/7', text: 'We support online 24 hrs a day' },
    { icon: 'fas fa-credit-card', title: 'Receive Gift Card', text: 'Recieve gift all over oder $50' },
    { icon: 'fas fa-lock', title: 'Secure Payment', text: 'We Value Your Security' },
    { icon: 'fas fa-headset', title: 'Online Service', text: 'Free return products in 30 days' },
];

const offerCards = [
    { title: 'Smart Camera', subtitle: 'Tìm camera tốt nhất dành cho bạn', discount: '40%', imageUrl: '/electro/img/product-5.png' },
    { title: 'Smart Watch', subtitle: 'Đồng hồ thông minh, vạn năng', discount: '20%', imageUrl: '/electro/img/product-6.png' },
];

const Home = () => {
    const [allProducts, setAllProducts] = useState(getImmediateProducts);
    const [featuredProducts, setFeaturedProducts] = useState(() => getFeaturedProducts(getImmediateProducts()));
    const [bestsellerProducts, setBestsellerProducts] = useState(() => getBestsellerProducts(getImmediateProducts()));
    const [loading, setLoading] = useState(false);
    const [heroIndex, setHeroIndex] = useState(0);
    const { addItem } = useCart();

    const miniProducts = useMemo(() => {
        const map = new Map();
        [...bestsellerProducts, ...featuredProducts].forEach((p) => {
            if (!map.has(p.id)) map.set(p.id, p);
        });
        return Array.from(map.values()).slice(0, 8).map(normalizeHomeProduct);
    }, [bestsellerProducts, featuredProducts]);

    const allProductItems = useMemo(() => spreadByCategory(allProducts, 12).map(normalizeHomeProduct), [allProducts]);

    const handleAddToCart = (product) => addItem(product, 1);

    useEffect(() => {
        setPageMeta({ title: `${t('Home')} | TechStore`, description: t('Home meta description') });
        const loadData = async () => {
            try {
                const prods = await fetchHomeCatalog();
                setAllProducts(prods);
                setFeaturedProducts(getFeaturedProducts(prods));
                setBestsellerProducts(getBestsellerProducts(prods));
            } catch (error) {
                console.error('Failed to load store home data', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const id = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), 6500);
        return () => clearInterval(id);
    }, []);

    const slide = heroSlides[heroIndex];

    return (
        <div>
            {/* HERO */}
            <section className="relative isolate overflow-hidden border-b border-[var(--color-border)]">
                <span aria-hidden className="ts-anim-blob pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] bg-gradient-to-br from-[var(--color-accent)]/25 to-[var(--color-primary)]/15 blur-3xl" />
                <span aria-hidden className="ts-anim-blob pointer-events-none absolute -right-32 bottom-0 h-[460px] w-[460px] bg-gradient-to-tr from-[var(--color-primary)]/15 to-[var(--color-accent)]/20 blur-3xl" style={{ animationDelay: '-7s' }} />

                <div className="ts-container relative grid items-center gap-10 py-20 lg:grid-cols-2 lg:py-28">
                    <motion.div
                        key={`text-${heroIndex}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
                    >
                        <motion.p
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="ts-eyebrow text-[var(--color-accent)]"
                        >
                            {slide.kicker}
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
                            className="ts-display mt-4 text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
                        >
                            {slide.title}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.32, duration: 0.6 }}
                            className="mt-6 max-w-lg text-base text-[var(--color-fg-muted)]"
                        >
                            {slide.sub}
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, duration: 0.5 }}
                            className="mt-8 flex flex-wrap items-center gap-3"
                        >
                            <Link to={slide.cta.to} className="ts-btn ts-btn-primary px-6 py-3 group">
                                {slide.cta.label}
                                <i className="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
                            </Link>
                            <Link to="/shop" className="ts-btn ts-btn-ghost px-6 py-3">
                                Khám phá cửa hàng
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            className="mt-10 flex items-center gap-3"
                        >
                            {heroSlides.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setHeroIndex(i)}
                                    aria-label={`Slide ${i + 1}`}
                                    className={`h-1 transition-all duration-500 ${i === heroIndex ? 'w-12 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]' : 'w-6 bg-[var(--color-border-strong)] hover:bg-[var(--color-fg-dim)]'}`}
                                />
                            ))}
                            <span className="ts-mono ml-3 text-xs text-[var(--color-fg-dim)]">
                                {String(heroIndex + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}
                            </span>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        key={`img-${heroIndex}`}
                        initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
                        className="relative"
                    >
                        <div className="relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-12 shadow-[var(--shadow-lift)] lg:aspect-[4/3]">
                            <motion.img
                                src={slide.image}
                                alt="Hero"
                                className="h-full w-full object-contain"
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            {/* Decorative dots */}
                            <span aria-hidden className="absolute right-6 top-6 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                            <span aria-hidden className="absolute right-12 top-6 h-2 w-2 rounded-full bg-[var(--color-primary)]/40" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: 0.5, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                            className="absolute -bottom-6 -left-6 hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lift)] backdrop-blur-md sm:block ts-anim-float-slow"
                        >
                            <p className="ts-eyebrow text-[var(--color-accent)]">Special Offer</p>
                            <p className="ts-display mt-2 text-2xl"><span className="ts-gradient-text">−$48</span> off</p>
                            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">Apple iPad Mini G2356</p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* SERVICES STRIP */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                className="ts-container py-12"
            >
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] shadow-[var(--shadow-soft)] md:grid-cols-3 lg:grid-cols-6">
                    {serviceItems.map((item, idx) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ delay: idx * 0.06, duration: 0.5 }}
                            whileHover={{ y: -2 }}
                            className="group flex items-start gap-3 bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-surface-2)]"
                        >
                            <i className={`${item.icon} mt-1 text-lg text-[var(--color-accent)] transition-transform duration-300 group-hover:scale-110`}></i>
                            <div className="min-w-0">
                                <p className="ts-eyebrow text-[10px]">{t(item.title)}</p>
                                <p className="mt-1 text-xs leading-tight text-[var(--color-fg-muted)]">{t(item.text)}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            {/* OFFERS */}
            <section className="ts-container py-12">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {offerCards.map((offer, idx) => (
                        <motion.div
                            key={offer.title}
                            initial={{ opacity: 0, x: idx === 0 ? -30 : 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
                        >
                            <Link
                                to="/shop"
                                className="group relative flex items-center justify-between overflow-hidden rounded-md border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-8 shadow-[var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]"
                            >
                                <div className="relative z-10 max-w-[55%]">
                                    <p className="text-sm text-[var(--color-fg-muted)]">{offer.subtitle}</p>
                                    <h3 className="ts-display mt-3 text-2xl text-[var(--color-fg)]">{t(offer.title)}</h3>
                                    <p className="ts-display mt-2 text-5xl font-bold">
                                        <span className="ts-gradient-text">{offer.discount}</span>
                                        <span className="ml-2 text-sm font-normal text-[var(--color-fg-muted)]">Giảm</span>
                                    </p>
                                </div>
                                <img
                                    src={offer.imageUrl}
                                    alt={offer.title}
                                    className="relative z-10 h-44 w-auto object-contain transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                                />
                                <span className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-[var(--color-primary)]/10 blur-3xl transition-all duration-700 group-hover:scale-125 group-hover:bg-[var(--color-accent)]/20" />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            <OurProductsSection products={miniProducts} loading={loading} onAddToCart={handleAddToCart} />

            {/* TEMPLATE BANNERS */}
            <section className="ts-container py-12">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.7 }}
                    >
                        <Link to="/shop" className="group relative block aspect-[16/9] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]">
                            <img src="/electro/img/product-banner.jpg" alt="EOS Rebel T7i" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110" />
                            <div className="relative z-10 flex h-full flex-col items-start justify-center gap-3 bg-gradient-to-r from-white/90 via-white/60 to-transparent p-8">
                                <h3 className="ts-display text-3xl text-[var(--color-fg)]">EOS Rebel<br /><span className="ts-gradient-text">T7i Kit</span></h3>
                                <p className="ts-mono text-xl text-[var(--color-fg-muted)]">$899.99</p>
                                <span className="ts-btn ts-btn-primary mt-2 group/btn">{t('Shop Now')} <i className="fas fa-arrow-right text-xs transition-transform group-hover/btn:translate-x-1"></i></span>
                            </div>
                        </Link>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                    >
                        <Link to="/shop" className="group relative block aspect-[16/9] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]">
                            <img src="/electro/img/product-banner-2.jpg" alt="Sale" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" />
                            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-r from-transparent via-white/60 to-white/90 p-8 text-center">
                                <h3 className="ts-display text-4xl text-[var(--color-fg)] tracking-wider">GIẢM <span className="ts-gradient-text">50%</span></h3>
                                <p className="text-sm uppercase tracking-[0.3em] text-[var(--color-fg-muted)]">Flash Sale</p>
                                <span className="ts-btn ts-btn-outline mt-2">{t('Shop Now')}</span>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ALL ITEMS CAROUSEL */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.7 }}
                className="py-12"
            >
                <AllProductItemsCarousel products={allProductItems} onAddToCart={handleAddToCart} />
            </motion.section>

            {/* BESTSELLER MINI GRID */}
            <section className="ts-container py-16">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 flex items-end justify-between gap-4"
                >
                    <div>
                        <p className="ts-eyebrow text-[var(--color-accent)]">{t('Bestseller Products')}</p>
                        <h2 className="ts-display mt-3 text-3xl md:text-4xl">{t('Most Popular Items')}</h2>
                        <div className="mt-3 h-px w-16 bg-gradient-to-r from-[var(--color-accent)] to-transparent" />
                    </div>
                    <Link to="/bestseller" className="ts-btn ts-btn-ghost hidden text-xs md:inline-flex group">
                        Xem tất cả <i className="fas fa-arrow-right ml-1 text-[10px] transition-transform group-hover:translate-x-1"></i>
                    </Link>
                </motion.div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {miniProducts.slice(0, 6).map((product, idx) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ delay: (idx % 3) * 0.1, duration: 0.5 }}
                        >
                            <ProductMiniCard product={product} onAddToCart={handleAddToCart} />
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
