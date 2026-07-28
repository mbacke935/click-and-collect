'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ApiDataState<T> {
  data: T | null;
  loading: boolean;
  erreur: string;
  recharger: () => void;
}

// Centralise le trio chargement / erreur / rechargement des pages du back-office.
// Avant, chaque page faisait `apiFetch(...).then(setState).catch(() => {})` : une panne
// réseau ou une erreur serveur se traduisait par un tableau vide silencieux, impossible à
// distinguer d'une absence réelle de données.
//
// `deps` déclenche un rechargement quand une dépendance change (ex. un filtre). Le résultat
// d'une requête obsolète est ignoré, pour qu'un enchaînement rapide de filtres n'affiche pas
// la réponse arrivée en dernier plutôt que celle du filtre courant.
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [compteurRechargement, setCompteurRechargement] = useState(0);

  const requeteCourante = useRef(0);
  // Conservé dans une ref : le fetcher est une fonction fléchée recréée à chaque rendu,
  // la mettre dans `deps` provoquerait une boucle de rechargement infinie.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const idRequete = ++requeteCourante.current;
    setLoading(true);
    setErreur('');

    fetcherRef.current()
      .then((resultat) => {
        if (idRequete !== requeteCourante.current) return;
        setData(resultat);
      })
      .catch((err: Error) => {
        if (idRequete !== requeteCourante.current) return;
        setErreur(err.message || 'Une erreur est survenue.');
      })
      .finally(() => {
        if (idRequete !== requeteCourante.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, compteurRechargement]);

  const recharger = useCallback(() => setCompteurRechargement((n) => n + 1), []);

  return { data, loading, erreur, recharger };
}
