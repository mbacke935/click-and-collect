// Enregistre les matchers de @testing-library/jest-dom (toBeInTheDocument, toHaveValue…)
// auprès de TypeScript. Sans cet import, ils fonctionnent à l'exécution mais `tsc` les
// signale comme inexistants sur le type des assertions.
import '@testing-library/jest-dom';
