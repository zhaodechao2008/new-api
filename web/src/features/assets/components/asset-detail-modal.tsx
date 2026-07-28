import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Music, Pencil, Trash2, Video, X } from 'lucide-react'
import { Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'

import { deleteAsset, updateAsset } from '../api'
import { statusBadgeClass, statusLabel } from '../status'
import type { Asset } from '../types'

interface AssetDetailModalProps {
  asset: Asset | null
  groupId: number
  onClose: () => void
  onDeleted: (assetId: number) => void
  onUpdated: (asset: Asset) => void
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString()
}

function AssetPreview({ asset }: { asset: Asset }) {
  if (asset.asset_type === 'Image' && asset.url) {
    return (
      <img
        src={asset.url}
        alt={asset.name}
        className='w-full bg-muted object-contain'
        style={{ maxHeight: 320 }}
      />
    )
  }
  if (asset.asset_type === 'Video' && asset.url) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={asset.url}
        controls
        className='w-full bg-black'
        style={{ maxHeight: 320 }}
      />
    )
  }
  if (asset.asset_type === 'Audio' && asset.url) {
    return (
      <div className='flex flex-col items-center gap-3 bg-muted px-6 py-8'>
        <Music className='text-muted-foreground size-12' aria-hidden='true' />
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={asset.url} controls className='w-full' />
      </div>
    )
  }

  const icon =
    asset.asset_type === 'Video' ? (
      <Video className='size-12' aria-hidden='true' />
    ) : asset.asset_type === 'Audio' ? (
      <Music className='size-12' aria-hidden='true' />
    ) : (
      <ImageIcon className='size-12' aria-hidden='true' />
    )

  return (
    <div className='text-muted-foreground flex h-40 items-center justify-center bg-muted'>
      {icon}
    </div>
  )
}

