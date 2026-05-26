import React, { useEffect, useState } from 'react';
import ElectroAssets from './ElectroAssets';
import ElectroFooter from './ElectroFooter';
import ElectroHeader from './ElectroHeader';
import { cn } from '../../utils/cn';

const StoreLayout = ({ children }) => {
    const [showSpinner, setShowSpinner] = useState(true);
    const [spinnerHiding, setSpinnerHiding] = useState(false);
    const [toastState, setToastState] = useState(null);
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const hide = () => {
            setSpinnerHiding(true);
            window.setTimeout(() => setShowSpinner(false), 350);
        };
        if (document.readyState === 'complete') {
            hide();
            return undefined;
        }

        window.addEventListener('load', hide, { once: true });
        const fallbackTimer = window.setTimeout(hide, 800);
        return () => {
            window.removeEventListener('load', hide);
            window.clearTimeout(fallbackTimer);
        };
    }, []);

    useEffect(() => {
        let timeoutId;
        const handler = (event) => {
            const detail = event?.detail || {};
            const message = String(detail.message || '');
            const variant = String(detail.variant || 'primary');
            if (!message.trim()) return;

            setToastState({ message, variant, key: `${Date.now()}-${Math.random()}` });
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => setToastState(null), 3000);
        };

        window.addEventListener('store:toast', handler);
        return () => {
            window.removeEventListener('store:toast', handler);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 320);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toastVariantClass = {
        primary: 'border-[var(--color-primary)]/40 bg-[var(--color-surface)] text-[var(--color-fg)]',
        success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        danger: 'border-red-500/40 bg-red-500/10 text-red-300',
        warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        info: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    }[toastState?.variant] || 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)]';

    return (
        <div className="relative isolate flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-fg)]">
            <ElectroAssets />

            {showSpinner && (
                <div
                    className={cn(
                        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-white via-[var(--color-background)] to-[var(--color-surface-2)] transition-opacity duration-500",
                        spinnerHiding ? "pointer-events-none opacity-0" : "opacity-100"
                    )}
                >
                    <div className="relative">
                        <div className="h-14 w-14 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                        <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-2 border-transparent border-r-[var(--color-accent)]" style={{ animationDuration: '1.6s', animationDirection: 'reverse' }} />
                    </div>
                    <p className="ts-eyebrow mt-6 text-[10px] text-[var(--color-accent)] ts-anim-pulse">TechStore</p>
                </div>
            )}

            <ElectroHeader />
            <main className="relative z-10 flex-1">{children}</main>
            <ElectroFooter />

            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Lên đầu trang"
                className={cn(
                    "fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-fg-muted)] backdrop-blur-md transition-all duration-300 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
                    showBackToTop
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-4 opacity-0"
                )}
            >
                <i className="fas fa-arrow-up text-sm"></i>
            </button>

            {toastState && (
                <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 ts-anim-fade-up">
                    <div
                        key={toastState.key}
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                        className={cn(
                            "flex items-center gap-3 rounded-md border px-4 py-3 shadow-2xl backdrop-blur-md",
                            toastVariantClass
                        )}
                    >
                        <span className="text-sm">{toastState.message}</span>
                        <button
                            type="button"
                            aria-label="Đóng"
                            onClick={() => setToastState(null)}
                            className="ml-2 text-[var(--color-fg-dim)] transition-colors hover:text-[var(--color-fg)]"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreLayout;
