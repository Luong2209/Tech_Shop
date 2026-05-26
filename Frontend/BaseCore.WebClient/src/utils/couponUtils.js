const CLAIMED_COUPONS_KEY = 'claimedCoupons';

const normalizeText = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getProductFromItem = (item) => item?.product || item || {};

export const getClaimedCoupons = () => {
    try {
        const value = JSON.parse(localStorage.getItem(CLAIMED_COUPONS_KEY) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
};

export const claimCoupon = (couponId) => {
    if (!couponId) return { success: false, message: 'Phiếu giảm giá không tồn tại' };
    const claimed = getClaimedCoupons();
    if (claimed.includes(couponId)) return { success: false, message: 'Phiếu đã có trong ví' };
    localStorage.setItem(CLAIMED_COUPONS_KEY, JSON.stringify([...claimed, couponId]));
    return { success: true, message: 'Đã lưu phiếu vào ví' };
};

export const isCouponClaimed = (couponId) => getClaimedCoupons().includes(couponId);

export const removeClaimedCoupon = (couponId) => {
    const next = getClaimedCoupons().filter((id) => id !== couponId);
    localStorage.setItem(CLAIMED_COUPONS_KEY, JSON.stringify(next));
    return next;
};

export const getCartSubtotal = (cartItems = []) => (
    cartItems.reduce((sum, item) => sum + Number(getProductFromItem(item).price || 0) * Number(item.quantity || 1), 0)
);

export const getCartQuantity = (cartItems = []) => (
    cartItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
);

export const isCouponExpired = (coupon) => {
    if (!coupon?.expiresAt) return false;
    const end = new Date(`${coupon.expiresAt}T23:59:59`);
    return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
};

export const matchCategory = (itemOrProduct, categories = []) => {
    if (!categories.length) return true;
    const product = getProductFromItem(itemOrProduct);
    const candidates = [
        product.category?.name,
        product.category?.slug,
        product.categoryName,
        product.categorySlug,
        product.categoryId,
    ].map(normalizeText).filter(Boolean);
    const accepted = categories.map(normalizeText).filter(Boolean);

    return accepted.some((category) => candidates.some((candidate) => (
        candidate === category || candidate.includes(category) || category.includes(candidate)
    )));
};

const matchProductId = (itemOrProduct, productIds = []) => {
    if (!productIds.length) return true;
    const product = getProductFromItem(itemOrProduct);
    return productIds.map(String).includes(String(product.id || product.productId));
};

const getContextSubtotal = (context = {}) => Number(
    context.subtotal ?? getCartSubtotal(context.cartItems || [])
);

const getContextQuantity = (context = {}) => Number(
    context.quantity ?? getCartQuantity(context.cartItems || [])
);

export const getCouponClaimStatus = (coupon, context = {}) => {
    if (!coupon?.isActive) {
        return { status: 'locked', message: 'Chưa đủ điều kiện', missingAmount: 0, missingQuantity: 0 };
    }
    if (isCouponExpired(coupon)) {
        return { status: 'expired', message: 'Hết hạn', missingAmount: 0, missingQuantity: 0 };
    }
    if (Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || 0)) {
        return { status: 'out_of_stock', message: 'Hết lượt', missingAmount: 0, missingQuantity: 0 };
    }
    if (isCouponClaimed(coupon.id)) {
        return { status: 'claimed', message: 'Đã nhận', missingAmount: 0, missingQuantity: 0 };
    }
    if (coupon.claimType === 'instant') {
        return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
    }
    if (coupon.claimType === 'spin') {
        return { status: 'locked', message: 'Quay thưởng để nhận mã', missingAmount: 0, missingQuantity: 0 };
    }

    const condition = coupon.unlockCondition || { type: 'none' };
    const subtotal = getContextSubtotal(context);
    const quantity = getContextQuantity(context);
    const cartItems = context.cartItems || [];
    const product = context.product || null;
    const currentHour = context.currentHour ?? new Date().getHours();

    if (condition.type === 'none') return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };

    if (condition.type === 'cart_total') {
        const minSubtotal = Number(condition.minSubtotal || coupon.minOrder || 0);
        if (subtotal >= minSubtotal) return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
        return { status: 'locked', message: `Còn thiếu ${minSubtotal - subtotal} để nhận mã`, missingAmount: minSubtotal - subtotal, missingQuantity: 0 };
    }

    if (condition.type === 'item_quantity') {
        const minQuantity = Number(condition.minQuantity || 1);
        if (quantity >= minQuantity) return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
        return { status: 'locked', message: `Cần thêm ${minQuantity - quantity} sản phẩm`, missingAmount: 0, missingQuantity: minQuantity - quantity };
    }

    if (condition.type === 'cart_category') {
        const matched = cartItems.some((item) => matchCategory(item, coupon.categories));
        if (matched) return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
        return { status: 'locked', message: 'Thêm sản phẩm thuộc danh mục áp dụng để nhận mã', missingAmount: 0, missingQuantity: 0 };
    }

    if (condition.type === 'product_category') {
        if (product && matchCategory(product, coupon.categories)) return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
        return { status: 'locked', message: 'Sản phẩm chưa thuộc danh mục áp dụng', missingAmount: 0, missingQuantity: 0 };
    }

    if (condition.type === 'product_id') {
        if (product && matchProductId(product, coupon.productIds)) return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
        return { status: 'locked', message: 'Sản phẩm chưa thuộc phạm vi áp dụng', missingAmount: 0, missingQuantity: 0 };
    }

    if (condition.type === 'flash_time') {
        const startHour = Number(condition.startHour || 0);
        const endHour = Number(condition.endHour || 24);
        if (currentHour < startHour) return { status: 'locked', message: 'Sắp mở', missingAmount: 0, missingQuantity: 0 };
        if (currentHour >= endHour) return { status: 'locked', message: 'Đã kết thúc', missingAmount: 0, missingQuantity: 0 };
        return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
    }

    if (condition.type === 'login_required' || condition.type === 'new_user') {
        return { status: 'available', message: 'Có thể nhận', missingAmount: 0, missingQuantity: 0 };
    }

    return { status: 'locked', message: 'Chưa đủ điều kiện', missingAmount: 0, missingQuantity: 0 };
};

