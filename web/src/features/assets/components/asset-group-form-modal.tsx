import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

import { createAssetGroup, updateAssetGroup } from '../api'
import type { AssetGroup, CreateAssetGroupRequest } from '../types'

interface AssetGroupFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** When provided the modal operates in edit mode. */
  group?: AssetGroup
  defaultGroupType?: string
}

export default function AssetGroupFormModal(
  props: AssetGroupFormModalProps
) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = !!props.group

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [groupType, setGroupType] = useState(
    props.defaultGroupType || 'AIGC'
  )

  useEffect(() => {
    if (props.isOpen) {
      if (props.group) {
        setName(props.group.name)
        setDescription(props.group.description || '')
        setGroupType(props.group.group_type || 'AIGC')
      } else {
        setName('')
        setDescription('')
        setGroupType(props.defaultGroupType || 'AIGC')
      }
    }
  }, [props.isOpen, props.group, props.defaultGroupType])

  const createMutation = useMutation({
    mutationFn: (data: CreateAssetGroupRequest) => createAssetGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
      toast.success(t('Asset group created'))
      props.onClose()
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to create asset group')
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      updateAssetGroup(props.group!.id, { name, description }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'groups'] })
      queryClient.setQueryData(
        ['assets', 'group', props.group!.id],
        (old: { group: AssetGroup; assets: unknown[] } | undefined) =>
          old ? { ...old, group: updated } : old
      )
      toast.success(t('Asset group updated'))
      props.onClose()
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to update asset group')
      )
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t('Group name is required'))
      return
    }
    if (isEdit) {
      updateMutation.mutate({ name: name.trim(), description: description.trim() })
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim(),
        group_type: groupType,
      })
    }
  }

  console.log('[AssetGroupFormModal] render, isOpen=', props.isOpen)

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => {
        console.log('[AssetGroupFormModal] onOpenChange', open)
        if (!open) props.onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('Edit Asset Group') : t('Create Asset Group')}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='group-name'>{t('Group name')}</Label>
            <Input
              id='group-name'
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder={t('Enter group name')}
              disabled={isPending}
            />
          </div>

          {!isEdit && (
            <div className='space-y-2'>
              <Label htmlFor='group-type'>{t('Group type')}</Label>
              <Select
                value={groupType}
                onValueChange={(value) => setGroupType(value || 'AIGC')}
              >
                <SelectTrigger id='group-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='AIGC'>{t('Virtual Assets')}</SelectItem>
                  <SelectItem value='LivenessFace'>
                    {t('Liveness Assets')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='group-description'>{t('Description')}</Label>
            <Textarea
              id='group-description'
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              placeholder={t('Optional description')}
              rows={3}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={props.onClose}
            disabled={isPending}
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending ? <Spinner className='mr-2' /> : null}
            {isEdit ? t('Save') : t('Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
