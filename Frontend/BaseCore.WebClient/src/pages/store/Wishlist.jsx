import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import ProductCard from '../../components/store/ProductCard';
import PageHero from '../../components/store/PageHero';
import { setPageMeta, t, toast } from '../../utils/store';

const Wishlist = () => {
    const { wishlistItems, clearWishlist } = useWishlist();
    const { addItem } = useCart();

    useEffect(() => {
        setPageMeta({
            title: `${t('Wishlist')} | TechStore`,
            description: t('Wishlist meta description'),
        });
    }, []);

    const handleAddAll = () => {
        const inStock = wishlistItems.filter((p) => p.stock > 0);
        if (inStock.length === 0) {
            toast('Tất cả sản phẩm đã hết hàng.', 'danger');
            return;
        }
        inStock.forEach((p) => addItem(p, 1));
        toast(`Đã thêm ${inStock.length} sản phẩm vào giỏ hàng!`, 'success');
    };

    return (
        <>
            <PageHero title={t('Wishlist')} current={t('Wishlist')} kicker="Saved for later" />

            <section className="ts-container py-12">
                {wishlistItems.length === 0 ? (
                    <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--color-border)] py-20 text-center">
                        <i className="far fa-heart text-4xl text-[var(--color-fg-dim)]"></i>
                        <h4 className="ts-display mt-6 text-2xl">{t('Your wishlist is empty')}</h4>
                        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Hãy thêm sản phẩm bạn yêu thích để lưu lại cho sau.</p>
                        <Link to="/shop" className="ts-btn ts-btn-primary mt-6">{t('Continue Shopping')}</Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                            <p className="text-sm text-[var(--color-fg-muted)]">
                                <i className="fas fa-heart mr-2 text-[var(--color-primary)]"></i>
                                <strong className="text-[var(--color-fg)]">{wishlistItems.length}</strong> sản phẩm yêu thích
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleAddAll} className="ts-btn ts-btn-primary text-xs">
                                    <i className="fas fa-shopping-cart"></i>Thêm tất cả vào giỏ
                                </button>
                                <button
                                    onClick={() => { if (window.confirm('Xóa toàn bộ danh sách yêu thích?')) clearWishlist(); }}
                                    className="ts-btn ts-btn-outline text-xs"
                                >
                                    <i className="fas fa-trash"></i>Xóa tất cả
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                            {wishlistItems.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </>
    );
};

export default Wishlist;
