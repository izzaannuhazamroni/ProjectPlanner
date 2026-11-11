/**
 * Normalisasi nomor WhatsApp ke format internasional tanpa tanda "+" (diawali 62).
 *
 * Contoh:
 *   "+62 812-3456-7890" -> "6281234567890"
 *   "0812 3456 7890"    -> "6281234567890"
 *   "81234567890"       -> "6281234567890"
 *   "6281234567890"     -> "6281234567890"
 *
 * Mengembalikan null bila nomor tidak valid.
 */
export function normalizePhone(input) {
  if (input === undefined || input === null) return null;

  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  // "00" adalah awalan panggilan internasional (0062...)
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('62')) {
    // sudah internasional; hilangkan 0 ekstra, mis. 620812... -> 62812...
    if (digits.startsWith('620')) digits = '62' + digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else {
    return null; // bukan nomor Indonesia
  }

  // Nomor seluler Indonesia: 62 + 9 s.d. 12 digit (total 11-14 digit)
  if (!/^62\d{9,12}$/.test(digits)) return null;
  if (!digits.startsWith('628')) return null;

  return digits;
}
