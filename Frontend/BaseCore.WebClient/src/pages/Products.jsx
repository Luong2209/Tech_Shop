import React, { useEffect, useMemo, useState } from 'react';
import { productApi, categoryApi, supplierApi, specApi, uploadApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, resolveProductImage } from '../utils/store';

const inputClass = 'rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [submittedKeyword, setSubmittedKeyword] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [specDefinitions, setSpecDefinitions] = useState([]);
    const [specValues, setSpecValues] = useState({});
    const [uploadingImages, setUploadingImages] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        stock: 0,
        description: '',
        imageUrl: '',
        images: [],
        categoryId: '',
        supplierId: '',
    });
    const [error, setError] = useState('');
    const { user, isAdmin } = useAuth();
    const canLoadSuppliers = ['Admin', 'Warehouse'].includes(user?.role);

    useEffect(() => {
        loadCategories();
        if (canLoadSuppliers) {
            loadSuppliers();
        } else {
            setSuppliers([]);
        }
    }, [canLoadSuppliers]);

    useEffect(() => {
        loadProducts();
    }, [page, submittedKeyword, categoryId]);

    const loadSpecDefinitions = async (nextCategoryId, productSpecs = []) => {
        if (!nextCategoryId) {
            setSpecDefinitions([]);
            setSpecValues({});
            return;
        }

        try {
            const response = await specApi.getDefinitions(nextCategoryId);
            const definitions = Array.isArray(response.data) ? response.data : [];
            const values = {};
            productSpecs.forEach((spec) => {
                const definitionId = spec.specDefinitionId ?? spec.SpecDefinitionId;
                if (!definitionId) return;
                values[definitionId] = {
                    specOptionId: spec.specOptionId ?? spec.SpecOptionId ?? '',
                    value: spec.valueText ?? spec.optionValue ?? spec.value ?? spec.valueNumber ?? spec.valueBool ?? '',
                };
            });
            setSpecDefinitions(definitions);
            setSpecValues(values);
        } catch (err) {
            console.error('Khong the tai thong so:', err);
            setSpecDefinitions([]);
            setSpecValues({});
        }
    };

    const loadCategories = async () => {
        try {
            const response = await categoryApi.getAll();
            setCategories(response.data || []);
        } catch (err) {
            console.error('Không thể tải danh mục:', err);
        }
    };

    const loadSuppliers = async () => {
        try {
            const response = await supplierApi.getAll({ isActive: true, page: 1, pageSize: 200 });
            const list = Array.isArray(response.data) ? response.data : response.data?.items || [];
            setSuppliers(list.filter((item) => (item.isActive ?? item.IsActive) !== false));
        } catch (err) {
            console.error('Khong the tai nha cung cap:', err);
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = await productApi.search({
                keyword: submittedKeyword,
                categoryId: categoryId || undefined,
                page,
                pageSize,
            });
            setProducts(response.data.items || response.data.data || []);
            setTotalPages(response.data.totalPages || 0);
            setTotalCount(response.data.totalCount || 0);
        } catch (err) {
            console.error('Không thể tải sản phẩm:', err);
        } finally {
            setLoading(false);
        }
    };

    const visibleProducts = useMemo(() => {
        if (!stockFilter) return products;
        if (stockFilter === 'low') return products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 10);
        if (stockFilter === 'out') return products.filter((product) => Number(product.stock || 0) <= 0);
        if (stockFilter === 'available') return products.filter((product) => Number(product.stock || 0) > 10);
        return products;
    }, [products, stockFilter]);

    const inventoryStats = useMemo(() => {
        return products.reduce((acc, product) => {
            const stock = Number(product.stock || 0);
            acc.totalStock += stock;
            if (stock <= 0) acc.out += 1;
            else if (stock <= 10) acc.low += 1;
            else acc.available += 1;
            return acc;
        }, { totalStock: 0, low: 0, out: 0, available: 0 });
    }, [products]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSubmittedKeyword(keyword.trim());
        setPage(1);
    };

    const openModal = async (product = null) => {
        if (product) {
            let detail = product;
            try {
                const response = await productApi.getById(product.id);
                detail = response.data || product;
            } catch (err) {
                console.error('Khong the tai chi tiet san pham:', err);
            }

            setEditingProduct(detail);
            setFormData({
                name: detail.name,
                price: detail.price,
                stock: detail.stock,
                description: detail.description || '',
                imageUrl: detail.imageUrl || '',
                images: Array.isArray(detail.images) ? detail.images : [],
                categoryId: detail.categoryId,
                supplierId: detail.supplierId || '',
            });
            await loadSpecDefinitions(detail.categoryId, detail.specs || []);
        } else {
            setEditingProduct(null);
            const nextCategoryId = categories[0]?.id || '';
            setFormData({
                name: '',
                price: 0,
                stock: 0,
                description: '',
                imageUrl: '',
                images: [],
                categoryId: nextCategoryId,
                supplierId: '',
            });
            await loadSpecDefinitions(nextCategoryId, []);
        }
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setError('');
    };

    const updateImage = (index, patch) => {
        setFormData((current) => ({
            ...current,
            images: current.images.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
        }));
    };

    const handleCategoryChange = async (nextCategoryId) => {
        setFormData({ ...formData, categoryId: nextCategoryId });
        await loadSpecDefinitions(nextCategoryId, []);
    };

    const setPrimaryImage = (imageUrl) => {
        setFormData((current) => ({
            ...current,
            imageUrl,
            images: (current.images || []).map((image) => ({ ...image, isPrimary: image.imageUrl === imageUrl })),
        }));
    };

    const removeImage = (index) => {
        setFormData((current) => {
            const currentImages = current.images || [];
            const removedImage = currentImages[index];
            const nextImages = currentImages.filter((_, itemIndex) => itemIndex !== index);
            const nextMainImage = removedImage?.imageUrl === current.imageUrl ? (nextImages[0]?.imageUrl || '') : current.imageUrl;

            return {
                ...current,
                imageUrl: nextMainImage,
                images: nextImages.map((image) => ({ ...image, isPrimary: image.imageUrl === nextMainImage })),
            };
        });
    };

    const handleUploadImages = async (files) => {
        const selectedFiles = Array.from(files || []);
        if (selectedFiles.length === 0) return;

        setUploadingImages(true);
        try {
            const response = await uploadApi.uploadProductImages(selectedFiles);
            const urls = Array.isArray(response.data?.urls) ? response.data.urls.filter(Boolean) : [];
            if (urls.length === 0) return;

            setFormData((current) => {
                const hasMainImage = Boolean(String(current.imageUrl || '').trim());
                const mainImageUrl = hasMainImage ? current.imageUrl : urls[0];
                const existingUrls = new Set((current.images || []).map((image) => image.imageUrl));
                const uploadedImages = urls
                    .filter((url) => !existingUrls.has(url))
                    .map((url, index) => ({
                        imageUrl: url,
                        altText: current.name || '',
                        sortOrder: (current.images || []).length + index,
                        isPrimary: url === mainImageUrl,
                    }));

                return {
                    ...current,
                    imageUrl: mainImageUrl,
                    images: [...(current.images || []), ...uploadedImages].map((image) => ({
                        ...image,
                        isPrimary: image.imageUrl === mainImageUrl,
                    })),
                };
            });
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Khong the upload anh san pham');
        } finally {
            setUploadingImages(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const images = (formData.images || [])
                .filter((image) => String(image.imageUrl || '').trim())
                .map((image, index) => ({
                    ...image,
                    imageUrl: String(image.imageUrl || '').trim(),
                    altText: image.altText || null,
                    sortOrder: Number(image.sortOrder || index),
                    isPrimary: Boolean(image.isPrimary),
                }));

            const data = {
                ...formData,
                price: parseFloat(formData.price),
                stock: editingProduct ? Number(editingProduct.stock || 0) : 0,
                categoryId: parseInt(formData.categoryId),
                supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
                images,
            };

            let savedProduct;
            if (editingProduct) {
                const response = await productApi.update(editingProduct.id, data);
                savedProduct = response.data || { id: editingProduct.id };
            } else {
                const response = await productApi.create(data);
                savedProduct = response.data;
            }

            const savedProductId = savedProduct?.id || editingProduct?.id;
            if (savedProductId && specDefinitions.length > 0) {
                const specPayload = specDefinitions.map((definition) => {
                    const stateValue = specValues[definition.id] || {};
                    const rawValue = typeof stateValue === 'object' ? stateValue.value : stateValue;
                    const specOptionId = typeof stateValue === 'object' ? stateValue.specOptionId : null;
                    const inputType = String(definition.inputType || definition.dataType || 'text');
                    const normalizedInputType = inputType.toLowerCase();
                    return {
                        specDefinitionId: definition.id,
                        specOptionId: specOptionId ? Number(specOptionId) : null,
                        valueText: normalizedInputType === 'number' || normalizedInputType === 'boolean' ? null : (rawValue ? String(rawValue) : null),
                        valueNumber: normalizedInputType === 'number' && rawValue !== '' && rawValue != null ? Number(rawValue) : null,
                        valueBool: normalizedInputType === 'boolean' && rawValue !== '' && rawValue != null ? rawValue === true || rawValue === 'true' : null,
                    };
                });
                await specApi.updateProductSpecs(savedProductId, specPayload);
            }

            closeModal();
            loadProducts();
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Thao tác thất bại');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

        try {
            await productApi.delete(id);
            loadProducts();
        } catch (err) {
            alert('Không thể xóa sản phẩm');
        }
    };

    const stockBadge = (stock) => {
        const value = Number(stock || 0);
        if (value <= 0) return 'bg-red-500/10 text-red-300 ring-red-500/30';
        if (value <= 10) return 'bg-[var(--color-surface-2)] text-amber-300 ring-[var(--color-border)]';
        return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30';
    };

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Danh mục bán hàng</p>
                    <h2 className="mb-0 text-2xl font-bold text-[var(--color-fg)]">Quản lý sản phẩm</h2>
                </div>
                {isAdmin() && (
                    <button className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[var(--color-primary)]" onClick={() => openModal()}>
                        <i className="fas fa-plus"></i>
                        Thêm sản phẩm
                    </button>
                )}
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ">
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Tổng sản phẩm</p>
                    <div className="text-2xl font-bold text-[var(--color-fg)]">{totalCount}</div>
                </div>
                <button type="button" className={`rounded-md border p-4 text-left  ${stockFilter === 'available' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`} onClick={() => setStockFilter(stockFilter === 'available' ? '' : 'available')}>
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Còn hàng</p>
                    <div className="text-2xl font-bold text-emerald-300">{inventoryStats.available}</div>
                </button>
                <button type="button" className={`rounded-md border p-4 text-left  ${stockFilter === 'low' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`} onClick={() => setStockFilter(stockFilter === 'low' ? '' : 'low')}>
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Sắp hết hàng</p>
                    <div className="text-2xl font-bold text-amber-300">{inventoryStats.low}</div>
                </button>
                <button type="button" className={`rounded-md border p-4 text-left  ${stockFilter === 'out' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`} onClick={() => setStockFilter(stockFilter === 'out' ? '' : 'out')}>
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Hết hàng</p>
                    <div className="text-2xl font-bold text-red-300">{inventoryStats.out}</div>
                </button>
            </div>

            <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                <div className="border-b border-[var(--color-border)] p-4">
                    <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto]">
                        <input
                            type="text"
                            className={inputClass}
                            placeholder="Tìm sản phẩm..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                        <select
                            className={inputClass}
                            value={categoryId}
                            onChange={(e) => {
                                setCategoryId(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]">
                            <i className="fas fa-search"></i>
                            Tìm kiếm
                        </button>
                    </form>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="py-12 text-center text-sm font-medium text-[var(--color-fg-muted)]">Đang tải sản phẩm...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                            <table className="min-w-[900px] table-fixed divide-y divide-[var(--color-border)] text-sm">
                                <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                    <tr>
                                        <th className="w-[380px] px-4 py-3">Sản phẩm</th>
                                        <th className="w-[180px] px-4 py-3">Danh mục</th>
                                        <th className="w-[170px] px-4 py-3">Giá</th>
                                        <th className="w-[110px] px-4 py-3">Tồn kho</th>
                                        {isAdmin() && <th className="w-[130px] px-4 py-3 text-right">Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {visibleProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin() ? 5 : 4} className="px-4 py-10 text-center text-[var(--color-fg-muted)]">Không tìm thấy sản phẩm</td>
                                        </tr>
                                    ) : visibleProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-[var(--color-surface-2)]">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <img src={resolveProductImage(product)} className="h-12 w-12 rounded-md border border-[var(--color-border)] object-contain bg-[var(--color-surface)]" alt={product.name} />
                                                    <div className="min-w-0">
                                                        <p className="mb-0 truncate font-semibold text-[var(--color-fg)]">{product.name}</p>
                                                        <p className="mb-0 text-xs text-[var(--color-fg-muted)]">ID #{product.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="truncate px-4 py-3 text-[var(--color-fg-muted)]">{product.category?.name || categories.find((cat) => cat.id === product.categoryId)?.name || 'Chưa phân loại'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--color-fg)]">{formatCurrency(product.price)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${stockBadge(product.stock)}`}>{product.stock}</span>
                                            </td>
                                            {isAdmin() && (
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]" onClick={() => openModal(product)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleDelete(product.id)}>
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-fg-muted)] sm:flex-row sm:items-center sm:justify-between">
                    <span>Tổng: {totalCount} sản phẩm</span>
                    <div className="flex items-center gap-2">
                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-semibold disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
                        <span>Trang {page}/{totalPages || 1}</span>
                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-semibold disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
                    </div>
                </div>
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-md bg-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <h3 className="mb-0 text-lg font-bold text-[var(--color-fg)]">{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-5">
                                {error && <div className="mb-4 rounded-md border border-rose-200 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2 rounded-md border border-[var(--color-border)] p-3">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <div>
                                                <span className="block text-sm font-semibold text-[var(--color-fg)]">Anh san pham</span>
                                                <span className="text-xs text-[var(--color-fg-muted)]">Upload file anh vao thu muc uploads/products. Anh chinh se dung lam banner.</span>
                                            </div>
                                            <label className="cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-surface-2)]">
                                                {uploadingImages ? 'Dang upload...' : 'Upload anh'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    multiple
                                                    disabled={uploadingImages}
                                                    onChange={(e) => {
                                                        handleUploadImages(e.target.files);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {formData.imageUrl && (
                                            <div className="mb-4 rounded-md border border-orange-200 bg-[var(--color-accent)]/10 p-3">
                                                <div className="mb-2 text-xs font-semibold uppercase text-[var(--color-accent)]">Anh chinh / banner</div>
                                                <div className="flex items-center gap-3">
                                                    <img src={resolveProductImage({ imageUrl: formData.imageUrl })} className="h-20 w-20 rounded-md border border-orange-200 bg-[var(--color-surface)] object-contain" alt="Anh chinh" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-semibold text-[var(--color-fg)]">{formData.imageUrl}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {(formData.images || []).length === 0 ? (
                                            <p className="mb-0 text-sm text-[var(--color-fg-muted)]">Chua co anh. Hay bam "Upload anh".</p>
                                        ) : (formData.images || []).map((image, index) => (
                                            <div key={`image-${index}`} className="mb-3 grid gap-3 rounded-md border border-[var(--color-border)] p-3 md:grid-cols-[80px_minmax(0,1fr)_auto_auto] md:items-center">
                                                <img src={resolveProductImage({ imageUrl: image.imageUrl })} className="h-20 w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] object-contain" alt={image.altText || formData.name || 'Anh san pham'} />
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-[var(--color-fg)]">{image.imageUrl}</div>
                                                    <input type="text" className={`${inputClass} mt-2 w-full`} placeholder="Alt text" value={image.altText || ''} onChange={(e) => updateImage(index, { altText: e.target.value })} />
                                                </div>
                                                <button type="button" className={`rounded-md px-3 py-2 text-xs font-semibold ${formData.imageUrl === image.imageUrl ? 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]'}`} onClick={() => setPrimaryImage(image.imageUrl)}>
                                                    {formData.imageUrl === image.imageUrl ? 'Anh chinh' : 'Lam anh chinh'}
                                                </button>
                                                <button type="button" className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700" onClick={() => removeImage(index)}>
                                                    Xoa
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="md:col-span-2 rounded-md border border-[var(--color-border)] p-3">
                                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <span className="block text-sm font-semibold text-[var(--color-fg)]">Thong so ky thuat theo danh muc</span>
                                                <span className="text-xs text-[var(--color-fg-muted)]">Lay tu bo thong so cua danh muc dang chon, chi luu dong co gia tri.</span>
                                            </div>
                                            <span className="text-xs font-semibold text-[var(--color-fg-muted)]">{specDefinitions.length} thong so</span>
                                        </div>
                                        {specDefinitions.length === 0 ? (
                                            <p className="mb-0 text-sm text-[var(--color-fg-muted)]">Danh muc nay chua co bo thong so. Hay cau hinh trong trang Danh muc truoc.</p>
                                        ) : (
                                            <div className="grid gap-3 md:grid-cols-2">
                                                {specDefinitions.map((definition) => {
                                                    const inputType = String(definition.inputType || definition.dataType || 'text');
                                                    const dataType = inputType.toLowerCase();
                                                    const currentValue = specValues[definition.id] || {};
                                                    const rawValue = typeof currentValue === 'object' ? currentValue.value : currentValue;
                                                    const currentOptionId = typeof currentValue === 'object' ? currentValue.specOptionId : '';
                                                    const options = Array.isArray(definition.options) ? definition.options : [];
                                                    const hasOptions = options.length > 0;
                                                    const allowCustomValue = definition.allowCustomValue !== false;
                                                    const setSpecValue = (patch) => setSpecValues({
                                                        ...specValues,
                                                        [definition.id]: { specOptionId: currentOptionId || '', value: rawValue || '', ...patch },
                                                    });
                                                    return (
                                                        <label key={definition.id}>
                                                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">{definition.name}{definition.unit ? ` (${definition.unit})` : ''}</span>
                                                            {dataType === 'boolean' || dataType === 'bool' ? (
                                                                <select className={`${inputClass} w-full`} value={rawValue ?? ''} onChange={(e) => setSpecValue({ value: e.target.value, specOptionId: '' })}>
                                                                    <option value="">Chua co du lieu</option>
                                                                    <option value="true">Co</option>
                                                                    <option value="false">Khong</option>
                                                                </select>
                                                            ) : hasOptions && dataType === 'multiselect' ? (
                                                                <div className="grid gap-2">
                                                                    <select
                                                                        multiple
                                                                        className={`${inputClass} h-28 w-full`}
                                                                        value={String(rawValue || '').split(',').map((item) => item.trim()).filter(Boolean)}
                                                                        onChange={(e) => setSpecValue({ value: Array.from(e.target.selectedOptions).map((option) => option.value).join(', '), specOptionId: '' })}
                                                                    >
                                                                        {options.map((option) => <option key={option.id} value={option.value}>{option.value}</option>)}
                                                                    </select>
                                                                    {allowCustomValue && (
                                                                        <input type="text" className={`${inputClass} w-full`} placeholder="Gia tri tuy chinh" value={rawValue ?? ''} onChange={(e) => setSpecValue({ value: e.target.value, specOptionId: '' })} />
                                                                    )}
                                                                </div>
                                                            ) : hasOptions ? (
                                                                <div className="grid gap-2">
                                                                    <select className={`${inputClass} w-full`} value={currentOptionId || ''} onChange={(e) => {
                                                                        const option = options.find((item) => String(item.id) === e.target.value);
                                                                        setSpecValue({ specOptionId: e.target.value, value: option?.value || '' });
                                                                    }}>
                                                                        <option value="">Chon gia tri co san</option>
                                                                        {options.map((option) => <option key={option.id} value={option.id}>{option.value}</option>)}
                                                                    </select>
                                                                    {allowCustomValue && (
                                                                        <input type="text" className={`${inputClass} w-full`} placeholder="Nhap gia tri khac neu danh sach chua co" value={currentOptionId ? '' : (rawValue ?? '')} onChange={(e) => setSpecValue({ value: e.target.value, specOptionId: '' })} />
                                                                    )}
                                                                </div>
                                                            ) : dataType === 'textarea' ? (
                                                                <textarea className={`${inputClass} w-full`} rows="3" value={rawValue ?? ''} onChange={(e) => setSpecValue({ value: e.target.value, specOptionId: '' })} />
                                                            ) : (
                                                                <input type={dataType === 'number' ? 'number' : 'text'} className={`${inputClass} w-full`} value={rawValue ?? ''} onChange={(e) => setSpecValue({ value: e.target.value, specOptionId: '' })} />
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <label className="md:col-span-2">
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Tên sản phẩm</span>
                                        <input type="text" className={`${inputClass} w-full`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Danh mục</span>
                                        <select className={`${inputClass} w-full`} value={formData.categoryId} onChange={(e) => handleCategoryChange(e.target.value)} required>
                                            <option value="">Chọn danh mục</option>
                                            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Giá</span>
                                        <input type="number" className={`${inputClass} w-full`} value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required min="0" />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Tồn kho</span>
                                        <input type="number" className={`${inputClass} w-full bg-[var(--color-surface-3)] text-[var(--color-fg-muted)]`} value={formData.stock} readOnly />
                                        <span className="mt-1 block text-xs font-semibold text-[var(--color-fg-muted)]">Tồn kho được cập nhật qua phiếu nhập kho, không chỉnh trực tiếp tại đây.</span>
                                    </label>
                                    <label className="md:col-span-2">
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Mô tả</span>
                                        <textarea className={`${inputClass} w-full`} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="4" />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Nha cung cap</span>
                                        <select className={`${inputClass} w-full`} value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}>
                                            <option value="">Chua chon</option>
                                            {suppliers.map((supplier) => <option key={supplier.id ?? supplier.Id} value={supplier.id ?? supplier.Id}>{supplier.name ?? supplier.Name}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                                <button type="button" className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]" onClick={closeModal}>Hủy</button>
                                <button type="submit" className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)]">{editingProduct ? 'Cập nhật' : 'Tạo mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
