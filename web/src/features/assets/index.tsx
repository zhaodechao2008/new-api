import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertCircle,
  CloudUpload,
  Copy,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  MoreHorizontal,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  RefreshCw,
  Trash2,
  Video,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  deleteAssetGroup,
  getAssetConfig,
  getAssetGroupDetails,
  getAssetGroups,
  importAssetByUrl,
  listAssets,
  uploadAsset,
} from './api'
import AssetDetailModal from './components/asset-detail-modal'
import AssetGroupFormModal from './components/asset-group-form-modal'
import AssetGroupList from './components/asset-group-list'
import LivenessSessionModal from './components/liveness-session-modal'
import { statusBadgeClass, statusLabel } from './status'
import type { Asset, AssetGroup } from './types'

const pageSize = 12
const allValue = 'all'

// assetTypeFromUrl detects the asset type from a filename/URL extension.
// Supported: .jpg .jpeg .png .webp -> Image; .mp4 .mov -> Video; .mp3 .wav -> Audio.
function assetTypeFromUrl(
  nameOrUrl: string
): 'Image' | 'Video' | 'Audio' | null {
  const match = nameOrUrl.toLowerCase().match(/\.([a-z0-9]+)(?:[?#].*)?$/)
  const ext = match?.[1] ?? ''
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return 'Image'
    case 'mp4':
    case 'mov':
      return 'Video'
    case 'mp3':
    case 'wav':
      return 'Audio'
    default:
      return null
  }
}

// assetTypeLabel maps an asset type code to its localized label.
function assetTypeLabel(
  type: 'Image' | 'Video' | 'Audio' | string,
  t: (key: string) => string
): string {
  if (type === 'Image') return t('图片')
  if (type === 'Video') return t('视频')
  if (type === 'Audio') return t('音频')
  return type
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}


function AssetPreview(props: { asset: Asset }) {
  const { asset } = props
  if (asset.asset_type === 'Image' && asset.url) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        className='aspect-[4/3] w-full bg-muted object-cover'
        loading='lazy'
        draggable={false}
      />
    )
  }
  if (asset.asset_type === 'Video' && asset.url) {
    return (
      <div className='relative aspect-[4/3] w-full bg-black'>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={asset.url}
          preload='metadata'
          draggable={false}
          className='h-full w-full object-cover'
        />
        <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <span className='flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm'>
            <Video className='size-4 fill-white' aria-hidden='true' />
          </span>
        </span>
      </div>
    )
  }

  let icon = <ImageIcon className='size-8' aria-hidden='true' />
  if (asset.asset_type === 'Audio') {
    icon = <Music className='size-8' aria-hidden='true' />
  }

  return (
    <div className='text-muted-foreground flex aspect-[4/3] items-center justify-center bg-muted'>
      {icon}
    </div>
  )
}

