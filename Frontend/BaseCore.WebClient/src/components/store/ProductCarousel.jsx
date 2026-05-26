import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { cn } from '../../utils/cn';
import 'swiper/css';
import 'swiper/css/pagination';

const ProductCarousel = ({ products, renderProduct, className = '' }) => {
    const swiperRef = useRef(null);

    if (!products || products.length === 0) return null;

    return (
        <div
            className={cn("relative", className)}
            onMouseEnter={() => swiperRef.current?.autoplay?.stop()}
            onMouseLeave={() => swiperRef.current?.autoplay?.start()}
        >
            <Swiper
                modules={[Autoplay, Pagination]}
                loop={products.length > 4}
                speed={700}
                spaceBetween={20}
                grabCursor
                watchSlidesProgress
                autoplay={{
                    delay: 5500,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                }}
                pagination={{ clickable: true }}
                breakpoints={{
                    0: { slidesPerView: 1.15 },
                    576: { slidesPerView: 2 },
                    900: { slidesPerView: 3 },
                    1200: { slidesPerView: 4 },
                }}
                onSwiper={(swiper) => { swiperRef.current = swiper; }}
                onBeforeDestroy={() => { swiperRef.current = null; }}
                className="!pb-12"
            >
                {products.map((product) => (
                    <SwiperSlide key={product.id} className="h-auto">
                        <div className="h-full">{renderProduct(product)}</div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <button
                type="button"
                aria-label="Previous"
                onClick={() => swiperRef.current?.slidePrev()}
                className="absolute -left-2 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-fg-muted)] backdrop-blur-md transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:flex"
            >
                <i className="fas fa-chevron-left text-xs"></i>
            </button>
            <button
                type="button"
                aria-label="Next"
                onClick={() => swiperRef.current?.slideNext()}
                className="absolute -right-2 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-fg-muted)] backdrop-blur-md transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:flex"
            >
                <i className="fas fa-chevron-right text-xs"></i>
            </button>
        </div>
    );
};

export default ProductCarousel;
