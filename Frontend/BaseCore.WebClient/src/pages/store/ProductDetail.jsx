import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { productApi } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCompare } from '../../contexts/CompareContext';
import PageHero from '../../components/store/PageHero';
import ProductCard from '../../components/store/ProductCard';
import coupons from '../../data/coupons';
import { canClaimCoupon, claimCoupon, getAvailableCouponsForProduct, getClaimedCoupons, getCouponClaimStatus, isCouponClaimed } from '../../utils/couponUtils';
import { formatCurrency, resolveProductImage, setPageMeta, t } from '../../utils/store';
import { cn } from '../../utils/cn';

const RECENTLY_VIEWED_KEY = 'recentlyViewedProducts';
const PRODUCT_DETAIL_CACHE_KEY = 'electro_product_detail_cache';

const safeParseJson = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
};

const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const normalizeRecentProduct = (p) => p ? ({
    id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl,
    categoryId: p.categoryId, category: p.category, brand: p.brand,
}) : null;

const getProductDetailCache = () => {
    const cached = safeParseJson(sessionStorage.getItem(PRODUCT_DETAIL_CACHE_KEY) || '{}', {});
    return cached && typeof cached === 'object' && !Array.isArray(cached) ? cached : {};
};

const cacheProductDetail = (product) => {
    if (!product?.id) return;
    const cached = getProductDetailCache();
    sessionStorage.setItem(PRODUCT_DETAIL_CACHE_KEY, JSON.stringify({ ...cached, [product.id]: product }));
};

const getInstantProduct = (productId) => {
    const cached = getProductDetailCache()[productId];
    if (cached?.id && Array.isArray(cached.specs) && cached.specs.length > 0) return cached;
    return productApi.getLocalCatalog?.().find((item) => item.id === productId) || null;
};

const getRelatedProductsFromLocalCatalog = (product) => {
    if (!product?.categoryId) return [];
    return (productApi.getLocalCatalog?.() || [])
        .filter((item) => item.categoryId === product.categoryId && item.id !== product.id)
        .slice(0, 4);
};

const rememberRecentProduct = (product) => {
    const normalized = normalizeRecentProduct(product);
    if (!normalized?.id) return;
    const current = safeParseJson(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]', []);
    const withoutDup = Array.isArray(current) ? current.filter((p) => p?.id !== normalized.id) : [];
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify([normalized, ...withoutDup].slice(0, 6)));
};

const compactValue = (value) => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(compactValue).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        return Object.entries(value).map(([k, v]) => {
            const text = compactValue(v);
            return text ? `${k}: ${text}` : '';
        }).filter(Boolean).join(', ');
    }
    return String(value).trim();
};

const fixText = (value) => compactValue(value);

const inferBrandFromName = (name) => {
    const text = String(name || '').toLowerCase();
    const brands = ['Apple', 'Samsung', 'Xiaomi', 'Dell', 'Asus', 'HP', 'Lenovo', 'Canon', 'Sony', 'JBL', 'Bose', 'OnePlus', 'Nothing'];
    return brands.find((b) => text.includes(b.toLowerCase())) || '';
};

const getCategoryType = (product) => {
    const cat = normalizeText(`${product?.category?.name || ''} ${product?.categoryName || ''} ${product?.category || ''}`);
    const name = normalizeText(product?.name);
    if (cat.includes('dien thoai') || cat.includes('phone') || name.includes('iphone')) return 'phone';
    if (cat.includes('laptop') || name.includes('macbook')) return 'laptop';
    if (cat.includes('tablet') || name.includes('ipad')) return 'tablet';
    if (cat.includes('smartwatch') || cat.includes('watch')) return 'smartwatch';
    if (cat.includes('camera') || name.includes('eos')) return 'camera';
    if (cat.includes('headphone') || cat.includes('tai nghe') || name.includes('airpods')) return 'headphone';
    return 'default';
};

export const getProductSpecs = (product) => {
    if (!product) return [];
    const specs = Array.isArray(product.specs) ? product.specs
        : Array.isArray(product.specValues) ? product.specValues
        : Array.isArray(product.productSpecValues) ? product.productSpecValues : [];
    return specs.map((item) => ({
        label: fixText(item.name || item.label || item.specName || ''),
        value: item.unit ? `${fixText(item.value ?? item.optionValue ?? '')} ${fixText(item.unit)}` : fixText(item.value ?? item.optionValue ?? ''),
    })).filter((s) => s.label && s.value);
};

const getProductDescriptionParts = (product) => {
    const parts = [];
    const description = fixText(product?.longDescription) || fixText(product?.description);
    if (description) parts.push(description);
    [product?.highlights, product?.features].forEach((value) => {
        if (Array.isArray(value)) {
            const items = value.map(compactValue).filter(Boolean);
            if (items.length) parts.push(items);
            return;
        }
        const text = compactValue(value);
        if (text) parts.push(text);
    });
    return parts;
};

