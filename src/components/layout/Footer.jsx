import { Link } from 'react-router-dom'
import './Footer.css'

const CATEGORIES = [
  { slug: 'perfumes',  label: 'Perfumes'  },
  { slug: 'carteras',  label: 'Carteras'  },
  { slug: 'sandalias', label: 'Sandalias' },
  { slug: 'zapatos',   label: 'Zapatos'   },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">

        {/* Logo y descripcion */}
        <div className="footer__brand">
          <Link to="/" aria-label="Inicio">
            <img
              src="/logo_sin_fondo.webp"
              alt="Estilos Gissel"
              className="footer__logo"
            />
          </Link>
          <p className="footer__tagline body-sm">
            Moda con caracter. Estilo sin compromiso.
          </p>
        </div>

        {/* Categorias */}
        <div className="footer__col">
          <h3 className="footer__heading overline">Categorias</h3>
          <ul className="footer__list">
            {CATEGORIES.map(cat => (
              <li key={cat.slug}>
                <Link to={`/categoria/${cat.slug}`} className="footer__link">
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Por genero */}
        <div className="footer__col">
          <h3 className="footer__heading overline">Por genero</h3>
          <ul className="footer__list">
            {CATEGORIES.map(cat => (
              <li key={cat.slug}>
                <Link to={`/categoria/${cat.slug}/mujer`} className="footer__link">
                  {cat.label} Mujer
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Info */}
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
          <p className="body-sm">
            &copy; {new Date().getFullYear()} Estilos Gissel. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