export default function AssetDetailModal({
  asset,
  groupId,
  onClose,
  onDeleted,
  onUpdated,
}: AssetDetailModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (asset) {
      setNameInput(asset.name)
      setEditingName(false)
      setConfirmDelete(false)
    }
  }, [asset])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateAsset(groupId, asset!.id, { name }),
    onSuccess: () => {
      toast.success(t('Asset renamed'))
      setEditingName(false)
      onUpdated({ ...asset!, name: nameInput.trim() })
      queryClient.invalidateQueries({ queryKey: ['assets', 'group', groupId] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('Failed to rename asset'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(groupId, asset!.id),
    onSuccess: () => {
      toast.success(t('Asset deleted'))
      onDeleted(asset!.id)
      queryClient.invalidateQueries({ queryKey: ['assets', 'group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
      onClose()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('Failed to delete asset'))
      setConfirmDelete(false)
    },
  })

  const submitRename = () => {
    const name = nameInput.trim()
    if (!name || name === asset?.name) {
      setEditingName(false)
      setNameInput(asset?.name ?? '')
      return
    }
    renameMutation.mutate(name)
  }

  const copyUrl = () => {
    if (!asset?.url) {
      toast.error(t('No URL available'))
      return
    }
    navigator.clipboard.writeText(asset.url)
    toast.success(t('URL copied to clipboard'))
  }

  return (
    <Sheet open={!!asset} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 p-0 sm:max-w-lg'
        showCloseButton={false}
      >
        <SheetHeader className='flex-row items-center justify-between border-b px-4 py-3'>
          <SheetTitle className='text-base'>{t('素材详情')}</SheetTitle>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={onClose}
            aria-label={t('Close')}
          >
            <X className='size-4' />
          </Button>
        </SheetHeader>

        {asset && (
          <div className='flex flex-1 flex-col overflow-y-auto'>
            {/* Media preview */}
            <div className='bg-muted/30 border-b'>
              <AssetPreview asset={asset} />
            </div>

            {/* Name + actions */}
            <div className='flex items-start justify-between gap-3 border-b px-4 py-3'>
              <div className='min-w-0 flex-1'>
                {editingName ? (
                  <div className='flex items-center gap-1.5'>
                    <Input
                      ref={nameInputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename()
                        if (e.key === 'Escape') {
                          setEditingName(false)
                          setNameInput(asset.name)
                        }
                      }}
                      disabled={renameMutation.isPending}
                      className='h-7 text-sm'
                    />
                    <Button
                      size='icon-sm'
                      variant='ghost'
                      onClick={submitRename}
                      disabled={renameMutation.isPending}
                      aria-label={t('Save name')}
                    >
                      {renameMutation.isPending ? (
                        <Spinner className='size-3.5' />
                      ) : (
                        <Check className='size-3.5' />
                      )}
                    </Button>
                    <Button
                      size='icon-sm'
                      variant='ghost'
                      onClick={() => {
                        setEditingName(false)
                        setNameInput(asset.name)
                      }}
                      disabled={renameMutation.isPending}
                      aria-label={t('Cancel')}
                    >
                      <X className='size-3.5' />
                    </Button>
                  </div>
                ) : (
                  <h4
                    className='truncate font-semibold'
                    title={asset.name}
                  >
                    {asset.name}
                  </h4>
                )}
                <Badge className={`mt-1 ${statusBadgeClass(asset.status)}`}>
                  {statusLabel(asset.status, t)}
                </Badge>
              </div>
              {!editingName && (
                <div className='flex shrink-0 items-center gap-1'>
                  <Button
                    size='icon-sm'
                    variant='ghost'
                    onClick={copyUrl}
                    disabled={!asset.url}
                    aria-label={t('Copy URL')}
                  >
                    <Copy className='size-4' />
                  </Button>
                  <Button
                    size='icon-sm'
                    variant='ghost'
                    onClick={() => setEditingName(true)}
                    aria-label={t('Rename asset')}
                  >
                    <Pencil className='size-4' />
                  </Button>
                  <Button
                    size='icon-sm'
                    variant='ghost'
                    className='text-destructive hover:text-destructive'
                    onClick={() => setConfirmDelete(true)}
                    aria-label={t('Delete asset')}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              )}
            </div>

            {/* Metadata */}
            <dl className='divide-y text-sm'>
              <div className='px-4 py-2.5'>
                <dt className='text-muted-foreground mb-0.5 text-xs'>{t('素材类型')}</dt>
                <dd>{t(asset.asset_type)}</dd>
              </div>
              {asset.size > 0 && (
                <div className='px-4 py-2.5'>
                  <dt className='text-muted-foreground mb-0.5 text-xs'>{t('文件大小')}</dt>
                  <dd>{formatBytes(asset.size)}</dd>
                </div>
              )}
              {asset.mime_type && (
                <div className='px-4 py-2.5'>
                  <dt className='text-muted-foreground mb-0.5 text-xs'>{t('文件格式')}</dt>
                  <dd className='font-mono text-xs'>{asset.mime_type}</dd>
                </div>
              )}
              <div className='px-4 py-2.5'>
                <dt className='text-muted-foreground mb-0.5 text-xs'>{t('创建时间')}</dt>
                <dd className='text-xs'>{formatDate(asset.created_time)}</dd>
              </div>
              {asset.updated_time > 0 && (
                <div className='px-4 py-2.5'>
                  <dt className='text-muted-foreground mb-0.5 text-xs'>{t('更新时间')}</dt>
                  <dd className='text-xs'>{formatDate(asset.updated_time)}</dd>
                </div>
              )}
              {asset.url && (
                <div className='px-4 py-2.5'>
                  <dt className='text-muted-foreground mb-0.5 text-xs'>{t('素材地址')}</dt>
                  <dd className='min-w-0'>
                    <span
                      className='block break-all text-xs text-blue-600 dark:text-blue-400'
                      title={asset.url}
                    >
                      {asset.url}
                    </span>
                  </dd>
                </div>
              )}
            </dl>

            {/* Delete confirmation inline */}
            {confirmDelete && (
              <div className='m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4'>
                <p className='mb-3 text-sm font-medium text-destructive'>
                  {t('Are you sure you want to delete this asset? This action cannot be undone.')}
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending && <Spinner className='mr-1.5 size-3.5' />}
                    {t('Delete')}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleteMutation.isPending}
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

