export function formatRoleName(defaultRoleKey: string) {
    return defaultRoleKey
        .split(/[_:\-\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
