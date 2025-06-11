import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  return user;
}