export default function AssetsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [groupType, setGroupType] = useState('AIGC')
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [assetType, setAssetType] = useState(allValue)
  const [status, setStatus] = useState(allValue)
  const [sort, setSort] = useState('created_desc')
  const [groupFormModal, setGroupFormModal] = useState<{
    open: boolean
    group?: AssetGroup
  }>({ open: false })
  const [livenessModal, setLivenessModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [uploadMode, setUploadMode] = useState<'local' | 'url'>('local')
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [urlAssetType, setUrlAssetType] = useState<'Image' | 'Video' | 'Audio'>('Image')
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groupsQuery = useQuery({
    queryKey: ['assets', 'groups', groupType],
    queryFn: () => getAssetGroups(groupType),
    refetchInterval: 30000,
  })
  const configQuery = useQuery({
    queryKey: ['assets', 'config'],
    queryFn: getAssetConfig,
  })
  const groupQuery = useQuery({
    queryKey: ['assets', 'group', selectedGroupId],
    queryFn: () => getAssetGroupDetails(selectedGroupId as number),
    enabled: selectedGroupId !== null,
  })
  const assetsQuery = useQuery({
    queryKey: [
      'assets',
      'group',
      selectedGroupId,
      'items',
      page,
      search,
      assetType,
      status,
      sort,
    ],
    queryFn: () =>
      listAssets(selectedGroupId as number, {
        p: page,
        page_size: pageSize,
        q: search,
        asset_type: assetType === allValue ? '' : assetType,
        status: status === allValue ? '' : status,
        sort,
      }),
    enabled: selectedGroupId !== null,
  })

  const groups = groupsQuery.data?.items ?? []
  const assets = assetsQuery.data?.items ?? []
  const totalPages = Math.max(
    1,
    Math.ceil((assetsQuery.data?.total ?? 0) / pageSize)
  )

  const selectGroup = useCallback(
    (groupId: number) => {
      setSelectedGroupId(groupId)
      setPage(1)
      setSearch('')
      setAssetType(allValue)
      setStatus(allValue)
      setUrlInput('')
      setUrlName('')
      setUrlAssetType('Image')
    },
    []
  )

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
  }, [queryClient])

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadAsset(selectedGroupId as number, file, setUploadProgress),
    onMutate: () => setUploadProgress(0),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['assets', 'group', selectedGroupId],
      })
      queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
      toast.success(t('Asset uploaded successfully'))
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to upload asset')
      )
    },
    onSettled: () => {
      setTimeout(() => setUploadProgress(null), 600)
    },
  })

  const urlMutation = useMutation({
    mutationFn: (vars: { url: string; name: string; asset_type: 'Image' | 'Video' | 'Audio' }) =>
      importAssetByUrl(selectedGroupId as number, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['assets', 'group', selectedGroupId],
      })
      queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
      toast.success(t('Asset imported successfully'))
      setUrlInput('')
      setUrlName('')
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to import asset')
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: number) => deleteAssetGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
      toast.success(t('Asset group deleted'))
      setDeleteTarget(null)
      if (selectedGroupId === deleteTarget) {
        setSelectedGroupId(null)
      }
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to delete asset group')
      )
    },
  })

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    setUploadingFileName(file.name.replace(/\.[^/.]+$/, ''))
    uploadMutation.mutate(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFileSelect(file)
  }

  const copyUrl = (url: string) => {
    if (!url) {
      toast.error(t('No URL available'))
      return
    }
    navigator.clipboard.writeText(url)
    toast.success(t('URL copied to clipboard'))
  }

  const extensions = configQuery.data?.extensions ?? [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.mp4',
    '.mov',
    '.mp3',
    '.wav',
  ]
  const maxSizeMb = configQuery.data
    ? Math.round(configQuery.data.max_file_bytes / 1024 / 1024)
    : 200

  if (groupsQuery.isLoading && selectedGroupId === null && groups.length === 0) {
    return (
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Assets Management')}</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='flex min-h-[400px] items-center justify-center'>
            <Spinner />
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )
  }

  return (
    <>
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>
        {t('Assets Management')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button variant='outline' size='sm' onClick={refresh}>
          <RefreshCw className='size-4' aria-hidden='true' />
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='flex h-full gap-3'>
          {/* Left panel: asset groups */}
          {sidebarOpen && (
            <aside className='bg-card flex w-64 shrink-0 flex-col rounded-lg border p-2'>
              <AssetGroupList
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={selectGroup}
                groupType={groupType}
                onGroupTypeChange={(type) => {
                  setGroupType(type)
                  setSelectedGroupId(null)
                }}
                search={groupSearch}
                onSearchChange={setGroupSearch}
                onCreateGroup={() => {
                  if (groupType === 'LivenessFace') {
                    setLivenessModal(true)
                  } else {
                    setGroupFormModal({ open: true })
                  }
                }}
              />
            </aside>
          )}

          {/* Toggle sidebar button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='mt-1 shrink-0 self-start'
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label={
                    sidebarOpen
                      ? t('Collapse sidebar')
                      : t('Expand sidebar')
                  }
                >
                  {sidebarOpen ? (
                    <PanelLeftClose
                      className='size-4'
                      aria-hidden='true'
                    />
                  ) : (
                    <PanelLeftOpen
                      className='size-4'
                      aria-hidden='true'
                    />
                  )}
                </Button>
              }
            />
            <TooltipContent>
              {sidebarOpen
                ? t('Collapse sidebar')
                : t('Expand sidebar')}
            </TooltipContent>
          </Tooltip>

          {/* Right panel: group details */}
          <section className='bg-card min-w-0 flex-1 overflow-hidden rounded-lg border'>
            {selectedGroupId === null ? (
              <div className='flex h-full items-center justify-center'>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <FolderOpen aria-hidden='true' />
                    </EmptyMedia>
                    <EmptyTitle>{t('Select an asset group')}</EmptyTitle>
                    <EmptyDescription>
                      {t(
                        'Choose a group from the left panel or create a new one.'
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className='flex h-full flex-col'>
                {/* Group header */}
                <div className='flex items-start justify-between gap-3 border-b p-3'>
                  <div className='min-w-0'>
                    <h3
                      className='truncate text-base font-semibold'
                      title={groupQuery.data?.group.name || ''}
                    >
                      {groupQuery.data?.group.name || t('Loading...')}
                    </h3>
                    <p className='text-muted-foreground truncate text-sm'>
                      {groupQuery.data?.group.description ||
                        t('No description')}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={t('Edit asset group')}
                            onClick={() =>
                              setGroupFormModal({
                                open: true,
                                group: groupQuery.data?.group,
                              })
                            }
                          >
                            <PenLine
                              className='size-4'
                              aria-hidden='true'
                            />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {t('Edit asset group')}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={t('Delete asset group')}
                            onClick={() =>
                              setDeleteTarget(selectedGroupId)
                            }
                          >
                            <Trash2
                              className='size-4'
                              aria-hidden='true'
                            />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {t('Delete asset group')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Toolbar */}
                <div className='flex flex-wrap items-center gap-2 border-b p-3'>
                  <div className='relative min-w-0 flex-1'>
                    <Input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.currentTarget.value)
                        setPage(1)
                      }}
                      placeholder={t('Search assets')}
                      aria-label={t('Search assets')}
                      className='h-8'
                    />
                  </div>
                  <Select
                    value={assetType}
                    onValueChange={(value) => {
                      setAssetType(value ?? allValue)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className='h-8 w-[120px]' aria-label={t('Asset type')}>
                      <SelectValue>
                        {(value: string) => {
                          if (!value || value === allValue) return t('All types')
                          if (value === 'Image') return t('Image')
                          if (value === 'Video') return t('Video')
                          if (value === 'Audio') return t('Audio')
                          return value
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={allValue}>{t('All types')}</SelectItem>
                      <SelectItem value='Image'>{t('Image')}</SelectItem>
                      <SelectItem value='Video'>{t('Video')}</SelectItem>
                      <SelectItem value='Audio'>{t('Audio')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value ?? allValue)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className='h-8 w-[120px]' aria-label={t('Status')}>
                      <SelectValue>
                        {(value: string) => {
                          if (!value || value === allValue) return t('All statuses')
                          return statusLabel(value, t)
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={allValue}>{t('All statuses')}</SelectItem>
                      <SelectItem value='Active'>{statusLabel('Active', t)}</SelectItem>
                      <SelectItem value='Processing'>{statusLabel('Processing', t)}</SelectItem>
                      <SelectItem value='Failed'>{statusLabel('Failed', t)}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sort}
                    onValueChange={(value) => setSort(value ?? 'created_desc')}
                  >
                    <SelectTrigger className='h-8 w-[130px]' aria-label={t('Sort')}>
                      <SelectValue>
                        {(value: string) =>
                          value === 'created_asc'
                            ? t('Oldest first')
                            : t('Newest first')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='created_desc'>
                        {t('Newest first')}
                      </SelectItem>
                      <SelectItem value='created_asc'>
                        {t('Oldest first')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={t('Refresh assets')}
                          onClick={() =>
                            queryClient.invalidateQueries({
                              queryKey: ['assets', 'group', selectedGroupId],
                            })
                          }
                        >
                          <RefreshCw
                            className='size-4'
                            aria-hidden='true'
                          />
                        </Button>
                      }
                    />
                    <TooltipContent>{t('Refresh')}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Upload zone */}
                <div className='border-b p-3'>
                  <Tabs
                    value={uploadMode}
                    onValueChange={(value) =>
                      setUploadMode(value as 'local' | 'url')
                    }
                  >
                    <TabsList className='mb-2'>
                      <TabsTrigger value='local'>
                        <CloudUpload className='size-3.5' aria-hidden='true' />
                        {t('Local File')}
                      </TabsTrigger>
                      <TabsTrigger value='url'>
                        <Link2 className='size-3.5' aria-hidden='true' />
                        {t('Public URL')}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value='local'>
                      <div
                        role='presentation'
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOver(true)
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-6 transition-colors ${
                          dragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <CloudUpload
                          className='text-muted-foreground size-6'
                          aria-hidden='true'
                        />
                        <div className='text-center'>
                          <strong className='text-sm'>
                            {t('Drag and drop files here to upload')}
                          </strong>
                          <p className='text-muted-foreground text-xs'>
                            {extensions.join(' · ')} ·{' '}
                            {t('Max {{size}} MB each', { size: maxSizeMb })}
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type='file'
                          accept={extensions.join(',')}
                          className='hidden'
                          onChange={(e) =>
                            handleFileSelect(e.target.files?.[0])
                          }
                        />
                      </div>
                      {uploadMutation.isPending && (
                        <div className='mt-2 space-y-1'>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-muted-foreground max-w-[80%] truncate'>
                              {uploadingFileName}
                            </span>
                            <span className='text-muted-foreground tabular-nums'>
                              {uploadProgress !== null ? `${uploadProgress}%` : ''}
                            </span>
                          </div>
                          <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
                            <div
                              className='h-full rounded-full bg-primary transition-[width] duration-200'
                              style={{ width: `${uploadProgress ?? 0}%` }}
                              role='progressbar'
                              aria-valuenow={uploadProgress ?? 0}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value='url'>
                      <div className='space-y-3 rounded-lg border-2 border-dashed border-border p-4'>
                        {/* Header: icon + title + supported formats */}
                        <div className='flex items-start gap-2'>
                          <Link2
                            className='text-muted-foreground mt-0.5 size-5 shrink-0'
                            aria-hidden='true'
                          />
                          <div className='min-w-0'>
                            <strong className='block text-sm'>
                              {t('通过公网 Public URL 导入素材')}
                            </strong>
                            <small className='text-muted-foreground block text-xs'>
                              {t(
                                '.jpg、.jpeg、.png、.webp、.mp4、.mov、.mp3、.wav · 需公网可访问 · 每次 1 个'
                              )}
                            </small>
                          </div>
                        </div>

                        {/* Public URL (full width) */}
                        <div>
                          <label className='text-muted-foreground mb-1 block text-xs'>
                            {t('Public URL')}
                          </label>
                          <Input
                            value={urlInput}
                            onChange={(e) => {
                              const val = e.currentTarget.value
                              setUrlInput(val)
                              // Auto-fill name + asset type from URL path when possible
                              if (val.trim()) {
                                try {
                                  const pathname = new URL(val.trim()).pathname
                                  const base = pathname.split('/').filter(Boolean).pop() ?? ''
                                  const nameFromUrl = base.replace(/\.[^/.]+$/, '')
                                  if (nameFromUrl) setUrlName(nameFromUrl)
                                  const detected = assetTypeFromUrl(base)
                                  if (detected) setUrlAssetType(detected)
                                } catch {
                                  // not a valid URL yet
                                }
                              }
                            }}
                            placeholder='https://example.com/image.png'
                            aria-label={t('Public URL')}
                            disabled={urlMutation.isPending}
                          />
                        </div>

                        {/* Name + Asset Type (read-only, auto-detected) row */}
                        <div className='grid grid-cols-[1fr_8rem] gap-2'>
                          <div>
                            <label className='text-muted-foreground mb-1 block text-xs'>
                              {t('素材名称')}
                            </label>
                            <Input
                              value={urlName}
                              onChange={(e) => setUrlName(e.currentTarget.value)}
                              placeholder={t('将根据 URL 自动填充，可修改')}
                              maxLength={64}
                              aria-label={t('素材名称')}
                              disabled={urlMutation.isPending}
                            />
                          </div>
                          <div>
                            <label className='text-muted-foreground mb-1 block text-xs'>
                              {t('素材类型')}
                            </label>
                            <div className='border-input bg-muted/40 text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm'>
                              {urlInput.trim() && assetTypeFromUrl(urlInput.trim())
                                ? assetTypeLabel(urlAssetType, t)
                                : t('粘贴 URL 后自动识别')}
                            </div>
                          </div>
                        </div>

                        {/* Actions: hint + submit */}
                        <div className='flex items-center justify-between gap-3'>
                          <span className='text-muted-foreground text-xs'>
                            {t('后台将直接抓取该公网地址，无需本地下载')}
                          </span>
                          <Button
                            onClick={() => {
                              const url = urlInput.trim()
                              const name = urlName.trim()
                              if (!url) {
                                toast.error(t('Please enter a URL'))
                                return
                              }
                              if (!name) {
                                toast.error(t('请输入素材名称'))
                                return
                              }
                              urlMutation.mutate({ url, name, asset_type: urlAssetType })
                            }}
                            disabled={
                              urlMutation.isPending || !urlInput.trim() || !urlName.trim()
                            }
                          >
                            {urlMutation.isPending ? (
                              <Spinner className='size-4' />
                            ) : null}
                            {t('提交 URL')}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Gallery */}
                <div className='min-h-0 flex-1 overflow-y-auto p-3'>
                  {(groupQuery.isLoading || assetsQuery.isLoading) && (
                    <div className='flex min-h-[200px] items-center justify-center'>
                      <Spinner />
                    </div>
                  )}

                  {(groupQuery.error || assetsQuery.error) && (
                    <div className='text-destructive flex items-center gap-2 py-4 text-sm'>
                      <AlertCircle className='size-5' aria-hidden='true' />
                      {t('Failed to load assets')}
                    </div>
                  )}

                  {!assetsQuery.isLoading &&
                    !assetsQuery.error &&
                    assets.length === 0 && (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant='icon'>
                            <FolderOpen aria-hidden='true' />
                          </EmptyMedia>
                          <EmptyTitle>
                            {t('No assets in this group')}
                          </EmptyTitle>
                          <EmptyDescription>
                            {t('Upload or import assets to get started.')}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}

                  {!assetsQuery.isLoading && assets.length > 0 && (
                    <div className='grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'>
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          role='button'
                          tabIndex={0}
                          aria-label={asset.name}
                          onClick={() => setSelectedAsset(asset)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedAsset(asset)
                            }
                          }}
                          className='group cursor-pointer overflow-hidden rounded-lg border transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        >
                          <div className='relative'>
                            <AssetPreview asset={asset} />
                            <div className='absolute inset-0 flex items-start justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100'>
                              {asset.url && (
                                <Button
                                  variant='default'
                                  size='icon-sm'
                                  aria-label={t('Copy URL')}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyUrl(asset.url)
                                  }}
                                >
                                  <Copy className='size-3.5' aria-hidden='true' />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant='default'
                                      size='icon-sm'
                                      aria-label={t('More actions')}
                                    >
                                      <MoreHorizontal
                                        className='size-4'
                                        aria-hidden='true'
                                      />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuItem
                                    onClick={() => copyUrl(asset.url)}
                                  >
                                    <Copy className='size-4' aria-hidden='true' />
                                    {t('Copy URL')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className='space-y-1 p-2'>
                            <p
                              className='truncate text-sm font-medium'
                              title={asset.name}
                            >
                              {asset.name}
                            </p>
                            <div className='flex items-center gap-1.5'>
                              <Badge className={statusBadgeClass(asset.status)}>
                                {statusLabel(asset.status, t)}
                              </Badge>
                              <span className='text-muted-foreground text-xs'>
                                {t(asset.asset_type)}
                              </span>
                              {asset.size > 0 && (
                                <>
                                  <span
                                    className='text-muted-foreground text-xs'
                                    aria-hidden='true'
                                  >
                                    ·
                                  </span>
                                  <span className='text-muted-foreground text-xs'>
                                    {formatBytes(asset.size)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='border-t p-2'>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href='#'
                            text={t('Previous')}
                            aria-disabled={page <= 1}
                            onClick={(e) => {
                              e.preventDefault()
                              if (page > 1) setPage(page - 1)
                            }}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className='px-3 text-sm'>
                            {t('Page {{page}} of {{total}}', {
                              page,
                              total: totalPages,
                            })}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href='#'
                            text={t('Next')}
                            aria-disabled={page >= totalPages}
                            onClick={(e) => {
                              e.preventDefault()
                              if (page < totalPages) setPage(page + 1)
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>

    {/* Create / edit group modal — must be OUTSIDE SectionPageLayout */}
    <AssetGroupFormModal
      isOpen={groupFormModal.open}
      onClose={() => setGroupFormModal({ open: false })}
      group={groupFormModal.group}
      defaultGroupType={groupType}
    />

    <LivenessSessionModal
      open={livenessModal}
      onClose={() => setLivenessModal(false)}
      onSynced={(groups, newGroups) => {
        setLivenessModal(false)
        queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
        if (newGroups.length > 0) setSelectedGroupId(newGroups[0].id)
        else if (groups.length > 0) setSelectedGroupId(groups[0].id)
      }}
    />

    {selectedAsset && (
      <AssetDetailModal
        asset={selectedAsset}
        groupId={selectedGroupId as number}
        onClose={() => setSelectedAsset(null)}
        onDeleted={() => {
          setSelectedAsset(null)
          queryClient.invalidateQueries({
            queryKey: ['assets', 'group', selectedGroupId],
          })
          queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
        }}
        onUpdated={(updated) => {
          setSelectedAsset(updated)
          queryClient.invalidateQueries({
            queryKey: ['assets', 'group', selectedGroupId],
          })
        }}
      />
    )}

    {/* Delete confirmation dialog */}
    <Dialog
      open={deleteTarget !== null}
      onOpenChange={(open) => !open && setDeleteTarget(null)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Delete Asset Group')}</DialogTitle>
          <DialogDescription>
            {t(
              'Are you sure you want to delete this asset group? This action cannot be undone.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => setDeleteTarget(null)}
            disabled={deleteMutation.isPending}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant='destructive'
            onClick={() =>
              deleteTarget && deleteMutation.mutate(deleteTarget)
            }
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Spinner className='mr-2' /> : null}
            {t('Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