const getRelatedProducts = (product, catalog) => {
    const brand = product?.brand || inferBrandFromName(product?.name);
    const price = Number(product?.price || 0);
    return catalog.filter((item) => item.id !== product?.id)
        .map((item) => {
            const itemBrand = item.brand || inferBrandFromName(item.name);
            const itemPrice = Number(item.price || 0);
            let score = 0;
            if (item.categoryId === product?.categoryId) score += 4;
            if (brand && itemBrand === brand) score += 3;
            if (price && itemPrice && Math.abs(itemPrice - price) / price <= 0.25) score += 2;
            return { item, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
        .slice(0, 4);
};

const ratingLabels = { 1: 'Rất tệ', 2: 'Tệ', 3: 'Bình thường', 4: 'Tốt', 5: 'Tuyệt vời' };

const reviewCriteria = {
    phone: ['Hiệu năng', 'Pin', 'Camera'],
    laptop: ['Hiệu năng', 'Màn hình', 'Pin'],
    tablet: ['Màn hình', 'Pin', 'Hiệu năng'],
    headphone: ['Âm thanh', 'Chống ồn', 'Pin'],
    smartwatch: ['Sức khỏe', 'Pin', 'Thiết kế'],
    camera: ['Hình ảnh', 'Quay video', 'Tiện dụng'],
    default: ['Chất lượng', 'Trải nghiệm', 'Thiết kế'],
};

const normalizeReview = (review, index = 0) => {
    const rating = Math.max(1, Math.min(5, Number(review?.rating || review?.stars || 5)));
    return {
        id: review?.id || `review-${index}`,
        customerName: fixText(review?.customerName || review?.userName || 'Khách hàng'),
        rating,
        date: fixText(review?.date || 'Gần đây'),
        content: fixText(review?.content || review?.comment || review?.message || ''),
        experienceRatings: review?.experienceRatings && typeof review.experienceRatings === 'object' ? review.experienceRatings : {},
        images: Array.isArray(review?.images) ? review.images.filter(Boolean) : [],
        tags: Array.isArray(review?.tags) ? review.tags.filter(Boolean) : [],
    };
};

const normalizeQuestion = (item, index = 0) => {
    if (!item) return null;
    const rawAnswer = item.answer || item.reply || (Array.isArray(item.answers) ? item.answers[0] : null);
    const answer = rawAnswer ? {
        adminName: fixText(rawAnswer.adminName || 'Quản trị viên'),
        content: fixText(rawAnswer.content || rawAnswer.answer || rawAnswer),
        createdAt: rawAnswer.createdAt || rawAnswer.date,
    } : null;
    const question = compactValue(item.question || item.content || item.message);
    if (!question) return null;
    return {
        id: item.id || `question-${index}`,
        customerName: fixText(item.customerName || 'Khách hàng'),
        question: fixText(question),
        createdAt: item.createdAt || item.date,
        answer: answer?.content ? answer : null,
    };
};

const formatRelativeTime = (value) => {
    if (!value) return 'Vừa xong';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60_000) return 'Vừa xong';
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 24) return `${Math.max(1, hours)} giờ trước`;
    return `${Math.max(1, Math.floor(hours / 24))} ngày trước`;
};

const getOptionLabel = (option, fallback = '') => fixText(
    typeof option === 'object'
        ? option.label || option.name || option.value || option.version || option.storage || option.title || fallback
        : option
);

const normalizeVersionOption = (option, index = 0) => {
    if (typeof option === 'string' || typeof option === 'number') return { id: `version-${option}`, label: String(option) };
    if (!option || typeof option !== 'object') return null;
    const label = getOptionLabel(option, `Phiên bản ${index + 1}`);
    if (!label) return null;
    return { id: option.id || option.sku || `version-${label}`, label, price: option.price, oldPrice: option.oldPrice, stock: option.stock, sku: option.sku, image: option.image || option.imageUrl };
};

const normalizeColorOption = (option, index = 0) => {
    if (typeof option === 'string' || typeof option === 'number') return { id: `color-${option}`, label: String(option) };
    if (!option || typeof option !== 'object') return null;
    const label = getOptionLabel(option, `Màu ${index + 1}`);
    if (!label) return null;
    return { id: option.id || option.sku || `color-${label}`, label, colorCode: option.colorCode || option.hex, price: option.price, oldPrice: option.oldPrice, stock: option.stock, sku: option.sku, image: option.image || option.imageUrl };
};

const uniqueOptions = (options) => {
    const seen = new Set();
    return options.filter((o) => {
        if (!o?.label) return false;
        const key = normalizeText(o.label);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const getProductVersions = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    return uniqueOptions(variants.map((v, i) => normalizeVersionOption({ ...v, label: v.variantName || v.version || v.storage || v.label || v.name }, i)).filter(Boolean));
};

const getProductColors = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    return uniqueOptions(variants.map((v, i) => normalizeColorOption({ ...v, label: v.colorName || v.color || v.label || v.name }, i)).filter(Boolean));
};

const findSelectedVariant = (product, sv, sc) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return null;
    const versionText = normalizeText(sv?.label);
    const colorText = normalizeText(sc?.label);
    return variants.find((v) => {
        const vVer = normalizeText(v.variantName || v.version || v.storage || v.label || v.name);
        const vCol = normalizeText(v.colorName || v.color);
        return (!versionText || vVer === versionText) && (!colorText || vCol === colorText);
    }) || null;
};

const Stars = ({ value = 5, size = 'sm' }) => (
    <div className={cn("inline-flex items-center gap-0.5", size === 'sm' ? "text-xs" : "text-base")} aria-label={`${value} star rating`}>
        {Array.from({ length: 5 }).map((_, i) => (
            <i key={i} className={cn(i < Math.round(value) ? "fas fa-star text-[var(--color-gold)]" : "far fa-star text-[var(--color-fg-dim)]")}></i>
        ))}
    </div>
);

const StarPicker = ({ value, onChange, labels = ratingLabels }) => (
    <div className="flex items-center gap-3">
        <div role="radiogroup" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    aria-label={`${star} sao`}
                    onClick={() => onChange(star)}
                    className={cn(
                        "text-lg transition-colors",
                        star <= value ? "text-[var(--color-gold)]" : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)]"
                    )}
                >
                    <i className="fas fa-star"></i>
                </button>
            ))}
        </div>
        <span className="text-xs text-[var(--color-fg-muted)]">{value ? labels[value] : 'Chưa chọn'}</span>
    </div>
);

