import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { categoryApi, inventoryApi, productApi, supplierApi } from '../services/api';
import { toast } from '../utils/store';
import AdminFilterDropdown from '../components/AdminFilterDropdown';
import { useAuth } from '../contexts/AuthContext';

const STOCK_STATUS_LABELS = {
    InStock: 'Còn trong kho',
    Reserved: 'Đã giữ hàng',
    Sold: 'Đã bán',
    Returned: 'Khách trả',
    Repairing: 'Đang sửa',
    Warranty: 'Đang bảo hành',
    Damaged: 'Hư hỏng',
    Lost: 'Thất lạc',
};

const stockStatusText = (value) => STOCK_STATUS_LABELS[value] || value || 'Không rõ';
const fieldClass = 'w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:bg-[var(--color-surface-3)] disabled:text-[var(--color-fg-dim)]';
const labelClass = 'mb-1 block text-sm font-semibold text-[var(--color-fg)]';
const CSV_SOURCE_HINT = 'D:\\nam3\\Ki2\\CNTHTT\\BaseCoreAnhTung\\BaseCore';
const SERIAL_CSV_TEMPLATE = 'serialOrImei\n356938035643809\n356938035643810\n356938035643811\n';

const stockStatusClass = (value) => {
    const status = String(value || '');
    if (status === 'InStock') return 'bg-emerald-500/10 text-emerald-300';
    if (status === 'Sold') return 'bg-[var(--color-surface-3)] text-[var(--color-fg)]';
    if (status === 'Reserved') return 'bg-[var(--color-surface-2)] text-amber-300';
    if (status === 'Damaged' || status === 'Lost') return 'bg-red-500/10 text-red-300';
    return 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]';
};

const unwrapItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const unwrapPageMeta = (payload, items, page, pageSize) => {
    if (!payload || Array.isArray(payload)) {
        const totalCount = items.length;
        return { totalCount, totalPages: Math.ceil(totalCount / pageSize) || 1, page, pageSize };
    }
    const totalCount = Number(payload.totalCount ?? payload.total ?? payload.count ?? items.length);
    return {
        totalCount,
        totalPages: Number(payload.totalPages ?? (Math.ceil(totalCount / pageSize) || 1)),
        page: Number(payload.page || page),
        pageSize: Number(payload.pageSize || pageSize),
    };
};

const normalizeStockItem = (x) => ({
    id: x.id ?? x.Id,
    productId: x.productId ?? x.ProductId,
    productName: x.productName ?? x.ProductName,
    serialOrImei: x.serialOrImei ?? x.SerialOrImei,
    status: x.status ?? x.Status,
    receivedAt: x.receivedAt ?? x.ReceivedAt,
    soldAt: x.soldAt ?? x.SoldAt,
});

const readError = (err, fallback) => {
    const data = err?.response?.data;
    return data?.message || data?.detail || data?.title || err?.message || fallback;
};

