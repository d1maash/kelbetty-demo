'use client'

import { useEffect, useState } from 'react'
import { Download, Presentation, Loader2, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react'

interface PptxEditorProps {
  file: File
}

export default function PptxEditor({ file }: PptxEditorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slides, setSlides] = useState<Array<{ id: number; title: string; content: string; background?: string }>>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [editingSlide, setEditingSlide] = useState<number | null>(null)

  useEffect(() => {
    if (!file) return

    const loadPptx = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Для демо создаем фиктивные слайды
        const demoSlides = [
          {
            id: 1,
            title: 'Заголовок презентации',
            content: 'Добро пожаловать в Kelbetty! Этот слайд можно редактировать.',
            background: '#f8fafc'
          },
          {
            id: 2,
            title: 'Основные возможности',
            content: '• Сохранение стилей\n• ИИ-редактирование\n• Экспорт в PPTX\n• Простой интерфейс',
            background: '#f1f5f9'
          },
          {
            id: 3,
            title: 'Заключение',
            content: 'Kelbetty — лучший способ работы с презентациями!',
            background: '#e2e8f0'
          }
        ]

        // Симуляция загрузки
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        setSlides(demoSlides)
        setIsLoading(false)
      } catch (err) {
        console.error('Ошибка при загрузке PPTX:', err)
        setError('Не удалось загрузить презентацию. Проверьте, что файл не поврежден.')
        setIsLoading(false)
      }
    }

    loadPptx()
  }, [file])

  const handleSlideEdit = (slideId: number, field: 'title' | 'content', value: string) => {
    setSlides(prev => prev.map(slide => 
      slide.id === slideId 
        ? { ...slide, [field]: value }
        : slide
    ))
  }

  const handleExport = async () => {
    try {
      // В реальном приложении здесь был бы экспорт через pptxgenjs
      const demoContent = JSON.stringify(slides, null, 2)
      const blob = new Blob([demoContent], { type: 'application/json' })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.[^/.]+$/, '') + '_edited.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('В реальной версии здесь будет создан настоящий PPTX файл')
    } catch (error) {
      console.error('Ошибка при экспорте:', error)
      alert('Не удалось экспортировать презентацию')
    }
  }

  const nextSlide = () => {
    setCurrentSlideIndex(prev => (prev + 1) % slides.length)
    setEditingSlide(null)
  }

  const prevSlide = () => {
    setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)
    setEditingSlide(null)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Загружаем презентацию...</p>
          <p className="text-sm text-slate-500 mt-1">Извлекаем слайды и стили</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <Presentation className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ошибка загрузки</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Presentation className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-slate-900">{file.name}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm text-slate-500">
              <span>Слайд {currentSlideIndex + 1} из {slides.length}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setEditingSlide(editingSlide === currentSlide.id ? null : currentSlide.id)}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                editingSlide === currentSlide.id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              {editingSlide === currentSlide.id ? 'Готово' : 'Редактировать'}
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать PPTX
            </button>
          </div>
        </div>
      </div>

      {/* Slide Navigation */}
      <div className="border-b border-slate-200 p-2 bg-slate-50">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={prevSlide}
            disabled={slides.length <= 1}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex space-x-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => {
                  setCurrentSlideIndex(index)
                  setEditingSlide(null)
                }}
                className={`w-12 h-8 rounded border-2 transition-colors ${
                  index === currentSlideIndex
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
                style={{ backgroundColor: slide.background }}
              >
                <span className="text-xs font-medium">{index + 1}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={nextSlide}
            disabled={slides.length <= 1}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="flex-1 overflow-auto p-8 bg-slate-100">
        <div className="max-w-4xl mx-auto">
          <div 
            className="pptx-slide mx-auto p-12 shadow-lg"
            style={{
              width: '800px',
              height: '450px',
              backgroundColor: currentSlide.background || '#ffffff'
            }}
          >
            {editingSlide === currentSlide.id ? (
              <div className="h-full flex flex-col">
                <input
                  type="text"
                  value={currentSlide.title}
                  onChange={(e) => handleSlideEdit(currentSlide.id, 'title', e.target.value)}
                  className="text-3xl font-bold text-slate-900 bg-transparent border-b-2 border-blue-300 mb-8 pb-2 focus:outline-none focus:border-blue-500"
                  placeholder="Заголовок слайда"
                />
                <textarea
                  value={currentSlide.content}
                  onChange={(e) => handleSlideEdit(currentSlide.id, 'content', e.target.value)}
                  className="flex-1 text-lg text-slate-700 bg-transparent resize-none focus:outline-none"
                  placeholder="Содержимое слайда..."
                />
              </div>
            ) : (
              <div className="h-full">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">
                  {currentSlide.title}
                </h1>
                <div className="text-lg text-slate-700 whitespace-pre-line">
                  {currentSlide.content}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 p-3 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          💡 Нажмите &quot;Редактировать&quot; для изменения текста. В реальной версии поддерживается полное редактирование PPTX.
        </p>
      </div>
    </div>
  )
}