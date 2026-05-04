import { useEffect, useState } from 'react';

import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';

/** Avoid routing flash before persisted session is loaded */
export function useSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useSessionStore.persist.hasHydrated?.() ?? false
  );

  useEffect(() => {
    const finished = useSessionStore.persist.onFinishHydration?.(() =>
      setHydrated(true)
    );
    if (useSessionStore.persist.hasHydrated?.()) setHydrated(true);
    return () => {
      finished?.();
    };
  }, []);

  return hydrated;
}

/** Profile must rehydrate before `app/index` reads `onboardingComplete` */
export function useProfileHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useProfileStore.persist.hasHydrated?.() ?? false
  );

  useEffect(() => {
    const finished = useProfileStore.persist.onFinishHydration?.(() =>
      setHydrated(true)
    );
    if (useProfileStore.persist.hasHydrated?.()) setHydrated(true);
    return () => {
      finished?.();
    };
  }, []);

  return hydrated;
}

/** Session + profile — both required for correct / index routing */
export function useAppStoresHydrated(): boolean {
  return useSessionHydrated() && useProfileHydrated();
}
