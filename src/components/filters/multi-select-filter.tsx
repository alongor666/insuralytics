'use client'

import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'

interface MultiSelectFilterProps {
  options: { label: string; value: string }[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
}

export function MultiSelectFilter({
  options,
  selectedValues,
  onChange,
  placeholder = '选择选项',
  searchPlaceholder = '搜索...',
  emptyText = '未找到选项',
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const optionValues = options.map(opt => opt.value)
  const isAllSelected =
    optionValues.length > 0 && selectedValues.length === optionValues.length
  const showBulkActions = options.length > 3

  const handleSelect = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onChange(newValues)
  }

  const handleSelectAll = () => {
    if (optionValues.length === 0) return
    if (!showBulkActions && isAllSelected) {
      onChange([])
      return
    }
    onChange(optionValues)
  }

  const handleInvertSelection = () => {
    if (optionValues.length === 0) return
    const inverted = optionValues.filter(value => !selectedValues.includes(value))
    onChange(inverted)
  }

  const handleClear = () => {
    if (selectedValues.length === 0) return
    onChange([])
  }

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : isAllSelected
        ? '全部'
        : `已选 ${selectedValues.length} 项`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            <CommandItem onSelect={handleSelectAll} className="cursor-pointer">
              <Checkbox
                checked={isAllSelected}
                className="mr-2"
              />
              <span className="font-medium">全选</span>
            </CommandItem>
            {showBulkActions && (
              <>
                <CommandItem
                  onSelect={handleInvertSelection}
                  className="cursor-pointer pl-8 text-sm text-slate-600"
                >
                  反选
                </CommandItem>
                <CommandItem
                  onSelect={handleClear}
                  className="cursor-pointer pl-8 text-sm text-slate-600"
                >
                  清空
                </CommandItem>
                <CommandSeparator className="mx-2" />
              </>
            )}
            {options.map(option => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
                className="cursor-pointer"
              >
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  className="mr-2"
                />
                <span>{option.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
