import { api } from '@/lib/api'

import type {
  AssetConfig,
  AssetConfigResponse,
  AssetGroup,
  AssetGroupDetailsResponse,
  AssetGroupsResponse,
  AssetsResponse,
  PagedData,
} from './types'

export interface AssetListParams {
  p?: number
  page_size?: number
  q?: string
  asset_type?: string
  status?: string
  sort?: string
}

export async function getAssetGroups(): Promise<PagedData<AssetGroup>> {
  const res = await api.get<AssetGroupsResponse>('/api/assets/groups')
  return res.data.data
}

export async function getAssetConfig(): Promise<AssetConfig> {
  const res = await api.get<AssetConfigResponse>('/api/assets/config')
  return res.data.data
}

export async function getAssetGroupDetails(groupId: number) {
  const res = await api.get<AssetGroupDetailsResponse>(
    `/api/assets/groups/${groupId}`
  )
  return res.data.data
}

export async function listAssets(
  groupId: number,
  params: AssetListParams = {}
) {
  const query = new URLSearchParams()
  if (params.p) query.set('p', String(params.p))
  if (params.page_size) query.set('page_size', String(params.page_size))
  if (params.q) query.set('q', params.q)
  if (params.asset_type) query.set('asset_type', params.asset_type)
  if (params.status) query.set('status', params.status)
  if (params.sort) query.set('sort', params.sort)

  const res = await api.get<AssetsResponse>(
    `/api/assets/groups/${groupId}/items?${query.toString()}`
  )
  return res.data.data
}
