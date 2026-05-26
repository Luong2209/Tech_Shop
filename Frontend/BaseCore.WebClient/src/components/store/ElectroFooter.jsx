import React from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../utils/store';

const contactItems = [
    { icon: 'fas fa-map-marker-alt', title: 'Address', text: '123 Street New York.USA' },
    { icon: 'fas fa-envelope', title: 'Mail Us', text: 'info@example.com' },
    { icon: 'fas fa-phone-alt', title: 'Telephone', text: '(+012) 3456 7890' },
    { icon: 'fas fa-globe', title: 'Website', text: 'techstore.example.com' },
];

const footerGroups = [
    {
        title: 'Customer Service',
        links: [
            { label: 'Contact Us', to: '/contact' },
            { label: 'Returns', to: '/shop' },
            { label: 'Order History', to: '/orders' },
            { label: 'Site Map', to: '/' },
            { label: 'Wishlist', to: '/wishlist' },
        ],
    },
    {
        title: 'Information',
        links: [
            { label: 'About Us', to: '/' },
            { label: 'Delivery infomation', to: '/shop' },
            { label: 'Privacy Policy', to: '/contact' },
            { label: 'Terms & Conditions', to: '/contact' },
            { label: 'FAQ', to: '/contact' },
        ],
    },
    {
        title: 'Extras',
        links: [
            { label: 'Brands', to: '/shop' },
            { label: 'Gift Vouchers', to: '/cart' },
            { label: 'Affiliates', to: '/contact' },
            { label: 'Wishlist', to: '/wishlist' },
            { label: 'Track Your Order', to: '/orders' },
        ],
    },
];

const socials = [
    { icon: 'fab fa-facebook-f', href: '#', label: 'Facebook' },
    { icon: 'fab fa-instagram', href: '#', label: 'Instagram' },
    { icon: 'fab fa-x-twitter', href: '#', label: 'Twitter' },
    { icon: 'fab fa-youtube', href: '#', label: 'YouTube' },
    { icon: 'fab fa-tiktok', href: '#', label: 'TikTok' },
];

const ElectroFooter = () => (
    <footer className="relative mt-32 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/40 to-transparent" />

        <div className="ts-container py-20">
            <div className="grid grid-cols-2 gap-8 border-b border-[var(--color-border)] pb-12 md:grid-cols-4">
                {contactItems.map((item) => (
                    <div key={item.title} className="group">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)] transition-colors group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)]">
                            <i className={item.icon}></i>
                        </div>
                        <p className="ts-eyebrow mb-2">{t(item.title)}</p>
                        <p className="text-sm text-[var(--color-fg-muted)]">{item.text}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-1">
                    <Link to="/" className="ts-display text-2xl text-[var(--color-fg)]">
                        Tech<span className="ts-gradient-text">Store</span>
                    </Link>
                    <p className="mt-5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                        Sản phẩm công nghệ được tuyển chọn — chính hãng, bảo hành minh bạch, dịch vụ tận tâm.
                    </p>
                    <p className="ts-eyebrow mt-8 mb-3">{t('Newsletter')}</p>
                    <form
                        onSubmit={(event) => event.preventDefault()}
                        className="flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-background)] p-1 transition-colors focus-within:border-[var(--color-primary)]"
                    >
                        <input
                            type="email"
                            placeholder={t('Enter your email')}
                            className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none"
                        />
                        <button type="submit" className="ts-btn ts-btn-primary px-4 py-2 text-xs">
                            {t('SignUp')}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center gap-3">
                        {socials.map((s) => (
                            <a
                                key={s.label}
                                href={s.href}
                                aria-label={s.label}
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-fg-muted)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            >
                                <i className={s.icon}></i>
                            </a>
                        ))}
                    </div>
                </div>

                {footerGroups.map((group) => (
                    <div key={group.title}>
                        <p className="ts-eyebrow mb-5 text-[var(--color-accent)]">{t(group.title)}</p>
                        <ul className="space-y-3">
                            {group.links.map((link) => (
                                <li key={`${group.title}-${link.label}`}>
                                    <Link
                                        to={link.to}
                                        className="group inline-flex items-center text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
                                    >
                                        <span className="mr-2 inline-block h-px w-3 bg-[var(--color-border-strong)] transition-all group-hover:w-5 group-hover:bg-[var(--color-primary)]" />
                                        {t(link.label)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>

        <div className="border-t border-[var(--color-border)]">
            <div className="ts-container flex flex-col items-center justify-between gap-3 py-6 md:flex-row">
                <p className="text-xs text-[var(--color-fg-dim)]">
                    © {new Date().getFullYear()} <Link to="/" className="text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-primary)]">TechStore</Link> · Bản quyền được bảo lưu.
                </p>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-fg-dim)]">Crafted on BaseCore</p>
            </div>
        </div>
    </footer>
);

export default ElectroFooter;
