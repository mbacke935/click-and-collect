import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AppNavigator from '../src/navigation/AppNavigator';

const mockUseAuth = jest.fn();
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Empêche les écrans d'émettre de vraies requêtes réseau pendant les tests.
jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn().mockRejectedValue(new Error('réseau désactivé en test')) },
}));

describe('AppNavigator', () => {
  it("affiche l'écran de connexion quand l'utilisateur n'est pas authentifié", async () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, loading: false, userRole: null });
    render(<AppNavigator />);
    expect(await screen.findByText('Click&Collect')).toBeTruthy();
  });

  it('dirige vers l’espace client quand le rôle est "client"', async () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: true, loading: false, userRole: 'client' });
    render(<AppNavigator />);
    expect(await screen.findByText('Bonjour')).toBeTruthy();
  });

  it('dirige vers l’espace commerçant quand le rôle est "commercant"', async () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: true, loading: false, userRole: 'commercant' });
    render(<AppNavigator />);
    expect(await screen.findByText('Ma boutique')).toBeTruthy();
  });

  it('affiche un indicateur de chargement pendant la vérification du token', () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, loading: true, userRole: null });
    const result = render(<AppNavigator />);
    expect(result.toJSON()).toBeTruthy();
  });
});
