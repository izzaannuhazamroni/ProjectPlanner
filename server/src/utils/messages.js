import { env } from '../config/env.js';

const STATUS_LABEL = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export function formatDeadline(iso) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: env.timezone,
  }).format(new Date(iso));
}

function describeRemaining(deadlineIso) {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let text;
  if (days >= 1) text = `${days} hari ${hours % 24} jam`;
  else if (hours >= 1) text = `${hours} jam ${minutes % 60} menit`;
  else text = `${Math.max(minutes, 1)} menit`;

  return diffMs >= 0 ? `Sisa waktu: ${text}` : `Terlambat: ${text}`;
}

/**
 * Membuat teks pesan pengingat.
 * @param {object} project baris tabel projects
 * @param {'manual'|'h1'|'overdue'} type
 */
export function buildReminderMessage(project, type) {
  const headers = {
    manual: '🔔 *PENGINGAT PROYEK*',
    h1: '⏰ *PENGINGAT DEADLINE (H-1)*',
    overdue: '🚨 *PROYEK MELEWATI DEADLINE*',
  };

  const description = project.description
    ? project.description.length > 300
      ? `${project.description.slice(0, 297)}...`
      : project.description
    : '-';

  return [
    headers[type] || headers.manual,
    '',
    `📌 *Proyek*: ${project.name}`,
    `📝 *Keterangan*: ${description}`,
    `🗓️ *Deadline*: ${formatDeadline(project.deadline)}`,
    `⏳ ${describeRemaining(project.deadline)}`,
    `📊 *Progres*: ${project.progress}%`,
    `🏷️ *Status*: ${STATUS_LABEL[project.status] || project.status}`,
    '',
    'Mohon segera ditindaklanjuti. Terima kasih 🙏',
    '_Pesan otomatis dari Project Planner_',
  ].join('\n');
}
