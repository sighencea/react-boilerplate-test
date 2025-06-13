import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import '../styles/style.css';
import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout.js';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const authPaths = ['/', '/404']; // Sign-in page and 404 page

  // Removed useEffect for Bootstrap JS import

  return (
    <AuthProvider>
      <Head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        {/* Add other global head elements here if needed */}
      </Head>
      {authPaths.includes(router.pathname) ? (
        // Pages that should not have MainLayout (e.g., sign-in, sign-up)
        <Component {...pageProps} />
      ) : (
        // Pages that should have MainLayout
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
      )}
    </AuthProvider>
  );
}