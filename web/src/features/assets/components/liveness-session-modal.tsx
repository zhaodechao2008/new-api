import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

import { createLivenessSession, syncLivenessGroups } from '../api'
import type { AssetGroup } from '../types'

interface LivenessSessionModalProps {
  open: boolean
  onClose: () => void
  onSynced: (group: AssetGroup | null) => void
}

export default function LivenessSessionModal({
  open,
  onClose,
  onSynced,
}: LivenessSessionModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['assets', 'liveness', 'session'],
    queryFn: createLivenessSession,
    enabled: false,
    retry: false,
  })

  const syncMutation = useMutation({
    mutationFn: syncLivenessGroups,
    onSuccess: (group) => {
      toast.success(t('真人素材同步成功'))
      onSynced(group)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('同步失败，请重试'))
    },
  })

  // Fetch session when modal opens
  useEffect(() => {
    if (open) {
      sessionQuery.refetch()
    }
  }, [open])

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      queryClient.removeQueries({ queryKey: ['assets', 'liveness', 'session'] })
      setCopied(false)
      onClose()
    }
  }

  const copyLink = () => {
    if (!sessionQuery.data?.h5Link) return
    navigator.clipboard.writeText(sessionQuery.data.h5Link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerate = () => {
    sessionQuery.refetch()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>{t('新建真人素材组')}</DialogTitle>
        </DialogHeader>

        {sessionQuery.isLoading && (
          <div className='flex flex-col items-center gap-3 py-8'>
            <Spinner />
            <p className='text-muted-foreground text-sm'>
              {t('正在创建授权会话...')}
            </p>
          </div>
        )}

        {sessionQuery.error && !sessionQuery.isLoading && (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='text-destructive text-sm'>
              {t('创建会话失败，请重试')}
            </p>
            <Button size='sm' onClick={regenerate}>
              {t('重新生成')}
            </Button>
          </div>
        )}

        {sessionQuery.data && !sessionQuery.isLoading && (
          <div className='space-y-4'>
            {/* QR Code from qrDataUrl (base64 PNG from ecloud) */}
            <div className='flex flex-col items-center gap-3'>
              <p className='text-muted-foreground text-center text-xs'>
                {t('使用手机扫码完成真人认证')}
              </p>
              <div className='relative rounded-lg border p-2'>
                <img
                  src={sessionQuery.data.qrDataUrl}
                  alt='QR Code'
                  width={180}
                  height={180}
                  className='block size-[180px]'
                />
                {/* Expiry badge overlay */}
                {sessionQuery.data.expiresAt && (
                  <div className='absolute -top-2 -right-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
                    {t('{{minutes}}分钟', {
                      minutes: Math.floor(sessionQuery.data.expiresIn / 60),
                    })}
                  </div>
                )}
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={regenerate}
                disabled={sessionQuery.isFetching}
              >
                {sessionQuery.isFetching ? (
                  <Spinner className='size-3.5' />
                ) : null}
                {t('重新生成')}
              </Button>
            </div>

            {/* Steps */}
            <ol className='list-inside list-decimal space-y-1 rounded-lg border bg-muted/30 p-3 text-sm'>
              <li>
                <span className='font-medium'>{t('手机扫码')}</span>
                <span className='text-muted-foreground text-xs'>
                  {' '}&mdash; {t('使用微信扫码')}
                </span>
              </li>
              <li>
                <span className='font-medium'>{t('开始认证')}</span>
                <span className='text-muted-foreground text-xs'>
                  {' '}&mdash; {t('完成人脸验证')}
                </span>
              </li>
              <li>
                <span className='font-medium'>{t('同步素材')}</span>
                <span className='text-muted-foreground text-xs'>
                  {' '}&mdash; {t('认证成功自动同步')}
                </span>
              </li>
            </ol>

            {/* H5 link */}
            <div className='space-y-1'>
              <p className='text-muted-foreground text-xs'>{t('授权链接（可复制到浏览器）')}</p>
              <div className='flex gap-2'>
                <a
                  href={sessionQuery.data.h5Link}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='min-w-0 flex-1 truncate text-xs text-blue-500 underline'
                  title={sessionQuery.data.h5Link}
                >
                  {sessionQuery.data.h5Link}
                </a>
                <Button size='sm' variant='outline' onClick={copyLink}>
                  {copied ? t('已复制') : t('复制链接')}
                </Button>
              </div>
            </div>

            {/* Sync button */}
            <Button
              className='w-full'
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Spinner className='mr-2' />
              ) : null}
              {t('我已完成认证，同步素材')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