const AdminInventory = () => {
    const { user } = useAuth();
    const location = useLocation();
    const role = user?.role || '';
    const canReceive = ['Admin', 'Warehouse'].includes(role);
    const canReturn = ['Admin', 'Technical'].includes(role);

    const [products, setProducts] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [filters, setFilters] = useState({ keyword: '', status: '', productId: '', minDaysInStock: '' });
    const [serialQuickSearch, setSerialQuickSearch] = useState('');
    const [stockPage, setStockPage] = useState(1);
    const [stockPageSize] = useState(10);
    const [stockTotalCount, setStockTotalCount] = useState(0);
    const [stockTotalPages, setStockTotalPages] = useState(1);
    const [returnLookup, setReturnLookup] = useState({ loading: false, data: null, error: '' });
    const [activeLeftPanel, setActiveLeftPanel] = useState(canReceive ? 'receive' : 'return');
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [csvImportStatus, setCsvImportStatus] = useState('');
    const [isCsvDragging, setIsCsvDragging] = useState(false);
    const [csvPreview, setCsvPreview] = useState(null);
    const [csvPreviewPage, setCsvPreviewPage] = useState(1);
    const [selectedCsvSerials, setSelectedCsvSerials] = useState([]);
    const csvPreviewPageSize = 20;

    const [form, setForm] = useState({
        categoryId: '',
        supplierId: '',
        productId: '',
        quantity: 1,
        unitCost: 0,
        serialsText: '',
    });

    const [returnForm, setReturnForm] = useState({
        serialOrImei: '',
        reason: '',
        statusAfter: 'InStock',
    });

    const selectedProduct = useMemo(() => {
        const id = Number(form.productId);
        return id ? products.find((p) => Number(p.id ?? p.Id) === id) || null : null;
    }, [form.productId, products]);

    const requiresSerialTracking = Boolean(selectedProduct?.requiresSerialTracking ?? selectedProduct?.RequiresSerialTracking);

    const selectedSupplier = useMemo(() => {
        const id = Number(form.supplierId);
        return id ? suppliers.find((s) => Number(s.id ?? s.Id) === id) || null : null;
    }, [form.supplierId, suppliers]);

    const serials = useMemo(
        () => form.serialsText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
        [form.serialsText]
    );

    const serialValidation = useMemo(() => {
        const seen = new Set();
        const duplicates = new Set();
        serials.forEach((serial) => {
            const key = serial.toLowerCase();
            if (seen.has(key)) duplicates.add(serial);
            seen.add(key);
        });

        const quantity = Number(form.quantity || 0);
        const count = serials.length;
        return {
            count,
            duplicates: Array.from(duplicates),
            isEnough: count === quantity,
            isMissing: count < quantity,
            isExtra: count > quantity,
            isValid: !requiresSerialTracking || (quantity > 0 && count === quantity && duplicates.size === 0),
        };
    }, [serials, form.quantity, requiresSerialTracking]);

    const productNameById = useMemo(() => {
        const map = new Map();
        products.forEach((p) => {
            const id = Number(p.id ?? p.Id);
            if (id) map.set(id, String(p.name ?? p.Name ?? `#${id}`));
        });
        return map;
    }, [products]);

    const loadProducts = async () => {
        const res = await productApi.getAllRemote({ page: 1, pageSize: 200 });
        const data = res.data;
        setProducts(Array.isArray(data) ? data : data.items || data.Items || []);
    };

    const loadCategories = async () => {
        const res = await categoryApi.getAll();
        const data = res.data;
        setCategories(Array.isArray(data) ? data : data.items || data.Items || []);
    };

    const loadSuppliers = async () => {
        const res = await supplierApi.getAll({ isActive: true, page: 1, pageSize: 100 });
        const data = res.data;
        const list = Array.isArray(data) ? data : data.items || data.Items || [];
        setSuppliers(list.filter((item) => (item.isActive ?? item.IsActive) !== false));
    };

    const loadStock = async (page = stockPage) => {
        const keyword = serialQuickSearch.trim() || filters.keyword.trim();
        const res = await inventoryApi.getStockItems({
            page,
            pageSize: stockPageSize,
            keyword: keyword || undefined,
            status: filters.status || undefined,
            productId: filters.productId || undefined,
            minDays: filters.minDaysInStock || undefined,
        });
        const items = unwrapItems(res.data);
        const meta = unwrapPageMeta(res.data, items, page, stockPageSize);
        setStockItems(items);
        setStockTotalCount(meta.totalCount);
        setStockTotalPages(Math.max(1, meta.totalPages));
        if (meta.page && meta.page !== stockPage) {
            setStockPage(meta.page);
        }
    };

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            await Promise.all([loadProducts(), loadCategories(), loadSuppliers(), loadStock()]);
        } catch (err) {
            setError(readError(err, 'Không tải được dữ liệu kho.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        setForm((prev) => ({ ...prev, productId: '' }));
    }, [form.categoryId]);

    useEffect(() => {
        if (location.pathname.includes('/returns')) {
            setActiveLeftPanel('return');
            return;
        }
        if (location.pathname.includes('/receipts')) {
            setActiveLeftPanel(canReceive ? 'receive' : 'return');
            return;
        }
        if (!canReceive) setActiveLeftPanel('return');
    }, [location.pathname, canReceive]);

    useEffect(() => {
        setStockPage(1);
    }, [filters.keyword, filters.status, filters.productId, filters.minDaysInStock, serialQuickSearch]);

    useEffect(() => {
        loadStock(stockPage).catch((err) => setError(readError(err, 'Không tải được tồn kho.')));
    }, [stockPage, filters.keyword, filters.status, filters.productId, filters.minDaysInStock, serialQuickSearch]);

    useEffect(() => {
        const serial = String(returnForm.serialOrImei || '').trim();
        if (!serial) {
            setReturnLookup({ loading: false, data: null, error: '' });
            return undefined;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setReturnLookup({ loading: true, data: null, error: '' });
            try {
                const res = await inventoryApi.lookupStockItem(serial);
                if (!cancelled) setReturnLookup({ loading: false, data: res.data || null, error: '' });
            } catch (err) {
                if (cancelled) return;
                if (err?.response?.status === 404) {
                    setReturnLookup({ loading: false, data: null, error: 'Không tìm thấy Serial/IMEI' });
                    return;
                }
                setReturnLookup({ loading: false, data: null, error: readError(err, 'Không tra cứu được Serial/IMEI') });
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [returnForm.serialOrImei]);

    const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const cleanSerialWhitespace = () => {
        setForm((prev) => ({
            ...prev,
            serialsText: prev.serialsText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join('\n'),
        }));
    };

    const removeDuplicateSerials = () => {
        const seen = new Set();
        const unique = [];
        form.serialsText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).forEach((serial) => {
            const key = serial.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            unique.push(serial);
        });
        setForm((prev) => ({ ...prev, serialsText: unique.join('\n') }));
    };

    const normalizeCsvKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizeCsvValue = (value) => String(value || '').trim().toLowerCase();
    const isCsvHeaderValue = (value) => {
        const key = normalizeCsvKey(value);
        return [
            'receiptcode',
            'categoryid',
            'categoryname',
            'category',
            'danhmucid',
            'danhmuc',
            'tendanhmuc',
            'productid',
            'productname',
            'product',
            'sanphamid',
            'sanpham',
            'tensanpham',
            'sku',
            'productsku',
            'masanpham',
            'supplierid',
            'suppliername',
            'supplier',
            'nhacungcap',
            'quantity',
            'soluong',
            'unitcost',
            'giavon',
        ].includes(key);
    };

    const splitCsvLine = (line) => {
        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            const next = line[i + 1];
            if (char === '"' && next === '"') {
                current += '"';
                i += 1;
                continue;
            }
            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (!inQuotes && (char === ',' || char === ';' || char === '\t')) {
                cells.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }

        cells.push(current.trim());
        return cells;
    };

    const findHeaderIndex = (headers, aliases) => {
        const aliasSet = new Set(aliases);
        return headers.findIndex((header) => aliasSet.has(normalizeCsvKey(header)));
    };

    const parseSerialsFromCsv = (text) => {
        const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean).map(splitCsvLine);
        if (rows.length === 0) return { serials: [], totalRows: 0, skippedByContext: 0, missingSerialColumn: true };

        const headers = rows[0];
        const serialIndex = findHeaderIndex(headers, [
            'serial',
            'imei',
            'serialimei',
            'serialorimei',
            'serialnumber',
            'serialno',
            'imeinumber',
            'imeino',
            'maserial',
            'maimei',
            'somay',
        ]);
        const categoryIdIndex = findHeaderIndex(headers, ['categoryid', 'danhmucid']);
        const categoryNameIndex = findHeaderIndex(headers, ['categoryname', 'category', 'danhmuc', 'tendanhmuc']);
        const productIdIndex = findHeaderIndex(headers, ['productid', 'sanphamid']);
        const productNameIndex = findHeaderIndex(headers, ['productname', 'product', 'sanpham', 'tensanpham']);
        const skuIndex = findHeaderIndex(headers, ['sku', 'productsku', 'masanpham']);

        const hasHeader = serialIndex >= 0 || headers.some((header) => /receipt|category|product|sku/i.test(header));
        if (serialIndex < 0 && rows.every((row) => row.length <= 1)) {
            if (isCsvHeaderValue(rows[0]?.[0])) {
                return { serials: [], totalRows: Math.max(0, rows.length - 1), skippedByContext: 0, missingSerialColumn: true };
            }
            const serials = rows
                .map((row) => row[0] || '')
                .filter((value) => value && !isCsvHeaderValue(value) && !/^serial|imei|serial\/imei|serialOrImei$/i.test(value));
            return { serials, totalRows: serials.length, skippedByContext: 0, missingSerialColumn: false };
        }
        if (serialIndex < 0 || !hasHeader) {
            return { serials: [], totalRows: Math.max(0, rows.length - 1), skippedByContext: 0, missingSerialColumn: true };
        }

        const selectedCategoryId = String(form.categoryId || '').trim();
        const selectedCategory = categories.find((item) => String(item.id ?? item.Id) === selectedCategoryId);
        const selectedCategoryName = normalizeCsvValue(selectedCategory?.name ?? selectedCategory?.Name);
        const selectedProductId = String(form.productId || '').trim();
        const selectedProductName = normalizeCsvValue(selectedProduct?.name ?? selectedProduct?.Name);
        const selectedSku = normalizeCsvValue(selectedProduct?.sku ?? selectedProduct?.Sku);
        let skippedByContext = 0;

        const previewRows = [];
        const serials = rows.slice(1).map((row, index) => {
            const rowCategoryId = categoryIdIndex >= 0 ? String(row[categoryIdIndex] || '').trim() : '';
            const rowCategoryName = categoryNameIndex >= 0 ? normalizeCsvValue(row[categoryNameIndex]) : '';
            const rowProductId = productIdIndex >= 0 ? String(row[productIdIndex] || '').trim() : '';
            const rowProductName = productNameIndex >= 0 ? normalizeCsvValue(row[productNameIndex]) : '';
            const rowSku = skuIndex >= 0 ? normalizeCsvValue(row[skuIndex]) : '';

            const categoryMatches =
                (categoryIdIndex < 0 && categoryNameIndex < 0) ||
                (selectedCategoryId && rowCategoryId && rowCategoryId === selectedCategoryId) ||
                (selectedCategoryName && rowCategoryName && rowCategoryName === selectedCategoryName);
            const productMatches =
                (productIdIndex < 0 && productNameIndex < 0 && skuIndex < 0) ||
                (selectedProductId && rowProductId && rowProductId === selectedProductId) ||
                (selectedProductName && rowProductName && rowProductName === selectedProductName) ||
                (selectedSku && rowSku && rowSku === selectedSku);

            const serialValue = String(row[serialIndex] || '').trim();
            const isMatch = categoryMatches && productMatches && serialValue && !isCsvHeaderValue(serialValue);
            previewRows.push({
                index: index + 1,
                cells: headers.map((_, cellIndex) => row[cellIndex] || ''),
                serial: serialValue,
                isMatch,
            });

            if (!isMatch) {
                skippedByContext += 1;
                return '';
            }

            return serialValue;
        }).map((value) => String(value).trim()).filter((value) => value && !isCsvHeaderValue(value));

        return {
            serials,
            totalRows: Math.max(0, rows.length - 1),
            skippedByContext,
            missingSerialColumn: false,
            headers,
            serialIndex,
            previewRows,
        };
    };

    const importSerialsFromCsv = async (file) => {
        if (!file) return;
        try {
            const text = await file.text();
            const parsedCsv = parseSerialsFromCsv(text);
            setCsvPreview({ ...parsedCsv, fileName: file.name });
            setCsvPreviewPage(1);
            setSelectedCsvSerials([]);
            if (parsedCsv.missingSerialColumn) {
                setCsvImportStatus(`File ${file.name} thieu cot serial/IMEI. Khong lay cot dau tien de tranh nham receipt_code.`);
            } else {
                setCsvImportStatus(`Da doc ${parsedCsv.totalRows} dong tu ${file.name}. Co ${parsedCsv.serials.length} dong dung danh muc/san pham dang chon.`);
            }
            return;
            const csvSerials = parsedCsv.serials;
            const quantity = Math.max(0, Number(form.quantity || 0));
            const currentSerials = serials;
            const remainingSlots = Math.max(0, quantity - currentSerials.length);
            const existingKeys = new Set(currentSerials.map((item) => item.toLowerCase()));
            const uniqueCsvSerials = [];
            let duplicateCount = 0;

            csvSerials.forEach((item) => {
                const key = item.toLowerCase();
                if (existingKeys.has(key)) {
                    duplicateCount += 1;
                    return;
                }
                existingKeys.add(key);
                uniqueCsvSerials.push(item);
            });

            const imported = uniqueCsvSerials.slice(0, remainingSlots);
            const skippedByLimit = Math.max(0, uniqueCsvSerials.length - imported.length);

            setForm((prev) => ({
                ...prev,
                serialsText: [...currentSerials, ...imported].join('\n'),
            }));

            const parts = [];
            if (parsedCsv.missingSerialColumn) {
                parts.push(`File ${file.name} thieu cot serial/IMEI. Khong lay cot dau tien de tranh nham receipt_code.`);
            } else if (csvSerials.length === 0) {
                parts.push(`File ${file.name} khong co serial/IMEI hop le.`);
            } else if (remainingSlots === 0) {
                parts.push(`Da du ${quantity} ma theo so luong, chua nhap them tu ${file.name}.`);
            } else {
                parts.push(`Da nhap ${imported.length}/${remainingSlots} ma can them tu ${file.name}.`);
            }
            if (parsedCsv.skippedByContext > 0) parts.push(`Bo qua ${parsedCsv.skippedByContext} dong khong dung danh muc/san pham dang chon.`);
            if (skippedByLimit > 0) parts.push(`Bo qua ${skippedByLimit} ma vi vuot so luong.`);
            if (duplicateCount > 0) parts.push(`Bo qua ${duplicateCount} ma trung.`);
            setCsvImportStatus(parts.join(' '));
        } catch (err) {
            setError('Không đọc được file CSV serial/IMEI.');
        }
    };

    const applyCsvPreviewToReceipt = () => {
        if (!csvPreview) return;
        const csvSerials = selectedCsvSerials;
        const quantity = Math.max(0, Number(form.quantity || 0));
        const currentSerials = serials;
        const remainingSlots = Math.max(0, quantity - currentSerials.length);
        const existingKeys = new Set(currentSerials.map((item) => item.toLowerCase()));
        const uniqueCsvSerials = [];
        let duplicateCount = 0;

        csvSerials.forEach((item) => {
            const key = item.toLowerCase();
            if (existingKeys.has(key)) {
                duplicateCount += 1;
                return;
            }
            existingKeys.add(key);
            uniqueCsvSerials.push(item);
        });

        const imported = uniqueCsvSerials.slice(0, remainingSlots);
        const skippedByLimit = Math.max(0, uniqueCsvSerials.length - imported.length);

        setForm((prev) => ({
            ...prev,
            serialsText: [...currentSerials, ...imported].join('\n'),
        }));

        const parts = [];
        if (csvPreview.missingSerialColumn) {
            parts.push(`File ${csvPreview.fileName} thieu cot serial/IMEI.`);
        } else if (selectedCsvSerials.length === 0) {
            parts.push('Chua chon serial/IMEI nao trong bang CSV.');
        } else if (remainingSlots === 0) {
            parts.push(`Da du ${quantity} ma theo so luong, chua nhap them.`);
        } else {
            parts.push(`Da dua ${imported.length}/${remainingSlots} ma vao phieu.`);
        }
        if (csvPreview.skippedByContext > 0) parts.push(`Bo qua ${csvPreview.skippedByContext} dong khong dung danh muc/san pham.`);
        if (skippedByLimit > 0) parts.push(`Bo qua ${skippedByLimit} ma vi vuot so luong.`);
        if (duplicateCount > 0) parts.push(`Bo qua ${duplicateCount} ma trung.`);
        setCsvImportStatus(parts.join(' '));
        if (imported.length > 0) {
            setSelectedCsvSerials((prev) => prev.filter((item) => !imported.includes(item)));
        }
    };

    const toggleCsvSerialSelection = (serial) => {
        if (!serial) return;
        setSelectedCsvSerials((prev) =>
            prev.includes(serial) ? prev.filter((item) => item !== serial) : [...prev, serial]
        );
    };

    const selectCurrentCsvPage = () => {
        const pageSerials = csvPageRows
            .filter((row) => row.isMatch && row.serial)
            .map((row) => row.serial);
        setSelectedCsvSerials((prev) => Array.from(new Set([...prev, ...pageSerials])));
    };

    const handleCsvDrop = async (e) => {
        e.preventDefault();
        setIsCsvDragging(false);
        const file = Array.from(e.dataTransfer?.files || []).find((item) =>
            item.type === 'text/csv' ||
            item.type === 'text/plain' ||
            item.name.toLowerCase().endsWith('.csv') ||
            item.name.toLowerCase().endsWith('.txt')
        );
        await importSerialsFromCsv(file);
    };

    const downloadCsvTemplate = () => {
        const blob = new Blob([SERIAL_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'serial-imei-template.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleCreateReceipt = async (e) => {
        e.preventDefault();
        const productId = Number(form.productId);
        const quantity = Number(form.quantity);
        const unitCost = Number(form.unitCost);
        if (!productId || quantity <= 0) return;
        if (requiresSerialTracking && !serialValidation.isValid) {
            setError('Serial/IMEI chưa hợp lệ. Vui lòng nhập đúng số lượng và không để trùng mã.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await inventoryApi.createReceipt({
                categoryId: Number(form.categoryId),
                supplierId: Number(form.supplierId),
                lines: [{ productId, quantity, unitCost, serials: requiresSerialTracking ? serials : [] }],
            });
            setForm((prev) => ({ ...prev, quantity: 1, unitCost: 0, serialsText: '' }));
            await loadAll();
            toast(requiresSerialTracking ? 'Da nhap kho va tao serial/IMEI' : 'Da nhap kho', 'success');
        } catch (err) {
            setError(readError(err, 'Không tạo được phiếu nhập.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturn = async (e) => {
        e.preventDefault();
        if (!returnForm.serialOrImei.trim()) return;

        setSubmitting(true);
        setError('');
        try {
            await inventoryApi.returnItem({
                serialOrImei: returnForm.serialOrImei.trim(),
                reason: returnForm.reason.trim() || null,
                statusAfter: returnForm.statusAfter || 'InStock',
                condition: returnForm.statusAfter === 'Damaged' ? 'Damaged' : 'Used',
            });
            setReturnForm({ serialOrImei: '', reason: '', statusAfter: 'InStock' });
            await loadAll();
            toast('Da xu ly hang tra', 'success');
        } catch (err) {
            setError(readError(err, 'Không xử lý được hàng trả.'));
        } finally {
            setSubmitting(false);
        }
    };

    const pagedStockItems = stockItems;
    const totalStockPages = stockTotalPages;

    useEffect(() => {
        setStockPage((p) => Math.min(Math.max(1, p), totalStockPages));
    }, [totalStockPages]);

    const productOptions = useMemo(() => {
        const categoryId = Number(form.categoryId || 0);
        return products
            .filter((p) => !categoryId || Number(p.categoryId ?? p.CategoryId) === categoryId)
            .slice()
            .sort((a, b) => String(a.name ?? a.Name ?? '').localeCompare(String(b.name ?? b.Name ?? '')))
            .slice(0, 120);
    }, [products, form.categoryId]);

    const activeFilterCount =
        (filters.keyword.trim() ? 1 : 0) +
        (filters.status ? 1 : 0) +
        (filters.productId ? 1 : 0) +
        (String(filters.minDaysInStock || '').trim() ? 1 : 0);
    const stockFrom = stockItems.length ? (stockPage - 1) * stockPageSize + 1 : 0;
    const stockTo = stockItems.length ? (stockPage - 1) * stockPageSize + stockItems.length : 0;
    const csvRows = csvPreview?.previewRows || [];
    const csvTotalPages = Math.max(1, Math.ceil(csvRows.length / csvPreviewPageSize));
    const csvPage = Math.min(Math.max(1, csvPreviewPage), csvTotalPages);
    const csvPageRows = csvRows.slice((csvPage - 1) * csvPreviewPageSize, csvPage * csvPreviewPageSize);
    const csvFrom = csvRows.length ? (csvPage - 1) * csvPreviewPageSize + 1 : 0;
    const csvTo = csvRows.length ? Math.min(csvPage * csvPreviewPageSize, csvRows.length) : 0;

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Kho hàng</p>
                    <h2 className="mb-0 text-2xl font-bold text-[var(--color-fg)]">Quản lý tồn kho</h2>
                </div>
                <button type="button" className="rounded-md border border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10" onClick={loadAll} disabled={loading}>
                    Làm mới
                </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                    {canReceive && (
                        <button
                            type="button"
                            className={`rounded-md px-3 py-2 text-sm font-semibold ${activeLeftPanel === 'receive' ? 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white' : 'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'}`}
                            onClick={() => setActiveLeftPanel('receive')}
                        >
                            Nhập kho
                        </button>
                    )}
                    {canReturn && (
                        <button
                            type="button"
                            className={`rounded-md px-3 py-2 text-sm font-semibold ${activeLeftPanel === 'return' ? 'bg-[var(--color-surface-2)]0 text-white' : 'border border-amber-500 text-amber-300 hover:bg-[var(--color-surface-2)]'}`}
                            onClick={() => setActiveLeftPanel('return')}
                        >
                            Trả hàng
                        </button>
                    )}
                </div>

                {activeLeftPanel === 'receive' && canReceive ? (
                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                        <div className="border-b border-[var(--color-border)] px-4 py-3">
                            <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Nhập kho theo phiếu</h3>
                        </div>
                        <div className="p-4">
                            {error && <div className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}
                            <form onSubmit={handleCreateReceipt} className="space-y-4">
                                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                                    <div className="mb-3 text-sm font-bold text-[var(--color-fg)]">Thông tin phiếu nhập</div>
                                    <label className="block">
                                        <span className={labelClass}>Danh mục</span>
                                        <select className={fieldClass} value={form.categoryId} onChange={handleChange('categoryId')} required>
                                            <option value="">Chọn danh mục</option>
                                            {categories.map((category) => (
                                                <option key={category.id ?? category.Id} value={category.id ?? category.Id}>
                                                    {category.name ?? category.Name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="mt-3 block">
                                        <span className={labelClass}>Nhà cung cấp</span>
                                        <select
                                            className={fieldClass}
                                            value={form.supplierId}
                                            onChange={handleChange('supplierId')}
                                            required
                                            disabled={suppliers.length === 0}
                                        >
                                            <option value="">Chọn nhà cung cấp</option>
                                            {suppliers.map((s) => (
                                                <option key={s.id ?? s.Id} value={s.id ?? s.Id}>
                                                    {s.name ?? s.Name} {s.code ? `(${s.code})` : s.Code ? `(${s.Code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {selectedSupplier && (
                                        <div className="mt-2 rounded-md bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-fg-muted)]">
                                            {[selectedSupplier.phone || selectedSupplier.Phone, selectedSupplier.email || selectedSupplier.Email].filter(Boolean).join(' - ')}
                                        </div>
                                    )}
                                    {suppliers.length === 0 && <div className="mt-2 text-xs font-semibold text-rose-600">Chưa có nhà cung cấp đang hoạt động.</div>}
                                </div>

                                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="text-sm font-bold text-[var(--color-fg)]">Sản phẩm nhập kho</div>
                                        <Link to="/admin/products" className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent)]">
                                            Tạo sản phẩm
                                        </Link>
                                    </div>
                                    <label className="block">
                                        <span className={labelClass}>Chọn sản phẩm có sẵn</span>
                                        <select className={fieldClass} value={form.productId} onChange={handleChange('productId')} required disabled={!form.categoryId || productOptions.length === 0}>
                                            <option value="">{!form.categoryId ? 'Chọn danh mục trước' : productOptions.length ? 'Chọn sản phẩm' : 'Danh mục này chưa có sản phẩm'}</option>
                                            {productOptions.map((p) => (
                                                <option key={p.id ?? p.Id} value={p.id ?? p.Id}>
                                                    {p.name ?? p.Name} (ID: {p.id ?? p.Id})
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {form.categoryId && productOptions.length === 0 && (
                                        <div className="mt-3 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-amber-800">
                                            Danh mục này chưa có sản phẩm. Hãy tạo sản phẩm trước, sau đó quay lại nhập kho.
                                        </div>
                                    )}
                                    {selectedProduct && (
                                        <div className="mt-3 rounded-md bg-[var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--color-fg-muted)]">
                                            {requiresSerialTracking ? 'Sản phẩm này cần nhập Serial/IMEI.' : 'Sản phẩm này không bắt buộc Serial/IMEI.'}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className={labelClass}>Số lượng</span>
                                        <input className={fieldClass} type="number" min="1" value={form.quantity} onChange={handleChange('quantity')} required />
                                    </label>
                                    <label className="block">
                                        <span className={labelClass}>Giá vốn nhập</span>
                                        <input className={fieldClass} type="number" min="0" value={form.unitCost} onChange={handleChange('unitCost')} placeholder="Giá mua từ nhà cung cấp" />
                                        <span className="mt-1 block text-xs font-semibold text-[var(--color-fg-muted)]">Dùng để tính giá trị phiếu nhập, không phải giá bán cho khách.</span>
                                    </label>
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                        <span className={labelClass}>Serial/IMEI</span>
                                        {selectedProduct && requiresSerialTracking && (
                                            <span className={`text-xs font-bold ${serialValidation.isValid ? 'text-emerald-300' : 'text-amber-300'}`}>
                                                Đã nhập {serialValidation.count}/{Number(form.quantity || 0)} mã
                                            </span>
                                        )}
                                    </div>
                                    <textarea
                                        className={`${fieldClass} min-h-32 resize-y font-mono`}
                                        rows="6"
                                        value={form.serialsText}
                                        onChange={handleChange('serialsText')}
                                        placeholder={'Mỗi dòng một mã\n356938035643809\n356938035643810'}
                                        disabled={!selectedProduct || !requiresSerialTracking}
                                    />
                                    {selectedProduct && requiresSerialTracking && (
                                        <div className="mt-2 space-y-2">
                                            <div className={`rounded-md px-3 py-2 text-xs font-semibold ${serialValidation.isValid ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[var(--color-surface-2)] text-amber-800'}`}>
                                                {serialValidation.duplicates.length > 0
                                                    ? `Có ${serialValidation.duplicates.length} mã bị trùng trong danh sách.`
                                                    : serialValidation.isMissing
                                                        ? `Còn thiếu ${Number(form.quantity || 0) - serialValidation.count} mã Serial/IMEI.`
                                                        : serialValidation.isExtra
                                                            ? `Đang thừa ${serialValidation.count - Number(form.quantity || 0)} mã Serial/IMEI.`
                                                            : 'Danh sách Serial/IMEI hợp lệ.'}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <label className="cursor-pointer rounded-md border border-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10">
                                                    Nhập từ CSV
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept=".csv,text/csv,text/plain"
                                                        onChange={(e) => {
                                                            importSerialsFromCsv(e.target.files?.[0]);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                                <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]" onClick={cleanSerialWhitespace}>
                                                    Xóa khoảng trắng
                                                </button>
                                                <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] disabled:opacity-50" onClick={removeDuplicateSerials} disabled={serialValidation.duplicates.length === 0}>
                                                    Xóa dòng trùng
                                                </button>
                                            </div>
                                            <div className="text-xs font-semibold text-[var(--color-fg-muted)]">
                                                CSV có thể là một cột serial/IMEI, hoặc nhiều cột; hệ thống lấy giá trị đầu tiên trên mỗi dòng.
                                            </div>
                                        </div>
                                    )}
                                    {selectedProduct && !requiresSerialTracking && (
                                        <span className="mt-1 block text-xs font-semibold text-[var(--color-fg-muted)]">Có thể bỏ qua trường này với sản phẩm không quản lý serial.</span>
                                    )}
                                </div>

                                <button className="w-full rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary)] disabled:opacity-60" disabled={submitting || loading || (requiresSerialTracking && !serialValidation.isValid)}>
                                    {submitting ? 'Đang lưu...' : 'Tạo phiếu nhập'}
                                </button>
                            </form>
                        </div>
                    </section>
                ) : activeLeftPanel === 'return' && canReturn ? (
                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                        <div className="border-b border-[var(--color-border)] px-4 py-3">
                            <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Trả hàng / nhập lại kho</h3>
                        </div>
                        <div className="p-4">
                            {error && <div className="mb-4 rounded-md border border-rose-200 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">{error}</div>}
                            <form className="space-y-4" onSubmit={handleReturn}>
                                <label className="block">
                                    <span className={labelClass}>Serial/IMEI</span>
                                    <input
                                        className={fieldClass}
                                        value={returnForm.serialOrImei}
                                        onChange={(e) => setReturnForm((p) => ({ ...p, serialOrImei: e.target.value }))}
                                        placeholder="Nhập serial/IMEI của sản phẩm khách trả"
                                    />
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="block">
                                        <span className={labelClass}>Trạng thái sau xử lý</span>
                                        <select className={fieldClass} value={returnForm.statusAfter} onChange={(e) => setReturnForm((p) => ({ ...p, statusAfter: e.target.value }))}>
                                            <option value="InStock">Còn trong kho - có thể bán lại</option>
                                            <option value="Damaged">Hư hỏng - không bán lại</option>
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className={labelClass}>Lý do trả hàng</span>
                                        <input
                                            className={fieldClass}
                                            value={returnForm.reason}
                                            onChange={(e) => setReturnForm((p) => ({ ...p, reason: e.target.value }))}
                                            placeholder="Ví dụ: khách đổi ý, lỗi kỹ thuật..."
                                        />
                                    </label>
                                </div>
                                {(returnLookup.loading || returnLookup.error || returnLookup.data) && (
                                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                                        {returnLookup.loading ? (
                                            <div className="text-sm font-semibold text-[var(--color-fg-muted)]">Đang tra cứu serial...</div>
                                        ) : returnLookup.error ? (
                                            <div className="text-sm font-semibold text-red-300">{returnLookup.error}</div>
                                        ) : (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="font-bold text-[var(--color-fg)]">{returnLookup.data?.productName || '-'}</div>
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stockStatusClass(returnLookup.data?.status)}`}>
                                                        {stockStatusText(returnLookup.data?.status)}
                                                    </span>
                                                </div>
                                                <div className="grid gap-2 text-[var(--color-fg-muted)] sm:grid-cols-2">
                                                    <div>Bán lúc: {returnLookup.data?.soldAt ? new Date(returnLookup.data.soldAt).toLocaleString() : '-'}</div>
                                                    <div>Đơn hàng: {returnLookup.data?.orderCode || (returnLookup.data?.orderId ? `#${returnLookup.data.orderId}` : '-')}</div>
                                                    <div className="sm:col-span-2">
                                                        Khách hàng: {returnLookup.data?.customerName || '-'} {returnLookup.data?.customerPhone ? `(${returnLookup.data.customerPhone})` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button className="w-full rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary)] disabled:opacity-60" disabled={submitting}>
                                    {submitting ? 'Đang xử lý...' : 'Xác nhận nhập lại'}
                                </button>
                                <div className="text-xs font-semibold text-[var(--color-fg-muted)]">
                                    Chỉ xử lý nhập lại khi serial đã bán và yêu cầu trả hàng được duyệt.
                                </div>
                            </form>
                        </div>
                    </section>
                ) : (
                    <div className="rounded-md border border-blue-200 bg-[var(--color-accent)]/10 px-3 py-2 text-sm font-semibold text-[var(--color-accent)]">Không có quyền truy cập chức năng này.</div>
                )}
            </div>

            <div>
                {activeLeftPanel === 'receive' && csvPreview && (
                    <section className="flex h-full min-h-[760px] flex-col rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Bang CSV nhap kho</h3>
                                <p className="mb-0 mt-1 text-xs font-semibold text-[var(--color-fg-muted)]">
                                    {csvPreview.fileName} - {csvPreview.serials?.length || 0}/{csvPreview.totalRows || 0} dong phu hop - da chon {selectedCsvSerials.length}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]" onClick={selectCurrentCsvPage} disabled={csvPreview.missingSerialColumn}>
                                    Chon trang nay
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)] disabled:opacity-60"
                                    onClick={applyCsvPreviewToReceipt}
                                    disabled={csvPreview.missingSerialColumn || !selectedProduct || !requiresSerialTracking || selectedCsvSerials.length === 0}
                                >
                                    Dua vao phieu
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                            {csvPreview.missingSerialColumn ? (
                                <div className="rounded-md border border-rose-200 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
                                    File thieu cot serial/IMEI. Them cot serial, imei hoac serialOrImei de he thong doc dung.
                                </div>
                            ) : (
                                <div className="min-h-[610px] max-h-[610px] flex-1 overflow-auto rounded-md border border-[var(--color-border)]">
                                    <table className="min-w-[760px] divide-y divide-[var(--color-border)] text-xs">
                                        <thead className="bg-[var(--color-surface-2)] text-left font-bold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                            <tr>
                                                <th className="px-3 py-2">Dong</th>
                                                <th className="px-3 py-2">Chon</th>
                                                <th className="px-3 py-2">Trang thai</th>
                                                {(csvPreview.headers || []).map((header, index) => (
                                                    <th key={`${header}-${index}`} className={`px-3 py-2 ${index === csvPreview.serialIndex ? 'bg-emerald-500/10 text-emerald-300' : ''}`}>
                                                        {header || `Cot ${index + 1}`}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {csvPageRows.map((row) => (
                                                <tr key={row.index} className={row.isMatch ? 'bg-emerald-500/10/40' : 'bg-[var(--color-surface)] text-[var(--color-fg-dim)]'}>
                                                    <td className="px-3 py-2 font-semibold">{row.index}</td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCsvSerials.includes(row.serial)}
                                                            disabled={!row.isMatch}
                                                            onChange={() => toggleCsvSerialSelection(row.serial)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={`rounded-full px-2 py-1 font-bold ${row.isMatch ? 'bg-emerald-100 text-emerald-300' : 'bg-[var(--color-surface-3)] text-[var(--color-fg-dim)]'}`}>
                                                            {row.isMatch ? 'Dung phieu' : 'Bo qua'}
                                                        </span>
                                                    </td>
                                                    {(csvPreview.headers || []).map((_, index) => (
                                                        <td key={`${row.index}-${index}`} className={`max-w-[180px] truncate px-3 py-2 ${index === csvPreview.serialIndex ? 'font-mono font-bold text-emerald-300' : ''}`}>
                                                            {row.cells?.[index] || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-[var(--color-fg-muted)] sm:flex-row sm:items-center sm:justify-between">
                                <span>Hien thi {csvFrom}-{csvTo} trong {csvRows.length} dong CSV</span>
                                <div className="flex items-center gap-2">
                                    <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] disabled:opacity-50" onClick={() => setCsvPreviewPage((p) => Math.max(1, p - 1))} disabled={csvPage <= 1}>Truoc</button>
                                    <span className="rounded-md bg-[var(--color-surface-3)] px-3 py-1.5 text-[var(--color-fg)]">Trang {csvPage} / {csvTotalPages}</span>
                                    <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] disabled:opacity-50" onClick={() => setCsvPreviewPage((p) => Math.min(csvTotalPages, p + 1))} disabled={csvPage >= csvTotalPages}>Sau</button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {!(activeLeftPanel === 'receive' && csvPreview) && (
                <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                    <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Tồn kho theo Serial/IMEI</h3>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)] sm:w-[240px]" placeholder="Tìm serial..." value={serialQuickSearch} onChange={(e) => setSerialQuickSearch(e.target.value)} />
                            <AdminFilterDropdown open={isFilterMenuOpen} onOpenChange={setIsFilterMenuOpen} label="Bộ lọc" activeCount={activeFilterCount}>
                                <form onSubmit={(e) => { e.preventDefault(); setIsFilterMenuOpen(false); }}>
                                    <div className="mb-3">
                                        <label>Serial/IMEI</label>
                                        <input className="ts-input" value={filters.keyword} onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))} />
                                    </div>
                                    <div className="mb-3">
                                        <label>Trạng thái</label>
                                        <select className="ts-input" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                                            <option value="">Tất cả</option>
                                            {Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label>Số ngày tồn tối thiểu</label>
                                        <input className="ts-input" type="number" min="0" value={filters.minDaysInStock} onChange={(e) => setFilters((p) => ({ ...p, minDaysInStock: e.target.value }))} placeholder="Ví dụ: 90" />
                                        <button type="button" className="ts-btn ts-btn-ghost mt-2 px-3 py-1.5 text-xs" onClick={() => setFilters((p) => ({ ...p, minDaysInStock: '90', status: p.status || 'InStock' }))}>
                                            {'>= 90 ngày'}
                                        </button>
                                    </div>
                                    <div className="mb-3">
                                        <label>Sản phẩm</label>
                                        <select className="ts-input" value={filters.productId} onChange={(e) => setFilters((p) => ({ ...p, productId: e.target.value }))}>
                                            <option value="">Tất cả</option>
                                            {products.map((p) => <option key={p.id ?? p.Id} value={p.id ?? p.Id}>{(p.name ?? p.Name) || `#${p.id ?? p.Id}`}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" className="ts-btn ts-btn-ghost text-xs" onClick={() => setFilters({ keyword: '', status: '', productId: '', minDaysInStock: '' })}>Xóa lọc</button>
                                        <button type="submit" className="ts-btn ts-btn-primary text-xs">Đóng</button>
                                    </div>
                                </form>
                            </AdminFilterDropdown>
                        </div>
                    </div>
                    <div className="p-4">
                        {loading ? (
                            <div className="py-12 text-center text-sm font-semibold text-[var(--color-fg-muted)]">Đang tải tồn kho...</div>
                        ) : (
                            <>
                            <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                                <table className="min-w-[920px] divide-y divide-[var(--color-border)] text-sm">
                                    <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                        <tr>
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Sản phẩm</th>
                                            <th className="px-4 py-3">Serial/IMEI</th>
                                            <th className="px-4 py-3">Trạng thái</th>
                                            <th className="px-4 py-3">Ngày nhập</th>
                                            <th className="px-4 py-3">Ngày bán</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {pagedStockItems.map((raw) => {
                                            const s = normalizeStockItem(raw);
                                            const productName = s.productName || productNameById.get(Number(s.productId)) || `#${s.productId}`;
                                            return (
                                                <tr key={s.id} className="hover:bg-[var(--color-surface-2)]">
                                                    <td className="px-4 py-3 font-semibold text-[var(--color-fg)]">{s.id}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="block max-w-[240px] truncate font-semibold text-[var(--color-fg)]">{productName}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono">
                                                        <span className="block max-w-[260px] truncate">{s.serialOrImei}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stockStatusClass(s.status)}`}>{stockStatusText(s.status)}</span>
                                                    </td>
                                                    <td className="px-4 py-3">{s.receivedAt ? new Date(s.receivedAt).toLocaleString() : '-'}</td>
                                                    <td className="px-4 py-3">{s.soldAt ? new Date(s.soldAt).toLocaleString() : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        {!pagedStockItems.length && (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-8 text-center text-sm font-semibold text-[var(--color-fg-muted)]">
                                                    Không có dữ liệu phù hợp.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-[var(--color-fg-muted)] sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        Hiển thị {stockFrom}-{stockTo} trong {stockTotalCount} serial
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setStockPage((p) => Math.max(1, p - 1))} disabled={stockPage <= 1}>Trước</button>
                                        <span className="rounded-md bg-[var(--color-surface-3)] px-3 py-2 font-semibold text-[var(--color-fg)]">Trang {stockPage} / {totalStockPages}</span>
                                        <button type="button" className="rounded-md border border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setStockPage((p) => Math.min(totalStockPages, p + 1))} disabled={stockPage >= totalStockPages}>Sau</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>
                )}
            </div>
        </div>
        </div>
    );
};

export default AdminInventory;
