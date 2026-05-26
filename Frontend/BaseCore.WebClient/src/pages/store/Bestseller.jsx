import React, { useEffect, useState } from 'react';
import BestsellerSection from '../../components/store/BestsellerSection';
import PageHero from '../../components/store/PageHero';
import { productApi } from '../../services/api';
import { setPageMeta } from '../../utils/store';

const unwrapProducts = (payload) => {
    if (Array.isArray(payload)) return payload;
    return payload?.items || payload?.data || payload?.Items || [];
};

const Bestseller = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        setPageMeta({
            title: 'Sản phẩm bán chạy | TechStore',
            description: 'Sản phẩm bán chạy của TechStore.',
        });

        const loadProducts = async () => {
            const response = await productApi.getAll({ page: 1, pageSize: 12 });
            const items = unwrapProducts(response.data);
            const bestsellers = items.filter((item) => item.isBestSeller || item.IsBestSeller);
            setProducts((bestsellers.length ? bestsellers : items).slice(0, 8));
        };

        loadProducts().catch((error) => {
            console.error('Failed to load bestseller products', error);
            setProducts([]);
        });
    }, []);

    return (
        <>
            <PageHero title="Sản phẩm bán chạy" current="Bán chạy" kicker="Top picks" />
            <BestsellerSection products={products} />
        </>
    );
};

export default Bestseller;
