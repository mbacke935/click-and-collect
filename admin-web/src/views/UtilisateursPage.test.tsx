import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UtilisateursPage from './UtilisateursPage';
import type { User } from '../types';

const UTILISATEURS: User[] = [
  {
    id: 'u1', email: 'fatou@mail.sn', role: 'client', actif: true,
    nom: 'Diallo', prenom: 'Fatou', dateCreation: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'u2', email: 'awa@boutique.sn', role: 'commercant', actif: true,
    nom: 'Sarr', prenom: 'Awa', dateCreation: '2026-07-02T10:00:00.000Z',
  },
];

jest.mock('../services/api', () => ({
  adminApi: {
    getUsers: jest.fn(() => Promise.resolve(UTILISATEURS)),
    toggleUser: jest.fn(() => Promise.resolve()),
    updateUser: jest.fn(() => Promise.resolve()),
    createUser: jest.fn(() => Promise.resolve()),
    deleteUser: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    session: { id: 'admin1', email: 'admin@test.com', role: 'administrateur' },
    isAuthenticated: true, loading: false, logout: jest.fn(),
  }),
}));

describe('UtilisateursPage — bouton Modifier', () => {
  it('bascule le formulaire en mode édition et le pré-remplit avec le compte choisi', async () => {
    const user = userEvent.setup();
    render(<UtilisateursPage />);

    await screen.findByText('fatou@mail.sn');

    // Avant le clic : le formulaire est en mode création, champs vides.
    expect(screen.getByRole('heading', { name: 'Nouveau compte' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('');

    const ligneFatou = screen.getByText('fatou@mail.sn').closest('tr')!;
    await user.click(within(ligneFatou).getByRole('button', { name: 'Modifier' }));

    // Après le clic : le formulaire passe en édition et porte les valeurs de la ligne.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Modifier le compte/ })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Email')).toHaveValue('fatou@mail.sn');
    expect(screen.getByLabelText('Prénom')).toHaveValue('Fatou');
    expect(screen.getByLabelText('Nom')).toHaveValue('Diallo');
  });

  // Le passage en édition remplissait déjà correctement le formulaire, mais celui-ci est
  // rendu sous un tableau qui peut faire plusieurs écrans de haut : sans retour visible,
  // le bouton paraissait inopérant. Ces assertions portent sur ce que l'utilisateur voit.
  it("donne un retour visible : nom du compte, ligne surlignée et défilement vers le formulaire", async () => {
    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const user = userEvent.setup();
    render(<UtilisateursPage />);
    await screen.findByText('fatou@mail.sn');

    const ligneFatou = screen.getByText('fatou@mail.sn').closest('tr')!;
    await user.click(within(ligneFatou).getByRole('button', { name: 'Modifier' }));

    // Le titre nomme le compte édité, pas un libellé générique.
    await screen.findByRole('heading', { name: 'Modifier le compte — Fatou Diallo' });

    // La ligne concernée est marquée, et le formulaire est amené dans le champ de vision.
    expect(ligneFatou).toHaveAttribute('aria-selected', 'true');
    expect(within(ligneFatou).getByRole('button', { name: 'En cours…' })).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('revient en mode création quand on annule', async () => {
    const user = userEvent.setup();
    render(<UtilisateursPage />);
    await screen.findByText('awa@boutique.sn');

    const ligneAwa = screen.getByText('awa@boutique.sn').closest('tr')!;
    await user.click(within(ligneAwa).getByRole('button', { name: 'Modifier' }));
    await screen.findByRole('heading', { name: /Modifier le compte/ });

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('heading', { name: 'Nouveau compte' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });
});
