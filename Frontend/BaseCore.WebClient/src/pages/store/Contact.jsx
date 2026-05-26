import React, { useEffect } from 'react';
import PageHero from '../../components/store/PageHero';
import { setPageMeta, t } from '../../utils/store';

const contactItems = [
    { icon: 'fas fa-map-marker-alt', title: 'Address', text: '236 Hoàng Quốc Việt, Hà Nội' },
    { icon: 'fas fa-envelope', title: 'Mail Us', text: 'info@techstore.example.com' },
    { icon: 'fas fa-phone-alt', title: 'Telephone', text: '(+84) 327 188 459' },
    { icon: 'fas fa-globe', title: 'Website', text: 'techstore.example.com' },
];

const Contact = () => {
    useEffect(() => {
        setPageMeta({
            title: `${t('Contact Us')} | TechStore`,
            description: t('Contact meta description'),
        });
    }, []);

    return (
        <>
            <PageHero title={t('Contact Us')} current={t('Contact')} kicker="Get in touch" />

            <section className="ts-container py-12">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
                    {/* Form */}
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                        <p className="ts-eyebrow text-[var(--color-accent)]">{t("Let's Connect")}</p>
                        <h2 className="ts-display mt-3 text-3xl text-[var(--color-fg)]">{t('Send Your Message')}</h2>
                        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{t('We are here for you!')}</p>

                        <form onSubmit={(e) => e.preventDefault()} className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label>
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">{t('Your Name')}</span>
                                <input type="text" className="ts-input" placeholder="Nguyễn Văn A" />
                            </label>
                            <label>
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">{t('Your Email')}</span>
                                <input type="email" className="ts-input" placeholder="email@example.com" />
                            </label>
                            <label>
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">{t('Your Phone')}</span>
                                <input type="tel" className="ts-input" placeholder="0327 188 459" />
                            </label>
                            <label>
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">{t('Subject')}</span>
                                <input type="text" className="ts-input" placeholder="Chủ đề..." />
                            </label>
                            <label className="md:col-span-2">
                                <span className="ts-eyebrow mb-1.5 block text-[10px]">{t('Message')}</span>
                                <textarea rows="6" className="ts-input resize-none" placeholder="Nội dung của bạn..."></textarea>
                            </label>
                            <button type="submit" className="ts-btn ts-btn-primary md:col-span-2">
                                <i className="fas fa-paper-plane"></i>{t('Send Message')}
                            </button>
                        </form>
                    </div>

                    {/* Map + contact */}
                    <div className="space-y-6">
                        <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <iframe
                                className="h-72 w-full grayscale [filter:invert(0.92)_hue-rotate(180deg)_grayscale(0.8)]"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.0!2d105.7!3d21.05!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0!2sHanoi%20Vietnam!5e0!3m2!1sen!2svn!4v1694259649153!5m2!1sen!2svn"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="TechStore map"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {contactItems.map((item) => (
                                <div key={item.title} className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border-strong)]">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                                        <i className={item.icon}></i>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="ts-eyebrow text-[10px]">{t(item.title)}</p>
                                        <p className="mt-0.5 truncate text-sm text-[var(--color-fg)]">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Contact;
