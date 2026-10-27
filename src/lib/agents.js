const AGENT_DOMAIN = 'agentes.cccs-solutions.app';

function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function agentEmail(firstName, lastName) {
  return `${slug(firstName)}.${slug(lastName)}@${AGENT_DOMAIN}`;
}

export function agentDisplayName(user) {
  if (!user) return '';
  if (user.displayName) return user.displayName;
  const local = (user.email || '').split('@')[0];
  return local
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function agentInitials(user) {
  return agentDisplayName(user)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();
}
