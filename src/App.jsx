import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Category from './pages/Category'
import ProductDetail from './pages/ProductDetail'
import SearchResults from './pages/SearchResults'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="categoria/:category" element={<Category />} />
          <Route path="categoria/:category/:gender" element={<Category />} />
          <Route path="producto/:id" element={<ProductDetail />} />
          <Route path="buscar" element={<SearchResults />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