export const canClaimCoupon = (coupon, context = {}) => getCouponClaimStatus(coupon, context).status === 'available';

export const getCouponStatus = (coupon, context = {}) => getCouponClaimStatus(coupon, context).status;

export const getCouponStatusText = (status, coupon, context = {}) => {
    const claimStatus = getCouponClaimStatus(coupon, context);
    if (status === 'available') return 'Có thể nhận';
    if (status === 'claimed') return 'Đã nhận';
    if (status === 'locked') return claimStatus.message || 'Chưa đủ điều kiện';
    if (status === 'expired') return 'Hết hạn';
    if (status === 'out_of_stock') return 'Hết lượt';
    return claimStatus.message || 'Chưa đủ điều kiện';
};

export const getAvailableCouponsForProduct = (product, couponList = [], context = {}) => (
    couponList
        .filter((coupon) => coupon?.code && coupon?.isActive && !isCouponExpired(coupon))
        .filter((coupon) => {
            if (coupon.appliesTo === 'all' || coupon.appliesTo === 'shipping') return true;
            if (coupon.appliesTo === 'category') return matchCategory(product, coupon.categories);
            if (coupon.appliesTo === 'product') return matchProductId(product, coupon.productIds);
            return false;
        })
        .map((coupon) => ({
            coupon,
            claimStatus: getCouponClaimStatus(coupon, { ...context, product }),
        }))
);

const getApplicableProductTotal = (coupon, cartItems = []) => {
    const matchingItems = cartItems.filter((item) => {
        if (coupon.appliesTo === 'all') return true;
        if (coupon.appliesTo === 'category') return matchCategory(item, coupon.categories);
        if (coupon.appliesTo === 'product') return matchProductId(item, coupon.productIds);
        return false;
    });
    return getCartSubtotal(matchingItems);
};

export const calculateProductCouponDiscount = (coupon, cartItems = [], subtotal = getCartSubtotal(cartItems)) => {
    const baseAmount = coupon.appliesTo === 'all' ? Number(subtotal || 0) : getApplicableProductTotal(coupon, cartItems);
    if (baseAmount <= 0) return 0;
    if (coupon.discountType === 'fixed') return Math.min(Number(coupon.value || 0), baseAmount);
    if (coupon.discountType === 'percent') {
        const rawDiscount = baseAmount * Number(coupon.value || 0) / 100;
        const capped = coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;
        return Math.min(capped, baseAmount);
    }
    return 0;
};

