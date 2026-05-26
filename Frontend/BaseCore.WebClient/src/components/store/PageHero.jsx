import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { t } from '../../utils/store';

const PageHero = ({ title, current, kicker = 'Page' }) => (
    <section className="relative isolate overflow-hidden border-b border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-background)] to-[var(--color-surface-2)] py-20">
        <span aria-hidden className="ts-anim-blob pointer-events-none absolute -top-32 left-1/4 h-80 w-80 bg-gradient-to-br from-[var(--color-accent)]/25 to-[var(--color-primary)]/15 blur-3xl" />
        <span aria-hidden className="ts-anim-blob pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 bg-gradient-to-tr from-[var(--color-primary)]/20 to-[var(--color-accent)]/15 blur-3xl" style={{ animationDelay: '-5s' }} />

        <div className="ts-container relative z-10 text-center">
            <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="ts-eyebrow text-[var(--color-accent)]"
            >
                {kicker}
            </motion.p>
            <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
                className="ts-display mt-4 text-4xl md:text-5xl lg:text-6xl text-[var(--color-fg)]"
            >
                {title}
            </motion.h1>
            <motion.nav
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--color-fg-dim)]"
                aria-label="Breadcrumb"
            >
                <Link to="/" className="transition-colors hover:text-[var(--color-accent)]">{t('Home')}</Link>
                <span className="text-[var(--color-border-strong)]">·</span>
                <span>{t('Pages')}</span>
                <span className="text-[var(--color-border-strong)]">·</span>
                <span className="text-[var(--color-fg)]">{current || title}</span>
            </motion.nav>
        </div>
    </section>
);

export default PageHero;
