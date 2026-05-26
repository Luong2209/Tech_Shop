import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPostLoginPath } from '../utils/store';
import AuthLayout from '../components/layout/AuthLayout';
import { cn } from '../utils/cn';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registerData, setRegisterData] = useState({
        username: '', password: '', name: '', email: '', phone: '', dateOfBirth: '',
    });
    const [registerError, setRegisterError] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isLeaving, setIsLeaving] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);

        if (result.success) {
            const requestedPath = location.state?.from?.pathname;
            setIsLeaving(true);
            window.setTimeout(() => {
                navigate(getPostLoginPath(result.user, requestedPath), { replace: true });
            }, 240);
            return;
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegisterError('');
        setRegisterSuccess('');
        setRegisterLoading(true);

        const result = await register(registerData);

        if (result.success) {
            setRegisterSuccess('Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.');
            setRegisterData({ username: '', password: '', name: '', email: '', phone: '', dateOfBirth: '' });
        } else {
            setRegisterError(result.message);
        }
        setRegisterLoading(false);
    };

    return (
        <AuthLayout>
            <div className={cn("relative isolate flex min-h-screen items-center justify-center p-6 transition-opacity duration-300", isLeaving && "opacity-0")}>
                <span aria-hidden className="ts-anim-blob pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] bg-gradient-to-br from-[var(--color-accent)]/25 to-[var(--color-primary)]/15 blur-3xl" />
                <span aria-hidden className="ts-anim-blob pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px] bg-gradient-to-tr from-[var(--color-primary)]/15 to-[var(--color-accent)]/20 blur-3xl" style={{ animationDelay: '-6s' }} />

                <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lift)] lg:grid-cols-2 ts-anim-scale-in">
                    {/* Branding side */}
                    <aside className="relative flex flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-[var(--color-surface-2)] via-[var(--color-surface)] to-[var(--color-surface-2)] p-10 lg:p-12">
                        <span aria-hidden className="ts-anim-blob pointer-events-none absolute -bottom-12 -right-12 h-72 w-72 bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-primary)]/10 blur-3xl" />

                        <Link to="/" className="ts-display text-2xl text-[var(--color-fg)] relative">
                            Tech<span className="ts-gradient-text">Store</span>
                        </Link>

                        <div className="relative">
                            <p className="ts-eyebrow text-[var(--color-accent)]">Welcome</p>
                            <h1 className="ts-display mt-4 text-4xl leading-tight text-[var(--color-fg)] md:text-5xl">
                                Tech tuyển chọn,<br /><span className="ts-gradient-text">trải nghiệm tinh tế</span>.
                            </h1>
                            <p className="mt-5 text-sm text-[var(--color-fg-muted)]">
                                Đăng nhập để theo dõi đơn hàng, lưu phiếu giảm giá và quản lý bảo hành sản phẩm của bạn.
                            </p>

                            <ul className="mt-8 space-y-3">
                                {[
                                    'Theo dõi đơn hàng nhanh chóng',
                                    'Lưu và sử dụng phiếu giảm giá',
                                    'Quản lý sản phẩm yêu thích',
                                    'Tra cứu bảo hành dễ dàng',
                                ].map((b) => (
                                    <li key={b} className="flex items-center gap-3 text-sm text-[var(--color-fg-muted)]">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[10px] text-[var(--color-gold)]">
                                            <i className="fas fa-check"></i>
                                        </span>
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="relative text-xs text-[var(--color-fg-dim)]">© {new Date().getFullYear()} TechStore. All rights reserved.</p>
                    </aside>

                    {/* Form side */}
                    <section className="flex flex-col p-8 lg:p-12">
                        <Link to="/" className="mb-6 inline-flex w-fit items-center gap-2 text-xs text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]">
                            <i className="fas fa-arrow-left"></i>Về trang chủ
                        </Link>

                        {isLoginMode ? (
                            <>
                                <p className="ts-eyebrow text-[var(--color-accent)]">Sign in</p>
                                <h2 className="ts-display mt-3 text-3xl text-[var(--color-fg)]">Đăng nhập</h2>
                                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Chào mừng bạn quay lại TechStore</p>

                                {error && (
                                    <div className="mt-5 flex items-start justify-between gap-3 rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                                        <span>{error}</span>
                                        <button onClick={() => setError('')} aria-label="Đóng" className="text-red-400 hover:text-red-200">
                                            <i className="fas fa-times text-xs"></i>
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                    <label className="block">
                                        <span className="ts-eyebrow mb-1.5 block text-[10px]">Email / SĐT / Tên đăng nhập</span>
                                        <div className="relative">
                                            <i className="fas fa-user pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-fg-dim)]"></i>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                placeholder="Tên đăng nhập"
                                                className="ts-input pl-9"
                                            />
                                        </div>
                                    </label>
                                    <label className="block">
                                        <span className="ts-eyebrow mb-1.5 block text-[10px]">Mật khẩu</span>
                                        <div className="relative">
                                            <i className="fas fa-lock pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-fg-dim)]"></i>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="••••••••"
                                                className="ts-input pl-9"
                                            />
                                        </div>
                                    </label>

                                    <div className="flex items-center justify-between text-xs">
                                        <label className="inline-flex items-center gap-2 text-[var(--color-fg-muted)]">
                                            <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-primary)]" />
                                            Ghi nhớ đăng nhập
                                        </label>
                                        <button type="button" className="text-[var(--color-accent)] hover:underline">Quên mật khẩu?</button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || isLeaving}
                                        className="ts-btn ts-btn-primary w-full py-3"
                                    >
                                        {isLeaving ? <><i className="fas fa-check"></i>Đang chuyển...</> : loading ? <><i className="fas fa-spinner fa-spin"></i>Đang đăng nhập...</> : 'Đăng nhập'}
                                    </button>

                                    <p className="text-center text-xs text-[var(--color-fg-muted)]">
                                        Chưa có tài khoản?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setIsLoginMode(false)}
                                            className="text-[var(--color-accent)] hover:underline"
                                        >
                                            Đăng ký ngay
                                        </button>
                                    </p>
                                </form>
                            </>
                        ) : (
                            <>
                                <p className="ts-eyebrow text-[var(--color-accent)]">Sign up</p>
                                <h2 className="ts-display mt-3 text-3xl text-[var(--color-fg)]">Đăng ký tài khoản</h2>
                                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Tạo tài khoản để mua sắm thuận tiện hơn</p>

                                {registerError && <div className="mt-5 rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{registerError}</div>}
                                {registerSuccess && <div className="mt-5 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{registerSuccess}</div>}

                                <form onSubmit={handleRegister} autoComplete="off" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {[
                                        ['username', 'Tên đăng nhập', 'text', true],
                                        ['password', 'Mật khẩu', 'password', true],
                                        ['name', 'Họ và tên', 'text', false],
                                        ['dateOfBirth', 'Ngày sinh', 'date', false],
                                        ['email', 'Email', 'email', false],
                                        ['phone', 'Số điện thoại', 'tel', false],
                                    ].map(([field, label, type, req]) => (
                                        <label key={field} className="block">
                                            <span className="ts-eyebrow mb-1.5 block text-[10px]">{label}{req && ' *'}</span>
                                            <input
                                                type={type}
                                                name={`register-${field}`}
                                                value={registerData[field]}
                                                onChange={(e) => setRegisterData({ ...registerData, [field]: e.target.value })}
                                                required={req}
                                                {...(field === 'password' ? { minLength: 6, autoComplete: 'new-password' } : { autoComplete: 'off' })}
                                                {...(field === 'dateOfBirth' ? { max: new Date().toISOString().split('T')[0] } : {})}
                                                className="ts-input"
                                            />
                                        </label>
                                    ))}

                                    <button
                                        type="submit"
                                        disabled={registerLoading}
                                        className="ts-btn ts-btn-primary mt-2 w-full sm:col-span-2 py-3"
                                    >
                                        {registerLoading ? <><i className="fas fa-spinner fa-spin"></i>Đang tạo tài khoản...</> : 'Đăng ký ngay'}
                                    </button>

                                    <p className="text-center text-xs text-[var(--color-fg-muted)] sm:col-span-2">
                                        Đã có tài khoản?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setIsLoginMode(true)}
                                            className="text-[var(--color-accent)] hover:underline"
                                        >
                                            Đăng nhập
                                        </button>
                                    </p>
                                </form>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Login;
