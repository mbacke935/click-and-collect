import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from './DataTable';

interface Ligne {
  id: string;
  nom: string;
  montant: number;
}

const LIGNES: Ligne[] = [
  { id: '1', nom: 'Bravo', montant: 300 },
  { id: '2', nom: 'alpha', montant: 1000 },
  { id: '3', nom: 'Charlie', montant: 50 },
];

const COLONNES = [
  { key: 'nom' as const, label: 'Nom', triable: true },
  { key: 'montant' as const, label: 'Montant', triable: true },
];

function nomsAffiches(): string[] {
  const lignes = screen.getAllByRole('row').slice(1); // ignore l'en-tête
  return lignes.map((tr) => within(tr).getAllByRole('cell')[0].textContent ?? '');
}

describe('DataTable — états', () => {
  it('distingue chargement, erreur et absence de données', () => {
    const { rerender } = render(<DataTable columns={COLONNES} data={[]} loading />);
    expect(screen.getByText('Chargement…')).toBeInTheDocument();

    const onReessayer = jest.fn();
    rerender(<DataTable columns={COLONNES} data={[]} erreur="Serveur injoignable" onReessayer={onReessayer} />);
    expect(screen.getByText(/Serveur injoignable/)).toBeInTheDocument();

    rerender(<DataTable columns={COLONNES} data={[]} emptyMessage="Rien à afficher." />);
    expect(screen.getByText('Rien à afficher.')).toBeInTheDocument();
  });
});

describe('DataTable — tri', () => {
  it('trie par ordre croissant puis décroissant, sans tenir compte de la casse', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLONNES} data={LIGNES} />);

    expect(nomsAffiches()).toEqual(['Bravo', 'alpha', 'Charlie']);

    await user.click(screen.getByRole('button', { name: 'Trier par Nom' }));
    expect(nomsAffiches()).toEqual(['alpha', 'Bravo', 'Charlie']);

    await user.click(screen.getByRole('button', { name: 'Trier par Nom' }));
    expect(nomsAffiches()).toEqual(['Charlie', 'Bravo', 'alpha']);
  });

  it("revient à l'ordre d'origine au troisième clic", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLONNES} data={LIGNES} />);
    const enTete = screen.getByRole('button', { name: 'Trier par Nom' });

    await user.click(enTete);
    await user.click(enTete);
    await user.click(enTete);

    expect(nomsAffiches()).toEqual(['Bravo', 'alpha', 'Charlie']);
  });

  it('compare les montants numériquement et non comme du texte', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLONNES} data={LIGNES} />);

    await user.click(screen.getByRole('button', { name: 'Trier par Montant' }));

    // Un tri alphabétique donnerait 1000 avant 300 ; l'ordre attendu est 50, 300, 1000.
    expect(nomsAffiches()).toEqual(['Charlie', 'Bravo', 'alpha']);
  });
});

describe('DataTable — pagination', () => {
  const beaucoup: Ligne[] = Array.from({ length: 7 }, (_, i) => ({
    id: String(i), nom: `Ligne ${i}`, montant: i,
  }));

  it("n'affiche pas de pagination quand tout tient sur une page", () => {
    render(<DataTable columns={COLONNES} data={beaucoup} taillePage={10} />);
    expect(screen.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();
  });

  it('découpe les données et navigue entre les pages', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLONNES} data={beaucoup} taillePage={3} />);

    expect(nomsAffiches()).toEqual(['Ligne 0', 'Ligne 1', 'Ligne 2']);
    expect(screen.getByText('1–3 sur 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(nomsAffiches()).toEqual(['Ligne 3', 'Ligne 4', 'Ligne 5']);

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(nomsAffiches()).toEqual(['Ligne 6']);
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
  });

  it('recadre la page courante quand la liste filtrée devient plus courte', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataTable columns={COLONNES} data={beaucoup} taillePage={3} />);

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Page 3 / 3')).toBeInTheDocument();

    // L'utilisateur saisit une recherche : la liste se réduit à deux lignes.
    rerender(<DataTable columns={COLONNES} data={beaucoup.slice(0, 2)} taillePage={3} />);

    // Sans recadrage, le tableau afficherait une page vide.
    expect(nomsAffiches()).toEqual(['Ligne 0', 'Ligne 1']);
  });
});
