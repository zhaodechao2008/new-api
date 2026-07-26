import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  FolderOpen,
  Image as ImageIcon,
  Music,
  RefreshCw,
  Video,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  getAssetConfig,
  getAssetGroupDetails,
  getAssetGroups,
  listAssets,
} from './api'
import AssetGroupList from './components/asset-group-list'
import type { Asset } from './types'

const pageSize = 12
const allValue = 'all'

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function getStatusVariant(status: string) {
  if (status === 'Failed') return 'destructive' as const
  if (status === 'Processing') return 'secondary' as const
  return 'outline' as const
}

function AssetPreview(props: { asset: Asset }) {
  if (props.asset.asset_type === 'Image' && props.asset.url) {
    return (
      <img
        src={props.asset.url}
        alt={props.asset.name}
        className='aspect-video w-full bg-muted object-cover'
        loading='lazy'
      />
    )
  }

  let icon = <ImageIcon className='size-10' aria-hidden='true' />
  if (props.asset.asset_type === 'Video') {
    icon = <Video className='size-10' aria-hidden='true' />
  } else if (props.asset.asset_type === 'Audio') {
    icon = <Music className='size-10' aria-hidden='true' />
  }

  return (
    <div className='text-muted-foreground flex aspect-video items-center justify-center bg-muted'>
      {icon}
    </div>
  )
}

export default function AssetsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [assetType, setAssetType] = useState(allValue)
  const [status, setStatus] = useState(allValue)

  const groupsQuery = useQuery({
    queryKey: ['assets', 'groups'],
    queryFn: getAssetGroups,
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
    ],
    queryFn: () =>
      listAssets(selectedGroupId as number, {
        p: page,
        page_size: pageSize,
        q: search,
        asset_type: assetType === allValue ? '' : assetType,
        status: status === allValue ? '' : status,
        sort: 'created_desc',
      }),
    enabled: selectedGroupId !== null,
  })

  const groups = groupsQuery.data?.items ?? []
  const assets = assetsQuery.data?.items ?? []
  const totalPages = Math.max(
    1,
    Math.ceil((assetsQuery.data?.total ?? 0) / pageSize)
  )

  const selectGroup = (groupId: number) => {
    setSelectedGroupId(groupId)
    setPage(1)
    setSearch('')
    setAssetType(allValue)
    setStatus(allValue)
  }

  const backToGroups = () => {
    setSelectedGroupId(null)
    setPage(1)
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
  }

  if (groupsQuery.isLoading && selectedGroupId === null) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Spinner />
      </div>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {selectedGroupId === null ? t('Assets Management') : t('Asset Group')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button variant='outline' size='sm' onClick={refresh}>
          <RefreshCw className='size-4' aria-hidden='true' />
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='space-y-5'>
          {selectedGroupId === null ? (
            <>
              {configQuery.data && (
                <div className='border-border flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-3 text-sm'>
                  <span>
                    {t('Extensions: {{extensions}}', {
                      extensions: configQuery.data.extensions.join(', '),
                    })}
                  </span>
                  <span>
                    {t('Maximum file size: {{size}} MB', {
                      size: Math.round(
                        configQuery.data.max_file_bytes / 1024 / 1024
                      ),
                    })}
                  </span>
                  <span>
                    {t('Maximum batch files: {{count}}', {
                      count: configQuery.data.max_batch_files,
                    })}
                  </span>
                  <Badge variant='outline'>
                    {configQuery.data.liveness_enabled
                      ? t('Liveness enabled')
                      : t('Liveness disabled')}
                  </Badge>
                </div>
              )}

              {groupsQuery.error ? (
                <Card>
                  <CardContent className='text-destructive flex items-center gap-2'>
                    <AlertCircle className='size-5' aria-hidden='true' />
                    {t('Failed to load asset groups')}
                  </CardContent>
                </Card>
              ) : (
                <AssetGroupList groups={groups} onSelectGroup={selectGroup} />
              )}
            </>
          ) : (
            <div className='space-y-5'>
              <div className='flex flex-wrap items-center gap-3'>
                <Button variant='ghost' size='sm' onClick={backToGroups}>
                  <ArrowLeft className='size-4' aria-hidden='true' />
                  {t('Back')}
                </Button>
                <div className='min-w-0'>
                  <h2 className='truncate text-base font-medium'>
                    {groupQuery.data?.group.name || t('Asset Group')}
                  </h2>
                  {groupQuery.data?.group.project_name && (
                    <p className='text-muted-foreground text-sm'>
                      {groupQuery.data.group.project_name}
                    </p>
                  )}
                </div>
                {groupQuery.data?.group.group_type && (
                  <Badge variant='secondary'>
                    {groupQuery.data.group.group_type}
                  </Badge>
                )}
              </div>

              <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]'>
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value)
                    setPage(1)
                  }}
                  placeholder={t('Search assets')}
                  aria-label={t('Search assets')}
                />
                <Select
                  value={assetType}
                  onValueChange={(value) => {
                    setAssetType(value ?? allValue)
                    setPage(1)
                  }}
                >
                  <SelectTrigger aria-label={t('Asset type')}>
                    <SelectValue />
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
                  <SelectTrigger aria-label={t('Status')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={allValue}>{t('All statuses')}</SelectItem>
                    <SelectItem value='Active'>{t('Active')}</SelectItem>
                    <SelectItem value='Processing'>{t('Processing')}</SelectItem>
                    <SelectItem value='Failed'>{t('Failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(groupQuery.isLoading || assetsQuery.isLoading) && (
                <div className='flex min-h-[240px] items-center justify-center'>
                  <Spinner />
                </div>
              )}

              {(groupQuery.error || assetsQuery.error) && (
                <Card>
                  <CardContent className='text-destructive flex items-center gap-2'>
                    <AlertCircle className='size-5' aria-hidden='true' />
                    {t('Failed to load assets')}
                  </CardContent>
                </Card>
              )}

              {!assetsQuery.isLoading && !assetsQuery.error && assets.length === 0 && (
                <Empty className='border'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <FolderOpen aria-hidden='true' />
                    </EmptyMedia>
                    <EmptyTitle>{t('No assets in this group')}</EmptyTitle>
                    <EmptyDescription>
                      {t('Try changing the search or filters.')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              {!assetsQuery.isLoading && assets.length > 0 && (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {assets.map((asset) => (
                    <Card key={asset.id} className='gap-3 py-0 pb-4'>
                      <AssetPreview asset={asset} />
                      <CardHeader>
                        <CardTitle className='truncate' title={asset.name}>
                          {asset.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-2'>
                        <div className='flex items-center justify-between gap-3'>
                          <Badge variant={getStatusVariant(asset.status)}>
                            {t(asset.status)}
                          </Badge>
                          <span className='text-muted-foreground text-xs'>
                            {formatBytes(asset.size)}
                          </span>
                        </div>
                        <p className='text-muted-foreground truncate text-xs'>
                          {asset.mime_type}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href='#'
                        text={t('Previous')}
                        aria-disabled={page <= 1}
                        onClick={(event) => {
                          event.preventDefault()
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
                        onClick={(event) => {
                          event.preventDefault()
                          if (page < totalPages) setPage(page + 1)
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
