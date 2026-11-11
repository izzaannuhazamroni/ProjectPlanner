import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';

const TABLE = 'wa_auth';

/**
 * Auth state Baileys yang disimpan di tabel Supabase `wa_auth`.
 *
 * Mengapa tidak memakai useMultiFileAuthState?
 * Disk di Render (free tier) bersifat sementara: setiap restart/redeploy file sesi hilang
 * dan nomor harus scan QR ulang. Dengan menyimpan sesi di database, koneksi WhatsApp
 * bertahan melewati restart.
 */
export async function useSupabaseAuthState(supabase, sessionName = 'default') {
  const prefix = `${sessionName}:`;

  const readData = async (key) => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', prefix + key)
      .maybeSingle();

    if (error) throw new Error(`Gagal membaca sesi WA: ${error.message}`);
    if (!data) return null;
    return JSON.parse(data.value, BufferJSON.reviver);
  };

  const writeRows = async (rows) => {
    if (rows.length === 0) return;
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'key' });
    if (error) throw new Error(`Gagal menyimpan sesi WA: ${error.message}`);
  };

  const removeKeys = async (keys) => {
    if (keys.length === 0) return;
    const { error } = await supabase.from(TABLE).delete().in('key', keys);
    if (error) throw new Error(`Gagal menghapus sesi WA: ${error.message}`);
  };

  const toRow = (key, value) => ({
    key: prefix + key,
    value: JSON.stringify(value, BufferJSON.replacer),
    updated_at: new Date().toISOString(),
  });

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              result[id] = value;
            })
          );
          return result;
        },
        set: async (data) => {
          const rowsToWrite = [];
          const keysToDelete = [];

          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) rowsToWrite.push(toRow(key, value));
              else keysToDelete.push(prefix + key);
            }
          }

          await writeRows(rowsToWrite);
          await removeKeys(keysToDelete);
        },
      },
    },
    saveCreds: async () => {
      await writeRows([toRow('creds', creds)]);
    },
    // Menghapus seluruh sesi (dipakai saat logout agar QR baru dapat dibuat)
    clearAll: async () => {
      const { error } = await supabase.from(TABLE).delete().like('key', `${prefix}%`);
      if (error) throw new Error(`Gagal membersihkan sesi WA: ${error.message}`);
    },
  };
}
