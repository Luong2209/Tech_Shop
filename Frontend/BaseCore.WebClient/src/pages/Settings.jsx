import React, { useEffect, useState } from 'react';
import { settingsApi } from '../services/api';

const inputClass = 'rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100';

const emptyForm = {
    storeName: '',
    hotline: '',
    supportEmail: '',
    address: '',
    warrantyAddress: '',
    defaultShippingFee: 0,
    freeShippingThreshold: '',
    supportTime: '',
    logoUrl: '',
};

const Settings = () => {
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await settingsApi.get();
            const settings = response.data || {};
            setFormData({
                storeName: settings.storeName || '',
                hotline: settings.hotline || '',
                supportEmail: settings.supportEmail || '',
                address: settings.address || '',
                warrantyAddress: settings.warrantyAddress || '',
                defaultShippingFee: Number(settings.defaultShippingFee || 0),
                freeShippingThreshold: settings.freeShippingThreshold ?? '',
                supportTime: settings.supportTime || '',
                logoUrl: settings.logoUrl || '',
            });
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Không thể tải cấu hình');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const validate = () => {
        if (!formData.storeName.trim()) return 'Tên cửa hàng là bắt buộc';
        if (!formData.hotline.trim()) return 'Hotline là bắt buộc';
        if (Number(formData.defaultShippingFee) < 0) return 'Phí vận chuyển mặc định phải lớn hơn hoặc bằng 0';
        if (formData.supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail.trim())) {
            return 'Email hỗ trợ không đúng định dạng';
        }
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationMessage = validate();
        if (validationMessage) {
            setError(validationMessage);
            setSuccess('');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await settingsApi.update({
                storeName: formData.storeName.trim(),
                hotline: formData.hotline.trim(),
                supportEmail: formData.supportEmail.trim(),
                address: formData.address.trim(),
                warrantyAddress: formData.warrantyAddress.trim(),
                defaultShippingFee: Number(formData.defaultShippingFee || 0),
                freeShippingThreshold: formData.freeShippingThreshold === '' ? null : Number(formData.freeShippingThreshold),
                supportTime: formData.supportTime.trim(),
                logoUrl: formData.logoUrl.trim(),
            });
            setSuccess('Đã lưu cấu hình hệ thống');
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Không thể lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-6">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Hệ thống</p>
                <h2 className="mb-0 text-2xl font-bold text-[var(--color-fg)]">Cấu hình</h2>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-rose-200 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                    {success}
                </div>
            )}

            <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                <div className="border-b border-[var(--color-border)] px-4 py-3">
                    <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Thông tin cửa hàng</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-sm font-medium text-[var(--color-fg-muted)]">Đang tải cấu hình...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-5 p-4 lg:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Tên cửa hàng</span>
                            <input className={`${inputClass} w-full`} value={formData.storeName} onChange={(e) => updateField('storeName', e.target.value)} required />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Hotline</span>
                            <input className={`${inputClass} w-full`} value={formData.hotline} onChange={(e) => updateField('hotline', e.target.value)} required />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Email hỗ trợ</span>
                            <input type="email" className={`${inputClass} w-full`} value={formData.supportEmail} onChange={(e) => updateField('supportEmail', e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Thời gian hỗ trợ</span>
                            <input className={`${inputClass} w-full`} value={formData.supportTime} onChange={(e) => updateField('supportTime', e.target.value)} />
                        </label>
                        <label className="block lg:col-span-2">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Địa chỉ</span>
                            <textarea className={`${inputClass} min-h-24 w-full resize-y`} value={formData.address} onChange={(e) => updateField('address', e.target.value)} />
                        </label>
                        <label className="block lg:col-span-2">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Địa chỉ tiếp nhận bảo hành</span>
                            <textarea className={`${inputClass} min-h-24 w-full resize-y`} value={formData.warrantyAddress} onChange={(e) => updateField('warrantyAddress', e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Phí vận chuyển mặc định</span>
                            <input type="number" min="0" className={`${inputClass} w-full`} value={formData.defaultShippingFee} onChange={(e) => updateField('defaultShippingFee', e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Miễn phí vận chuyển từ</span>
                            <input type="number" min="0" className={`${inputClass} w-full`} value={formData.freeShippingThreshold} onChange={(e) => updateField('freeShippingThreshold', e.target.value)} />
                        </label>
                        <label className="block lg:col-span-2">
                            <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Logo URL</span>
                            <input type="url" className={`${inputClass} w-full`} value={formData.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} />
                        </label>
                        <div className="flex justify-end lg:col-span-2">
                            <button
                                type="submit"
                                className="rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)] disabled:opacity-60"
                                disabled={saving}
                            >
                                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
};

export default Settings;
