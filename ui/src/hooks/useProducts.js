import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchProducts() {
  const { data } = await axios.get(`${API_URL}/api/v1/products`);
  return data.products || [];
}

async function fetchProductSummary(productId, dateFrom, dateTo) {
  const params = {};
  if (dateFrom) params.from = dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom;
  if (dateTo)   params.to   = dateTo   instanceof Date ? dateTo.toISOString()   : dateTo;
  const { data } = await axios.get(`${API_URL}/api/v1/products/${productId}/summary`, { params });
  return data;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn:  fetchProducts,
    staleTime: 60 * 1000,
  });
}

export function useProductSummary(productId, dateFrom, dateTo) {
  return useQuery({
    queryKey: ['product-summary', productId, dateFrom?.toISOString?.() ?? dateFrom, dateTo?.toISOString?.() ?? dateTo],
    queryFn:  () => fetchProductSummary(productId, dateFrom, dateTo),
    enabled:  !!productId,
    staleTime: 30 * 1000,
  });
}
