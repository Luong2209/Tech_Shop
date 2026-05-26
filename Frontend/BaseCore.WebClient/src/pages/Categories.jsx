import React, { useEffect, useState } from 'react';
import { categoryApi, specApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const inputClass = 'rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100';
const hiddenAdminCategoryNames = new Set(['accessories', 'phu kien', 'phụ kiện', 'audio']);

const normalizeCategoryName = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const isVisibleAdminCategory = (category) =>
    !hiddenAdminCategoryNames.has(normalizeCategoryName(category?.name));

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(8);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [showSpecModal, setShowSpecModal] = useState(false);
    const [showSpecEditor, setShowSpecEditor] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [specDefinitions, setSpecDefinitions] = useState([]);
    const [specLoading, setSpecLoading] = useState(false);
    const [specForm, setSpecForm] = useState({ id: null, name: '', code: '', options: [] });
    const [optionInputs, setOptionInputs] = useState({});
    const [optionDefinition, setOptionDefinition] = useState(null);
    const { isAdmin } = useAuth();

    useEffect(() => {
        loadCategories();
    }, [page]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await categoryApi.getAll();
            const allCategories = (response.data || []).filter(isVisibleAdminCategory);
            const total = allCategories.length;
            const totalPagesCount = Math.ceil(total / pageSize) || 1;
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;

            setCategories(allCategories.slice(startIndex, endIndex));
            setTotalCount(total);
            setTotalPages(totalPagesCount);
        } catch (err) {
            console.error('Không thể tải danh mục:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                description: '',
            });
        }
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setError('');
    };

    const closeSpecModal = () => {
        setShowSpecModal(false);
        setShowSpecEditor(false);
        setSelectedCategory(null);
        setSpecDefinitions([]);
        setOptionDefinition(null);
        resetSpecForm();
    };

    const closeSpecEditor = () => {
        setShowSpecEditor(false);
        resetSpecForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (editingCategory) {
                await categoryApi.update(editingCategory.id, {
                    id: editingCategory.id,
                    ...formData,
                });
            } else {
                await categoryApi.create(formData);
            }

            closeModal();
            setPage(1);
            loadCategories();
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Thao tác thất bại');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa danh mục này?')) return;

        try {
            await categoryApi.delete(id);
            setPage(1);
            loadCategories();
        } catch (err) {
            alert('Không thể xóa danh mục. Danh mục có thể đang chứa sản phẩm.');
        }
    };

    const resetSpecForm = () => setSpecForm({ id: null, name: '', code: '', options: [] });

    const loadCategorySpecs = async (category, activeDefinitionId = null) => {
        setSelectedCategory(category);
        resetSpecForm();
        setSpecLoading(true);
        try {
            const response = await specApi.getDefinitions(category.id);
            const definitions = Array.isArray(response.data) ? response.data : [];
            setSpecDefinitions(definitions);
            if (activeDefinitionId) {
                setOptionDefinition(definitions.find((definition) => definition.id === activeDefinitionId) || null);
            }
        } catch (err) {
            console.error('Khong the tai thong so danh muc:', err);
            setSpecDefinitions([]);
        } finally {
            setSpecLoading(false);
        }
    };

    const openSpecModal = async (category) => {
        setShowSpecModal(true);
        setShowSpecEditor(false);
        await loadCategorySpecs(category);
    };

    const openCreateSpecEditor = () => {
        resetSpecForm();
        setShowSpecEditor(true);
    };

    const openOptionModal = (definition) => setOptionDefinition(definition);
    const closeOptionModal = () => setOptionDefinition(null);

    const submitSpec = async (event) => {
        event.preventDefault();
        if (!selectedCategory) return;
        const options = (specForm.options || [])
            .map((option, index) => ({
                ...option,
                value: String(option.value || '').trim(),
                displayOrder: Number(option.displayOrder || index + 1),
                isActive: option.isActive !== false,
            }))
            .filter((option) => option.value);
        const payload = { id: specForm.id || 0, name: specForm.name, code: specForm.code, categoryId: selectedCategory.id, dataType: 'select', options };
        if (specForm.id) await specApi.updateDefinition(specForm.id, payload);
        else await specApi.createDefinition(payload);
        await loadCategorySpecs(selectedCategory);
        setShowSpecEditor(false);
    };

    const editSpec = (definition) => {
        setSpecForm({
            id: definition.id,
            name: definition.name || '',
            code: definition.code || '',
            options: (definition.options || []).map((option, index) => ({
                id: option.id,
                specDefinitionId: definition.id,
                value: option.value || '',
                displayOrder: option.displayOrder || index + 1,
                isActive: option.isActive !== false,
            })),
        });
        setShowSpecEditor(true);
    };

    const addSpecFormOption = () => {
        setSpecForm((current) => ({
            ...current,
            options: [
                ...(current.options || []),
                { id: 0, specDefinitionId: current.id || 0, value: '', displayOrder: (current.options || []).length + 1, isActive: true },
            ],
        }));
    };

    const updateSpecFormOption = (index, changes) => {
        setSpecForm((current) => ({
            ...current,
            options: (current.options || []).map((option, optionIndex) => optionIndex === index ? { ...option, ...changes } : option),
        }));
    };

    const removeSpecFormOption = (index) => {
        setSpecForm((current) => ({
            ...current,
            options: (current.options || [])
                .filter((_, optionIndex) => optionIndex !== index)
                .map((option, optionIndex) => ({ ...option, displayOrder: optionIndex + 1 })),
        }));
    };

    const deleteSpec = async (definition) => {
        if (!window.confirm('Xoa hoac tat thong so nay?')) return;
        await specApi.deleteDefinition(definition.id);
        await loadCategorySpecs(selectedCategory);
    };

    const addOption = async (definition) => {
        const value = String(optionInputs[definition.id] || '').trim();
        if (!value) return;
        await specApi.createOption({ specDefinitionId: definition.id, value, displayOrder: (definition.options || []).length + 1, isActive: true });
        setOptionInputs({ ...optionInputs, [definition.id]: '' });
        await loadCategorySpecs(selectedCategory, definition.id);
    };

    const deleteOption = async (option) => {
        await specApi.deleteOption(option.id);
        await loadCategorySpecs(selectedCategory, option.specDefinitionId);
    };

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Danh mục bán hàng</p>
                    <h2 className="mb-0 text-2xl font-bold text-[var(--color-fg)]">Quản lý danh mục</h2>
                </div>
                {isAdmin() && (
                    <button className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[var(--color-primary)]" onClick={() => openModal()}>
                        <i className="fas fa-plus"></i>
                        Thêm danh mục
                    </button>
                )}
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ">
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Tổng danh mục</p>
                    <div className="text-2xl font-bold text-[var(--color-fg)]">{totalCount}</div>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ">
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Trang hiện tại</p>
                    <div className="text-2xl font-bold text-[var(--color-accent)]">{page}/{totalPages || 1}</div>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ">
                    <p className="mb-1 text-sm font-semibold text-[var(--color-fg-muted)]">Dòng đang hiển thị</p>
                    <div className="text-2xl font-bold text-emerald-300">{categories.length}</div>
                </div>
            </div>

            <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                <div className="border-b border-[var(--color-border)] px-4 py-4">
                    <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Tất cả danh mục</h3>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="py-12 text-center text-sm font-medium text-[var(--color-fg-muted)]">Đang tải danh mục...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                            <table className="min-w-[900px] table-fixed divide-y divide-[var(--color-border)] text-sm">
                                <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                    <tr>
                                        <th className="w-[90px] px-4 py-3">ID</th>
                                        <th className="w-[220px] px-4 py-3">Tên danh mục</th>
                                        <th className="px-4 py-3">Mô tả</th>
                                        {isAdmin() && <th className="w-[130px] px-4 py-3 text-right">Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {categories.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin() ? 4 : 3} className="px-4 py-10 text-center text-[var(--color-fg-muted)]">Không tìm thấy danh mục</td>
                                        </tr>
                                    ) : categories.map((category) => (
                                        <tr key={category.id} className="hover:bg-[var(--color-surface-2)]">
                                            <td className="px-4 py-3 font-bold text-[var(--color-fg)]">#{category.id}</td>
                                            <td className="truncate px-4 py-3 font-semibold text-[var(--color-fg)]">{category.name}</td>
                                            <td className="truncate px-4 py-3 text-[var(--color-fg-muted)]">{category.description || '-'}</td>
                                            {isAdmin() && (
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]"
                                                            onClick={() => openSpecModal(category)}
                                                        >
                                                            <i className="fas fa-sliders-h"></i>
                                                            Bo thong so
                                                        </button>
                                                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]" onClick={() => openModal(category)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleDelete(category.id)}>
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
                    <span>Hiển thị {categories.length ? ((page - 1) * pageSize) + 1 : 0} - {Math.min(page * pageSize, totalCount)} trong {totalCount} danh mục</span>
                    <div className="flex items-center gap-2">
                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-semibold disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
                        <span>Trang {page}/{totalPages || 1}</span>
                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-semibold disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
                    </div>
                </div>
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-md bg-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <h3 className="mb-0 text-lg font-bold text-[var(--color-fg)]">{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]" onClick={closeModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="p-5">
                                {error && <div className="mb-4 rounded-md border border-rose-200 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                                <div className="grid gap-4">
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Tên danh mục</span>
                                        <input
                                            type="text"
                                            className={`${inputClass} w-full`}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Mô tả</span>
                                        <textarea
                                            className={`${inputClass} w-full`}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows="4"
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                                <button type="button" className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]" onClick={closeModal}>Hủy</button>
                                <button type="submit" className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)]">{editingCategory ? 'Cập nhật' : 'Tạo mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSpecModal && selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-md bg-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Bo thong so theo danh muc</p>
                                <h3 className="mb-0 text-lg font-bold text-[var(--color-fg)]">{selectedCategory.name}</h3>
                            </div>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]" onClick={closeSpecModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="text-sm text-[var(--color-fg-muted)]">{specDefinitions.length} thong so trong danh muc nay</div>
                                <button type="button" className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)]" onClick={openCreateSpecEditor}>
                                    Them thong so moi
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                                {specLoading ? (
                                    <div className="p-6 text-sm text-[var(--color-fg-muted)]">Dang tai thong so...</div>
                                ) : specDefinitions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="mb-2 text-base font-bold text-[var(--color-fg)]">Danh muc nay chua co thong so</div>
                                        <p className="mb-0 text-sm text-[var(--color-fg-muted)]">Bam "Them thong so moi" de tao thong so dau tien.</p>
                                    </div>
                                ) : (
                                    <table className="min-w-[900px] divide-y divide-[var(--color-border)] text-sm">
                                        <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase text-[var(--color-fg-muted)]">
                                            <tr>
                                                <th className="w-[280px] px-4 py-3">Thong so</th>
                                                <th className="px-4 py-3">Options</th>
                                                <th className="w-[120px] px-4 py-3 text-right">Thao tac</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {specDefinitions.map((definition) => (
                                                <tr key={definition.id}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-semibold text-[var(--color-fg)]">{definition.name}</div>
                                                        <div className="text-xs text-[var(--color-fg-muted)]">{definition.code}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xs font-semibold text-[var(--color-fg-muted)]">{(definition.options || []).length} option</span>
                                                            <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-surface-2)]" onClick={() => openOptionModal(definition)}>
                                                                Xem option
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-3 py-2 text-white" onClick={() => editSpec(definition)}><i className="fas fa-edit"></i></button>
                                                            <button type="button" className="rounded-md bg-rose-600 px-3 py-2 text-white" onClick={() => deleteSpec(definition)}><i className="fas fa-trash"></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {optionDefinition && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-md bg-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Danh sach option</p>
                                <h3 className="mb-0 text-lg font-bold text-[var(--color-fg)]">{optionDefinition.name}</h3>
                                <p className="mb-0 mt-1 text-xs text-[var(--color-fg-muted)]">{optionDefinition.code}</p>
                            </div>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]" onClick={closeOptionModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="max-h-[calc(86vh-150px)] overflow-y-auto p-5">
                            {(optionDefinition.options || []).length === 0 ? (
                                <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-fg-muted)]">
                                    Thong so nay chua co option.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
                                    <table className="w-full divide-y divide-[var(--color-border)] text-sm">
                                        <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase text-[var(--color-fg-muted)]">
                                            <tr>
                                                <th className="px-4 py-3">Gia tri</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {(optionDefinition.options || []).map((option) => (
                                                <tr key={option.id}>
                                                    <td className="px-4 py-3 font-medium text-[var(--color-fg)]">{option.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showSpecEditor && selectedCategory && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-md bg-[var(--color-surface)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Bo thong so</p>
                                <h3 className="mb-0 text-lg font-bold text-[var(--color-fg)]">{specForm.id ? 'Sua thong so' : 'Them thong so moi'}</h3>
                            </div>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:bg-[var(--color-surface-3)]" onClick={closeSpecEditor}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={submitSpec}>
                            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-5">
                                <div className="mb-4 rounded-md bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-fg-muted)]">
                                    Danh muc: <span className="font-semibold text-[var(--color-fg)]">{selectedCategory.name}</span>
                                </div>
                                <div className="grid gap-4">
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Ten thong so</span>
                                        <input className={`${inputClass} w-full`} value={specForm.name} onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })} required />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Code</span>
                                        <input className={`${inputClass} w-full`} value={specForm.code} onChange={(e) => setSpecForm({ ...specForm, code: e.target.value })} required />
                                    </label>
                                    <div className="rounded-md border border-[var(--color-border)]">
                                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                                            <div>
                                                <div className="text-sm font-semibold text-[var(--color-fg)]">Gia tri lua chon</div>
                                                <div className="text-xs text-[var(--color-fg-muted)]">Danh sach gia tri cho thong so nay.</div>
                                            </div>
                                            <button type="button" className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-surface-2)]" onClick={addSpecFormOption}>
                                                Them option
                                            </button>
                                        </div>
                                        <div className="grid gap-2 p-3">
                                            {(specForm.options || []).length === 0 ? (
                                                <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-sm text-[var(--color-fg-muted)]">
                                                    Chua co option. Bam "Them option" de them gia tri cho thong so nay.
                                                </div>
                                            ) : (
                                                (specForm.options || []).map((option, index) => (
                                                    <div key={`${option.id || 'new'}-${index}`} className="grid gap-2 rounded-md border border-[var(--color-border)] p-2 sm:grid-cols-[1fr_auto] sm:items-center">
                                                        <input
                                                            className={`${inputClass} w-full`}
                                                            value={option.value || ''}
                                                            onChange={(e) => updateSpecFormOption(index, { value: e.target.value })}
                                                            placeholder="Gia tri option"
                                                        />
                                                        <button type="button" className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700" onClick={() => removeSpecFormOption(index)}>
                                                            Xoa
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                                <button type="button" className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]" onClick={closeSpecEditor}>Huy</button>
                                <button type="submit" className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)]">{specForm.id ? 'Cap nhat' : 'Them thong so'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;
