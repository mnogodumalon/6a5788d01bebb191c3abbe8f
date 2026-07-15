import { useDashboardData } from '@/hooks/useDashboardData';
import type { Personenpunkte } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { LivingAppsService } from '@/services/livingAppsService';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PersonenpunkteDialog } from '@/components/dialogs/PersonenpunkteDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch, IconTrophy,
  IconMedal, IconStar, IconUsers, IconFlame,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a5788d01bebb191c3abbe8f';
const REPAIR_ENDPOINT = '/claude/build/repair';

const KATEGORIE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; order: number }> = {
  platin: {
    label: 'Platin',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    icon: <IconTrophy size={16} className="text-slate-500 shrink-0" />,
    order: 1,
  },
  gold: {
    label: 'Gold',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: <IconMedal size={16} className="text-amber-500 shrink-0" />,
    order: 2,
  },
  silber: {
    label: 'Silber',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    icon: <IconStar size={16} className="text-gray-400 shrink-0" />,
    order: 3,
  },
  bronze: {
    label: 'Bronze',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    icon: <IconFlame size={16} className="text-orange-400 shrink-0" />,
    order: 4,
  },
};

export default function DashboardOverview() {
  const { personenpunkte, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Personenpunkte | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Personenpunkte | null>(null);
  const [filterKategorie, setFilterKategorie] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return personenpunkte.filter(p => {
      const matchSearch = !q ||
        (p.fields.vorname ?? '').toLowerCase().includes(q) ||
        (p.fields.nachname ?? '').toLowerCase().includes(q) ||
        (p.fields.email ?? '').toLowerCase().includes(q);
      const matchKat = !filterKategorie || p.fields.kategorie?.key === filterKategorie;
      return matchSearch && matchKat;
    });
  }, [personenpunkte, search, filterKategorie]);

  const grouped = useMemo(() => {
    const groups: Record<string, Personenpunkte[]> = {};
    for (const p of filtered) {
      const key = p.fields.kategorie?.key ?? 'none';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    // Sort within each group by points descending
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (b.fields.punkte ?? 0) - (a.fields.punkte ?? 0));
    }
    return groups;
  }, [filtered]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const oa = KATEGORIE_CONFIG[a]?.order ?? 99;
      const ob = KATEGORIE_CONFIG[b]?.order ?? 99;
      return oa - ob;
    });
  }, [grouped]);

  const totalPunkte = useMemo(() =>
    personenpunkte.reduce((sum, p) => sum + (p.fields.punkte ?? 0), 0),
    [personenpunkte]
  );

  const topPerson = useMemo(() =>
    [...personenpunkte].sort((a, b) => (b.fields.punkte ?? 0) - (a.fields.punkte ?? 0))[0],
    [personenpunkte]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deletePersonenpunkteEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const openCreate = () => {
    setEditRecord(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Personenpunkte) => {
    setEditRecord(p);
    setDialogOpen(true);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Personen gesamt"
          value={String(personenpunkte.length)}
          description="Einträge"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtpunkte"
          value={totalPunkte.toLocaleString('de-DE')}
          description="Alle Punkte"
          icon={<IconStar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Platin & Gold"
          value={String(personenpunkte.filter(p => p.fields.kategorie?.key === 'platin' || p.fields.kategorie?.key === 'gold').length)}
          description="Top-Kategorien"
          icon={<IconTrophy size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Beste Person"
          value={topPerson ? `${topPerson.fields.punkte ?? 0}` : '—'}
          description={topPerson ? `${topPerson.fields.vorname ?? ''} ${topPerson.fields.nachname ?? ''}`.trim() || '—' : '—'}
          icon={<IconMedal size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name oder E-Mail suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterKategorie(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterKategorie === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Alle
          </button>
          {Object.entries(KATEGORIE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterKategorie(filterKategorie === key ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filterKategorie === key
                  ? 'bg-primary text-primary-foreground'
                  : `${cfg.bg} ${cfg.color} border ${cfg.border} hover:opacity-80`
              }`}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          ))}
        </div>
        <Button onClick={openCreate} size="sm" className="ml-auto shrink-0">
          <IconPlus size={15} className="mr-1" />
          Person hinzufügen
        </Button>
      </div>

      {/* Leaderboard */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <IconUsers size={48} stroke={1.5} />
          <p className="text-sm">Keine Personen gefunden.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <IconPlus size={14} className="mr-1" /> Erste Person anlegen
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroupKeys.map(groupKey => {
            const cfg = KATEGORIE_CONFIG[groupKey];
            const entries = grouped[groupKey];
            return (
              <div key={groupKey} className="rounded-[20px] overflow-hidden border bg-card shadow-sm">
                {/* Group Header */}
                <div className={`flex items-center gap-3 px-5 py-3 ${cfg ? cfg.bg : 'bg-muted'} border-b ${cfg ? cfg.border : 'border-border'}`}>
                  {cfg?.icon}
                  <span className={`font-semibold text-sm ${cfg ? cfg.color : 'text-muted-foreground'}`}>
                    {cfg?.label ?? 'Ohne Kategorie'}
                  </span>
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${cfg ? cfg.bg : 'bg-muted'} border ${cfg ? cfg.border : 'border-border'} ${cfg ? cfg.color : 'text-muted-foreground'}`}>
                    {entries.length} {entries.length === 1 ? 'Person' : 'Personen'}
                  </span>
                </div>

                {/* Entries */}
                <div className="divide-y divide-border/60">
                  {entries.map((person, idx) => {
                    const name = `${person.fields.vorname ?? ''} ${person.fields.nachname ?? ''}`.trim() || '—';
                    const initials = [person.fields.vorname?.[0], person.fields.nachname?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                    return (
                      <div key={person.record_id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
                        {/* Rank */}
                        <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-center">
                          {idx + 1}
                        </span>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${cfg ? `${cfg.bg} ${cfg.color}` : 'bg-muted text-muted-foreground'}`}>
                          {initials}
                        </div>

                        {/* Name & Email */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                          {person.fields.email && (
                            <p className="text-xs text-muted-foreground truncate">{person.fields.email}</p>
                          )}
                          {person.fields.bemerkung && (
                            <p className="text-xs text-muted-foreground/70 truncate mt-0.5 italic">{person.fields.bemerkung}</p>
                          )}
                        </div>

                        {/* Points */}
                        <div className="text-right shrink-0">
                          <p className="font-bold text-lg text-foreground leading-tight">
                            {(person.fields.punkte ?? 0).toLocaleString('de-DE')}
                          </p>
                          <p className="text-xs text-muted-foreground">Punkte</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(person)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Bearbeiten"
                          >
                            <IconPencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(person)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Löschen"
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <PersonenpunkteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updatePersonenpunkteEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createPersonenpunkteEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Personenpunkte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Personenpunkte']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Person löschen"
        description={`Soll "${deleteTarget?.fields.vorname ?? ''} ${deleteTarget?.fields.nachname ?? ''}".trim() || 'dieser Eintrag' wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-[20px]" />
      <Skeleton className="h-48 rounded-[20px]" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
