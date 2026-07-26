import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import type { AssetGroup } from '../types'

interface AssetImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (url: string, type: string, groupId?: string) => Promise<void>
  groups: AssetGroup[]
  defaultGroupId?: string
}

export default function AssetImportModal({
  isOpen,
  onClose,
  onImport,
  groups,
  defaultGroupId,
}: AssetImportModalProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [fileType, setFileType] = useState('image')
  const [selectedGroup, setSelectedGroup] = useState<string>(
    defaultGroupId || ''
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(defaultGroupId || '')
    }
  }, [defaultGroupId, isOpen])

  const fileTypeOptions = [
    { label: t('图片'), id: 'image' },
    { label: t('视频'), id: 'video' },
    { label: t('音频'), id: 'audio' },
  ]

  const handleImport = async () => {
    if (!url.trim()) {
      alert(t('请输入URL'))
      return
    }

    setIsLoading(true)
    try {
      await onImport(url, fileType, selectedGroup || undefined)
      setUrl('')
      setFileType('image')
      setSelectedGroup('')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('导入素材')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* URL输入 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('素材URL')}</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              placeholder='https://...'
              disabled={isLoading}
            />
          </div>

          {/* 文件类型 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('文件类型')}</label>
            <Select
              value={fileType}
              onValueChange={(value) => {
                if (value) setFileType(value)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fileTypeOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 选择分组（可选） */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('所属分组')}</label>
            <Select
              value={selectedGroup}
              onValueChange={(value) => setSelectedGroup(value || '')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('可选，不选择时将创建新分组')} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isLoading}>
            {t('取消')}
          </Button>
          <Button onClick={handleImport} disabled={isLoading || !url.trim()}>
            {t('导入')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
