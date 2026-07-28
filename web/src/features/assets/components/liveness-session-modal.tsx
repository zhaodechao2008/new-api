import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

import { createLivenessSession, syncLivenessGroups } from '../api'
import type { AssetGroup } from '../types'

interface LivenessSessionModalProps {
  open: boolean
  onClose: () => void
  onSynced: (groups: AssetGroup[], newGroups: AssetGroup[]) => void
}

const STEPS = [
  { title: '手机扫码', desc: '使用手机扫描下方二维码' },
  { title: '完成验证', desc: '在手机端完成人脸验证，并填写真人素材组名称' },
  { title: '同步素材组', desc: '验证完成后返回此处，点击“我已完成认证，立即同步”' },
] as const

export default function LivenessSessionModal({
  open,
  onClose,
  onSynced,
}: LivenessSessionModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState(0)

  const sessionQuery = useQuery({
    queryKey: ['assets', 'liveness', 'session'],
    queryFn: createLivenessSession,
    enabled: false,
    retry: false,
  })

  const syncMutation = useMutation({
    mutationFn: syncLivenessGroups,
    onSuccess: (result) => {
      toast.success(t('真人素材同步成功'))
      onSynced(result?.groups ?? [], result?.new_groups ?? [])
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

  // Reset countdown whenever a fresh session arrives.
  useEffect(() => {
    if (sessionQuery.data?.expiresIn) {
      setRemaining(sessionQuery.data.expiresIn)
    }
  }, [sessionQuery.data?.expiresIn])

  // Tick the countdown down to zero.
  useEffect(() => {
    if (remaining <= 0) return
    const timer = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [remaining])

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
      <DialogContent className='max-w-md sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('新建真人素材组')}</DialogTitle>
          <DialogDescription>
            {t(
              '真人素材组需要通过真人人像认证创建。认证期间请保留此窗口，完成后会同步生成一个新的真人素材组。'
            )}
          </DialogDescription>
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
          <div className='w-full min-w-0 space-y-4'>
            {/* Steps with numbered circles + connecting line */}
            <ol className='space-y-0'>
              {STEPS.map((step, i) => (
                <li key={step.title} className='flex gap-3'>
                  <div className='flex flex-col items-center'>
                    <span className='bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className='bg-primary/30 my-0.5 w-px flex-1' />
                    )}
                  </div>
                  <div className='pb-3'>
                    <p className='text-sm font-medium'>{t(step.title)}</p>
                    <p className='text-muted-foreground text-xs'>
                      {t(step.desc)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* QR Code (generated from h5Link; qrDataUrl fallback) */}
            <div className='flex justify-center'>
              <div className='rounded-lg border bg-white p-3'>
                {sessionQuery.data.h5Link ? (
                  <QRCodeSVG
                    value={sessionQuery.data.h5Link}
                    size={200}
                    level='M'
                    className='block size-[200px]'
                  />
                ) : sessionQuery.data.qrDataUrl ? (
                  <img
                    src={sessionQuery.data.qrDataUrl}
                    alt='QR Code'
                    width={200}
                    height={200}
                    className='block size-[200px]'
                  />
                ) : (
                  <div className='text-muted-foreground flex size-[200px] items-center justify-center text-xs'>
                    {t('二维码生成失败')}
                  </div>
                )}
              </div>
            </div>

            {/* Expiry countdown row */}
            <div className='bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm'>
              <span className='text-muted-foreground'>{t('链接有效期')}</span>
              <span
                className={
                  remaining <= 10 && remaining > 0
                    ? 'text-destructive font-semibold tabular-nums'
                    : 'font-semibold tabular-nums'
                }
              >
                {remaining > 0
                  ? t('{{seconds}} 秒', { seconds: remaining })
                  : t('已过期')}
              </span>
            </div>

            {/* H5 link + copy */}
            <div className='flex w-full min-w-0 gap-2'>
              <a
                href={sessionQuery.data.h5Link}
                target='_blank'
                rel='noopener noreferrer'
                className='bg-muted/40 min-w-0 flex-1 truncate rounded-md border px-3 py-2 text-xs text-blue-500 underline'
                title={sessionQuery.data.h5Link}
              >
                {sessionQuery.data.h5Link}
              </a>
              <Button
                size='icon'
                variant='outline'
                className='shrink-0'
                onClick={copyLink}
                aria-label={copied ? t('已复制') : t('复制链接')}
                title={copied ? t('已复制') : t('复制链接')}
              >
                <Copy className='size-4' aria-hidden='true' />
              </Button>
            </div>

            {/* Actions: regenerate + sync */}
            <div className='flex gap-2'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={regenerate}
                disabled={sessionQuery.isFetching}
              >
                {sessionQuery.isFetching ? (
                  <Spinner className='mr-1 size-4' />
                ) : (
                  <RefreshCw className='mr-1 size-4' aria-hidden='true' />
                )}
                {t('重新生成')}
              </Button>
              <Button
                className='flex-1'
                onClick={() => syncMutation.mutate(sessionQuery.data?.bytedToken)}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Spinner className='mr-1 size-4' />
                ) : null}
                {t('我已完成认证，立即同步')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
