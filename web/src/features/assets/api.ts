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
  DeleteAssetResponse,
  PagedData,
  UpdateAssetGroupRequest,
  UpdateAssetGroupResponse,
  UpdateAssetRequest,
  UpdateAssetResponse,
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
  file: File,
  onUploadProgress?: (progress: number) => void
): Promise<Asset> {
  // Strip extension so the stored asset name is clean
  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
  const renamedFile = new File([file], nameWithoutExt, { type: file.type })
  const formData = new FormData()
  formData.append('file', renamedFile)
  const res = await api.post<CreateAssetResponse>(
    `/api/assets/groups/${groupId}/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (e) => {
            if (e.total) {
              onUploadProgress(Math.round((e.loaded / e.total) * 100))
            }
          }
        : undefined,
    }
  )
  return res.data.data
}

export async function createAssetByUrl(
  groupId: number,
  data: CreateAssetByUrlRequest
): Promise<Asset> {
  const res = await api.post<CreateAssetResponse>(
    `/api/assets/groups/${groupId}/upload`,
    data
  )
  return res.data.data
}

export interface ImportAssetByUrlRequest {
  url: string
  name: string
  asset_type: 'Image' | 'Video' | 'Audio'
}

export async function importAssetByUrl(
  groupId: number,
  data: ImportAssetByUrlRequest
): Promise<Asset> {
  const res = await api.post<CreateAssetResponse>(
    `/api/assets/groups/${groupId}/upload-url`,
    data
  )
  return res.data.data
}

export async function updateAsset(
  groupId: number,
  assetId: number,
  data: UpdateAssetRequest
): Promise<void> {
  await api.patch<UpdateAssetResponse>(
    `/api/assets/groups/${groupId}/items/${assetId}`,
    data
  )
}

export async function deleteAsset(groupId: number, assetId: number): Promise<void> {
  await api.delete<DeleteAssetResponse>(
    `/api/assets/groups/${groupId}/items/${assetId}`
  )
}

export interface LivenessSessionResponse {
  success: boolean
  data: {
    bytedToken: string
    callbackUrl: string
    expiresAt: string
    expiresIn: number
    h5Link: string
    qrDataUrl: string
  }
}

export async function createLivenessSession(): Promise<LivenessSessionResponse['data']> {
  const res = await api.post<LivenessSessionResponse>('/api/assets/liveness/sessions')
  return res.data.data
}

export async function syncLivenessGroups(): Promise<AssetGroup | null> {
  const res = await api.post<{ success: boolean; data: AssetGroup }>(
    '/api/assets/liveness/groups/sync'
  )
  return res.data.success ? res.data.data : null
}
