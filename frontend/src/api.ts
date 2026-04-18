import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
  sizes: string;
  featured: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  size: string;
  product: Product;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  size: string;
}

export interface Order {
  id: number;
  total: number;
  status: string;
  shipping_address: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
  mp_payment_id?: string | null;
  pix_qr_code?: string | null;
  pix_qr_code_base64?: string | null;
  pix_ticket_url?: string | null;
}
