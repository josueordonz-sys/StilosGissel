import { Link } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  return (
    <div className="not-found-page container section">
      <div className="not-found-card">
        <span className="overline">Error 404</span>
        <h1 className="display-xl not-found-title">Página No Encontrada</h1>
        <p className="body-sm not-found-text">
          La página o colección que buscas no existe o ha sido reubicada dentro de nuestro catálogo.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Volver al Inicio
          </Link>
          <Link to="/categoria/perfumes" className="btn btn-outline">
            Explorar Perfumes
          </Link>
        </div>
      </div>
    </div>
  )
}
