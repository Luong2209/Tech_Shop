import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../../contexts/CompareContext';
import { useCart } from '../../contexts/CartContext';
import PageHero from '../../components/store/PageHero';
import { getProductSpecs } from './ProductDetail';
import { formatCurrency, resolveProductImage, setPageMeta, t } from '../../utils/store';

const normalizeText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const compareSpecFields = {
    phone: [
        ['Kích thước màn hình'], ['Công nghệ màn hình'], ['Camera sau'], ['Camera trước'],
        ['Chipset'], ['Bộ nhớ trong', 'Ổ cứng'], ['RAM', 'Dung lượng RAM'], ['SIM', 'Thẻ SIM'],
        ['Hệ điều hành'], ['Độ phân giải màn hình', 'Độ phân giải'], ['Pin'], ['Sạc nhanh'],
    ],
    laptop: [
        ['Loại card đồ họa'], ['Dung lượng RAM', 'RAM'], ['Ổ cứng', 'Bộ nhớ trong'],
        ['Kích thước màn hình'], ['Công nghệ màn hình'], ['Pin'], ['Hệ điều hành'],
        ['Độ phân giải màn hình', 'Độ phân giải'], ['Loại CPU'], ['Cổng kết nối', 'Cổng giao tiếp'],
    ],
    tablet: [
        ['Kích thước màn hình'], ['Camera sau'], ['Camera trước'], ['Chipset'],
        ['Bộ nhớ trong', 'Ổ cứng'], ['Pin'], ['Hệ điều hành'], ['Độ phân giải màn hình'],
    ],
    headphone: [
        ['Công nghệ âm thanh'], ['Micro'], ['Cổng kết nối'], ['Thời lượng pin', 'Thời lượng sử dụng pin'],
        ['Tính năng khác'], ['Hãng sản xuất', 'Thương hiệu'],
    ],
    smartwatch: [
        ['Công nghệ màn hình'], ['Kích thước màn hình'], ['Đường kính mặt'], ['Nghe gọi'],
        ['Tính năng sức khỏe', 'Tiện ích sức khỏe'], ['Tương thích'], ['Pin', 'Thời lượng pin'],
    ],
    camera: [
        ['Dòng camera'], ['Độ phân giải'], ['Góc ống kính'], ['Kết nối không dây'],
        ['Chống rung'], ['Hãng sản xuất', 'Thương hiệu'],
    ],
    default: [
        ['Hãng sản xuất', 'Thương hiệu'], ['Loại sản phẩm'], ['Kết nối'], ['Chất liệu'], ['Bảo hành'],
    ],
};

const getComparableSpecs = (products, getCompareCategoryKey) => {
    const categoryKey = getCompareCategoryKey(products[0]);
    const fields = compareSpecFields[categoryKey] || compareSpecFields.default;
    const specMaps = products.map((p) => {
        const entries = getProductSpecs(p);
        return entries.reduce((map, s) => {
            map.set(normalizeText(s.label), s.value);
            return map;
        }, new Map());
    });

    return fields.map((aliases) => ({
        label: aliases[0],
        values: specMaps.map((map) => {
            const alias = aliases.find((a) => map.has(normalizeText(a)));
            return alias ? map.get(normalizeText(alias)) : '—';
        }),
    }));
};

const Compare = () => {
    const { compareItems, removeFromCompare, getCompareCategoryKey } = useCompare();
    const { addItem } = useCart();
    const products = compareItems.slice(0, 2);
    const comparableSpecs = useMemo(
        () => (products.length >= 2 ? getComparableSpecs(products, getCompareCategoryKey) : []),
        [products, getCompareCategoryKey]
    );

    useEffect(() => {
        setPageMeta({
            title: 'So sánh sản phẩm | TechStore',
            description: t('Compare meta description'),
        });
    }, []);

    return (
        <>
            <PageHero title="So sánh sản phẩm" current="Compare" kicker="Side by side" />

            <section className="ts-container py-12">
                {products.length < 2 ? (
                    <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--color-border)] py-20 text-center">
                        <i className="fas fa-exchange-alt text-4xl text-[var(--color-fg-dim)]"></i>
                        <h4 className="ts-display mt-6 text-2xl">{t('No products to compare')}</h4>
                        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Chọn ít nhất 2 sản phẩm cùng danh mục để so sánh.</p>
                        <Link to="/shop" className="ts-btn ts-btn-primary mt-6">Tiếp tục mua sắm</Link>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)]">
                                        <th className="ts-eyebrow w-48 bg-[var(--color-surface-2)] p-4 text-left text-[10px]">Thông số</th>
                                        {products.map((product) => (
                                            <th key={product.id} className="bg-[var(--color-surface-2)] p-5 align-top">
                                                <div className="flex flex-col items-center text-center">
                                                    <button
                                                        onClick={() => removeFromCompare(product.id)}
                                                        className="mb-2 self-end text-[10px] text-[var(--color-fg-dim)] hover:text-[var(--color-danger)]"
                                                    >
                                                        <i className="fas fa-times mr-1"></i>Xóa
                                                    </button>
                                                    <img
                                                        src={resolveProductImage(product)}
                                                        alt={product.name || 'Sản phẩm'}
                                                        className="h-32 w-32 rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] object-contain p-3"
                                                    />
                                                    <h5 className="ts-display mt-3 text-base text-[var(--color-fg)]">{product.name || product.title}</h5>
                                                    <p className="ts-mono mt-2 text-lg font-semibold ts-gradient-text">{formatCurrency(product.price)}</p>
                                                    <div className="mt-3 flex flex-col gap-2">
                                                        <Link to={`/product/${product.id}`} className="ts-btn ts-btn-outline w-full text-xs">Xem chi tiết</Link>
                                                        <button
                                                            onClick={() => addItem(product, 1)}
                                                            disabled={product.stock <= 0}
                                                            className="ts-btn ts-btn-primary w-full text-xs"
                                                        >
                                                            <i className="fas fa-shopping-cart text-[10px]"></i>Thêm vào giỏ
                                                        </button>
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {comparableSpecs.map((row) => (
                                        <tr key={row.label}>
                                            <th className="bg-[var(--color-surface-2)] p-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">{row.label}</th>
                                            {row.values.map((value, i) => (
                                                <td key={`${row.label}-${products[i].id}`} className="p-4 text-sm text-[var(--color-fg)]">
                                                    {value || <span className="text-[var(--color-fg-dim)]">—</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
};

export default Compare;
