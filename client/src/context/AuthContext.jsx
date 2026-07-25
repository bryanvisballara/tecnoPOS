import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken } from '../api/client';

const AuthContext = createContext(null);

const ROLE_HOME = {
  owner: '/dashboard',
  manager: '/dashboard',
  waiter: '/pos',
  kitchen: '/kitchen',
  cashier: '/cash',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState(localStorage.getItem('tp_restaurant') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api('/api/auth/me');
        setUser(data.user);
        setOrganization(data.organization);
        setRestaurants(data.restaurants);
        const preferred = localStorage.getItem('tp_restaurant');
        const ids = data.restaurants.map((r) => r._id);
        const next = preferred && ids.includes(preferred) ? preferred : ids[0] || '';
        setRestaurantId(next);
        if (next) localStorage.setItem('tp_restaurant', next);
      } catch {
        localStorage.removeItem('tp_token');
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  const login = async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    applySession(data);
    return data;
  };

  const applySession = (data) => {
    localStorage.setItem('tp_token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setRestaurants(data.restaurants);
    const first = data.restaurants[0]?._id || '';
    setRestaurantId(first);
    if (first) localStorage.setItem('tp_restaurant', first);
  };

  const logout = () => {
    localStorage.removeItem('tp_token');
    localStorage.removeItem('tp_restaurant');
    setUser(null);
    setOrganization(null);
    setRestaurants([]);
    setRestaurantId('');
  };

  const selectRestaurant = (id) => {
    setRestaurantId(id);
    localStorage.setItem('tp_restaurant', id);
  };

  const value = useMemo(
    () => ({
      user,
      organization,
      restaurants,
      restaurantId,
      selectRestaurant,
      login,
      applySession,
      logout,
      loading,
      homeForRole: (role) => ROLE_HOME[role] || '/dashboard',
      currentRestaurant: restaurants.find((r) => r._id === restaurantId),
    }),
    [user, organization, restaurants, restaurantId, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
