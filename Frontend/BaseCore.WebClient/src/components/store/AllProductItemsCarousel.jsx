import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import ProductMiniCard from './ProductMiniCard';
import { t } from '../../utils/store';
import 'swiper/css';
import 'swiper/css/pagination';

const AllProductItemsCarousel = ({ products, onAddToCart }) => {
    const swiperRef = useRef(null);

    if (!products || products.length === 0) return null;

    return (
        <section className="ts-container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
                <p className="ts-eyebrow text-[var(--color-accent)]">{t('Products')}</p>
                <h2 className="ts-display mt-3 text-3xl md:text-4xl text-[var(--color-fg)]">{t('All Product Items')}</h2>
                <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
            </div>

            <div
                className="relative"
                onMouseEnter={() => swiperRef.current?.autoplay?.stop()}
                onMouseLeave={() => swiperRef.current?.autoplay?.start()}
            >
                <Swiper
                    modules={[Autoplay, Pagination]}
                    loop={products.length > 4}
                    speed={700}
                    spaceBetween={20}
                    grabCursor
                    autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
                    pagination={{ clickable: true }}
                    breakpoints={{
                        0: { slidesPerView: 1 },
                        768: { slidesPerView: 2 },
                        1280: { slidesPerView: 3 },
                    }}
                    onSwiper={(s) => { swiperRef.current = s; }}
                    className="!pb-12"
                >
                    {products.map((product) => (
                        <SwiperSlide key={product.id} className="h-auto">
                            <div className="h-full">
                                <ProductMiniCard product={product} onAddToCart={onAddToCart} />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => swiperRef.current?.slidePrev()}
                    className="absolute -left-3 top-[44%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-fg-muted)] backdrop-blur-md transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:flex"
                >
                    <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <button
                    type="button"
                    aria-label="Next"
                    onClick={() => swiperRef.current?.slideNext()}
                    className="absolute -right-3 top-[44%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-fg-muted)] backdrop-blur-md transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:flex"
                >
                    <i className="fas fa-chevron-right text-xs"></i>
                </button>
            </div>
        </section>
    );
};

export default AllProductItemsCarousel;
