/** Padanan normalizePhone di server: hasil berupa 62xxxxxxxxxx atau null. */
export function normalizePhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('62')) {
    if (digits.startsWith('620')) digits = '62' + digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else {
    return null;
  }

  if (!/^628\d{8,11}$/.test(digits)) return null;
  return digits;
}

/** 6281234567890 -> +62 812-3456-7890 */
export function formatPhone(value) {
  const n = normalizePhone(value);
  if (!n) return value || '-';
  const local = n.slice(2);
  return `+62 ${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
}