export const calculateShippingCouponDiscount = (coupon, shippingFee = 0) => {
    const fee = Number(shippingFee || 0);
    if (fee <= 0) return 0;
    if (coupon.discountType === 'freeship') return fee;
    if (coupon.discountType === 'fixed') return Math.min(Number(coupon.value || 0), fee);
    if (coupon.discountType === 'percent') {
        const rawDiscount = fee * Number(coupon.value || 0) / 100;
        const capped = coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;
        return Math.min(capped, fee);
    }
    return 0;
};

const couponAppliesToCart = (coupon, cartItems = []) => {
    if (coupon.appliesTo === 'all' || coupon.appliesTo === 'shipping') return true;
    if (coupon.appliesTo === 'category') return cartItems.some((item) => matchCategory(item, coupon.categories));
    if (coupon.appliesTo === 'product') return cartItems.some((item) => matchProductId(item, coupon.productIds));
    return true;
};

export const validateCouponForCart = (codeOrId, cartItems = [], subtotal = getCartSubtotal(cartItems), shippingFee = 0, couponList = []) => {
    const value = normalizeText(codeOrId);
    const coupon = couponList.find((item) => item.code && (normalizeText(item.code) === value || normalizeText(item.id) === value));
    if (!coupon) return { valid: false, message: 'Phiếu giảm giá không tồn tại', coupon: null, productDiscount: 0, shippingDiscount: 0, freeShipping: false };
    if (!isCouponClaimed(coupon.id)) return { valid: false, message: 'Bạn cần nhận phiếu trước khi sử dụng', coupon, productDiscount: 0, shippingDiscount: 0, freeShipping: false };
    if (!coupon.isActive || isCouponExpired(coupon)) return { valid: false, message: 'Phiếu giảm giá đã hết hạn', coupon, productDiscount: 0, shippingDiscount: 0, freeShipping: false };
    if (Number(subtotal || 0) < Number(coupon.minOrder || 0)) return { valid: false, message: 'Đơn hàng chưa đủ điều kiện áp dụng', coupon, productDiscount: 0, shippingDiscount: 0, freeShipping: false };
    if (!couponAppliesToCart(coupon, cartItems)) return { valid: false, message: 'Phiếu giảm giá không áp dụng cho sản phẩm trong giỏ', coupon, productDiscount: 0, shippingDiscount: 0, freeShipping: false };

    const productDiscount = coupon.couponType === 'product' ? calculateProductCouponDiscount(coupon, cartItems, subtotal) : 0;
    const shippingDiscount = coupon.couponType === 'shipping' ? calculateShippingCouponDiscount(coupon, shippingFee) : 0;
    return {
        valid: true,
        message: 'Áp dụng phiếu giảm giá thành công',
        coupon,
        productDiscount,
        shippingDiscount,
        freeShipping: coupon.discountType === 'freeship' && shippingDiscount > 0,
    };
};

export const calculateCouponDiscount = (coupon, cartItems = [], subtotal = getCartSubtotal(cartItems)) => ({
    discountAmount: coupon?.couponType === 'product' ? calculateProductCouponDiscount(coupon, cartItems, subtotal) : 0,
    freeShipping: coupon?.couponType === 'shipping' && coupon.discountType === 'freeship',
});

export const getCouponUnavailableReason = (coupon, cartItems = [], subtotal = getCartSubtotal(cartItems), shippingFee = 0) => {
    if (!coupon) return { message: 'Phiếu giảm giá không tồn tại', missingAmount: 0 };
    if (!isCouponClaimed(coupon.id)) return { message: 'Bạn cần nhận phiếu trước khi sử dụng', missingAmount: 0 };
    if (!coupon.isActive) return { message: 'Phiếu giảm giá không còn hiệu lực', missingAmount: 0 };
    if (isCouponExpired(coupon)) return { message: 'Hết hạn', missingAmount: 0 };
    if (Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || Infinity)) return { message: 'Hết lượt sử dụng', missingAmount: 0 };

    const missingAmount = Math.max(0, Number(coupon.minOrder || 0) - Number(subtotal || 0));
    if (missingAmount > 0) return { message: 'Chưa đủ điều kiện', missingAmount };
    if (!couponAppliesToCart(coupon, cartItems)) return { message: 'Không áp dụng cho giỏ hàng này', missingAmount: 0 };
    if (coupon.couponType === 'shipping' && Number(shippingFee || 0) <= 0) return { message: 'Không có phí vận chuyển để áp dụng', missingAmount: 0 };
    return null;
};

