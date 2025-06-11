import { Container } from 'react-bootstrap';
import AppNavbar from '../components/Navbar';

export default function Dashboard() {
  return (
    <>
      <AppNavbar />
      <Container className="mt-5">
        <h2>Dashboard</h2>
        <p>This is a protected page (to be implemented).</p>
      </Container>
    </>
  );
}