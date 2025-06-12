import Link from 'next/link';
import { Navbar, Nav, Container } from 'react-bootstrap';

export default function AppNavbar() {
  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Link href="/" passHref>
          <Navbar.Brand>My App</Navbar.Brand>
        </Link>
        <Nav className="me-auto">
          <Link href="/" passHref>
            <Nav.Link>Home</Nav.Link>
          </Link>
          <Link href="/dashboard" passHref>
            <Nav.Link>Dashboard</Nav.Link>
          </Link>
        </Nav>
      </Container>
    </Navbar>
  );
}