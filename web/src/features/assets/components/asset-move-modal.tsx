import { useState } from 'react'
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

import type { AssetGroup } from '../types'

interface AssetMoveModalProps {
  isOpen: boolean
  onClose: () => void
  onMove: (targetGroupId: string) => Promise<void>
  groups: AssetGroup[]
  currentGroupId?: string
}

export default function AssetMoveModal({
  isOpen,
  onClose,
  onMove,
  groups,
  currentGroupId,
}: AssetMoveModalProps) {
  const { t } = useTranslation()
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Filter out current group
  const availableGroups = groups.filter(
    (g) => String(g.id) !== currentGroupId
  )

  const handleMove = async () => {
    if (!selectedGroup) {
      alert(t('请选择目标分组'))
      return
    }

    setIsLoading(true)
    try {
      await onMove(selectedGroup)
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
          <DialogTitle>{t('移动素材到其他分组')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <Select
            value={selectedGroup}
            onValueChange={(value) => setSelectedGroup(value || '')}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('选择目标分组')} />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isLoading}>
            {t('取消')}
          </Button>
          <Button onClick={handleMove} disabled={isLoading || !selectedGroup}>
            {t('移动')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
