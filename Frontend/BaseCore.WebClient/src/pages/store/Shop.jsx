import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { categoryApi, productApi } from '../../services/api';
import ProductCard from '../../components/store/ProductCard';
import PageHero from '../../components/store/PageHero';
import coupons from '../../data/coupons';
import { getAvailableCouponsForProduct } from '../../utils/couponUtils';
import { resolveProductImage, setPageMeta, t } from '../../utils/store';
import { cn } from '../../utils/cn';

const RECENTLY_VIEWED_KEY = 'electro_recently_viewed_products';
const DEFAULT_MAX_PRICE = 50000000;

const formatVnd = (value) => {
    const amount = Number(value || 0);
    return `${new Intl.NumberFormat('vi-VN').format(Number.isFinite(amount) ? amount : 0)}đ`;
};

const parsePriceParam = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const slugifyCategory = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeCategorySlug = (value = '') => {
    const slug = String(value || '').trim().toLowerCase();
    const map = {
        all: '', phone: 'phone', smartphone: 'phone', 'dien-thoai': 'phone',
        laptop: 'laptop', accessory: 'accessory', accessories: 'accessory', 'phu-kien': 'accessory',
        gaming: 'gaming', tablet: 'tablet', watch: 'watch', smartwatch: 'watch', 'dong-ho-thong-minh': 'watch',
        camera: 'camera', 'may-anh': 'camera', headphone: 'headphone', headphones: 'headphone', audio: 'headphone', 'tai-nghe': 'headphone',
    };
    const slugified = slugifyCategory(slug);
    return map[slug] ?? map[slugified] ?? slugified;
};

const categorySlugMap = {
    Smartphone: 'phone', SmartPhone: 'phone', 'Điện thoại': 'phone', 'Mobiles & Tablets': 'phone',
    Laptop: 'laptop', Accessories: 'accessory', Gaming: 'gaming', Tablet: 'tablet',
    Smartwatch: 'watch', 'Smart Watch': 'watch', 'Đồng hồ thông minh': 'watch',
    Camera: 'camera', 'Máy ảnh': 'camera', Audio: 'headphone', 'Tai nghe': 'headphone',
};

const categoryIdSlugMap = { 1: 'phone', 2: 'laptop', 4: 'tablet', 5: 'watch', 6: 'camera', 7: 'headphone' };

const categoryDescriptionMap = {
    phone: 'Lựa chọn điện thoại theo hãng, nhu cầu và mức giá phù hợp.',
    laptop: 'Lựa chọn laptop theo hãng, cấu hình và mức giá phù hợp.',
    tablet: 'Lựa chọn tablet theo hãng, cấu hình và mức giá phù hợp.',
    accessory: 'Phụ kiện công nghệ cho thiết bị và góc làm việc của bạn.',
    gaming: 'Thiết bị cho game thủ với hiệu năng cao và thiết kế chuyên game.',
    watch: 'Đồng hồ thông minh theo thương hiệu, tính năng và nhu cầu sử dụng.',
    camera: 'Máy ảnh theo thương hiệu, chụp hình và quay video.',
    headphone: 'Tai nghe theo thương hiệu, nhu cầu sử dụng và công nghệ âm thanh.',
};

const safeParseJson = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
};

const normalizeRecentProduct = (product) => {
    if (!product) return null;
    return { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, categoryId: product.categoryId };
};

const normalizeSearchText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const getProductSearchText = (product) => normalizeSearchText([
    product?.name, product?.title, product?.description, product?.specs, product?.tags, product?.brand, product?.sku,
    product?.category?.name, product?.categoryName, product?.usage, product?.cpu, product?.gpu,
    product?.screenSize, product?.resolution, product?.ram, product?.storage, product?.battery, product?.camera,
].filter(Boolean).join(' '));

const inferPhoneBrand = (product) => {
    const explicitBrand = String(product?.brand || '').trim().toLowerCase();
    if (explicitBrand) return explicitBrand;
    const text = getProductSearchText(product);
    if (text.includes('iphone') || text.includes('apple')) return 'apple';
    if (text.includes('samsung')) return 'samsung';
    if (text.includes('xiaomi')) return 'xiaomi';
    if (text.includes('oppo')) return 'oppo';
    if (text.includes('vivo')) return 'vivo';
    if (text.includes('realme')) return 'realme';
    if (text.includes('nokia')) return 'nokia';
    return '';
};

