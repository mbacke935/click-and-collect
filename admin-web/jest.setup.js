require('@testing-library/jest-dom');

// jsdom n'implémente pas scrollIntoView : sans ce stub, tout composant qui amène un
// élément dans le champ de vision ferait échouer le test pour une raison d'environnement,
// pas de logique.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}
