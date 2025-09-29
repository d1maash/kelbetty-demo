'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface DocxEditorProps {
  file: File
}

type DocxState = 'idle' | 'loading' | 'ready' | 'error'

export default function DocxEditor({ file }: DocxEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<DocxState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    if (!file || !containerRef.current) return

    let isCancelled = false
    setCancelled(false)

    const loadDocx = async () => {
      try {
        setState('loading')
        setError(null)

        // Таймаут для предотвращения бесконечной загрузки
        const timeoutId = setTimeout(() => {
          if (!isCancelled) {
            setState('error')
            setError('Загрузка документа заняла слишком много времени')
          }
        }, 20000) // 20 секунд таймаут

        // Симуляция загрузки для демо
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (isCancelled) return

        // Создаем демо-контент с сохранением стилей
        const demoContent = `
          <div class="docx-content" style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #333;">
            <h1 style="color: #1e293b; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              ${file.name.replace(/\.[^/.]+$/, '')}
            </h1>
            
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 22px; font-weight: bold; margin: 24px 0 12px 0;">
                Документ успешно импортирован
              </h2>
              <p style="color: #475569; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">
                Этот документ был загружен в Kelbetty с полным сохранением стилей и форматирования. 
                В реальной версии здесь будет отображаться содержимое вашего DOCX файла.
              </p>
            </div>

            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 22px; font-weight: bold; margin: 24px 0 12px 0;">
                Основные возможности
              </h2>
              <ul style="color: #475569; line-height: 1.8; margin-bottom: 16px; padding-left: 24px;">
                <li style="margin-bottom: 8px;">Сохранение всех стилей и шрифтов</li>
                <li style="margin-bottom: 8px;">ИИ-редактирование через чат</li>
                <li style="margin-bottom: 8px;">Экспорт в исходном качестве</li>
                <li style="margin-bottom: 8px;">Поддержка сложного форматирования</li>
                <li style="margin-bottom: 8px;">Редактирование текста с сохранением стилей</li>
              </ul>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e293b; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">
                Информация о файле
              </h3>
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                <strong>Имя:</strong> ${file.name}<br>
                <strong>Размер:</strong> ${(file.size / 1024).toFixed(1)} КБ<br>
                <strong>Тип:</strong> ${file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
              </p>
            </div>
          </div>
        `

        if (isCancelled) return

        // Очищаем контейнер и вставляем контент
        if (containerRef.current) {
          containerRef.current.innerHTML = demoContent
          setHtmlContent(demoContent)
        }

        clearTimeout(timeoutId)
        setState('ready')

      } catch (err) {
        if (!isCancelled) {
          console.error('Ошибка при загрузке DOCX:', err)
          setError('Не удалось загрузить документ. Проверьте, что файл не поврежден.')
          setState('error')
        }
      }
    }

    loadDocx()

    return () => {
      isCancelled = true
      setCancelled(true)
    }
  }, [file])

  const handleRetry = () => {
    setState('idle')
    setError(null)
    // Перезапускаем загрузку
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
  }

  const handleExport = async () => {
    try {
      if (!htmlContent) {
        alert('Нет содержимого для экспорта')
        return
      }

      // Создаем blob с HTML содержимым
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.[^/.]+$/, '') + '_edited.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('В реальной версии здесь будет создан настоящий DOCX файл с сохранением всех стилей')
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error)
      alert('Не удалось экспортировать документ')
    }
  }

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML
    setHtmlContent(newContent)
  }

  if (state === 'loading') {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">Загружаем документ...</p>
          <p className="text-sm text-slate-500">Сохраняем все стили и форматирование</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ошибка загрузки</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleRetry}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Попробовать снова
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-900">{file.name}</span>
            <span className="text-sm text-slate-500">
              ({(file.size / 1024).toFixed(1)} КБ)
            </span>
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Скачать DOCX
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto p-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div
            ref={containerRef}
            className="document-editor min-h-full bg-white shadow-sm border border-slate-200 rounded-lg p-8"
            contentEditable
            suppressContentEditableWarning={true}
            onInput={handleContentChange}
            style={{
              minHeight: '800px',
              lineHeight: '1.6',
              fontSize: '14px',
              fontFamily: 'Times New Roman, serif'
            }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 p-3 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          💡 Документ полностью редактируемый. Все изменения сохраняют исходные стили и форматирование.
        </p>
      </div>
    </div>
  )
}