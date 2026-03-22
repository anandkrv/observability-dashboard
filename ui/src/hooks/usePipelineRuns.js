import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchPipelineRuns({ productId, releaseId, platform, status, dateFrom, dateTo, page = 1, limit = 50 }) {
  const params = { page, limit };
  if (productId)  params.product_id  = productId;
  if (releaseId)  params.release_id  = releaseId;
  if (platform)   params.platform    = platform;
  if (status)     params.status      = Array.isArray(status) ? status.join(',') : status;
  if (dateFrom)   params.from        = dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom;
  if (dateTo)     params.to          = dateTo   instanceof Date ? dateTo.toISOString()   : dateTo;

  const { data } = await axios.get(`${API_URL}/api/v1/pipeline-runs`, { params });
  return data;
}

async function fetchPipelineRunDetail(runId) {
  const { data } = await axios.get(`${API_URL}/api/v1/pipeline-runs/${runId}`);
  return data.run;
}

export function usePipelineRuns(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['pipeline-runs', filters],
    queryFn:  () => fetchPipelineRuns(filters),
    staleTime: 15 * 1000,
    ...options,
  });
}

export function usePipelineRunDetail(runId) {
  return useQuery({
    queryKey: ['pipeline-run-detail', runId],
    queryFn:  () => fetchPipelineRunDetail(runId),
    enabled:  !!runId,
    staleTime: 60 * 1000,
  });
}
