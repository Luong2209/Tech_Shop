import React, { useEffect, useRef } from 'react';

const AdminFilterDropdown = ({ open, onOpenChange, label, activeCount = 0, children }) => {
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const onMouseDown = (e) => {
            if (!open) return;
            const menuEl = menuRef.current;
            const buttonEl = buttonRef.current;
            if (!menuEl || !buttonEl) return;
            if (menuEl.contains(e.target) || buttonEl.contains(e.target)) return;
            onOpenChange(false);
        };

        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [open, onOpenChange]);

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => onOpenChange(!open)}
                className="inline-flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-fg)]"
            >
                <i className="fas fa-filter text-[10px]"></i>
                {label}
                {activeCount > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold leading-none text-white">
                        {activeCount}
                    </span>
                )}
            </button>
            {open && (
                <div
                    ref={menuRef}
                    className="absolute right-0 z-30 mt-2 min-w-[240px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-2xl ts-anim-fade-up"
                >
                    {children}
                </div>
            )}
        </div>
    );
};

export default AdminFilterDropdown;