const matchesPhonePriceRange = (product, range) => {
    const price = Number(product?.price || 0);
    if (!range || !Number.isFinite(price)) return true;
    if (range === 'duoi-3') return price < 3000000;
    if (range === '3-7') return price >= 3000000 && price <= 7000000;
    if (range === '7-15') return price >= 7000000 && price <= 15000000;
    if (range === '15-25') return price >= 15000000 && price <= 25000000;
    if (range === 'tren-25') return price > 25000000;
    return true;
};

const matchesTextToken = (product, token) => {
    if (!token) return true;
    return getProductSearchText(product).includes(normalizeSearchText(token));
};

const inferLaptopBrand = (product) => {
    const explicitBrand = String(product?.brand || '').trim().toLowerCase();
    if (explicitBrand) return explicitBrand;
    const text = getProductSearchText(product);
    if (text.includes('macbook') || text.includes('apple')) return 'apple';
    if (text.includes('dell')) return 'dell';
    if (text.includes('hp ') || text.startsWith('hp')) return 'hp';
    if (text.includes('asus') || text.includes('rog') || text.includes('tuf')) return 'asus';
    if (text.includes('acer') || text.includes('nitro')) return 'acer';
    if (text.includes('lenovo') || text.includes('thinkpad') || text.includes('legion')) return 'lenovo';
    if (text.includes('msi')) return 'msi';
    if (text.includes('gigabyte')) return 'gigabyte';
    if (text.includes('lg') || text.includes('gram')) return 'lg';
    return '';
};

const matchesLaptopPriceRange = (product, range) => {
    const price = Number(product?.price || 0);
    if (!range || !Number.isFinite(price)) return true;
    if (range === 'duoi-10') return price < 10000000;
    if (range === '10-15') return price >= 10000000 && price <= 15000000;
    if (range === '15-20') return price >= 15000000 && price <= 20000000;
    if (range === '20-30') return price >= 20000000 && price <= 30000000;
    if (range === '30-50') return price >= 30000000 && price <= 50000000;
    if (range === 'tren-50') return price > 50000000;
    return true;
};

const phoneFilterParams = ['brand', 'usage', 'priceRange', 'storage', 'ram', 'battery', 'camera'];
const laptopFilterParams = ['brand', 'usage', 'priceRange', 'cpu', 'ram', 'storage', 'gpu', 'screenSize', 'resolution'];

const phoneFilterGroups = [
    { key: 'brand', title: 'Hãng', options: [
        { label: 'Tất cả', value: '' }, { label: 'Apple', value: 'apple' }, { label: 'Samsung', value: 'samsung' },
        { label: 'Xiaomi', value: 'xiaomi' }, { label: 'OPPO', value: 'oppo' }, { label: 'Vivo', value: 'vivo' },
        { label: 'Realme', value: 'realme' }, { label: 'Nokia', value: 'nokia' },
    ]},
    { key: 'priceRange', title: 'Khoảng giá', options: [
        { label: 'Tất cả', value: '' },
        { label: 'Dưới 3 triệu', value: 'duoi-3' },
        { label: '3 - 7 triệu', value: '3-7' },
        { label: '7 - 15 triệu', value: '7-15' },
        { label: '15 - 25 triệu', value: '15-25' },
        { label: 'Trên 25 triệu', value: 'tren-25' },
    ]},
    { key: 'storage', title: 'Bộ nhớ', options: [{ label: 'Tất cả', value: '' }, ...['64GB', '128GB', '256GB', '512GB', '1TB'].map((l) => ({ label: l, value: l.toLowerCase() }))] },
    { key: 'ram', title: 'RAM', options: [{ label: 'Tất cả', value: '' }, ...['4GB', '6GB', '8GB', '12GB', '16GB'].map((l) => ({ label: l, value: l.toLowerCase() }))] },
];