export const getUsableCouponsForCart = (cartItems = [], couponList = [], subtotal = getCartSubtotal(cartItems), shippingFee = 0) => (
    couponList
        .filter((coupon) => coupon?.code && isCouponClaimed(coupon.id))
        .map((coupon) => {
            const validation = validateCouponForCart(coupon.code, cartItems, subtotal, shippingFee, couponList);
            return {
                coupon,
                valid: validation.valid,
                message: validation.valid ? 'Có thể dùng' : getCouponUnavailableReason(coupon, cartItems, subtotal, shippingFee)?.message || validation.message,
                missingAmount: validation.missingAmount || getCouponUnavailableReason(coupon, cartItems, subtotal, shippingFee)?.missingAmount || 0,
                productDiscount: validation.productDiscount || 0,
                shippingDiscount: validation.shippingDiscount || 0,
                freeShipping: validation.freeShipping || false,
            };
        })
);

export const getSelectedCouponUnavailableReason = (coupon, cartItems = [], subtotal = getCartSubtotal(cartItems), shippingFee = 0) => {
    if (!coupon) return { message: 'Phiếu giảm giá không tồn tại', missingAmount: 0 };
    if (!isCouponClaimed(coupon.id)) return { message: 'Bạn cần nhận phiếu trước khi sử dụng', missingAmount: 0 };
    if (!coupon.isActive) return { message: 'Phiếu giảm giá không còn hiệu lực', missingAmount: 0 };
    if (isCouponExpired(coupon)) return { message: 'Hết hạn', missingAmount: 0 };
    if (Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || Infinity)) return { message: 'Hết lượt sử dụng', missingAmount: 0 };
    if (!cartItems.length) return { message: 'Vui lòng chọn sản phẩm để thanh toán', missingAmount: 0 };

    const missingAmount = Math.max(0, Number(coupon.minOrder || 0) - Number(subtotal || 0));
    if (missingAmount > 0) return { message: 'Chưa đủ điều kiện', missingAmount };
    if (!couponAppliesToCart(coupon, cartItems)) return { message: 'Không áp dụng cho giỏ hàng này', missingAmount: 0 };
    if (coupon.couponType === 'shipping' && Number(shippingFee || 0) <= 0) return { message: 'Không có phí vận chuyển để áp dụng', missingAmount: 0 };
    return null;
};

export const validateSelectedCouponForCart = (codeOrId, cartItems = [], subtotal = getCartSubtotal(cartItems), shippingFee = 0, couponList = []) => {
    const value = normalizeText(codeOrId);
    const coupon = couponList.find((item) => item.code && (normalizeText(item.code) === value || normalizeText(item.id) === value));
    const unavailable = getSelectedCouponUnavailableReason(coupon, cartItems, subtotal, shippingFee);

    if (unavailable) {
        return {
            valid: false,
            message: unavailable.message,
            missingAmount: unavailable.missingAmount || 0,
            coupon,
            productDiscount: 0,
            shippingDiscount: 0,
            freeShipping: false,
        };
    }

    const productDiscount = coupon.couponType === 'product' ? calculateProductCouponDiscount(coupon, cartItems, subtotal) : 0;
    const shippingDiscount = coupon.couponType === 'shipping' ? calculateShippingCouponDiscount(coupon, shippingFee) : 0;

    return {
        valid: true,
        message: 'Có thể dùng',
        missingAmount: 0,
        coupon,
        productDiscount,
        shippingDiscount,
        freeShipping: coupon.discountType === 'freeship' && shippingDiscount > 0,
    };
};

export const getSelectedUsableCouponsForCart = (cartItems = [], couponList = [], subtotal = getCartSubtotal(cartItems), shippingFee = 0) => (
    couponList
        .filter((coupon) => coupon?.code && isCouponClaimed(coupon.id))
        .map((coupon) => validateSelectedCouponForCart(coupon.code, cartItems, subtotal, shippingFee, couponList))
);
