import { Folder, ScanFace } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { AssetGroup } from '../types'

interface AssetGroupListProps {
  groups: AssetGroup[]
  selectedGroupId: number | null
  onSelectGroup: (groupId: number) => void
  groupType: string
  onGroupTypeChange: (type: string) => void
  search: string
  onSearchChange: (value: string) => void
  onCreateGroup: () => void
}

export default function AssetGroupList(props: AssetGroupListProps) {
  const { t } = useTranslation()

  const filtered = props.groups.filter((group) =>
    group.name.toLowerCase().includes(props.search.toLowerCase())
  )

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between gap-2 px-1 pb-2'>
        <strong className='text-sm font-semibold'>
          {t('Asset Groups')}
        </strong>
        <div className='flex items-center gap-1'>
          <Button
            variant='default'
            size='sm'
            onClick={props.onCreateGroup}
          >
            {t('New Group')}
          </Button>
        </div>
      </div>

      <Tabs
        value={props.groupType}
        onValueChange={(value) =>
          props.onGroupTypeChange(value as string)
        }
        className='gap-0'
      >
        <TabsList variant='line' className='w-full justify-start'>
          <TabsTrigger value='AIGC'>
            <Folder className='size-3.5' aria-hidden='true' />
            {t('Virtual Assets')}
          </TabsTrigger>
          <TabsTrigger value='LivenessFace'>
            <ScanFace className='size-3.5' aria-hidden='true' />
            {t('Liveness Assets')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className='py-2'>
        <Input
          value={props.search}
          onChange={(e) => props.onSearchChange(e.currentTarget.value)}
          placeholder={t('Search asset groups')}
          aria-label={t('Search asset groups')}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {filtered.length === 0 ? (
          <div className='text-muted-foreground px-2 py-8 text-center text-sm'>
            {t('No asset groups')}
          </div>
        ) : (
          <div className='space-y-0.5'>
            {filtered.map((group) => (
              <button
                key={group.id}
                type='button'
                onClick={() => props.onSelectGroup(group.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                  props.selectedGroupId === group.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Folder
                  className='size-4 shrink-0 opacity-70'
                  aria-hidden='true'
                />
                <span className='flex min-w-0 flex-1 flex-col'>
                  <span
                    className='truncate text-sm font-medium'
                    title={group.name}
                  >
                    {group.name}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {t('{{count}} assets', { count: group.asset_count })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