const laptopFilterGroupsSimple = [
    { key: 'brand', title: 'Hãng', options: [
        { label: 'Tất cả', value: '' },
        ...['Apple', 'Dell', 'HP', 'Asus', 'Acer', 'Lenovo', 'MSI'].map((l) => ({ label: l, value: l.toLowerCase() })),
    ]},
    { key: 'priceRange', title: 'Khoảng giá', options: [
        { label: 'Tất cả', value: '' },
        { label: 'Dưới 10 triệu', value: 'duoi-10' },
        { label: '10 - 15 triệu', value: '10-15' },
        { label: '15 - 20 triệu', value: '15-20' },
        { label: '20 - 30 triệu', value: '20-30' },
        { label: '30 - 50 triệu', value: '30-50' },
        { label: 'Trên 50 triệu', value: 'tren-50' },
    ]},
    { key: 'cpu', title: 'CPU', options: [
        { label: 'Tất cả', value: '' },
        ...['i3', 'i5', 'i7', 'i9', 'm1', 'm2', 'm3'].map((c) => ({ label: c.toUpperCase(), value: c })),
    ]},
    { key: 'ram', title: 'RAM', options: [{ label: 'Tất cả', value: '' }, ...['8GB', '16GB', '32GB', '64GB'].map((l) => ({ label: l, value: l.toLowerCase() }))] },
];

const commonPriceOptions = [
    { label: 'Tất cả', value: '', min: null, max: null },
    { label: 'Dưới 5 triệu', value: 'lt5', min: 0, max: 5000000 },
    { label: '5 - 10 triệu', value: '5-10', min: 5000000, max: 10000000 },
    { label: '10 - 20 triệu', value: '10-20', min: 10000000, max: 20000000 },
    { label: '20 - 40 triệu', value: '20-40', min: 20000000, max: 40000000 },
    { label: 'Trên 40 triệu', value: 'gt40', min: 40000000, max: null },
];

const statusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Còn hàng', value: 'in-stock' },
];

const offerOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Có phiếu giảm giá', value: 'coupon' },
    { label: 'Hàng mới về', value: 'new' },
    { label: 'Đang giảm giá', value: 'sale' },
    { label: 'Freeship', value: 'freeship' },
];

const fallbackSidebarCategories = [
    { id: 1, name: 'Smartphone', slug: 'phone', productCount: 8 },
    { id: 2, name: 'Laptop', slug: 'laptop', productCount: 8 },
    { id: 5, name: 'Tablet', slug: 'tablet', productCount: 2 },
    { id: 6, name: 'Smartwatch', slug: 'watch', productCount: 2 },
    { id: 7, name: 'Camera', slug: 'camera', productCount: 2 },
    { id: 8, name: 'Audio', slug: 'headphone', productCount: 2 },
];

const categoryNameMap = {
    Smartphone: 'Điện thoại', Laptop: 'Laptop', Audio: 'Tai nghe', Smartwatch: 'Đồng hồ thông minh',
    Camera: 'Máy ảnh', Gaming: 'Gaming', Tablet: 'Tablet', Accessories: 'Phụ kiện',
};

const getCategoryDisplayName = (name = '') => categoryNameMap[name] || name;

const getImmediateCatalog = () => {
    try { return productApi.getLocalCatalog?.() || []; } catch { return []; }
};

const getImmediateCategories = () => {
    try { return categoryApi.getLocalAll?.() || []; } catch { return []; }
};

const getProductStats = (items = [], totalCount) => {
    const byId = {};
    items.forEach((product) => {
        if (product.categoryId == null) return;
        const id = String(product.categoryId);
        byId[id] = (byId[id] || 0) + 1;
    });
    return { totalProducts: totalCount || items.length, byId };
};

const fetchStoreCatalog = async () => {
    const first = await productApi.getAll({ page: 1, pageSize: 100 });
    const data = first.data || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const totalPages = Number(data.totalPages || 1);
    const pageSize = Number(data.pageSize || items.length || 100);
    if (totalPages <= 1) return { items, totalCount: data.totalCount };
    const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => productApi.getAll({ page: i + 2, pageSize }))
    );
    return {
        items: [...items, ...rest.flatMap((r) => Array.isArray(r.data?.items) ? r.data.items : [])],
        totalCount: data.totalCount,
    };
};

const PAGE_SIZE = 12;

