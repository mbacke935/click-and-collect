import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { User, UserRole } from './users/entities/user.entity';
import { BoutiquesService } from './boutiques/boutiques.service';
import { Boutique, BoutiqueCategorie } from './boutiques/entities/boutique.entity';
import { ProduitsService } from './produits/produits.service';
import { CreneauxService } from './creneaux/creneaux.service';
import { PaniersService } from './paniers/paniers.service';
import { CommandesService } from './commandes/commandes.service';
import { Commande, CommandeStatut, ModePaiement } from './commandes/entities/commande.entity';

// Script de seed : peuple la base avec des comptes, boutiques, produits,
// créneaux et commandes de démonstration. Idempotent — peut être relancé
// sans dupliquer les données déjà créées.
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);
  const boutiquesService = app.get(BoutiquesService);
  const produitsService = app.get(ProduitsService);
  const creneauxService = app.get(CreneauxService);
  const paniersService = app.get(PaniersService);
  const commandesService = app.get(CommandesService);

  async function getOrRegister(dto: {
    email: string; password: string; role: UserRole; nom: string; prenom: string;
  }): Promise<User> {
    const existing = await usersService.findByEmail(dto.email);
    if (existing) return existing;
    await authService.register(dto);
    return usersService.findByEmail(dto.email) as Promise<User>;
  }

  async function getOrCreateBoutique(
    commercant: User,
    dto: { nom: string; categorie: BoutiqueCategorie; adresse: string },
  ): Promise<Boutique> {
    const existantes = await boutiquesService.findByCommercant(commercant.id);
    const trouvee = existantes.find((b) => b.nom === dto.nom);
    if (trouvee) return trouvee;
    return boutiquesService.create(dto, commercant.id);
  }

  async function getOrCreateProduit(
    boutique: Boutique,
    commercantId: string,
    dto: { nom: string; prix: number; categorie: string; quantiteStock: number },
  ) {
    const existants = await produitsService.findByBoutique(boutique.id);
    const trouve = existants.find((p) => p.nom === dto.nom);
    if (trouve) return trouve;
    return produitsService.create(boutique.id, dto, commercantId);
  }

  async function getOrCreateCreneaux(boutique: Boutique, commercantId: string, jours: string[]) {
    const plages: Array<[string, string]> = [['11:00', '12:00'], ['17:00', '18:00'], ['18:30', '19:30']];
    for (const jour of jours) {
      const existants = await creneauxService.findByBoutique(boutique.id, jour);
      for (const [heureDebut, heureFin] of plages) {
        if (existants.find((c) => c.heureDebut === heureDebut)) continue;
        await creneauxService.create(boutique.id, { jour, heureDebut, heureFin, capaciteMax: 5 }, commercantId);
      }
    }
  }

  async function seedCommande(
    client: User,
    boutique: Boutique,
    commercant: User,
    statutCible: CommandeStatut,
  ): Promise<Commande> {
    const existantes = await commandesService.findByClient(client.id);
    let commande = existantes.find((c) => c.boutique_id === boutique.id);
    if (!commande) {
      const produits = await produitsService.findByBoutique(boutique.id);
      let panier = await paniersService.ajouterArticle(client.id, boutique.id, {
        produit_id: produits[0].id, quantite: 2,
      });
      if (produits[1]) {
        panier = await paniersService.ajouterArticle(client.id, boutique.id, {
          produit_id: produits[1].id, quantite: 1,
        });
      }
      const [creneau] = await creneauxService.findByBoutique(boutique.id, aujourdHui);
      commande = await commandesService.create(
        { panier_id: panier.id, creneau_id: creneau.id, modePaiement: ModePaiement.SUR_PLACE },
        client.id,
      );
    }
    if (commande.statut !== statutCible) {
      commande = await commandesService.updateStatut(
        commande.id, { statut: statutCible }, commercant.id, UserRole.COMMERCANT,
      );
    }
    return commande;
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  console.log('Création des utilisateurs...');
  const commercant1 = await getOrRegister({
    email: 'boulangerie@test.com', password: 'password123',
    role: UserRole.COMMERCANT, nom: 'Diop', prenom: 'Amadou',
  });
  const commercant2 = await getOrRegister({
    email: 'epicerie@test.com', password: 'password123',
    role: UserRole.COMMERCANT, nom: 'Fall', prenom: 'Aïssatou',
  });
  const commercant3 = await getOrRegister({
    email: 'friperie@test.com', password: 'password123',
    role: UserRole.COMMERCANT, nom: 'Ba', prenom: 'Ibrahima',
  });
  const client1 = await getOrRegister({
    email: 'client1@test.com', password: 'password123',
    role: UserRole.CLIENT, nom: 'Ndiaye', prenom: 'Fatou',
  });
  const client2 = await getOrRegister({
    email: 'client2@test.com', password: 'password123',
    role: UserRole.CLIENT, nom: 'Sarr', prenom: 'Moussa',
  });

  console.log('Création des boutiques...');
  const boulangerie = await getOrCreateBoutique(commercant1, {
    nom: 'Boulangerie du Coin', categorie: BoutiqueCategorie.BOULANGERIE,
    adresse: '12 Avenue Cheikh Anta Diop, Dakar',
  });
  const epicerie = await getOrCreateBoutique(commercant2, {
    nom: 'Épicerie Fraîcheur', categorie: BoutiqueCategorie.EPICERIE,
    adresse: '45 Rue Félix Faure, Dakar',
  });
  const friperie = await getOrCreateBoutique(commercant3, {
    nom: 'Friperie Rétro', categorie: BoutiqueCategorie.FRIPERIE,
    adresse: '8 Rue Vincens, Dakar',
  });

  console.log('Création des produits...');
  for (const p of [
    { nom: 'Baguette tradition', prix: 300, categorie: 'pain', quantiteStock: 40 },
    { nom: 'Croissant', prix: 250, categorie: 'viennoiserie', quantiteStock: 30 },
    { nom: 'Pain complet', prix: 400, categorie: 'pain', quantiteStock: 20 },
    { nom: 'Éclair au chocolat', prix: 500, categorie: 'patisserie', quantiteStock: 15 },
  ]) await getOrCreateProduit(boulangerie, commercant1.id, p);

  for (const p of [
    { nom: 'Riz 5kg', prix: 3500, categorie: 'epicerie', quantiteStock: 25 },
    { nom: 'Huile 1L', prix: 1500, categorie: 'epicerie', quantiteStock: 30 },
    { nom: 'Tomates 1kg', prix: 800, categorie: 'legumes', quantiteStock: 20 },
    { nom: 'Lait 1L', prix: 600, categorie: 'epicerie', quantiteStock: 35 },
  ]) await getOrCreateProduit(epicerie, commercant2.id, p);

  for (const p of [
    { nom: 'Chemise vintage', prix: 5000, categorie: 'hauts', quantiteStock: 10 },
    { nom: 'Jean 90s', prix: 8000, categorie: 'bas', quantiteStock: 8 },
    { nom: 'Veste en jean', prix: 12000, categorie: 'vestes', quantiteStock: 5 },
    { nom: 'Robe fleurie', prix: 6000, categorie: 'robes', quantiteStock: 7 },
  ]) await getOrCreateProduit(friperie, commercant3.id, p);

  console.log('Création des créneaux...');
  await getOrCreateCreneaux(boulangerie, commercant1.id, [aujourdHui, demain]);
  await getOrCreateCreneaux(epicerie, commercant2.id, [aujourdHui, demain]);
  await getOrCreateCreneaux(friperie, commercant3.id, [aujourdHui, demain]);

  console.log('Création des commandes de démonstration...');
  await seedCommande(client1, boulangerie, commercant1, CommandeStatut.RECUE);
  await seedCommande(client2, boulangerie, commercant1, CommandeStatut.EN_PREPARATION);
  await seedCommande(client1, epicerie, commercant2, CommandeStatut.PRETE);
  await seedCommande(client2, epicerie, commercant2, CommandeStatut.RECUPEREE);
  await seedCommande(client1, friperie, commercant3, CommandeStatut.RECUE);
  await seedCommande(client2, friperie, commercant3, CommandeStatut.EN_PREPARATION);

  await app.close();

  console.log('\nSeed terminé ✅');
  console.log('\nComptes de test (mot de passe : password123) :');
  console.log('  Commerçants : boulangerie@test.com · epicerie@test.com · friperie@test.com');
  console.log('  Clients     : client1@test.com · client2@test.com');
}

bootstrap().catch((err) => {
  console.error('Échec du seed :', err);
  process.exit(1);
});
