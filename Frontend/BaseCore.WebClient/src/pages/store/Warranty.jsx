import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/store/PageHero';
import { setPageMeta } from '../../utils/store';
import { cn } from '../../utils/cn';

const policyGroups = [
    { icon: 'fa-shield-alt', title: 'Sản phẩm được bảo hành', items: ['Sản phẩm mua tại TechStore hoặc có thông tin đơn hàng hợp lệ', 'Sản phẩm còn trong thời hạn bảo hành', 'Lỗi phát sinh do nhà sản xuất', 'Sản phẩm còn tem, số serial hợp lệ'] },
    { icon: 'fa-clipboard-check', title: 'Điều kiện bảo hành', items: ['Thời gian bảo hành tùy theo từng sản phẩm và hãng sản xuất', 'Cần cung cấp số điện thoại, mã đơn hàng hoặc serial', 'Sản phẩm còn nguyên trạng, không bị can thiệp', 'Phụ kiện đi kèm theo chính sách riêng'] },
    { icon: 'fa-exclamation-triangle', title: 'Không được bảo hành', items: ['Sản phẩm bị rơi vỡ, móp méo, cong vênh', 'Sản phẩm bị vào nước, ẩm mốc, cháy nổ', 'Sản phẩm bị sử dụng sai hướng dẫn', 'Đã bị tự ý tháo mở hoặc sửa chữa', 'Hết thời hạn bảo hành'] },
];

const warrantySteps = [
    ['Tra cứu thông tin bảo hành', 'Nhập số điện thoại, mã đơn hoặc serial để kiểm tra.'],
    ['Gửi yêu cầu bảo hành', 'Mô tả lỗi, chọn sản phẩm và cung cấp thông tin liên hệ.'],
    ['Tiếp nhận sản phẩm', 'Mang đến cửa hàng hoặc gửi qua đơn vị vận chuyển.'],
    ['Kỹ thuật kiểm tra', 'Bộ phận kỹ thuật kiểm tra và xác định lỗi.'],
    ['Hoàn tất xử lý', 'Sản phẩm được bảo hành, sửa chữa hoặc đổi mới.'],
];

const faqs = [
    ['Sản phẩm được bảo hành trong bao lâu?', 'Thời gian bảo hành tùy thuộc vào từng sản phẩm và chính sách của hãng sản xuất.'],
    ['Tôi cần chuẩn bị gì khi gửi bảo hành?', 'Cung cấp số điện thoại mua hàng, mã đơn hoặc serial. Nếu có hộp/phụ kiện vui lòng mang theo.'],
    ['Sản phẩm bị rơi vỡ có được bảo hành không?', 'Các lỗi do rơi vỡ, vào nước, cháy nổ thường không thuộc bảo hành miễn phí.'],
    ['Thời gian xử lý bảo hành mất bao lâu?', 'Phụ thuộc vào tình trạng sản phẩm và chính sách hãng. Chúng tôi sẽ cập nhật trong quá trình xử lý.'],
    ['Nếu hết hạn bảo hành thì sao?', 'TechStore vẫn hỗ trợ kiểm tra và tư vấn phương án sửa chữa có phí nếu khách đồng ý.'],
];

const initialForm = { name: '', phone: '', email: '', code: '', product: '', issue: '', method: '', returnAddress: '' };

