import { api } from '@/lib/api'

import type {
  Asset,
  AssetConfig,
  AssetConfigResponse,
  AssetGroup,
  AssetGroupDetailsResponse,
  AssetGroupsResponse,
  AssetsResponse,
  CreateAssetByUrlRequest,
  CreateAssetGroupRequest,
  CreateAssetGroupResponse,
  CreateAssetResponse,
  DeleteAssetGroupResponse,
  PagedData,
  UpdateAssetGroupRequest,
  UpdateAssetGroupResponse,
} from './types'

export interface AssetListParams {
  p?: number
  page_size?: number
  q?: string
  asset_type?: string
  status?: string
  sort?: string
}

export async function getAssetGroups(
  groupType?: string
): Promise<PagedData<AssetGroup>> {
  const params: Record<string, string> = {}
  if (groupType) params.group_type = groupType
  const res = await api.get<AssetGroupsResponse>('/api/assets/groups', {
    params,
  })
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

export async function createAssetGroup(
  data: CreateAssetGroupRequest
): Promise<AssetGroup> {
  const res = await api.post<CreateAssetGroupResponse>(
    '/api/assets/groups',
    data
  )
  return res.data.data
}

export async function deleteAssetGroup(groupId: number): Promise<void> {
  await api.delete<DeleteAssetGroupResponse>(`/api/assets/groups/${groupId}`)
}

export async function updateAssetGroup(
  groupId: number,
  data: UpdateAssetGroupRequest
): Promise<AssetGroup> {
  const res = await api.patch<UpdateAssetGroupResponse>(
    `/api/assets/groups/${groupId}`,
    data
  )
  return res.data.data
}

export async function uploadAsset(
  groupId: number,
  file: File
): Promise<Asset> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post<CreateAssetResponse>(
    `/api/assets/groups/${groupId}/items`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return res.data.data
}

export async function createAssetByUrl(
  groupId: number,
  data: CreateAssetByUrlRequest
): Promise<Asset> {
  const res = await api.post<CreateAssetResponse>(
    `/api/assets/groups/${groupId}/items`,
    data
  )
  return res.data.data
}
