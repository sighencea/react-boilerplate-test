import { supabase } from '../utils/supabaseClient';
import { useEffect, useState } from 'react';
import { Button, Container } from 'react-bootstrap';

export default function Home() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Container className="text-center mt-5">
      <h1>
        Welcome to our application! ABC <i className='bi bi-heart-fill' style={{ color: 'red' }}></i>
      </h1>
      {session ? (
        <>
          <p>You're signed in.</p>
          <Button onClick={handleSignOut}>Sign Out</Button>
        </>
      ) : (
        <Button onClick={handleSignIn}>Sign In with GitHub</Button>
      )}
    </Container>
  );
}
