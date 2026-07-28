'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { useAuth } from '../context/AuthContext';
import { COLORS, ROLE_COLORS, STYLES, pastilleStyle } from '../constants/theme';
import type { User, UserRole } from '../types';
import PageHeader from '../components/PageHeader';
import FilterChips from '../components/FilterChips';
import SearchInput from '../components/SearchInput';
import DataTable from '../components/DataTable';
import ToggleBadge from '../components/ToggleBadge';

const ROLES: UserRole[] = ['client', 'commercant', 'administrateur'];
const FORM_VIDE = { email: '', password: '', nom: '', prenom: '', role: 'client' };

function nomComplet(user: User): string {
  return [user.prenom, user.nom].filter(Boolean).join(' ') || user.email;
}

export default function UtilisateursPage() {
  const { session } = useAuth();
  const [filtre, setFiltre] = useState('');
  const [recherche, setRecherche] = useState('');
  const { data, loading, erreur, recharger } = useApiData<User[]>(
    () => adminApi.getUsers(filtre || undefined),
    [filtre],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [formErreur, setFormErreur] = useState('');
  const [actionErreur, setActionErreur] = useState('');
  const formulaireRef = useRef<HTMLDivElement>(null);

  // Le formulaire est rendu sous le tableau : avec plusieurs dizaines de comptes il se
  // retrouve hors écran, et un clic sur « Modifier » n'avait aucun effet visible même s'il
  // remplissait bien les champs. On amène donc le formulaire dans le champ de vision.
  useEffect(() => {
    if (!editingId) return;
    formulaireRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [editingId]);

  const users = useMemo(() => data ?? [], [data]);

  // Recherche côté client : la liste renvoyée par l'API tient largement en mémoire et
  // filtrer localement évite un aller-retour réseau à chaque frappe.
  const usersAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return users;
    return users.filter((u) =>
      [u.email, u.nom, u.prenom].some((champ) => champ?.toLowerCase().includes(terme)),
    );
  }, [users, recherche]);

  const toggle = async (user: User) => {
    setActionErreur('');
    try {
      await adminApi.toggleUser(user.id, !user.actif);
      recharger();
    } catch (err) {
      setActionErreur((err as Error).message);
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setForm({ email: user.email, password: '', nom: user.nom ?? '', prenom: user.prenom ?? '', role: user.role });
    setFormErreur('');
  };

  const startCreate = () => { setEditingId(null); setForm(FORM_VIDE); setFormErreur(''); };

  const enregistrer = async () => {
    if (!form.email.trim()) {
      setFormErreur("L'email est obligatoire.");
      return;
    }
    if (!editingId && form.password.length < 8) {
      setFormErreur('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    setSaving(true);
    setFormErreur('');
    try {
      if (editingId) {
        await adminApi.updateUser(editingId, {
          email: form.email, nom: form.nom, prenom: form.prenom, role: form.role,
        });
      } else {
        await adminApi.createUser(form);
      }
      startCreate();
      recharger();
    } catch (err) {
      setFormErreur((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (user: User) => {
    if (!window.confirm(`Supprimer définitivement le compte ${user.email} ?`)) return;
    setActionErreur('');
    try {
      await adminApi.deleteUser(user.id);
      if (editingId === user.id) startCreate();
      recharger();
    } catch (err) {
      setActionErreur((err as Error).message);
    }
  };

  const compteParRole = (role: string) => users.filter((u) => u.role === role).length;

  return (
    <div>
      <PageHeader
        titre="Utilisateurs"
        sousTitre={`${users.length} compte${users.length > 1 ? 's' : ''} · ${users.filter((u) => !u.actif).length} suspendu(s)`}
        actions={<button onClick={recharger} style={STYLES.buttonSecondary}>Rafraîchir</button>}
      />

      <FilterChips
        legende="Filtrer par rôle"
        valeurActive={filtre}
        onChange={setFiltre}
        options={[
          { valeur: '', label: 'Tous', compte: users.length },
          ...ROLES.map((r) => ({ valeur: r, label: r, compte: filtre ? undefined : compteParRole(r) })),
        ]}
      />

      <SearchInput
        label="Rechercher un utilisateur"
        placeholder="Nom, prénom ou email…"
        valeur={recherche}
        onChange={setRecherche}
      />

      {actionErreur && <p style={{ ...STYLES.erreur, marginBottom: 14 }}>{actionErreur}</p>}

      <DataTable<User>
        loading={loading}
        erreur={erreur}
        onReessayer={recharger}
        emptyMessage={recherche ? 'Aucun utilisateur ne correspond à cette recherche.' : 'Aucun utilisateur.'}
        data={usersAffiches}
        ligneActive={(row) => row.id === editingId}
        columns={[
          { key: 'prenom', label: 'Prénom', render: (v) => v || '—' },
          { key: 'nom', label: 'Nom', render: (v) => v || '—' },
          { key: 'email', label: 'Email' },
          {
            key: 'role', label: 'Rôle',
            render: (v) => <span style={pastilleStyle(ROLE_COLORS[String(v)] ?? COLORS.muted)}>{String(v)}</span>,
          },
          {
            key: 'actif', label: 'Statut',
            render: (_v, row) => (
              <ToggleBadge
                actif={row.actif}
                onToggle={() => toggle(row)}
                labels={['Actif', 'Suspendu']}
                cible={`le compte de ${nomComplet(row)}`}
              />
            ),
          },
          { key: 'dateCreation', label: 'Inscription', render: (v) => new Date(String(v)).toLocaleDateString('fr-FR') },
          {
            key: 'id', label: 'Actions',
            render: (id, row) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => startEdit(row)}
                  style={editingId === row.id
                    ? { ...STYLES.buttonSmall, borderColor: COLORS.gold, color: COLORS.gold }
                    : STYLES.buttonSmall}
                >
                  {editingId === row.id ? 'En cours…' : 'Modifier'}
                </button>
                {id !== session?.id && (
                  <button
                    onClick={() => supprimer(row)}
                    style={{ ...STYLES.buttonSmall, borderColor: COLORS.red, color: COLORS.red }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <div
        ref={formulaireRef}
        style={{
          ...STYLES.card, marginTop: 24, maxWidth: 480,
          // Bordure dorée en mode édition : le formulaire sert aux deux usages
          // (création et modification), la distinction doit se voir d'un coup d'œil.
          borderColor: editingId ? COLORS.gold : COLORS.line,
        }}
      >
        <h3 style={{ color: COLORS.white, fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
          {editingId ? `Modifier le compte — ${form.prenom || ''} ${form.nom || ''}`.trim() : 'Nouveau compte'}
        </h3>

        <label style={STYLES.label} htmlFor="u-email">Email</label>
        <input
          id="u-email" type="email" autoComplete="off" style={{ ...STYLES.input, marginBottom: 14 }}
          value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />

        {!editingId && (
          <>
            <label style={STYLES.label} htmlFor="u-password">Mot de passe (8 caractères minimum)</label>
            <input
              id="u-password" type="password" autoComplete="new-password" style={{ ...STYLES.input, marginBottom: 14 }}
              value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={STYLES.label} htmlFor="u-prenom">Prénom</label>
            <input id="u-prenom" style={STYLES.input} value={form.prenom}
              onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={STYLES.label} htmlFor="u-nom">Nom</label>
            <input id="u-nom" style={STYLES.input} value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </div>
        </div>

        <label style={STYLES.label} htmlFor="u-role">Rôle</label>
        <select id="u-role" style={{ ...STYLES.input, marginBottom: 18 }} value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {formErreur && <p style={{ ...STYLES.erreur, marginBottom: 14 }}>{formErreur}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          {editingId && (
            <button onClick={startCreate} style={STYLES.buttonSecondary}>Annuler</button>
          )}
          <button onClick={enregistrer} disabled={saving} style={{ ...STYLES.buttonPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  );
}