const Shop = () => {
    const [products, setProducts] = useState(() => getImmediateCatalog().slice(0, PAGE_SIZE));
    const [allProducts, setAllProducts] = useState(getImmediateCatalog);
    const [categories, setCategories] = useState(getImmediateCategories);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [categoryStats, setCategoryStats] = useState(() => getProductStats(getImmediateCatalog()));
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(() => Math.ceil(getImmediateCatalog().length / PAGE_SIZE) || 1);
    const [loading, setLoading] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const keyword = params.get('search') || params.get('keyword') || '';
    const rawCategorySlug = params.get('category') || '';
    const categorySlug = normalizeCategorySlug(rawCategorySlug);
    const categoryIdParam = params.get('categoryId') || '';
    const urlMinPrice = params.get('minPrice') || '';
    const urlMaxPrice = params.get('maxPrice') || '';
    const urlInStock = params.get('inStock') === 'true';
    const urlOffer = params.get('offer') || '';
    const urlSortBy = params.get('sort') || params.get('sortBy') || '';

    const sidebarCategories = categories.length ? categories : (categoriesLoading ? [] : fallbackSidebarCategories);
    const knownCategorySlugs = ['phone', 'laptop', 'accessory', 'gaming', 'tablet', 'watch', 'camera', 'headphone'];
    const getCategorySlug = (category) => {
        const name = category?.name || '';
        const displayName = getCategoryDisplayName(name);
        const normalizedSlug = normalizeCategorySlug(displayName);
        return category?.slug ||
            categorySlugMap[name] ||
            categorySlugMap[displayName] ||
            (knownCategorySlugs.includes(normalizedSlug) ? normalizedSlug : '') ||
            categoryIdSlugMap[Number(category?.id)] ||
            normalizedSlug;
    };
    const activeCategory = sidebarCategories.find((category) => {
        const currentSlug = getCategorySlug(category);
        return (categorySlug && currentSlug === categorySlug) || (categoryIdParam && String(category.id) === categoryIdParam);
    });
    const activeCategoryId = activeCategory?.id ? String(activeCategory.id) : categoryIdParam;
    const activeCategoryName = activeCategory ? getCategoryDisplayName(activeCategory.name) : '';
    const activeCategorySlug = activeCategory ? getCategorySlug(activeCategory) : categorySlug;
    const activeCategoryDescription = activeCategorySlug
        ? categoryDescriptionMap[activeCategorySlug] || `Khám phá các sản phẩm ${activeCategoryName ? activeCategoryName.toLowerCase() : 'công nghệ'} mới nhất.`
        : '';
    const isPhoneCategory = activeCategorySlug === 'phone';
    const isLaptopCategory = activeCategorySlug === 'laptop';

    const phoneFilterValues = {
        brand: params.get('brand') || '',
        priceRange: params.get('priceRange') || '',
        storage: params.get('storage') || '',
        ram: params.get('ram') || '',
    };

    const laptopFilterValues = {
        brand: params.get('brand') || '',
        priceRange: params.get('priceRange') || '',
        cpu: params.get('cpu') || '',
        ram: params.get('ram') || '',
    };

    const filterCategories = useMemo(() => sidebarCategories
        .filter((c) => c.id !== '')
        .filter((c) => ['phone', 'laptop', 'tablet', 'watch', 'camera', 'headphone'].includes(getCategorySlug(c)))
        .reduce((unique, category) => {
            const slug = getCategorySlug(category);
            if (!unique.some((item) => getCategorySlug(item) === slug)) unique.push(category);
            return unique;
        }, []), [sidebarCategories]);

    const recordRecentlyViewed = (product) => {
        const normalized = normalizeRecentProduct(product);
        if (!normalized?.id) return;
        const current = safeParseJson(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]', []);
        const withoutDup = Array.isArray(current) ? current.filter((p) => p?.id !== normalized.id) : [];
        const next = [normalized, ...withoutDup].slice(0, 6);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    };

    useEffect(() => {
        setPageMeta({ title: `${t('Shop')} | TechStore`, description: t('Shop meta description') });

        const loadCats = async () => {
            try {
                const response = await categoryApi.getAll();
                const cats = response.data || [];
                setCategories(cats);
                const statsById = {};
                cats.forEach((c) => {
                    if (c.productCount != null) statsById[String(c.id)] = c.productCount;
                });
                setCategoryStats({
                    totalProducts: cats.reduce((s, c) => s + (c.productCount || 0), 0),
                    byId: statsById,
                });
            } catch (e) {
                console.error('Failed to load categories', e);
            } finally {
                setCategoriesLoading(false);
            }
        };

        const loadCatalog = async () => {
            try {
                const { items, totalCount } = await fetchStoreCatalog();
                setAllProducts(items);
                setCategoryStats(getProductStats(items, totalCount));
            } catch (e) {
                console.error('Failed to load products catalog', e);
            }
        };

        Promise.all([loadCats(), loadCatalog()]);
    }, []);

    useEffect(() => {
        if (!allProducts) return;
        setLoading(true);

        let filtered = allProducts.slice();
        const normalizedKeyword = normalizeSearchText(keyword);

        if (normalizedKeyword) {
            filtered = filtered.filter((p) => normalizeSearchText(getProductSearchText(p)).includes(normalizedKeyword));
        }
        if (activeCategoryId) {
            filtered = filtered.filter((p) => String(p.categoryId) === String(activeCategoryId));
        }
        if (urlInStock) filtered = filtered.filter((p) => Number(p.stock || 0) > 0);
        if (urlOffer === 'coupon') filtered = filtered.filter((p) => getAvailableCouponsForProduct(p, coupons).length > 0);
        else if (urlOffer === 'new') filtered = filtered.filter((p) => p.badge === 'New' || Number(p.id || 0) >= 20);
        else if (urlOffer === 'sale') filtered = filtered.filter((p) => p.badge === 'Sale' || Number(p.oldPrice || 0) > Number(p.price || 0));
        else if (urlOffer === 'freeship') filtered = filtered.filter((p) => Number(p.price || 0) >= 500000);

        const minPriceValue = urlMinPrice ? Number(urlMinPrice) : null;
        const maxPriceValue = urlMaxPrice ? Number(urlMaxPrice) : null;
        if (Number.isFinite(minPriceValue)) filtered = filtered.filter((p) => Number(p.price || 0) >= minPriceValue);
        if (Number.isFinite(maxPriceValue)) filtered = filtered.filter((p) => Number(p.price || 0) <= maxPriceValue);

        if (isPhoneCategory) {
            if (phoneFilterValues.brand) filtered = filtered.filter((p) => inferPhoneBrand(p) === phoneFilterValues.brand);
            filtered = filtered.filter((p) => matchesPhonePriceRange(p, phoneFilterValues.priceRange));
            if (phoneFilterValues.storage) filtered = filtered.filter((p) => matchesTextToken(p, phoneFilterValues.storage));
            if (phoneFilterValues.ram) filtered = filtered.filter((p) => matchesTextToken(p, phoneFilterValues.ram));
        } else if (isLaptopCategory) {
            if (laptopFilterValues.brand) filtered = filtered.filter((p) => inferLaptopBrand(p) === laptopFilterValues.brand);
            filtered = filtered.filter((p) => matchesLaptopPriceRange(p, laptopFilterValues.priceRange));
            if (laptopFilterValues.cpu) filtered = filtered.filter((p) => matchesTextToken(p, laptopFilterValues.cpu));
            if (laptopFilterValues.ram) filtered = filtered.filter((p) => matchesTextToken(p, laptopFilterValues.ram));
        }

        if (urlSortBy === 'price_asc') filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        else if (urlSortBy === 'price_desc') filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        else if (urlSortBy === 'name_asc') filtered.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        else if (urlSortBy === 'name_desc') filtered.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));

        setProducts(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
        setTotalPages(Math.ceil(filtered.length / PAGE_SIZE) || 1);
        setLoading(false);
    }, [allProducts, location.search, page]);

    useEffect(() => { setPage(1); }, [location.search]);

    const setParam = (key, value) => {
        const next = new URLSearchParams(location.search);
        if (value) next.set(key, value);
        else next.delete(key);
        navigate(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
    };

    const handleCategoryChange = (value) => {
        const next = new URLSearchParams(location.search);
        if (value) next.set('category', value); else next.delete('category');
        next.delete('categoryId');
        [...phoneFilterParams, ...laptopFilterParams].forEach((p) => next.delete(p));
        navigate(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
    };

    const handleKeywordSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const nextKeyword = String(formData.get('keyword') || '').trim();
        const next = new URLSearchParams(location.search);
        next.delete('keyword');
        if (nextKeyword) next.set('search', nextKeyword); else next.delete('search');
        navigate(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
    };

    const handlePricePreset = (option) => {
        const next = new URLSearchParams(location.search);
        if (option.min != null && option.min > 0) next.set('minPrice', String(option.min));
        else next.delete('minPrice');
        if (option.max != null) next.set('maxPrice', String(option.max));
        else next.delete('maxPrice');
        navigate(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
    };

    const handleClearAll = () => {
        navigate('/shop');
    };

    const currentPricePreset = useMemo(() => {
        const min = urlMinPrice ? Number(urlMinPrice) : null;
        const max = urlMaxPrice ? Number(urlMaxPrice) : null;
        return commonPriceOptions.find((o) => (o.min ?? null) === (min ?? null) && (o.max ?? null) === (max ?? null))?.value || '';
    }, [urlMinPrice, urlMaxPrice]);

    const activeFilterChips = [
        keyword && { label: `"${keyword}"`, onRemove: () => setParam('search', '') },
        activeCategoryName && { label: activeCategoryName, onRemove: () => handleCategoryChange('') },
        (urlMinPrice || urlMaxPrice) && {
            label: `${formatVnd(urlMinPrice || 0)} – ${formatVnd(urlMaxPrice || DEFAULT_MAX_PRICE)}`,
            onRemove: () => {
                const next = new URLSearchParams(location.search);
                next.delete('minPrice'); next.delete('maxPrice');
                navigate(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
            },
        },
        urlInStock && { label: 'Còn hàng', onRemove: () => setParam('inStock', '') },
        urlOffer && { label: offerOptions.find((o) => o.value === urlOffer)?.label || urlOffer, onRemove: () => setParam('offer', '') },
    ].filter(Boolean);

    const currentFilterGroups = isPhoneCategory ? phoneFilterGroups : isLaptopCategory ? laptopFilterGroupsSimple : [];
    const currentFilterValues = isPhoneCategory ? phoneFilterValues : laptopFilterValues;

    const PillSelect = ({ label, options, value, onChange }) => (
        <div>
            <p className="ts-eyebrow mb-2 text-[10px]">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                    <button
                        key={opt.value || 'all'}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "rounded-sm border px-2.5 py-1 text-[11px] transition-all",
                            String(value || '') === String(opt.value || '')
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-fg)]"
                                : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <PageHero title="Cửa hàng" current={t('Shop')} kicker="Catalog" />

            <section className="ts-container py-12">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
                    {/* SIDEBAR */}
                    <aside className={cn(
                        "space-y-6",
                        mobileFiltersOpen ? "block" : "hidden lg:block"
                    )}>
                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                            <form onSubmit={handleKeywordSubmit}>
                                <p className="ts-eyebrow mb-3 text-[10px]">Tìm kiếm</p>
                                <div className="flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] px-3">
                                    <i className="fas fa-search text-xs text-[var(--color-fg-dim)]"></i>
                                    <input
                                        name="keyword"
                                        type="search"
                                        defaultValue={keyword}
                                        placeholder="Tìm sản phẩm..."
                                        className="h-10 flex-1 bg-transparent text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none"
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                            <p className="ts-eyebrow mb-3 text-[10px]">Danh mục</p>
                            <ul className="space-y-1">
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleCategoryChange('')}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors",
                                            !activeCategorySlug
                                                ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
                                                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-fg)]"
                                        )}
                                    >
                                        <span>Tất cả</span>
                                        {categoryStats.totalProducts > 0 && (
                                            <span className="ts-mono text-[11px] text-[var(--color-fg-dim)]">{categoryStats.totalProducts}</span>
                                        )}
                                    </button>
                                </li>
                                {sidebarCategories.map((category) => {
                                    const slugVal = getCategorySlug(category);
                                    const isActive = activeCategorySlug === slugVal;
                                    const count = categoryStats.byId[String(category.id)] || category.productCount || 0;
                                    return (
                                        <li key={category.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleCategoryChange(slugVal)}
                                                className={cn(
                                                    "flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors",
                                                    isActive
                                                        ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
                                                        : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-fg)]"
                                                )}
                                            >
                                                <span>{getCategoryDisplayName(category.name)}</span>
                                                {count > 0 && <span className="ts-mono text-[11px] text-[var(--color-fg-dim)]">{count}</span>}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-5">
                            <PillSelect
                                label="Khoảng giá"
                                options={commonPriceOptions}
                                value={currentPricePreset}
                                onChange={(v) => handlePricePreset(commonPriceOptions.find((o) => o.value === v) || commonPriceOptions[0])}
                            />
                            <PillSelect
                                label="Tình trạng"
                                options={statusOptions}
                                value={urlInStock ? 'in-stock' : ''}
                                onChange={(v) => setParam('inStock', v === 'in-stock' ? 'true' : '')}
                            />
                            <PillSelect
                                label="Ưu đãi"
                                options={offerOptions}
                                value={urlOffer}
                                onChange={(v) => setParam('offer', v)}
                            />

                            {currentFilterGroups.map((group) => (
                                <PillSelect
                                    key={group.key}
                                    label={group.title}
                                    options={group.options}
                                    value={currentFilterValues[group.key]}
                                    onChange={(v) => setParam(group.key, v)}
                                />
                            ))}
                        </div>

                        {activeFilterChips.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="ts-btn ts-btn-outline w-full"
                            >
                                <i className="fas fa-times text-[10px]"></i>
                                Xóa toàn bộ bộ lọc
                            </button>
                        )}
                    </aside>

                    {/* MAIN */}
                    <div>
                        {activeCategoryName && (
                            <div className="mb-6 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                                <p className="ts-eyebrow text-[var(--color-accent)]">Danh mục</p>
                                <h2 className="ts-display mt-2 text-2xl text-[var(--color-fg)]">{activeCategoryName}</h2>
                                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{activeCategoryDescription}</p>
                            </div>
                        )}

                        <div className="mb-6 flex flex-wrap items-center gap-3">
                            <div className="flex-1">
                                <p className="text-sm text-[var(--color-fg-muted)]">
                                    {keyword
                                        ? <>Kết quả cho <span className="ts-mono text-[var(--color-accent)]">"{keyword}"</span></>
                                        : `Hiển thị ${products.length} / ${totalPages * PAGE_SIZE} sản phẩm`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen((v) => !v)}
                                className="ts-btn ts-btn-outline text-xs lg:hidden"
                            >
                                <i className="fas fa-sliders-h"></i>Bộ lọc
                            </button>
                            <div className="relative">
                                <select
                                    value={urlSortBy}
                                    onChange={(e) => setParam('sort', e.target.value)}
                                    className="ts-input w-auto appearance-none pr-9 text-xs"
                                >
                                    <option value="">Sắp xếp mặc định</option>
                                    <option value="name_desc">Mới nhất</option>
                                    <option value="price_asc">Giá: thấp → cao</option>
                                    <option value="price_desc">Giá: cao → thấp</option>
                                    <option value="name_asc">Tên A → Z</option>
                                </select>
                                <i className="fas fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-fg-dim)]"></i>
                            </div>
                        </div>

                        {activeFilterChips.length > 0 && (
                            <div className="mb-6 flex flex-wrap items-center gap-2">
                                <span className="ts-eyebrow text-[10px]">Bộ lọc:</span>
                                {activeFilterChips.map((chip, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={chip.onRemove}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
                                    >
                                        {chip.label}
                                        <i className="fas fa-times text-[9px]"></i>
                                    </button>
                                ))}
                            </div>
                        )}

                        {loading ? (
                            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="aspect-[3/4] animate-pulse rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]" />
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
                                <i className="fas fa-search text-2xl text-[var(--color-fg-dim)]"></i>
                                <p className="mt-4 text-sm text-[var(--color-fg-muted)]">{t('No products found')}</p>
                                <button onClick={handleClearAll} className="ts-btn ts-btn-ghost mt-4 text-xs">
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                                    {products.map((product) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            onClickCapture={() => recordRecentlyViewed(product)}
                                        >
                                            <ProductCard product={product} />
                                        </motion.div>
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-12 flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            disabled={page === 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-border)] text-xs text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)] disabled:opacity-30"
                                        >
                                            <i className="fas fa-chevron-left"></i>
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                            .reduce((acc, p, idx, arr) => {
                                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((p, idx) =>
                                                p === '...' ? (
                                                    <span key={`e-${idx}`} className="px-2 text-xs text-[var(--color-fg-dim)]">…</span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => setPage(p)}
                                                        className={cn(
                                                            "h-9 min-w-9 rounded-sm border px-2 text-xs transition-colors",
                                                            p === page
                                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-fg)]"
                                                                : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                                                        )}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            )
                                        }
                                        <button
                                            type="button"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-border)] text-xs text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)] disabled:opacity-30"
                                        >
                                            <i className="fas fa-chevron-right"></i>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
};

export default Shop;
