import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ActionCenter from './pages/ActionCenter'
import Claims from './pages/Claims'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ProductDetails from './pages/ProductDetails'
import ProductFormPage from './pages/ProductFormPage'
import Products from './pages/Products'
import ReceiptVault from './pages/ReceiptVault'
import Register from './pages/Register'
import Timeline from './pages/Timeline'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/receipts" element={<ReceiptVault />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/actions" element={<ActionCenter />} />
          <Route path="/claims" element={<Claims />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
