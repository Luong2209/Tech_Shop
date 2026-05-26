import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setPageMeta } from '../../utils/store';

const NotFound = () => {
    useEffect(() => {
        setPageMeta({
            title: '404 — Không tìm thấy | TechStore',
            description: 'Trang bạn đang tìm không tồn tại.',
        });
    }, []);

    return (
        <section className="ts-container relative isolate flex min-h-[70vh] flex-col items-center justify-center text-center py-20">
            <span aria-hidden className="pointer-events-none absolute -z-10 h-96 w-96 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />

            <p className="ts-eyebrow text-[var(--color-accent)]">404</p>
            <h1 className="ts-display mt-4 text-7xl tracking-tight md:text-9xl">
                <span className="ts-gradient-text">404</span>
            </h1>
            <h2 className="ts-display mt-4 text-2xl md:text-3xl">Trang không tìm thấy</h2>
            <p className="mt-4 max-w-md text-sm text-[var(--color-fg-muted)]">
                Trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đường dẫn không chính xác.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/" className="ts-btn ts-btn-primary">
                    <i className="fas fa-home"></i>Về trang chủ
                </Link>
                <Link to="/shop" className="ts-btn ts-btn-ghost">
                    <i className="fas fa-shopping-bag"></i>Cửa hàng
                </Link>
            </div>
        </section>
    );
};

export default NotFound;
