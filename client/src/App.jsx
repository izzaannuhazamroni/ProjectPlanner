import { AlertTriangle, CheckCircle2, FolderKanban, Hourglass } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import LogsModal from './components/LogsModal.jsx';
import Navbar from './components/Navbar.jsx';
import ProjectModal from './components/ProjectModal.jsx';
import ProjectTable from './components/ProjectTable.jsx';
import StatsCard from './components/StatsCard.jsx';
import ToastContainer from './components/Toast.jsx';
import Toolbar from './components/Toolbar.jsx';
import WhatsAppModal from './components/WhatsAppModal.jsx';
import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchStats,
  fetchWaStatus,
  getErrorMessage,
  sendReminder,
  updateProject,
} from './services/api.js';
import { formatPhone } from './utils/phone.js';

const DEFAULT_FILTERS = { search: '', status: 'all', sort: 'deadline', order: 'asc' };
const EMPTY_STATS = { total: 0, completed: 0, near_deadline: 0, overdue: 0, window_hours: 24 };

export default function App() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [waStatus, setWaStatus] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reminding, setReminding] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [logsProject, setLogsProject] = useState(null);
  const [waOpen, setWaOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const requestSeq = useRef(0);

  // ---------- Toast ----------
  const dismissToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const notify = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismissToast(id), 5000);
    },
    [dismissToast]
  );

  // ---------- Data ----------
  const loadData = useCallback(async (activeFilters) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const [list, st] = await Promise.all([fetchProjects(activeFilters), fetchStats()]);
      if (seq !== requestSeq.current) return; // abaikan respons usang
      setProjects(list);
      setStats(st);
      setLoadError('');
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setLoadError(getErrorMessage(err));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  // Segarkan tampilan secara berkala (sisa waktu deadline & data dari cron)
  useEffect(() => {
    const timer = setInterval(() => loadData(filters), 60000);
    return () => clearInterval(timer);
  }, [filters, loadData]);

  // Status WhatsApp untuk lencana di Navbar
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const s = await fetchWaStatus();
        if (!cancelled) setWaStatus(s);
      } catch {
        if (!cancelled) setWaStatus({ status: 'unreachable' });
      }
    };
    check();
    const timer = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const updateFilters = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const hasFilters = filters.search !== '' || filters.status !== 'all';

  // ---------- CRUD ----------
  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (project) => {
    setEditing(project);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    const res = editing ? await updateProject(editing.id, payload) : await createProject(payload);
    setModalOpen(false);
    notify('success', res.message);
    loadData(filters);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const res = await deleteProject(deleting.id);
      notify('success', res.message);
      setDeleting(null);
      loadData(filters);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  // ---------- Kirim pengingat manual ----------
  const confirmSend = async () => {
    const project = reminding;
    setReminding(null);
    setSendingId(project.id);
    try {
      const res = await sendReminder(project.id);
      notify('success', res.message);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  };

  const statCards = [
    { icon: FolderKanban, label: 'Total Proyek', value: stats.total, tone: 'brand', filter: 'all', hint: 'Semua jadwal tercatat' },
    { icon: CheckCircle2, label: 'Proyek Selesai', value: stats.completed, tone: 'green', filter: 'completed', hint: 'Status Completed' },
    {
      icon: Hourglass,
      label: 'Mendekati Deadline',
      value: stats.near_deadline,
      tone: 'amber',
      filter: 'near',
      hint: `Dalam ${stats.window_hours} jam ke depan`,
    },
    { icon: AlertTriangle, label: 'Terlambat', value: stats.overdue, tone: 'red', filter: 'overdue', hint: 'Lewat deadline, belum selesai' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar waStatus={waStatus} onAdd={openCreate} onOpenWhatsApp={() => setWaOpen(true)} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Proyek</h1>
          <p className="mt-1 text-sm text-slate-500">Pantau jadwal, progres, dan kirim pengingat WhatsApp dari satu tempat.</p>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {statCards.map((c) => (
            <StatsCard
              key={c.label}
              icon={c.icon}
              label={c.label}
              value={c.value}
              hint={c.hint}
              tone={c.tone}
              active={filters.status === c.filter}
              onClick={() => updateFilters({ status: c.filter })}
            />
          ))}
        </section>

        <section className="space-y-4">
          <Toolbar filters={filters} onChange={updateFilters} />

          {loadError && (
            <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <button type="button" className="btn-secondary !py-1.5" onClick={() => loadData(filters)}>
                Coba lagi
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <ProjectTable
              projects={projects}
              loading={loading}
              windowHours={stats.window_hours}
              hasFilters={hasFilters}
              sendingId={sendingId}
              onSend={setReminding}
              onLogs={setLogsProject}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          </div>
        </section>
      </main>

      <ProjectModal open={modalOpen} project={editing} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus proyek?"
        message={`Proyek “${deleting?.name}” beserta riwayat pengirimannya akan dihapus permanen.`}
        confirmLabel="Hapus"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(reminding)}
        variant="whatsapp"
        title="Kirim pengingat sekarang?"
        message={`Pesan pengingat untuk “${reminding?.name}” akan dikirim ke ${reminding ? formatPhone(reminding.whatsapp_number) : ''} via WhatsApp.`}
        confirmLabel="Kirim Pengingat"
        onConfirm={confirmSend}
        onCancel={() => setReminding(null)}
      />

      <LogsModal project={logsProject} onClose={() => setLogsProject(null)} />

      <WhatsAppModal open={waOpen} onClose={() => setWaOpen(false)} onStatus={setWaStatus} notify={notify} />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
