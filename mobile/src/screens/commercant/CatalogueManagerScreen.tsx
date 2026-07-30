import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';

const VIDE = { nom: '', prix: '', categorie: '', quantiteStock: '' };

// Gestion du catalogue de la boutique du commerçant : création, édition et
// activation/désactivation d'un produit — cf. dossier de spécifications, cas
// d'utilisation Commerçant "Gérer le catalogue et les stocks". Un produit désactivé
// disparaît de la vitrine client (voir CatalogueScreen) mais reste dans l'historique des
// commandes qui le référencent déjà ; on utilise donc /produits/gestion (et non la route
// publique, filtrée aux produits actifs) pour que le commerçant retrouve aussi ceux qu'il
// a désactivés et puisse les réactiver.
export default function CatalogueManagerScreen({ route }: any) {
  const { boutiqueId } = route.params;
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(VIDE);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(() => {
    api.get(`/boutiques/${boutiqueId}/produits/gestion`)
      .then(({ data }) => setProduits(data))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger le catalogue.'))
      .finally(() => setLoading(false));
  }, [boutiqueId]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const startEdit = (produit: any) => {
    setEditingId(produit.id);
    setForm({
      nom: produit.nom, prix: String(produit.prix),
      categorie: produit.categorie || '', quantiteStock: String(produit.quantiteStock ?? ''),
    });
  };

  const startCreate = () => { setEditingId(null); setForm(VIDE); };

  const enregistrer = async () => {
    if (!form.nom.trim() || !form.prix.trim()) {
      Alert.alert('Erreur', 'Le nom et le prix sont obligatoires.');
      return;
    }
    const dto = {
      nom: form.nom.trim(),
      prix: parseInt(form.prix, 10),
      categorie: form.categorie.trim() || undefined,
      quantiteStock: form.quantiteStock.trim() ? parseInt(form.quantiteStock, 10) : undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/boutiques/${boutiqueId}/produits/${editingId}`, dto);
      } else {
        await api.post(`/boutiques/${boutiqueId}/produits`, dto);
      }
      setForm(VIDE);
      setEditingId(null);
      charger();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Échec de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActif = (produit: any) => {
    const reactivation = !produit.actif;
    Alert.alert(
      reactivation ? 'Réactiver ce produit ?' : 'Désactiver ce produit ?',
      reactivation
        ? `${produit.nom} redeviendra visible dans le catalogue client.`
        : `${produit.nom} disparaîtra du catalogue client, mais reste dans l'historique des commandes déjà passées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: reactivation ? 'Réactiver' : 'Désactiver',
          style: reactivation ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (reactivation) {
                await api.patch(`/boutiques/${boutiqueId}/produits/${produit.id}`, { actif: true });
              } else {
                await api.delete(`/boutiques/${boutiqueId}/produits/${produit.id}`);
              }
              charger();
            } catch (e: any) {
              Alert.alert('Erreur', e.response?.data?.message || 'Échec.');
            }
          },
        },
      ],
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catalogue</Text>

      <FlatList
        data={produits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.actif && styles.cardInactif]}
            onPress={() => startEdit(item)}
          >
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{item.nom}</Text>
              <Text style={styles.cardPrix}>{item.prix?.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardSub}>
                {item.categorie || 'Sans catégorie'} · stock {item.quantiteStock ?? '—'}
              </Text>
              <TouchableOpacity onPress={() => toggleActif(item)}>
                <Text style={[styles.badge, item.actif ? styles.badgeActif : styles.badgeInactif]}>
                  {item.actif ? 'Actif' : 'Désactivé'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun produit — ajoutez-en un ci-dessous.</Text>}
      />

      <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId ? 'Modifier le produit' : 'Nouveau produit'}</Text>
        <TextInput
          style={styles.input} placeholder="Nom" placeholderTextColor={COLORS.mutedLight}
          value={form.nom} onChangeText={(v) => setForm((f) => ({ ...f, nom: v }))}
        />
        <TextInput
          style={styles.input} placeholder="Prix (FCFA)" placeholderTextColor={COLORS.mutedLight}
          keyboardType="numeric" value={form.prix} onChangeText={(v) => setForm((f) => ({ ...f, prix: v }))}
        />
        <TextInput
          style={styles.input} placeholder="Catégorie" placeholderTextColor={COLORS.mutedLight}
          value={form.categorie} onChangeText={(v) => setForm((f) => ({ ...f, categorie: v }))}
        />
        <TextInput
          style={styles.input} placeholder="Stock disponible" placeholderTextColor={COLORS.mutedLight}
          keyboardType="numeric" value={form.quantiteStock} onChangeText={(v) => setForm((f) => ({ ...f, quantiteStock: v }))}
        />
        <View style={styles.formActions}>
          {editingId && (
            <TouchableOpacity style={styles.btnOutline} onPress={startCreate}>
              <Text style={styles.btnOutlineText}>Annuler</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, saving && { opacity: 0.5 }]} onPress={enregistrer} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.black} /> : (
              <Text style={styles.btnText}>{editingId ? 'Enregistrer' : 'Ajouter'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 12 },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 12, marginBottom: 8 },
  cardInactif: { opacity: 0.55 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  cardPrix: { color: COLORS.gold, fontSize: 13, fontFamily: 'monospace' },
  cardSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  badge: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 3,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, overflow: 'hidden',
  },
  badgeActif: { color: COLORS.green, backgroundColor: 'rgba(74,222,128,0.12)' },
  badgeInactif: { color: COLORS.red, backgroundColor: 'rgba(239,68,68,0.12)' },
  empty: { color: COLORS.muted, textAlign: 'center', marginVertical: 20 },
  form: { borderTopWidth: 1, borderColor: COLORS.line, paddingTop: 14, marginTop: 6 },
  formTitle: { color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  input: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 14, paddingVertical: 8, marginBottom: 10 },
  formActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 14 },
  btnOutline: { borderWidth: 1, borderColor: COLORS.mutedLight, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, justifyContent: 'center' },
  btnOutlineText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
});
