import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">

        {/* Brand */}
        <div className="footer__brand">
          <Link to="/" aria-label="Inicio" className="footer__brand-link">
            <img
              src="/logo_sin_fondo.webp"
              alt="Estilos Gissel"
              className="footer__logo"
            />
            <span className="footer__brand-name">STILOS GISSEL</span>
          </Link>
          <p className="footer__tagline">
            Moda con caracter. Estilo sin compromiso.
          </p>
        </div>

        {/* Categorias */}
        <div className="footer__col">
          <h3 className="footer__heading overline">Categorias</h3>
          <ul className="footer__list">
            <li>
              <Link to="/perfumes" className="footer__link">Perfumes</Link>
            </li>
            <li>
              <Link to="/carteras" className="footer__link">Carteras</Link>
            </li>
            <li>
              <Link to="/sandalias" className="footer__link">Sandalias</Link>
            </li>
            <li>
              <Link to="/zapatos" className="footer__link">Zapatos</Link>
            </li>
          </ul>
        </div>

        {/* Por genero */}
        <div className="footer__col">
          <h3 className="footer__heading overline">Por genero</h3>
          <ul className="footer__list">
            <li>
              <Link to="/perfumes/mujer" className="footer__link">Perfumes Mujer</Link>
            </li>
            <li>
              <Link to="/carteras/mujer" className="footer__link">Carteras Mujer</Link>
            </li>
            <li>
              <Link to="/sandalias/mujer" className="footer__link">Sandalias Mujer</Link>
            </li>
            <li>
              <Link to="/zapatos/mujer" className="footer__link">Zapatos Mujer</Link>
            </li>
          </ul>
        </div>

        {/* Informacion */}
        <div className="footer__col">
          <h3 className="footer__heading overline">Informacion</h3>
          <ul className="footer__list">
            <li><span className="footer__link footer__link--text">Envio nacional</span></li>
            <li><span className="footer__link footer__link--text">Devolucion en 30 dias</span></li>
            <li><span className="footer__link footer__link--text">Pago seguro</span></li>
          </ul>
        </div>

      </div>

      {/* Bottom */}
      <div className="footer__bottom container">
        <div className="footer__divider" />
        <div className="footer__bottom-content">
          <p className="footer__copyright">
            &copy; {new Date().getFullYear()} Stilos Gissel. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
