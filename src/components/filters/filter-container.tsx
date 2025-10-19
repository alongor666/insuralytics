'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FilterContainerProps {
  title: string
  children: ReactNode
  onReset?: () => void
}

export function FilterContainer({
  title,
  children,
  onReset,
}: FilterContainerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="mr-1 h-3 w-3" />
            清除
          </Button>
        )}
      </div>
      {children}
    </div>
  )
}
