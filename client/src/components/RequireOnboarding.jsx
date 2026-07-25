import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/** Si el dueño aún no termina el setup, lo mantiene en el wizard. */
export default function RequireOnboarding({ children }) {
  const { user, restaurantId, organization } = useAuth();
  const location = useLocation();
  const [needs, setNeeds] = useState(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (!user || !['owner', 'manager'].includes(user.role)) {
        if (alive) setNeeds(false);
        return;
      }
      if (organization?.onboardingCompleted || organization?.onboardingSkipped) {
        if (alive) setNeeds(false);
        return;
      }
      try {
        const status = await api(`/api/onboarding/status?restaurantId=${restaurantId}`, { restaurantId });
        if (alive) setNeeds(Boolean(status.needsOnboarding));
      } catch {
        if (alive) setNeeds(false);
      }
    }
    check();
    return () => { alive = false; };
  }, [user, restaurantId, organization?.onboardingCompleted, organization?.onboardingSkipped]);

  if (needs === null) {
    return <div className="login-page"><div className="muted">Cargando…</div></div>;
  }

  if (needs && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
