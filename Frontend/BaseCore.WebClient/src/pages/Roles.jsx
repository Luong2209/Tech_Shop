import React, { useEffect, useMemo, useState } from 'react';
import { roleApi, userApi } from '../services/api';

const inputClass = 'rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100';

const roleLabels = {
    Admin: 'Quan tri vien',
    Warehouse: 'Kho van',
    Technical: 'Ky thuat',
    User: 'Khach hang',
};

const roleDescriptions = {
    Admin: 'Toan quyen quan tri he thong',
    Warehouse: 'Quan ly ton kho, nhap hang va xu ly don',
    Technical: 'Xu ly ky thuat, bao hanh, sua chua va ticket ho tro',
    User: 'Tai khoan khach hang mua sam',
};

const getRoleName = (role) => roleLabels[role?.name] || roleLabels[role?.id] || role?.name || '-';
const getRoleDescription = (role) => role?.descriptionVi || roleDescriptions[role?.name] || roleDescriptions[role?.id] || role?.description || '-';

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const roleByName = useMemo(() => {
        return roles.reduce((acc, role) => {
            acc[role.name] = role;
            return acc;
        }, {});
    }, [roles]);

    const assignableUsers = useMemo(() => {
        return users.filter((user) => user.isActive);
    }, [users]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [rolesRes, usersRes] = await Promise.all([
                roleApi.getAll(),
                userApi.getAll({ page: 1, pageSize: 500 }),
            ]);

            const roleItems = (Array.isArray(rolesRes.data) ? rolesRes.data : [])
                .filter((role) => ['Admin', 'User', 'Warehouse', 'Technical'].includes(role.name));
            const userItems = Array.isArray(usersRes.data)
                ? usersRes.data
                : (usersRes.data?.data || usersRes.data?.items || usersRes.data?.Items || []);

            setRoles(roleItems);
            setUsers(userItems);
            setSelectedRoleId((current) => current || roleItems[0]?.id || '');
            setSelectedUserId((current) => current || userItems[0]?.id || '');
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Khong the tai du lieu vai tro');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignRole = async (e) => {
        e.preventDefault();
        if (!selectedUserId || !selectedRoleId) return;

        const role = roles.find((item) => item.id === selectedRoleId);
        if (!role) return;

        setSaving(true);
        setError('');
        try {
            await userApi.updateRole(selectedUserId, { roleId: role.id });
            await loadData();
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || data?.detail || data?.title || 'Khong the gan vai tro cho user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="px-4 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">He thong</p>
                    <h2 className="mb-0 text-2xl font-bold text-[var(--color-fg)]">Vai tro / Phan quyen</h2>
                </div>
                <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-amber-800">
                    He thong dang dung 4 vai tro co dinh
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-rose-200 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                    {error}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                    <div className="border-b border-[var(--color-border)] px-4 py-3">
                        <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Danh sach vai tro</h3>
                    </div>
                    <div className="p-4">
                        {loading ? (
                            <div className="py-12 text-center text-sm font-medium text-[var(--color-fg-muted)]">Dang tai vai tro...</div>
                        ) : (
                            <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
                                <table className="min-w-[760px] table-fixed divide-y divide-[var(--color-border)] text-sm">
                                    <thead className="bg-[var(--color-surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                                        <tr>
                                            <th className="w-[180px] px-4 py-3">Vai tro</th>
                                            <th className="px-4 py-3">Mo ta</th>
                                            <th className="w-[130px] px-4 py-3">Nguoi dung</th>
                                            <th className="w-[130px] px-4 py-3">Loai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {roles.map((role) => (
                                            <tr key={role.id} className="hover:bg-[var(--color-surface-2)]">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-[var(--color-fg)]">{getRoleName(role)}</div>
                                                    <div className="text-xs text-[var(--color-fg-muted)]">{role.name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-fg-muted)]">{getRoleDescription(role)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-border)]">
                                                        {role.userCount || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-fg-muted)]">Type {role.userType}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                        <div className="border-b border-[var(--color-border)] px-4 py-3">
                            <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Vai tro co dinh</h3>
                        </div>
                        <div className="space-y-3 p-4 text-sm text-[var(--color-fg-muted)]">
                            <div>
                                <div className="font-semibold text-[var(--color-fg)]">Admin</div>
                                <div>Quan tri he thong, quan ly tai khoan, cau hinh va van hanh tong.</div>
                            </div>
                            <div>
                                <div className="font-semibold text-[var(--color-fg)]">Warehouse</div>
                                <div>Quan ly kho, nhap xuat hang, ton kho va xu ly don lien quan kho.</div>
                            </div>
                            <div>
                                <div className="font-semibold text-[var(--color-fg)]">Technical</div>
                                <div>Xu ly bao hanh, sua chua, ho tro ky thuat va ticket.</div>
                            </div>
                            <div>
                                <div className="font-semibold text-[var(--color-fg)]">User</div>
                                <div>Tai khoan khach hang su dung de mua hang va theo doi don.</div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] ">
                        <div className="border-b border-[var(--color-border)] px-4 py-3">
                            <h3 className="mb-0 text-base font-bold text-[var(--color-fg)]">Gan vai tro cho user</h3>
                        </div>
                        <form onSubmit={handleAssignRole} className="space-y-4 p-4">
                            <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Nguoi dung</span>
                                <select className={`${inputClass} w-full`} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                                    {assignableUsers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} - {user.name || user.email || 'Chua co ten'} ({roleLabels[user.role] || getRoleName(roleByName[user.role]) || 'Khach hang'})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-[var(--color-fg)]">Vai tro moi</span>
                                <select className={`${inputClass} w-full`} value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>{getRoleName(role)}</option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="submit"
                                className="w-full rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary)] disabled:opacity-60"
                                disabled={saving || !selectedUserId || !selectedRoleId}
                            >
                                Gan vai tro
                            </button>
                        </form>
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default Roles;
