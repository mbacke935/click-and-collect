import { getValidSession, isLoggedIn } from './api';

function buildToken(payload: Record<string, any>): string {
  const base64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.signature-non-verifiee`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('getValidSession — garde de session du back-office', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renvoie null si aucun jeton n'est présent", () => {
    expect(getValidSession()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it('renvoie la session pour un jeton administrateur valide et non expiré', () => {
    const token = buildToken({ sub: 'u1', email: 'admin@test.com', role: 'administrateur', exp: nowSeconds() + 3600 });
    localStorage.setItem('adminToken', token);

    expect(getValidSession()).toEqual({ email: 'admin@test.com', role: 'administrateur' });
    expect(isLoggedIn()).toBe(true);
  });

  it('rejette et purge un jeton expiré', () => {
    const token = buildToken({ sub: 'u1', email: 'admin@test.com', role: 'administrateur', exp: nowSeconds() - 10 });
    localStorage.setItem('adminToken', token);

    expect(getValidSession()).toBeNull();
    expect(localStorage.getItem('adminToken')).toBeNull();
  });

  it("rejette et purge un jeton valide mais n'appartenant pas à un administrateur", () => {
    const token = buildToken({ sub: 'u1', email: 'client@test.com', role: 'client', exp: nowSeconds() + 3600 });
    localStorage.setItem('adminToken', token);

    expect(getValidSession()).toBeNull();
    expect(localStorage.getItem('adminToken')).toBeNull();
  });

  it('rejette un jeton mal formé sans lever d\'exception', () => {
    localStorage.setItem('adminToken', 'ceci-nest-pas-un-jwt');
    expect(() => getValidSession()).not.toThrow();
    expect(getValidSession()).toBeNull();
  });
});
