// Enmascara datos sensibles para mostrarlos en vistas públicas
// (perfil de otro participante, tabla de posiciones, etc).
// El dueño del perfil siempre ve sus datos completos.

export function maskEmail(email) {
  if (!email) return "";

  const [user, domain] = email.split("@");
  if (!domain) return email;

  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }

  const visibleStart = user.slice(0, 2);
  return `${visibleStart}${"*".repeat(user.length - 2)}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return "*".repeat(digits.length);

  const visibleEnd = digits.slice(-3);
  return `${"*".repeat(digits.length - 3)}${visibleEnd}`;
}