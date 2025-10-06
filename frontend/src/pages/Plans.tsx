import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Todo {
  id: string
  task: string
  timeFrame: 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'
  customDate?: string
  completed: boolean
  createdAt: string
}

export default function Plans() {
  
  // Load todos from localStorage or use default
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('logiketo-todos')
    if (savedTodos) {
      return JSON.parse(savedTodos)
    }
    return [
      {
        id: '1',
        task: 'Implement advanced analytics dashboard',
        timeFrame: 'this_week',
        completed: false,
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        task: 'Develop mobile app for drivers',
        timeFrame: 'this_month',
        completed: false,
        createdAt: '2024-01-10'
      },
      {
        id: '3',
        task: 'Optimize database performance',
        timeFrame: 'today',
        completed: true,
        createdAt: '2024-01-05'
      },
      {
        id: '4',
        task: 'Add email notifications system',
        timeFrame: 'this_month',
        completed: false,
        createdAt: '2024-01-12'
      },
      {
        id: '5',
        task: 'Implement API rate limiting',
        timeFrame: 'this_week',
        completed: false,
        createdAt: '2024-01-08'
      }
    ]
  })

  const [showForm, setShowForm] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [filterTimeFrame, setFilterTimeFrame] = useState<string>('all')
  const [filterCompleted, setFilterCompleted] = useState<string>('pending')

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('logiketo-todos', JSON.stringify(todos))
  }, [todos])

  const timeFrameLabels = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    this_year: 'This Year',
    custom: 'Custom Date'
  }

  const filteredTodos = todos.filter(todo => {
    const timeFrameMatch = filterTimeFrame === 'all' || todo.timeFrame === filterTimeFrame
    const completedMatch = filterCompleted === 'all' || 
      (filterCompleted === 'completed' && todo.completed) ||
      (filterCompleted === 'pending' && !todo.completed)
    return timeFrameMatch && completedMatch
  })

  const handleAddTodo = (newTodo: Omit<Todo, 'id' | 'createdAt'>) => {
    const todo: Todo = {
      ...newTodo,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    setTodos([...todos, todo])
    setShowForm(false)
  }

  const handleEditTodo = (updatedTodo: Todo) => {
    setTodos(todos.map(todo => 
      todo.id === updatedTodo.id ? updatedTodo : todo
    ))
    setEditingTodo(null)
  }

  const handleDeleteTodo = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTodos(todos.filter(todo => todo.id !== id))
    }
  }

  const handleToggleComplete = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const getTodoCounts = () => {
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length
    }
  }

  const todoCounts = getTodoCounts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">To Do</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Manage your tasks and development plans.
          </p>
        </div>
      </div>

      {/* Status Overview and Filters - Side by Side */}
      <div className="flex gap-6 items-start">
        {/* Task Summary */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-[200px]">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Task Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-green-600 dark:text-green-400 text-sm">Active:</span>
              <span className="text-gray-900 dark:text-white font-medium">{todoCounts.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-600 dark:text-blue-400 text-sm">Completed:</span>
              <span className="text-gray-900 dark:text-white font-medium">{todoCounts.completed}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Filters and Task List */}
        <div className="flex-1 flex flex-col gap-4 max-w-2xl">
          {/* Filters */}
          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Frame
                </label>
                <select
                  value={filterTimeFrame}
                  onChange={(e) => setFilterTimeFrame(e.target.value)}
                  className="input"
                >
                  <option value="all">All Time Frames</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filterCompleted}
                  onChange={(e) => setFilterCompleted(e.target.value)}
                  className="input"
                >
                  <option value="all">All Tasks</option>
                  <option value="pending">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <button 
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New Task
              </button>
            </div>
          </div>

          {/* TODO List */}
          <div className="space-y-3">
        {filteredTodos.map((todo) => (
          <div key={todo.id} className={`card p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
            todo.completed ? 'opacity-60' : ''
          }`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleComplete(todo.id)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  todo.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                }`}
              >
                {todo.completed && <CheckCircle className="h-3 w-3" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium ${
                  todo.completed 
                    ? 'line-through text-gray-500 dark:text-gray-400' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {todo.task}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timeFrameLabels[todo.timeFrame]}
                  </span>
                  {todo.customDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {todo.customDate}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {todo.createdAt}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTodo(todo)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Todo Form */}
      {(showForm || editingTodo) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingTodo ? 'Edit Task' : 'Add New Task'}
            </h2>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const todoData = {
                task: formData.get('task') as string,
                timeFrame: formData.get('timeFrame') as Todo['timeFrame'],
                customDate: formData.get('customDate') as string || undefined,
                completed: editingTodo?.completed || false
              }
              
              if (editingTodo) {
                handleEditTodo({ ...editingTodo, ...todoData })
              } else {
                handleAddTodo(todoData)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task
                  </label>
                  <input
                    type="text"
                    name="task"
                    defaultValue={editingTodo?.task || ''}
                    required
                    className="input w-full"
                    placeholder="Enter your task..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Frame
                  </label>
                  <select
                    name="timeFrame"
                    defaultValue={editingTodo?.timeFrame || 'this_week'}
                    className="input w-full"
                  >
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="this_year">This Year</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Date (if Custom Date is selected)
                  </label>
                  <input
                    type="date"
                    name="customDate"
                    defaultValue={editingTodo?.customDate || ''}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingTodo(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 shadow-sm"
                >
                  {editingTodo ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