const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const buildRequestCode = () => {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    return `BH-${date}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const Warranty = () => {
    const [lookupValue, setLookupValue] = useState('');
    const [lookupError, setLookupError] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [formData, setFormData] = useState(initialForm);
    const [formErrors, setFormErrors] = useState({});
    const [requestMessage, setRequestMessage] = useState('');
    const [requestCode, setRequestCode] = useState('');
    const [imagePreviews, setImagePreviews] = useState([]);
    const [openFaq, setOpenFaq] = useState(0);

    useEffect(() => {
        setPageMeta({ title: 'Bảo hành & hỗ trợ | TechStore', description: 'Tra cứu bảo hành, gửi yêu cầu hỗ trợ và xem chính sách đổi trả.' });
    }, []);

    useEffect(() => () => imagePreviews.forEach((i) => URL.revokeObjectURL(i.url)), [imagePreviews]);

    const lookupActive = useMemo(() => lookupResult?.status === 'Còn bảo hành', [lookupResult]);

    const handleLookup = (e) => {
        e.preventDefault();
        const keyword = lookupValue.trim();
        if (!keyword) { setLookupError('Vui lòng nhập thông tin cần tra cứu.'); setLookupResult(null); return; }
        if (keyword.length < 5) { setLookupError('Thông tin tra cứu chưa hợp lệ.'); setLookupResult(null); return; }
        const expired = keyword.toLowerCase().includes('0002') || keyword.toLowerCase().includes('expired');
        setLookupError('');
        setLookupResult(expired ? {
            product: 'MacBook Air M3 13 inch', orderCode: 'TS-2025-0002', serial: 'MBA-M3-DEMO',
            purchaseDate: '10/02/2025', warrantyPeriod: '12 tháng', status: 'Hết hạn bảo hành',
            warrantyUntil: '10/02/2026', suggestion: 'Vui lòng liên hệ hỗ trợ để được tư vấn sửa chữa.',
        } : {
            product: 'iPhone 17 Series 256GB', orderCode: 'TS-2026-0001', serial: 'IP17-256-DEMO',
            purchaseDate: '12/05/2026', warrantyPeriod: '12 tháng', status: 'Còn bảo hành',
            warrantyUntil: '12/05/2027',
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((c) => ({ ...c, [name]: value }));
        setFormErrors((c) => ({ ...c, [name]: '' }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []).slice(0, 3);
        imagePreviews.forEach((i) => URL.revokeObjectURL(i.url));
        setImagePreviews(files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })));
    };

    const handleRequestSubmit = (e) => {
        e.preventDefault();
        const errs = {};
        if (!formData.name.trim()) errs.name = 'Vui lòng nhập họ và tên.';
        if (!formData.phone.trim()) errs.phone = 'Vui lòng nhập số điện thoại.';
        if (!formData.code.trim()) errs.code = 'Vui lòng nhập mã đơn hoặc serial.';
        if (formData.issue.trim().length < 15) errs.issue = 'Mô tả lỗi tối thiểu 15 ký tự.';
        if (!formData.method) errs.method = 'Vui lòng chọn hình thức gửi.';
        setFormErrors(errs);
        if (Object.keys(errs).length) return;
        setRequestCode(buildRequestCode());
        setRequestMessage('Yêu cầu bảo hành đã được gửi. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.');
        setFormData(initialForm);
        imagePreviews.forEach((i) => URL.revokeObjectURL(i.url));
        setImagePreviews([]);
    };

    return (
        <>
            <PageHero title="Bảo hành & Hỗ trợ" current="Bảo hành" kicker="TechStore Care" />

            <section className="ts-container py-12">
                {/* Quick actions */}
                <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
                    <button onClick={() => scrollToSection('warranty-lookup')} className="ts-btn ts-btn-primary">
                        <i className="fas fa-search"></i>Tra cứu bảo hành
                    </button>
                    <button onClick={() => scrollToSection('warranty-request')} className="ts-btn ts-btn-outline">
                        <i className="fas fa-paper-plane"></i>Gửi yêu cầu
                    </button>
                </div>

                {/* Policy */}
                <section className="mb-16">
                    <div className="mb-8 text-center">
                        <p className="ts-eyebrow text-[var(--color-accent)]">Policy</p>
                        <h2 className="ts-display mt-3 text-2xl md:text-3xl">Chính sách bảo hành</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        {policyGroups.map((g) => (
                            <article key={g.title} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                                <i className={`fas ${g.icon} text-2xl text-[var(--color-accent)]`}></i>
                                <h3 className="ts-display mt-4 text-lg">{g.title}</h3>
                                <ul className="mt-4 space-y-2 text-sm text-[var(--color-fg-muted)]">
                                    {g.items.map((item) => (
                                        <li key={item} className="flex gap-2">
                                            <i className="fas fa-check mt-1 text-[10px] text-[var(--color-gold)]"></i>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Lookup */}
                <section id="warranty-lookup" className="mb-16">
                    <div className="mb-8 text-center">
                        <p className="ts-eyebrow text-[var(--color-accent)]">Lookup</p>
                        <h2 className="ts-display mt-3 text-2xl md:text-3xl">Tra cứu bảo hành</h2>
                    </div>
                    <div className="mx-auto max-w-2xl rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                        <form onSubmit={handleLookup} className="flex flex-col gap-3 md:flex-row">
                            <input
                                type="text"
                                value={lookupValue}
                                onChange={(e) => setLookupValue(e.target.value)}
                                placeholder="Số điện thoại, mã đơn hàng hoặc serial..."
                                className="ts-input md:flex-1"
                            />
                            <button type="submit" className="ts-btn ts-btn-primary">Tra cứu</button>
                        </form>
                        {lookupError && <p className="mt-3 text-xs text-red-400">{lookupError}</p>}
                        {lookupResult && (
                            <div className="mt-5 rounded-sm border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="ts-eyebrow text-[10px]">Sản phẩm</p>
                                        <strong className="text-sm text-[var(--color-fg)]">{lookupResult.product}</strong>
                                    </div>
                                    <span className={cn(
                                        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                                        lookupActive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"
                                    )}>
                                        {lookupResult.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 text-xs text-[var(--color-fg-muted)] sm:grid-cols-2">
                                    <p><span className="ts-eyebrow block text-[10px]">Mã đơn</span>{lookupResult.orderCode}</p>
                                    <p><span className="ts-eyebrow block text-[10px]">Serial</span>{lookupResult.serial}</p>
                                    <p><span className="ts-eyebrow block text-[10px]">Ngày mua</span>{lookupResult.purchaseDate}</p>
                                    <p><span className="ts-eyebrow block text-[10px]">Hạn đến</span>{lookupResult.warrantyUntil}</p>
                                </div>
                                {lookupActive ? (
                                    <button onClick={() => scrollToSection('warranty-request')} className="ts-btn ts-btn-primary mt-4 text-xs">Gửi yêu cầu bảo hành</button>
                                ) : (
                                    <p className="mt-4 text-xs italic text-[var(--color-fg-dim)]">{lookupResult.suggestion}</p>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Process */}
                <section className="mb-16">
                    <div className="mb-8 text-center">
                        <p className="ts-eyebrow text-[var(--color-accent)]">Process</p>
                        <h2 className="ts-display mt-3 text-2xl md:text-3xl">Quy trình bảo hành</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                        {warrantySteps.map(([title, desc], i) => (
                            <article key={title} className="relative rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                                <span className="ts-display text-3xl text-[var(--color-accent)]">0{i + 1}</span>
                                <h3 className="mt-3 text-sm font-semibold text-[var(--color-fg)]">{title}</h3>
                                <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{desc}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Request form */}
                <section id="warranty-request" className="mb-16">
                    <div className="mb-8 text-center">
                        <p className="ts-eyebrow text-[var(--color-accent)]">Submit Request</p>
                        <h2 className="ts-display mt-3 text-2xl md:text-3xl">Gửi yêu cầu bảo hành</h2>
                    </div>

                    <div className="mx-auto max-w-3xl rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                        {requestMessage && (
                            <div className="mb-5 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                                <strong className="text-sm text-emerald-300">{requestMessage}</strong>
                                <p className="mt-1 ts-mono text-xs text-[var(--color-fg-muted)]">Mã yêu cầu: <strong className="text-[var(--color-accent)]">{requestCode}</strong></p>
                            </div>
                        )}
                        <form onSubmit={handleRequestSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {[
                                ['name', 'Họ và tên', 'text'],
                                ['phone', 'Số điện thoại', 'tel'],
                                ['email', 'Email (nếu có)', 'email'],
                                ['code', 'Mã đơn / Serial', 'text'],
                                ['product', 'Sản phẩm cần bảo hành', 'text'],
                            ].map(([field, label, type]) => (
                                <label key={field} className="block">
                                    <span className="ts-eyebrow mb-1.5 block text-[10px]">{label}</span>
                                    <input name={field} type={type} value={formData[field]} onChange={handleFormChange} className="ts-input" />
                                    {formErrors[field] && <span className="mt-1 block text-[11px] text-red-400">{formErrors[field]}</span>}
                                </label>
                            ))}
                            <label className="block md:col-span-2">
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">Mô tả lỗi</span>
                                <textarea name="issue" value={formData.issue} onChange={handleFormChange} rows={4} className="ts-input resize-none" />
                                {formErrors.issue && <span className="mt-1 block text-[11px] text-red-400">{formErrors.issue}</span>}
                            </label>
                            <div className="md:col-span-2">
                                <p className="ts-eyebrow mb-2 text-[10px]">Hình thức gửi</p>
                                <div className="flex gap-3">
                                    {[['store', 'Đến cửa hàng'], ['shipping', 'Chuyển phát']].map(([val, label]) => (
                                        <label key={val} className={cn(
                                            "flex flex-1 cursor-pointer items-center gap-2 rounded-sm border px-4 py-2.5 text-sm transition-colors",
                                            formData.method === val
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-fg)]"
                                                : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)]"
                                        )}>
                                            <input type="radio" name="method" value={val} checked={formData.method === val} onChange={handleFormChange} className="accent-[var(--color-primary)]" />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                                {formErrors.method && <span className="mt-1 block text-[11px] text-red-400">{formErrors.method}</span>}
                            </div>
                            {formData.method === 'shipping' && (
                                <label className="block md:col-span-2">
                                    <span className="ts-eyebrow mb-1.5 block text-[10px]">Địa chỉ nhận lại</span>
                                    <input name="returnAddress" value={formData.returnAddress} onChange={handleFormChange} className="ts-input" />
                                </label>
                            )}
                            <label className="block md:col-span-2">
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">Hình ảnh lỗi (tối đa 3)</span>
                                <div className="flex items-center gap-3 rounded-sm border border-dashed border-[var(--color-border)] p-4">
                                    <i className="fas fa-camera text-[var(--color-fg-dim)]"></i>
                                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="text-xs text-[var(--color-fg-muted)] file:mr-3 file:rounded-sm file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-2)] file:px-3 file:py-1 file:text-xs file:text-[var(--color-fg)]" />
                                </div>
                                {imagePreviews.length > 0 && (
                                    <div className="mt-3 flex gap-2">
                                        {imagePreviews.map((image) => (
                                            <img key={image.url} src={image.url} alt={image.name} className="h-16 w-16 rounded-sm object-cover" />
                                        ))}
                                    </div>
                                )}
                            </label>
                            <button type="submit" className="ts-btn ts-btn-primary md:col-span-2">Gửi yêu cầu bảo hành</button>
                        </form>
                    </div>
                </section>

                {/* FAQ */}
                <section className="mb-16">
                    <div className="mb-8 text-center">
                        <p className="ts-eyebrow text-[var(--color-accent)]">FAQ</p>
                        <h2 className="ts-display mt-3 text-2xl md:text-3xl">Câu hỏi thường gặp</h2>
                    </div>
                    <div className="mx-auto max-w-3xl space-y-3">
                        {faqs.map(([q, a], i) => (
                            <article key={q} className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]"
                                >
                                    <span>{q}</span>
                                    <i className={cn("fas fa-chevron-down text-xs text-[var(--color-fg-dim)] transition-transform", openFaq === i && "rotate-180")}></i>
                                </button>
                                {openFaq === i && (
                                    <p className="border-t border-[var(--color-border)] px-5 py-4 text-sm text-[var(--color-fg-muted)]">{a}</p>
                                )}
                            </article>
                        ))}
                    </div>
                </section>

                {/* Contact */}
                <section className="rounded-md border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-8 md:p-12">
                    <div className="grid gap-8 md:grid-cols-2">
                        <div>
                            <p className="ts-eyebrow text-[var(--color-accent)]">Quick Support</p>
                            <h2 className="ts-display mt-3 text-2xl">Cần hỗ trợ thêm?</h2>
                            <p className="mt-3 text-sm text-[var(--color-fg-muted)]">Liên hệ TechStore để được tư vấn quy trình bảo hành, đổi trả hoặc gửi chuyển phát.</p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <a href="tel:0327188459" className="ts-btn ts-btn-primary"><i className="fas fa-phone"></i>Gọi hỗ trợ</a>
                                <Link to="/contact" className="ts-btn ts-btn-ghost">Liên hệ ngay</Link>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <p className="flex items-center gap-3"><i className="fas fa-phone-alt w-5 text-[var(--color-accent)]"></i><span className="text-[var(--color-fg-dim)]">Hotline:</span><strong className="ts-mono text-[var(--color-fg)]">0327 188 459</strong></p>
                            <p className="flex items-center gap-3"><i className="fas fa-envelope w-5 text-[var(--color-accent)]"></i><span className="text-[var(--color-fg-dim)]">Email:</span><strong className="text-[var(--color-fg)]">support@techstore.vn</strong></p>
                            <p className="flex items-center gap-3"><i className="fas fa-clock w-5 text-[var(--color-accent)]"></i><span className="text-[var(--color-fg-dim)]">Giờ:</span><strong className="text-[var(--color-fg)]">8:00 - 22:00 mỗi ngày</strong></p>
                        </div>
                    </div>
                </section>
            </section>
        </>
    );
};

export default Warranty;
