import { Upload } from 'lucide-react'
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

import type { AssetGroup } from '../types'

interface AssetUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (groupId: string, file: File) => Promise<void>
  groups: AssetGroup[]
  defaultGroupId?: string
}

export default function AssetUploadModal({
  isOpen,
  onClose,
  onUpload,
  groups,
  defaultGroupId,
}: AssetUploadModalProps) {
  const { t } = useTranslation()
  const [selectedGroup, setSelectedGroup] = useState<string>(
    defaultGroupId || ''
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(defaultGroupId || '')
    }
  }, [defaultGroupId, isOpen])

  const handleUpload = async () => {
    if (!selectedGroup || !selectedFile) {
      alert(t('请选择分组并选择文件'))
      return
    }

    setIsLoading(true)
    try {
      await onUpload(selectedGroup, selectedFile)
      setSelectedFile(null)
      setSelectedGroup('')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('上传素材')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* 选择分组 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('选择分组')}</label>
            <Select
              value={selectedGroup}
              onValueChange={(value) => setSelectedGroup(value || '')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('选择素材分组')} />
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

          {/* 文件上传 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('选择文件')}</label>
            <div className='border-input rounded-lg border p-4 text-center'>
              <input
                type='file'
                id='file-upload'
                className='hidden'
                onChange={handleFileChange}
              />
              <label
                htmlFor='file-upload'
                className='flex cursor-pointer flex-col items-center gap-2'
              >
                <Upload className='text-muted-foreground h-8 w-8' />
                <span className='text-muted-foreground text-sm'>
                  {selectedFile ? selectedFile.name : t('点击选择文件')}
                </span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isLoading}>
            {t('取消')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isLoading || !selectedGroup || !selectedFile}
          >
            {isLoading ? <Spinner className='mr-2' /> : null}
            {t('上传')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