const ProductDetail = () => {
    const { id } = useParams();
    const { addItem } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { toggleCompare, isInCompare } = useCompare();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [addedMsg, setAddedMsg] = useState('');
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
    const [activeImage, setActiveImage] = useState('');
    const [claimedCouponIds, setClaimedCouponIds] = useState([]);
    const [couponMsg, setCouponMsg] = useState('');
    const [activeTab, setActiveTab] = useState('description');
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [temporaryReviews, setTemporaryReviews] = useState([]);
    const [reviewMsg, setReviewMsg] = useState('');
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [experienceRatings, setExperienceRatings] = useState({});
    const [reviewContent, setReviewContent] = useState('');
    const [reviewImages, setReviewImages] = useState([]);
    const [reviewError, setReviewError] = useState('');
    const [temporaryQuestions, setTemporaryQuestions] = useState([]);
    const [questionInput, setQuestionInput] = useState('');
    const [questionError, setQuestionError] = useState('');
    const [questionMsg, setQuestionMsg] = useState('');
    const [expandedQuestionIds, setExpandedQuestionIds] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);

    const numericId = useMemo(() => Number(id), [id]);
    const productImage = useMemo(() => {
        try { return resolveProductImage(product); }
        catch { return '/electro/img/product-1.png'; }
    }, [product]);

    const productName = fixText(product?.name);
    const productCategoryName = fixText(product?.category?.name || product?.categoryName || product?.category || 'Electronics');
    const productVersions = useMemo(() => getProductVersions(product), [product]);
    const productColors = useMemo(() => getProductColors(product), [product]);
    const selectedVariant = useMemo(() => findSelectedVariant(product, selectedVersion, selectedColor), [product, selectedVersion, selectedColor]);
    const productStock = Number(selectedVariant?.stock ?? selectedVersion?.stock ?? selectedColor?.stock ?? product?.stock ?? 0);
    const productPrice = Number(selectedVariant?.price ?? selectedVersion?.price ?? selectedColor?.price ?? product?.price ?? 0);
    const productDescription = fixText(product?.longDescription || product?.description);
    const oldPrice = selectedVariant?.originalPrice ?? selectedVariant?.oldPrice ?? selectedVersion?.oldPrice ?? selectedColor?.oldPrice ?? product?.originalPrice ?? product?.oldPrice ?? 0;
    const displaySku = selectedVariant?.sku || selectedVersion?.sku || selectedColor?.sku || product?.sku || product?.id;
    const selectedImage = selectedVariant?.imageUrl || selectedVariant?.image || selectedColor?.image || selectedVersion?.image || '';
    const displayImage = selectedImage ? resolveProductImage({ id: product?.id, imageUrl: selectedImage }) : productImage;
    const galleryImages = useMemo(() => {
        const productImages = Array.isArray(product?.images) ? product.images.map((i) => i.imageUrl || i.url) : [];
        const variantImages = Array.isArray(product?.variants) ? product.variants.map((v) => v.imageUrl || v.image) : [];
        const images = [
            displayImage, productImage,
            ...productImages.map((u) => resolveProductImage({ id: product?.id, imageUrl: u })),
            ...variantImages.map((u) => resolveProductImage({ id: product?.id, imageUrl: u })),
        ];
        return [...new Set(images.filter(Boolean))];
    }, [displayImage, productImage, product]);
    const localCatalog = useMemo(() => productApi.getLocalCatalog?.() || [], [product?.id]);
    const productSpecifications = useMemo(() => getProductSpecs(product), [product]);
    const descriptionParts = useMemo(() => getProductDescriptionParts(product), [product]);
    const reviewExperienceItems = useMemo(() => reviewCriteria[getCategoryType(product)] || reviewCriteria.default, [product]);
    const productReviews = useMemo(() => {
        const raw = Array.isArray(product?.reviews) ? product.reviews : [];
        return [...temporaryReviews, ...raw.map(normalizeReview)].filter((r) => r.content);
    }, [product, temporaryReviews]);
    const reviewSummary = useMemo(() => {
        if (!productReviews.length) return { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
        const distribution = productReviews.reduce((acc, r) => {
            const s = Math.round(r.rating);
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
        const average = productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length;
        return { average, total: productReviews.length, distribution };
    }, [productReviews]);
    const visibleReviews = showAllReviews ? productReviews : productReviews.slice(0, 3);
    const productQuestions = useMemo(() => {
        const raw = Array.isArray(product?.questions) ? product.questions : Array.isArray(product?.qna) ? product.qna : [];
        return [...temporaryQuestions, ...raw.map(normalizeQuestion).filter(Boolean)];
    }, [product, temporaryQuestions]);
    const computedRelatedProducts = useMemo(() => {
        const scored = getRelatedProducts(product, localCatalog);
        return scored.length ? scored : relatedProducts.slice(0, 4);
    }, [product, localCatalog, relatedProducts]);
    const productCouponContext = useMemo(() => ({
        product, subtotal: productPrice,
        cartItems: product ? [{ product, quantity: 1 }] : [],
        currentHour: new Date().getHours(),
    }), [product, productPrice]);
    const productCoupons = useMemo(() => getAvailableCouponsForProduct(product, coupons, productCouponContext), [product, productCouponContext]);
    const visibleProductCoupons = productCoupons.slice(0, 3);

    useEffect(() => {
        setPageMeta({ title: `${t('Product Details')} | TechStore`, description: t('Product meta description') });
        setClaimedCouponIds(getClaimedCoupons());
    }, []);

    useEffect(() => {
        if (!Number.isFinite(numericId) || numericId <= 0) {
            setError(t('Product not found'));
            setProduct(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        const instantProduct = getInstantProduct(numericId);

        setError(''); setQuantity(1); setAddedMsg(''); setCouponMsg('');
        setShowAllReviews(false); setReviewMsg(''); setReviewModalOpen(false);
        setReviewRating(0); setExperienceRatings({}); setReviewContent('');
        setReviewImages([]); setReviewError(''); setTemporaryReviews([]);
        setTemporaryQuestions([]); setQuestionInput(''); setQuestionError('');
        setQuestionMsg(''); setExpandedQuestionIds([]);
        setSelectedVersion(null); setSelectedColor(null);
        setActiveTab('description');

        if (instantProduct) {
            setProduct(instantProduct);
            setRelatedProducts(getRelatedProductsFromLocalCatalog(instantProduct));
            rememberRecentProduct(instantProduct);
            setRecentlyViewedProducts(safeParseJson(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]', []).filter((i) => i?.id !== instantProduct.id).slice(0, 4));
            cacheProductDetail(instantProduct);
        }

        const loadProduct = async () => {
            setLoading(!instantProduct);
            try {
                const response = await productApi.getById(numericId);
                const data = response.data;
                if (cancelled) return;
                if (!data?.id) {
                    setError(t('Product not found'));
                    setProduct(null);
                    setRelatedProducts([]);
                    return;
                }
                setProduct(data);
                setRelatedProducts(getRelatedProductsFromLocalCatalog(data));
                rememberRecentProduct(data);
                setRecentlyViewedProducts(safeParseJson(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]', []).filter((i) => i?.id !== data.id).slice(0, 4));
                cacheProductDetail(data);
            } catch (e) {
                if (cancelled) return;
                const data = e.response?.data;
                setError(data?.message || data?.detail || data?.title || t('Unable to load product.'));
                setProduct(null);
                setRelatedProducts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadProduct();
        return () => { cancelled = true; };
    }, [numericId]);

    useEffect(() => { setActiveImage(displayImage); }, [displayImage]);

    useEffect(() => {
        if (!reviewModalOpen) return undefined;
        const handleEscape = (e) => { if (e.key === 'Escape') setReviewModalOpen(false); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [reviewModalOpen]);

    const handleAddToCart = () => {
        if (productStock <= 0 || quantity < 1) return;
        if (productVersions.length && !selectedVersion) {
            setAddedMsg('Vui lòng chọn phiên bản.');
            setTimeout(() => setAddedMsg(''), 2500);
            return;
        }
        if (productColors.length && !selectedColor) {
            setAddedMsg('Vui lòng chọn màu sắc.');
            setTimeout(() => setAddedMsg(''), 2500);
            return;
        }
        addItem({
            ...product, id: product.id, productId: product.id,
            variantId: selectedVariant?.id,
            selectedVersion: selectedVersion?.label || '',
            selectedColor: selectedColor?.label || '',
            price: productPrice, oldPrice, stock: productStock,
            sku: displaySku, image: displayImage, imageUrl: displayImage,
            name: [product.name, selectedVersion?.label, selectedColor?.label].filter(Boolean).join(' - '),
        }, quantity);
        setAddedMsg(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
        setTimeout(() => setAddedMsg(''), 2500);
    };

    const showCouponMessage = (msg) => {
        setCouponMsg(msg);
        setTimeout(() => setCouponMsg(''), 2500);
    };

    const handleClaimCoupon = (coupon) => {
        if (!canClaimCoupon(coupon, productCouponContext)) {
            showCouponMessage(getCouponClaimStatus(coupon, productCouponContext).message || 'Chưa đủ điều kiện');
            return;
        }
        const result = claimCoupon(coupon.id);
        setClaimedCouponIds(getClaimedCoupons());
        showCouponMessage(result.success ? 'Đã lưu phiếu vào ví' : fixText(result.message));
    };

    const changeActiveImage = (direction) => {
        const currentIndex = Math.max(0, galleryImages.indexOf(activeImage));
        const nextIndex = (currentIndex + direction + galleryImages.length) % galleryImages.length;
        setActiveImage(galleryImages[nextIndex]);
    };

    const openReviewModal = () => {
        setReviewError(''); setReviewMsg('');
        setReviewModalOpen(true);
    };

    const handleReviewImageChange = (event) => {
        const files = Array.from(event.target.files || []).slice(0, Math.max(0, 3 - reviewImages.length));
        const nextImages = files.map((f) => ({ id: `${f.name}-${f.lastModified}-${Date.now()}`, name: f.name, preview: URL.createObjectURL(f) }));
        setReviewImages((c) => [...c, ...nextImages].slice(0, 3));
        event.target.value = '';
    };

    const removeReviewImage = (imageId) => {
        setReviewImages((current) => {
            const removed = current.find((i) => i.id === imageId);
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return current.filter((i) => i.id !== imageId);
        });
    };

    const handleSubmitReview = (e) => {
        e.preventDefault();
        const content = reviewContent.trim();
        if (!reviewRating) return setReviewError('Vui lòng chọn đánh giá chung.');
        if (content.length < 15) return setReviewError('Vui lòng nhập nhận xét tối thiểu 15 ký tự.');
        const newReview = normalizeReview({
            id: `temp-review-${Date.now()}`,
            customerName: 'Khách hàng',
            rating: reviewRating,
            date: new Date().toLocaleDateString('vi-VN'),
            createdAt: new Date().toISOString(),
            content, experienceRatings,
            images: reviewImages.map((i) => i.preview),
        });
        setTemporaryReviews((c) => [newReview, ...c]);
        setReviewRating(0); setExperienceRatings({}); setReviewContent('');
        setReviewImages([]); setReviewError(''); setReviewModalOpen(false);
        setReviewMsg('Cảm ơn bạn đã gửi đánh giá.');
    };

    const toggleQuestionAnswer = (id) => {
        setExpandedQuestionIds((c) => c.includes(id) ? c.filter((i) => i !== id) : [...c, id]);
    };

    const handleSubmitQuestion = (e) => {
        e.preventDefault();
        const question = questionInput.trim();
        if (question.length < 10) {
            setQuestionError('Vui lòng nhập câu hỏi tối thiểu 10 ký tự.');
            setQuestionMsg('');
            return;
        }
        setTemporaryQuestions((c) => [{
            id: `temp-question-${Date.now()}`,
            customerName: 'Khách hàng',
            question, createdAt: new Date().toISOString(),
            answer: null,
        }, ...c]);
        setQuestionInput(''); setQuestionError('');
        setQuestionMsg('Câu hỏi của bạn đã được gửi.');
    };

    if (loading) {
        return (
            <>
                <PageHero title={t('Product Details')} current={t('Product Details')} kicker="Product" />
                <section className="ts-container py-12">
                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="aspect-square animate-pulse rounded-md bg-[var(--color-surface)]" />
                        <div className="space-y-4">
                            <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--color-surface)]" />
                            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-surface)]" />
                            <div className="h-12 w-1/4 animate-pulse rounded bg-[var(--color-surface)]" />
                        </div>
                    </div>
                </section>
            </>
        );
    }

    if (error || !product) {
        return (
            <>
                <PageHero title={t('Product Details')} current={t('Product Details')} kicker="Product" />
                <section className="ts-container flex flex-col items-center py-20 text-center">
                    <i className="fas fa-exclamation-circle text-4xl text-[var(--color-fg-dim)]"></i>
                    <p className="mt-6 text-sm text-[var(--color-fg-muted)]">{error || t('Product not found')}</p>
                    <Link to="/shop" className="ts-btn ts-btn-primary mt-6">{t('Back to Shop')}</Link>
                </section>
            </>
        );
    }

    return (
        <>
            <PageHero title={t('Product Details')} current={productName || t('Product Details')} kicker="Product" />

            <section className="ts-container py-12">
                {/* Breadcrumb */}
                <nav aria-label="breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-[var(--color-fg-dim)]">
                    <Link to="/" className="hover:text-[var(--color-accent)]">{t('Home')}</Link>
                    <span className="text-[var(--color-border-strong)]">·</span>
                    <Link to={`/shop?categoryId=${product.categoryId || ''}`} className="hover:text-[var(--color-accent)]">{productCategoryName}</Link>
                    <span className="text-[var(--color-border-strong)]">·</span>
                    <span className="truncate text-[var(--color-fg)]">{productName}</span>
                </nav>

                {/* Main grid */}
                <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
                    {/* Gallery */}
                    <div>
                        <div className="relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <img src={activeImage || productImage} alt={productName} className="h-full w-full object-contain p-12" />
                            {galleryImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => changeActiveImage(-1)}
                                        aria-label="Ảnh trước"
                                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)]/80 text-[var(--color-fg-muted)] backdrop-blur-md transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                    >
                                        <i className="fas fa-chevron-left text-xs"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => changeActiveImage(1)}
                                        aria-label="Ảnh sau"
                                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)]/80 text-[var(--color-fg-muted)] backdrop-blur-md transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                    >
                                        <i className="fas fa-chevron-right text-xs"></i>
                                    </button>
                                </>
                            )}
                        </div>
                        {galleryImages.length > 1 && (
                            <div className="mt-4 flex gap-2 overflow-x-auto">
                                {galleryImages.map((image) => (
                                    <button
                                        key={image}
                                        type="button"
                                        onClick={() => setActiveImage(image)}
                                        className={cn(
                                            "h-20 w-20 shrink-0 overflow-hidden rounded-sm border-2 bg-[var(--color-surface)] p-1 transition-all",
                                            activeImage === image ? "border-[var(--color-primary)]" : "border-[var(--color-border)] opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img src={image} alt="" className="h-full w-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div>
                        <p className="ts-eyebrow text-[var(--color-accent)]">{productCategoryName}</p>
                        <h1 className="ts-display mt-3 text-3xl text-[var(--color-fg)] md:text-4xl">{productName}</h1>

                        <div className="mt-4 flex items-center gap-3">
                            <Stars value={reviewSummary.average || 4} />
                            <span className="text-xs text-[var(--color-fg-dim)]">
                                {reviewSummary.total > 0 ? `${reviewSummary.total} đánh giá` : 'Chưa có đánh giá'}
                            </span>
                        </div>

                        <div className="mt-6 flex items-baseline gap-3">
                            <span className="ts-mono text-4xl font-semibold ts-gradient-text">{formatCurrency(productPrice)}</span>
                            {oldPrice > productPrice && (
                                <del className="ts-mono text-base text-[var(--color-fg-dim)]">{formatCurrency(oldPrice)}</del>
                            )}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-[var(--color-border)] py-4 text-xs">
                            <div>
                                <p className="ts-eyebrow text-[10px]">SKU</p>
                                <p className="ts-mono mt-1 text-[var(--color-fg-muted)]">{displaySku}</p>
                            </div>
                            <div>
                                <p className="ts-eyebrow text-[10px]">Tình trạng</p>
                                <p className={cn("mt-1 font-medium", productStock > 0 ? "text-emerald-400" : "text-red-400")}>
                                    {productStock > 0 ? `${t('In Stock')} (${productStock})` : t('Out of Stock')}
                                </p>
                            </div>
                        </div>

                        {/* Versions */}
                        {productVersions.length > 0 && (
                            <div className="mt-6">
                                <p className="ts-eyebrow mb-3 text-[10px]">Phiên bản</p>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                    {productVersions.map((version) => {
                                        const active = selectedVersion?.id === version.id;
                                        const oos = version.stock === 0;
                                        return (
                                            <button
                                                key={version.id}
                                                type="button"
                                                onClick={() => setSelectedVersion(version)}
                                                disabled={oos}
                                                className={cn(
                                                    "flex flex-col items-start rounded-sm border p-3 text-left transition-all",
                                                    active
                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                                                    oos && "opacity-50"
                                                )}
                                            >
                                                <strong className="text-sm text-[var(--color-fg)]">{version.label}</strong>
                                                {version.price != null && (
                                                    <span className="ts-mono mt-1 text-xs text-[var(--color-accent)]">{formatCurrency(version.price)}</span>
                                                )}
                                                {oos && <em className="mt-1 text-[10px] not-italic text-red-400">Hết hàng</em>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Colors */}
                        {productColors.length > 0 && (
                            <div className="mt-6">
                                <p className="ts-eyebrow mb-3 text-[10px]">Màu sắc</p>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                    {productColors.map((color) => {
                                        const active = selectedColor?.id === color.id;
                                        const colorImage = color.image ? resolveProductImage({ id: product.id, imageUrl: color.image }) : '';
                                        return (
                                            <button
                                                key={color.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedColor(color);
                                                    if (colorImage) setActiveImage(colorImage);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2 rounded-sm border p-2 text-left transition-all",
                                                    active ? "border-[var(--color-primary)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                                                )}
                                            >
                                                {colorImage ? (
                                                    <img src={colorImage} alt="" className="h-8 w-8 rounded-sm object-contain" />
                                                ) : (
                                                    <span className="h-6 w-6 rounded-sm border border-[var(--color-border)]" style={{ backgroundColor: color.colorCode || '#333' }} />
                                                )}
                                                <span className="min-w-0">
                                                    <strong className="block truncate text-xs text-[var(--color-fg)]">{color.label}</strong>
                                                    {color.price != null && <small className="ts-mono block text-[10px] text-[var(--color-accent)]">{formatCurrency(color.price)}</small>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quantity + Add to Cart */}
                        <div className="mt-8 flex items-center gap-3">
                            <div className="flex items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                                    disabled={quantity <= 1}
                                    aria-label="Giảm"
                                    className="flex h-11 w-11 items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-40"
                                >
                                    <i className="fas fa-minus text-xs"></i>
                                </button>
                                <span className="ts-mono w-12 text-center text-sm font-semibold text-[var(--color-fg)]">{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((v) => Math.min(productStock, v + 1))}
                                    disabled={productStock <= 0 || quantity >= productStock}
                                    aria-label="Tăng"
                                    className="flex h-11 w-11 items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-40"
                                >
                                    <i className="fas fa-plus text-xs"></i>
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={productStock <= 0}
                                className="ts-btn ts-btn-primary h-11 flex-1 px-6 text-sm"
                            >
                                <i className="fas fa-shopping-cart"></i>
                                {t('Add To Cart')}
                            </button>
                        </div>

                        {addedMsg && (
                            <div className="mt-3 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
                                <i className="fas fa-check-circle mr-2"></i>{addedMsg}
                            </div>
                        )}

                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => toggleWishlist(product)}
                                className={cn(
                                    "ts-btn flex-1 text-xs",
                                    isInWishlist(product.id) ? "ts-btn-primary" : "ts-btn-outline"
                                )}
                            >
                                <i className={isInWishlist(product.id) ? "fas fa-heart" : "far fa-heart"}></i>
                                {t('Wishlist')}
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleCompare(product)}
                                className={cn(
                                    "ts-btn flex-1 text-xs",
                                    isInCompare(product.id) ? "ts-btn-primary" : "ts-btn-outline"
                                )}
                            >
                                <i className="fas fa-random"></i>
                                {t('Compare')}
                            </button>
                        </div>

                        {/* Coupons */}
                        {productCoupons.length > 0 && (
                            <div className="mt-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="ts-eyebrow text-[var(--color-accent)]">Phiếu giảm giá</p>
                                    <Link to="/promotion" className="text-[11px] text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]">Xem thêm</Link>
                                </div>
                                {couponMsg && (
                                    <div className="mb-3 rounded-sm border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-2 text-xs text-[var(--color-fg)]">{couponMsg}</div>
                                )}
                                <div className="space-y-2">
                                    {visibleProductCoupons.map(({ coupon, claimStatus }) => {
                                        const status = claimedCouponIds.includes(coupon.id) ? 'claimed' : claimStatus.status;
                                        const canReceive = status === 'available';
                                        const isClaimed = status === 'claimed';
                                        return (
                                            <div key={coupon.id} className="flex items-center gap-3 rounded-sm border border-dashed border-[var(--color-border)] p-3">
                                                <span className="ts-mono shrink-0 rounded-sm bg-[var(--color-accent)]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">{coupon.code}</span>
                                                <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-fg-muted)]">{coupon.title}</span>
                                                <button
                                                    type="button"
                                                    disabled={!canReceive}
                                                    onClick={() => handleClaimCoupon(coupon)}
                                                    className={cn(
                                                        "shrink-0 rounded-sm px-3 py-1 text-[11px] font-medium",
                                                        isClaimed && "border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]",
                                                        canReceive && "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] text-white",
                                                        !canReceive && !isClaimed && "border border-[var(--color-border)] text-[var(--color-fg-dim)]"
                                                    )}
                                                >
                                                    {isClaimed ? 'Đã nhận' : canReceive ? 'Nhận' : 'Chưa đủ'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs: Description / Specs / Reviews / QnA */}
                <div className="mt-16">
                    <div className="flex gap-6 border-b border-[var(--color-border)] overflow-x-auto">
                        {[
                            { id: 'description', label: 'Mô tả' },
                            { id: 'specs', label: 'Thông số' },
                            { id: 'reviews', label: `Đánh giá${reviewSummary.total ? ` (${reviewSummary.total})` : ''}` },
                            { id: 'qna', label: 'Hỏi & Đáp' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative whitespace-nowrap pb-4 text-sm font-medium tracking-wide transition-colors",
                                    activeTab === tab.id ? "text-[var(--color-fg)]" : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)]"
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8">
                        {activeTab === 'description' && (
                            <div className="prose-luxury max-w-3xl space-y-4 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                                {descriptionParts.length > 0 ? descriptionParts.map((part, i) => (
                                    Array.isArray(part) ? (
                                        <ul key={i} className="list-disc space-y-1 pl-6">
                                            {part.map((item) => <li key={item}>{item}</li>)}
                                        </ul>
                                    ) : <p key={i}>{part}</p>
                                )) : <p className="italic">{t('No description')}</p>}
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="max-w-3xl overflow-hidden rounded-md border border-[var(--color-border)]">
                                {productSpecifications.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {productSpecifications.map(({ label, value }) => (
                                                <tr key={label}>
                                                    <th scope="row" className="w-1/3 bg-[var(--color-surface-2)] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">{label}</th>
                                                    <td className="px-4 py-3 text-[var(--color-fg)]">{String(value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="p-8 text-center text-sm text-[var(--color-fg-dim)]">Chưa có thông số.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div>
                                {reviewMsg && (
                                    <div className="mb-4 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">{reviewMsg}</div>
                                )}
                                {productReviews.length > 0 ? (
                                    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
                                        <aside className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                                            <p className="ts-display text-4xl">{reviewSummary.average.toFixed(1)}<span className="text-base text-[var(--color-fg-dim)]">/5</span></p>
                                            <Stars value={reviewSummary.average} />
                                            <p className="mt-2 text-xs text-[var(--color-fg-muted)]">{reviewSummary.total} đánh giá</p>
                                            <div className="mt-4 space-y-2">
                                                {[5, 4, 3, 2, 1].map((star) => (
                                                    <div key={star} className="flex items-center gap-2 text-xs">
                                                        <span className="ts-mono w-6 text-[var(--color-fg-dim)]">{star}★</span>
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)]"
                                                                style={{ width: `${reviewSummary.total ? (reviewSummary.distribution[star] / reviewSummary.total) * 100 : 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="ts-mono w-6 text-right text-[var(--color-fg-muted)]">{reviewSummary.distribution[star]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={openReviewModal} className="ts-btn ts-btn-primary mt-5 w-full text-xs">Viết đánh giá</button>
                                        </aside>

                                        <div className="space-y-4">
                                            {visibleReviews.map((review) => (
                                                <article key={review.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-[var(--color-fg)]">{review.customerName}</h5>
                                                            <span className="text-[11px] text-[var(--color-fg-dim)]">{review.date}</span>
                                                        </div>
                                                        <Stars value={review.rating} />
                                                    </div>
                                                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">{review.content}</p>
                                                    {Object.keys(review.experienceRatings || {}).length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {Object.entries(review.experienceRatings).map(([k, v]) => (
                                                                <span key={k} className="ts-pill">{k}: {v}/5</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {review.images?.length > 0 && (
                                                        <div className="mt-3 flex gap-2">
                                                            {review.images.map((image, i) => (
                                                                <img key={i} src={image} alt="" className="h-20 w-20 rounded-sm object-cover" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </article>
                                            ))}
                                            {productReviews.length > 3 && (
                                                <button type="button" onClick={() => setShowAllReviews((v) => !v)} className="ts-btn ts-btn-ghost w-full text-xs">
                                                    {showAllReviews ? 'Thu gọn' : `Xem thêm ${productReviews.length - 3} đánh giá`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--color-border)] py-16 text-center">
                                        <i className="far fa-comment text-3xl text-[var(--color-fg-dim)]"></i>
                                        <p className="mt-4 text-sm text-[var(--color-fg-muted)]">Chưa có đánh giá nào cho sản phẩm này.</p>
                                        <button type="button" onClick={openReviewModal} className="ts-btn ts-btn-primary mt-4 text-xs">Viết đánh giá đầu tiên</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'qna' && (
                            <div className="space-y-6">
                                <form onSubmit={handleSubmitQuestion} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                                    <p className="ts-eyebrow text-[var(--color-accent)]">Hỏi chúng tôi</p>
                                    <h4 className="ts-display mt-2 text-lg">Đặt câu hỏi về sản phẩm</h4>
                                    <textarea
                                        rows="3"
                                        value={questionInput}
                                        onChange={(e) => { setQuestionInput(e.target.value); setQuestionError(''); }}
                                        placeholder="Viết câu hỏi của bạn..."
                                        className="ts-input mt-3 resize-none"
                                    />
                                    {questionError && <p className="mt-2 text-xs text-red-400">{questionError}</p>}
                                    {questionMsg && <p className="mt-2 text-xs text-emerald-400">{questionMsg}</p>}
                                    <button type="submit" className="ts-btn ts-btn-primary mt-3 text-xs">Gửi câu hỏi</button>
                                </form>

                                {productQuestions.length > 0 ? (
                                    <div className="space-y-3">
                                        {productQuestions.map((item) => {
                                            const expanded = expandedQuestionIds.includes(item.id);
                                            const hasAnswer = Boolean(item.answer?.content);
                                            return (
                                                <article key={item.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                                                    <div className="flex gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-bold text-[var(--color-fg-muted)]">
                                                            {String(item.customerName || 'K')[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-baseline gap-2">
                                                                <strong className="text-sm text-[var(--color-fg)]">{item.customerName}</strong>
                                                                <span className="text-[11px] text-[var(--color-fg-dim)]">{formatRelativeTime(item.createdAt)}</span>
                                                            </div>
                                                            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{item.question}</p>
                                                            <div className="mt-2 flex items-center gap-3 text-[11px]">
                                                                {hasAnswer ? (
                                                                    <button type="button" onClick={() => toggleQuestionAnswer(item.id)} className="text-[var(--color-accent)] hover:underline">
                                                                        {expanded ? 'Thu gọn phản hồi' : 'Xem phản hồi'}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[var(--color-fg-dim)]">Đang chờ phản hồi</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {hasAnswer && expanded && (
                                                        <div className="mt-3 flex gap-3 rounded-sm border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-2)] p-3 ml-12">
                                                            <i className="fas fa-user-shield mt-1 text-[var(--color-accent)]"></i>
                                                            <div className="min-w-0">
                                                                <div className="flex items-baseline gap-2">
                                                                    <strong className="text-xs text-[var(--color-fg)]">{item.answer.adminName}</strong>
                                                                    <span className="rounded bg-[var(--color-accent)]/20 px-1 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">QTV</span>
                                                                    <span className="text-[11px] text-[var(--color-fg-dim)]">{formatRelativeTime(item.answer.createdAt)}</span>
                                                                </div>
                                                                <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{item.answer.content}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="rounded-md border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-fg-dim)]">Chưa có câu hỏi nào cho sản phẩm này.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Review Modal */}
                {reviewModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setReviewModalOpen(false)}>
                        <div className="w-full max-w-lg overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                                <h4 className="ts-display text-lg">Đánh giá & nhận xét</h4>
                                <button
                                    type="button"
                                    onClick={() => setReviewModalOpen(false)}
                                    aria-label="Đóng"
                                    className="text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
                                >
                                    <i className="fas fa-times text-sm"></i>
                                </button>
                            </div>
                            <form onSubmit={handleSubmitReview} className="max-h-[70vh] overflow-y-auto p-5">
                                <div className="mb-4 flex items-center gap-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] p-2">
                                    <img src={displayImage || productImage} alt={productName} className="h-12 w-12 rounded-sm object-contain" />
                                    <strong className="text-sm text-[var(--color-fg)]">{productName}</strong>
                                </div>

                                <div className="mb-5">
                                    <p className="ts-eyebrow mb-2 text-[10px]">Đánh giá chung</p>
                                    <StarPicker value={reviewRating} onChange={(r) => { setReviewRating(r); setReviewError(''); }} />
                                </div>

                                <div className="mb-5">
                                    <p className="ts-eyebrow mb-2 text-[10px]">Theo trải nghiệm</p>
                                    <div className="space-y-2">
                                        {reviewExperienceItems.map((criterion) => (
                                            <div key={criterion} className="flex items-center justify-between gap-3 rounded-sm border border-[var(--color-border)] px-3 py-2">
                                                <span className="text-xs text-[var(--color-fg-muted)]">{criterion}</span>
                                                <StarPicker
                                                    value={experienceRatings[criterion] || 0}
                                                    onChange={(r) => setExperienceRatings((c) => ({ ...c, [criterion]: r }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <textarea
                                        rows="4"
                                        value={reviewContent}
                                        onChange={(e) => { setReviewContent(e.target.value); setReviewError(''); }}
                                        placeholder="Chia sẻ cảm nhận về sản phẩm (tối thiểu 15 ký tự)"
                                        className="ts-input resize-none"
                                    />
                                </div>

                                <div className="mb-5">
                                    <label className="ts-btn ts-btn-outline inline-flex cursor-pointer text-xs">
                                        <input type="file" accept="image/*" multiple onChange={handleReviewImageChange} disabled={reviewImages.length >= 3} className="hidden" />
                                        <i className="fas fa-camera"></i>Thêm hình ảnh
                                    </label>
                                    {reviewImages.length > 0 && (
                                        <div className="mt-3 flex gap-2">
                                            {reviewImages.map((image) => (
                                                <div key={image.id} className="relative">
                                                    <img src={image.preview} alt={image.name} className="h-16 w-16 rounded-sm object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeReviewImage(image.id)}
                                                        aria-label="Xóa ảnh"
                                                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-[10px] text-white"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {reviewError && <p className="mb-4 rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{reviewError}</p>}

                                <button type="submit" className="ts-btn ts-btn-primary w-full">Gửi đánh giá</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Related */}
                {computedRelatedProducts.length > 0 && (
                    <section className="mt-20">
                        <h3 className="ts-display mb-8 text-2xl">Sản phẩm liên quan</h3>
                        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                            {computedRelatedProducts.map((item) => (
                                <ProductCard key={item.id} product={item} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Recently viewed */}
                {recentlyViewedProducts.length > 0 && (
                    <section className="mt-20">
                        <h3 className="ts-display mb-8 text-2xl">Sản phẩm đã xem gần đây</h3>
                        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                            {recentlyViewedProducts.map((item) => (
                                <ProductCard key={item.id} product={item} />
                            ))}
                        </div>
                    </section>
                )}
            </section>
        </>
    );
};

export default ProductDetail;
