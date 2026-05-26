import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';
import { formatCurrency, resolveProductImage } from '../utils/store';

const CompareContext = createContext(null);
const COMPARE_STORAGE_KEY = 'compareProducts';
const MAX_COMPARE_ITEMS = 2;

const normalizeText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const getCompareCategoryKey = (product) => {
    const text = normalizeText(`${product?.category?.name || ''} ${product?.categoryName || ''} ${product?.category || ''} ${product?.categorySlug || ''} ${product?.name || ''}`);
    if (product?.categoryId === 1 || text.includes('dien thoai') || text.includes('smartphone') || text.includes('phone') || text.includes('iphone') || text.includes('galaxy')) return 'phone';
    if (product?.categoryId === 2 || text.includes('laptop') || text.includes('macbook') || text.includes('thinkpad') || text.includes('vivobook')) return 'laptop';
    if (product?.categoryId === 5 || text.includes('tablet') || text.includes('may tinh bang') || text.includes('ipad')) return 'tablet';
    if (product?.categoryId === 8 || text.includes('tai nghe') || text.includes('headphone') || text.includes('earphone') || text.includes('airpods') || text.includes('bose')) return 'headphone';
    if (product?.categoryId === 6 || text.includes('dong ho thong minh') || text.includes('smartwatch') || text.includes('watch')) return 'smartwatch';
    if (product?.categoryId === 7 || text.includes('may anh') || text.includes('camera') || text.includes('canon') || text.includes('sony a7')) return 'camera';
    return product?.categoryId ? `category-${product.categoryId}` : 'default';
};

const getCategoryLabel = (product) => (
    product?.category?.name || product?.categoryName || 'Sản phẩm chính hãng'
);

const readCompareItems = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((item) => item?.id).slice(0, MAX_COMPARE_ITEMS) : [];
    } catch {
        return [];
    }
};

