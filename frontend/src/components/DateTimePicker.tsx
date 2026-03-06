import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock, ChevronUp, ChevronDown, X } from 'lucide-react'
import { format } from 'date-fns'

// Hours 00-23 for grid
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
// Minutes in 5-min increments
const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

// Parse HH:mm from various user inputs (hand-edit support)
function parseTimeInput(input: string): { h: string; m: string } | null {
  const trimmed = input.trim().replace(/\s/g, '')
  if (!trimmed) return null

  // Match H:MM, HH:MM, H:M, HH:M
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/)
  if (match) {
    let h = parseInt(match[1], 10)
    let m = parseInt(match[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return {
        h: h.toString().padStart(2, '0'),
        m: m.toString().padStart(2, '0'),
      }
    }
  }

  // Match HHMM (e.g. 1630)
  const match2 = trimmed.match(/^(\d{2})(\d{2})$/)
  if (match2) {
    const h = parseInt(match2[1], 10)
    const m = parseInt(match2[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { h: match2[1], m: match2[2] }
    }
  }

  // Match just hour
  const match3 = trimmed.match(/^(\d{1,2})$/)
  if (match3) {
    const h = parseInt(match3[1], 10)
    if (h >= 0 && h <= 23) {
      return { h: h.toString().padStart(2, '0'), m: '00' }
    }
  }

  return null
}

interface DateTimePickerProps {
  value: string // yyyy-MM-ddTHH:mm or empty
  onChange: (value: string) => void
  label?: string
  required?: boolean
  optional?: boolean
  disabled?: boolean
  minDate?: Date
  error?: string
  className?: string
  id?: string
}

export function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  optional = false,
  disabled = false,
  minDate,
  error,
  className = '',
  id,
}: DateTimePickerProps) {
  const [datePart, setDatePart] = useState(() => (value ? value.split('T')[0] : ''))
  const [timePart, setTimePart] = useState(() => {
    if (!value || !value.includes('T')) return ''
    const t = value.split('T')[1]
    return t ? t.substring(0, 5) : ''
  })
  const [showTimePopover, setShowTimePopover] = useState(false)
  const timePopoverRef = useRef<HTMLDivElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)

  // Sync from external value
  useEffect(() => {
    if (value) {
      const [d, t] = value.split('T')
      if (d) setDatePart(d)
      if (t) setTimePart(t.substring(0, 5))
    } else {
      setDatePart('')
      setTimePart('')
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timePopoverRef.current && !timePopoverRef.current.contains(e.target as Node)) {
        setShowTimePopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value
    setDatePart(d)
    if (d && timePart) {
      onChange(`${d}T${timePart}`)
    } else if (d) {
      onChange(`${d}T09:00`)
      setTimePart('09:00')
    } else {
      onChange('')
      setTimePart('')
    }
  }

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setTimePart(v)
    const parsed = parseTimeInput(v)
    if (parsed && datePart) {
      onChange(`${datePart}T${parsed.h}:${parsed.m}`)
    }
  }

  const handleTimeInputBlur = () => {
    const parsed = parseTimeInput(timePart)
    if (parsed) {
      const formatted = `${parsed.h}:${parsed.m}`
      setTimePart(formatted)
      if (datePart) onChange(`${datePart}T${formatted}`)
    } else if (timePart) {
      setTimePart('')
    }
  }

  const handleHourSelect = (h: string) => {
    const m = timePart ? timePart.split(':')[1] || '00' : '00'
    const formatted = `${h}:${m}`
    setTimePart(formatted)
    if (datePart) onChange(`${datePart}T${formatted}`)
  }

  const handleMinuteSelect = (m: string) => {
    const h = timePart ? timePart.split(':')[0] || '00' : '00'
    const formatted = `${h}:${m}`
    setTimePart(formatted)
    if (datePart) onChange(`${datePart}T${formatted}`)
  }

  const incrementHour = () => {
    const [h, m] = (timePart || '00:00').split(':').map(Number)
    const newH = ((h + 1) % 24).toString().padStart(2, '0')
    const formatted = `${newH}:${m.toString().padStart(2, '0')}`
    setTimePart(formatted)
    if (datePart) onChange(`${datePart}T${formatted}`)
  }

  const decrementHour = () => {
    const [h, m] = (timePart || '00:00').split(':').map(Number)
    const newH = ((h + 23) % 24).toString().padStart(2, '0')
    const formatted = `${newH}:${m.toString().padStart(2, '0')}`
    setTimePart(formatted)
    if (datePart) onChange(`${datePart}T${formatted}`)
  }

  const baseInputClass =
    'w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors'
  const errorClass = error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
  const dateInputMin = minDate ? format(minDate, 'yyyy-MM-dd') : undefined
  const currentHour = timePart ? timePart.split(':')[0] || '00' : '00'
  const currentMinute = timePart ? timePart.split(':')[1]?.substring(0, 2) || '00' : '00'
  const currentMinuteRounded = MINUTE_OPTIONS.includes(currentMinute)
    ? currentMinute
    : MINUTE_OPTIONS[Math.round(parseInt(currentMinute || '0', 10) / 5)] || '00'

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex gap-2 items-stretch">
        {/* Date - use native date input but show MM/dd/yy in a text overlay for display, or use text input */}
        <div className="flex-1 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
          <input
            type="date"
            value={datePart}
            onChange={handleDateChange}
            min={dateInputMin}
            disabled={disabled}
            className={`${baseInputClass} ${errorClass} pl-10`}
            id={id}
          />
        </div>

        {/* Time - editable input + popover with hour/minute grids */}
        <div className="relative w-28 flex-shrink-0" ref={timePopoverRef}>
          <div className="relative flex items-stretch">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
            <input
              ref={timeInputRef}
              type="text"
              value={timePart}
              onChange={handleTimeInputChange}
              onBlur={handleTimeInputBlur}
              onFocus={() => !disabled && setShowTimePopover(true)}
              disabled={disabled}
              placeholder="HH:MM"
              className={`${baseInputClass} ${errorClass} pl-10 pr-8`}
            />
            <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center">
              <button
                type="button"
                onClick={incrementHour}
                disabled={disabled}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={decrementHour}
                disabled={disabled}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showTimePopover && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[200px]">
              <div className="grid grid-cols-2 gap-4">
                {/* Hour grid */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hour</div>
                  <div className="grid grid-cols-4 gap-1">
                    {HOUR_OPTIONS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourSelect(h)}
                        className={`px-2 py-1.5 text-sm rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 ${
                          currentHour === h ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-medium' : ''
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Minute grid */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Minute</div>
                  <div className="grid grid-cols-4 gap-1">
                    {MINUTE_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinuteSelect(m)}
                        className={`px-2 py-1.5 text-sm rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 ${
                          currentMinuteRounded === m ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-medium' : ''
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {optional && value && (
          <button
            type="button"
            onClick={() => {
              setDatePart('')
              setTimePart('')
              onChange('')
            }}
            disabled={disabled}
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
