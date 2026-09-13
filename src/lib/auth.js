export function can(user, permission) {
  if (!user) return false
  if (user.is_superuser) return true
  return user.permissions?.includes(permission)
}

export function displayName(user) {
  const full = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
  return full || user?.username || 'Usuario'
}

export function roleLabel(user) {
  if (user?.is_superuser) return 'Administrador'
  return user?.groups?.[0] || 'Back Office'
}

export function initials(user) {
  const name = displayName(user)
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
