export interface AssetGroup {
  id: number
  user_id: number
  provider_group_id: string
  name: string
  description: string
  group_type: string
  project_name: string
  created_time: number
  updated_time: number
  asset_count: number
  processing_count: number
  failed_count: number
}

export interface Asset {
  id: number
  user_id: number
  asset_group_id: number
  provider_asset_id: string
  name: string
  asset_type: 'Image' | 'Video' | 'Audio' | string
  url: string
  status: 'Active' | 'Processing' | 'Failed' | string
  mime_type: string
  size: number
  created_time: number
  updated_time: number
}

export interface AssetConfig {
  extensions: string[]
  liveness_enabled: boolean
  max_batch_files: number
  max_file_bytes: number
}

export interface PagedData<T> {
  items: T[]
  page: number
  page_size: number
  total: number
}

export interface AssetGroupsResponse {
  success: boolean
  data: PagedData<AssetGroup>
}

export interface AssetConfigResponse {
  success: boolean
  data: AssetConfig
}

export interface AssetGroupDetailsResponse {
  success: boolean
  data: {
    group: AssetGroup
    assets: Asset[]
  }
}

export interface AssetsResponse {
  success: boolean
  data: PagedData<Asset>
}