export const CompareProvider = ({ children }) => {
    const [compareItems, setCompareItems] = useState(() => readCompareItems());
    const [isCompareBarVisible, setIsCompareBarVisible] = useState(false);
    const [isCompareBarCollapsed, setIsCompareBarCollapsed] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [compareNotice, setCompareNotice] = useState('');
    const [catalog, setCatalog] = useState(() => {
        try { return productApi.getLocalCatalog?.() || []; } catch { return []; }
    });
    const navigate = useNavigate();
    const location = useLocation();
    const isCompareRoute = location.pathname === '/compare';

    useEffect(() => {
        localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    }, [compareItems]);

    useEffect(() => {
        let active = true;
        const loadCatalog = async () => {
            try {
                const response = await productApi.getAll({ page: 1, pageSize: 1000 });
                const products = response.data?.items || [];
                if (active && products.length) setCatalog(products);
            } catch {
                // local catalog remains available as fallback
            }
        };
        loadCatalog();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!compareNotice) return undefined;
        const timeout = setTimeout(() => setCompareNotice(''), 2400);
        return () => clearTimeout(timeout);
    }, [compareNotice]);

    useEffect(() => {
        if (compareItems.length === 0 || isCompareRoute) {
            setIsCompareBarVisible(false);
            setPickerOpen(false);
        }
    }, [compareItems.length, isCompareRoute]);

    const addToCompare = (product) => {
        if (!product?.id) return false;
        setIsCompareBarVisible(true);
        let added = false;
        setCompareItems((current) => {
            if (current.some((item) => item.id === product.id)) {
                setCompareNotice('Sản phẩm đã có trong danh sách so sánh');
                return current;
            }
            if (current.length > 0 && getCompareCategoryKey(current[0]) !== getCompareCategoryKey(product)) {
                setCompareNotice('Chỉ có thể so sánh các sản phẩm cùng danh mục');
                return current;
            }
            if (current.length >= MAX_COMPARE_ITEMS) {
                setCompareNotice('Chỉ có thể so sánh tối đa 2 sản phẩm');
                return current;
            }
            added = true;
            return [...current, product];
        });
        setIsCompareBarCollapsed(false);
        setPickerOpen(false);
        if (added) setCompareNotice('Đã thêm sản phẩm vào so sánh');
        return added;
    };

    const toggleCompare = (product) => addToCompare(product);

    const removeFromCompare = (productId) => {
        setCompareItems((current) => {
            const nextItems = current.filter((item) => item.id !== productId);
            if (nextItems.length === 0) {
                setIsCompareBarVisible(false);
                setPickerOpen(false);
            }
            return nextItems;
        });
    };

    const clearCompare = () => {
        setCompareItems([]);
        setIsCompareBarVisible(false);
        setPickerOpen(false);
    };

    const isInCompare = (productId) => compareItems.some((item) => item.id === productId);

    const sameCategoryProducts = useMemo(() => {
        if (!compareItems.length) return [];
        const categoryKey = getCompareCategoryKey(compareItems[0]);
        const selectedIds = new Set(compareItems.map((item) => item.id));
        return catalog
            .filter((product) => product?.id && !selectedIds.has(product.id) && getCompareCategoryKey(product) === categoryKey)
            .slice(0, 8);
    }, [catalog, compareItems]);

    const goToCompare = () => {
        if (compareItems.length < 2) {
            setCompareNotice('Vui lòng chọn thêm 1 sản phẩm để so sánh');
            return;
        }
        setPickerOpen(false);
        navigate('/compare');
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    const value = {
        compareItems,
        compareCount: compareItems.length,
        addToCompare,
        toggleCompare,
        isInCompare,
        removeFromCompare,
        clearCompare,
        getCompareCategoryKey,
    };

    return (
        <CompareContext.Provider value={value}>
            {children}
            {isCompareBarVisible && !isCompareRoute && compareItems.length > 0 && (
                <div className="fixed inset-x-4 bottom-4 z-[55] mx-auto max-w-5xl">
                    {compareNotice && (
                        <div className="mb-2 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-center text-xs text-[var(--color-fg)] backdrop-blur-md">
                            {compareNotice}
                        </div>
                    )}
                    {isCompareBarCollapsed ? (
                        <button
                            type="button"
                            onClick={() => setIsCompareBarCollapsed(false)}
                            className="ts-btn ts-btn-primary mx-auto flex shadow-2xl"
                        >
                            <i className="fas fa-random text-xs"></i>
                            So sánh sản phẩm ({compareItems.length})
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 shadow-2xl backdrop-blur-md md:flex-row md:items-center md:gap-4">
                            <div className="flex flex-1 flex-wrap items-center gap-3">
                                {compareItems.map((item) => (
                                    <div key={item.id} className="relative flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] p-2 pr-7">
                                        <button
                                            type="button"
                                            aria-label="Xóa khỏi so sánh"
                                            onClick={() => removeFromCompare(item.id)}
                                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[10px] text-[var(--color-fg-muted)] hover:bg-[var(--color-danger)] hover:text-white"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                        <img src={resolveProductImage(item)} alt={item.name || 'Sản phẩm'} className="h-10 w-10 rounded-sm object-contain" />
                                        <div className="min-w-0 max-w-[140px]">
                                            <strong className="block truncate text-xs text-[var(--color-fg)]">{item.name || item.title}</strong>
                                            <span className="block truncate text-[10px] uppercase tracking-wider text-[var(--color-fg-dim)]">{getCategoryLabel(item)}</span>
                                        </div>
                                    </div>
                                ))}

                                {compareItems.length < MAX_COMPARE_ITEMS && (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setPickerOpen((open) => !open)}
                                            className="flex items-center gap-2 rounded-sm border border-dashed border-[var(--color-border-strong)] px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
                                        >
                                            <i className="fas fa-plus text-[10px]"></i>
                                            <span>Thêm sản phẩm</span>
                                        </button>
                                        {pickerOpen && (
                                            <div className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
                                                <div className="border-b border-[var(--color-border)] px-3 py-2">
                                                    <p className="ts-eyebrow text-[10px]">Chọn sản phẩm cùng danh mục</p>
                                                </div>
                                                {sameCategoryProducts.length > 0 ? (
                                                    <div className="max-h-72 overflow-y-auto p-2">
                                                        {sameCategoryProducts.map((product) => (
                                                            <div key={product.id} className="flex items-center gap-2 rounded-sm p-2 hover:bg-[var(--color-surface-2)]">
                                                                <img src={resolveProductImage(product)} alt={product.name} className="h-10 w-10 shrink-0 rounded-sm object-contain" />
                                                                <div className="min-w-0 flex-1">
                                                                    <strong className="block truncate text-xs text-[var(--color-fg)]">{product.name || product.title}</strong>
                                                                    <span className="ts-mono block text-[11px] text-[var(--color-accent)]">{formatCurrency(product.price)}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addToCompare(product)}
                                                                    className="rounded-sm border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-fg-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
                                                                >
                                                                    Chọn
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="p-4 text-xs text-[var(--color-fg-dim)]">Không có sản phẩm cùng danh mục để chọn.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 md:flex-col md:items-end lg:flex-row">
                                <span className="text-xs text-[var(--color-fg-dim)]">Đã chọn {compareItems.length} sản phẩm</span>
                                <button
                                    type="button"
                                    onClick={() => setIsCompareBarCollapsed(true)}
                                    className="ts-btn ts-btn-ghost px-3 py-1.5 text-xs"
                                >
                                    Thu gọn
                                </button>
                                <button
                                    type="button"
                                    disabled={compareItems.length < 2}
                                    onClick={goToCompare}
                                    className="ts-btn ts-btn-primary px-3 py-1.5 text-xs"
                                >
                                    So sánh
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </CompareContext.Provider>
    );
};

export const useCompare = () => {
    const context = useContext(CompareContext);
    if (!context) {
        throw new Error('useCompare must be used within CompareProvider');
    }
    return context;
};
