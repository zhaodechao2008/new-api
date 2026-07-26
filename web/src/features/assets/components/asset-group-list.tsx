import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

import type { AssetGroup } from '../types'

interface AssetGroupListProps {
  groups: AssetGroup[]
  onSelectGroup: (groupId: number) => void
}

export default function AssetGroupList(props: AssetGroupListProps) {
  const { t } = useTranslation()

  if (props.groups.length === 0) {
    return (
      <Empty className='border'>
        <EmptyHeader>
          <EmptyTitle>{t('No asset groups')}</EmptyTitle>
          <EmptyDescription>
            {t('Create an asset group before adding assets.')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {props.groups.map((group) => (
        <Card
          key={group.id}
          className='cursor-pointer transition-colors hover:bg-muted/40'
          onClick={() => props.onSelectGroup(group.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              props.onSelectGroup(group.id)
            }
          }}
          role='button'
          tabIndex={0}
        >
          <CardHeader>
            <div className='flex min-w-0 items-start justify-between gap-3'>
              <CardTitle className='truncate' title={group.name}>
                {group.name}
              </CardTitle>
              <Badge variant='secondary'>{group.group_type}</Badge>
            </div>
            <CardDescription>
              {group.project_name || t('Default project')}
            </CardDescription>
          </CardHeader>
          <CardContent className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm'>
            <span>{t('Assets: {{count}}', { count: group.asset_count })}</span>
            <span>
              {t('Processing: {{count}}', {
                count: group.processing_count,
              })}
            </span>
            <span className={group.failed_count > 0 ? 'text-destructive' : ''}>
              {t('Failed: {{count}}', { count: group.failed_count })}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
