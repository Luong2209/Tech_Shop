import React from 'react';

const AuthLayout = ({ children }) => (
    <div className="relative isolate min-h-screen bg-[var(--color-background)] text-[var(--color-fg)]">
        {children}
    </div>
);

export default AuthLayout;
