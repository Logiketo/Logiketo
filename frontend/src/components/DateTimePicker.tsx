import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock, X } from 'lucide-react'
import { format } from 'date-fns'

// Generate time options every 15 minutes: 12:00 AM -> 11:45 PM
const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const ampm = h < 12 ? 'AM' : 'PM'
    const min = m.toString().padStart(2, '0')
    TIME_OPTIONS.push(`${hour}:${min} ${ampm}`)
  }
}

// Convert "3:30 PM" to HH:mm (24h)
function timeTo24h(timeStr: string): string {
  const d = new Date(`2000-01-01 ${timeStr}`)
  return format(d, 'HH:mm')
}

// Convert HH:mm to "3:30 PM"
function timeTo12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

interface DateTimePickerProps {
  value: string // yyyy-MM-ddTHH:mm or empty
  onChange: (value: string) => void
  label?: string
  required?: boolean
  optional?: boolean // When true, show clear button when value is set
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
  const [datePart, setDatePart] = useState(() => {
    if (!value) return ''
    try {
      return value.split('T')[0]
    } catch {
      return ''
    }
  })
  const [timePart, setTimePart] = useState(() => {
    if (!value || !value.includes('T')) return ''
    try {
      const t = value.split('T')[1]
      if (t) return timeTo12h(t.substring(0, 5))
      return ''
    } catch {
      return ''
    }
  })
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const timeDropdownRef = useRef<HTMLDivElement>(null)

  // Sync from external value (e.g. when editing)
  useEffect(() => {
    if (value) {
      try {
        const [d, t] = value.split('T')
        if (d) setDatePart(d)
        if (t) setTimePart(timeTo12h(t.substring(0, 5)))
      } catch {
        // ignore
      }
    } else {
      setDatePart('')
      setTimePart('')
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const d = e.target.value
    setDatePart(d)
    if (d && timePart) {
      onChange(`${d}T${timeTo24h(timePart)}`)
    } else if (d) {
      onChange(`${d}T09:00`) // default 9 AM if no time
      setTimePart('9:00 AM')
    } else {
      onChange('')
      setTimePart('')
    }
  }

  const handleTimeSelect = (timeStr: string) => {
    setTimePart(timeStr)
    setShowTimeDropdown(false)
    if (datePart) {
      onChange(`${datePart}T${timeTo24h(timeStr)}`)
    }
  }

  const baseInputClass =
    'w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors'
  const errorClass = error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'

  const dateInputMin = minDate ? format(minDate, 'yyyy-MM-dd') : undefined

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex gap-2 items-stretch">
        {/* Date input */}
        <div className="flex-1 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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

        {/* Time dropdown */}
        <div className="relative w-36 flex-shrink-0" ref={timeDropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setShowTimeDropdown(!showTimeDropdown)}
            disabled={disabled}
            className={`${baseInputClass} ${errorClass} flex items-center justify-between text-left pl-10 pr-3 ${
              !timePart ? 'text-gray-500 dark:text-gray-400' : ''
            }`}
          >
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <span>{timePart || 'Time'}</span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${showTimeDropdown ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTimeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleTimeSelect(opt)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                    timePart === opt ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium' : ''
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear button for optional fields */}
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
