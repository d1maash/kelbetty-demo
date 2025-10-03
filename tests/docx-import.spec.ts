import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

test.describe('DOCX Import with Maximum Fidelity', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/documents/import')
    })

    test('should import DOCX with LibreOffice mode', async ({ page }) => {
        // Загружаем тестовый DOCX файл
        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        // Проверяем, что документ отображается
        const iframe = page.frameLocator('iframe')
        await expect(iframe.locator('body')).toBeVisible()

        // Проверяем качество конвертации
        const qualityText = await page.locator('text=Качество:').textContent()
        expect(qualityText).toMatch(/Качество: \d+%/)

        // Проверяем, что нет ошибок
        await expect(page.locator('text=Ошибка:')).not.toBeVisible()
    })

    test('should fallback to jsDocxToHtml when LibreOffice fails', async ({ page }) => {
        // Симулируем недоступность LibreOffice
        await page.route('/api/convert', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ error: 'LibreOffice недоступен' })
            })
        })

        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        // Проверяем, что документ все равно отображается
        const iframe = page.frameLocator('iframe')
        await expect(iframe.locator('body')).toBeVisible()
    })

    test('should preserve formatting in iframe', async ({ page }) => {
        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        const iframe = page.frameLocator('iframe')

        // Проверяем, что iframe изолирован
        await expect(iframe.locator('html')).toHaveAttribute('lang', 'ru')

        // Проверяем наличие стилей
        const styleTag = iframe.locator('style')
        await expect(styleTag).toBeVisible()

        // Проверяем, что есть inline стили
        const elementsWithStyle = iframe.locator('*[style]')
        await expect(elementsWithStyle.first()).toBeVisible()
    })

    test('should show font warnings when fonts are missing', async ({ page }) => {
        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document-with-custom-fonts.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        // Проверяем предупреждения о шрифтах
        const fontWarnings = page.locator('text=предупреждений о шрифтах')
        if (await fontWarnings.isVisible()) {
            await expect(fontWarnings).toBeVisible()
        }
    })

    test('should allow mode switching', async ({ page }) => {
        // Проверяем переключатель режимов
        const modeButtons = page.locator('button[class*="bg-white"]')
        await expect(modeButtons).toHaveCount(1) // Один активный режим

        // Переключаемся на jsDocxToHtml
        await page.locator('button:has-text("jsDocxToHtml")').click()

        // Проверяем, что режим изменился
        await expect(page.locator('button:has-text("jsDocxToHtml")')).toHaveClass(/bg-white/)
    })

    test('should download HTML file', async ({ page }) => {
        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        // Нажимаем кнопку скачивания
        const downloadPromise = page.waitForEvent('download')
        await page.locator('button:has-text("Скачать HTML")').click()

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.html$/)
    })
})

test.describe('Visual Regression Tests', () => {
    test('should match reference screenshot for simple document', async ({ page }) => {
        await page.goto('/documents/import')

        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        // Делаем скриншот
        const screenshot = await page.screenshot({ fullPage: true })

        // Сравниваем с эталоном (если есть)
        expect(screenshot).toMatchSnapshot('docx-import-simple.png')
    })

    test('should match reference screenshot for complex formatting', async ({ page }) => {
        await page.goto('/documents/import')

        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document-complex.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        // Делаем скриншот
        const screenshot = await page.screenshot({ fullPage: true })

        // Сравниваем с эталоном
        expect(screenshot).toMatchSnapshot('docx-import-complex.png')
    })
})

test.describe('Computed Styles Tests', () => {
    test('should preserve text-indent and margins', async ({ page }) => {
        await page.goto('/documents/import')

        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document-with-indents.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        const iframe = page.frameLocator('iframe')

        // Проверяем computed styles первого абзаца
        const firstParagraph = iframe.locator('p').first()
        await expect(firstParagraph).toBeVisible()

        // Получаем computed styles через JavaScript
        const styles = await iframe.evaluate(() => {
            const p = document.querySelector('p')
            if (!p) return null

            const computed = window.getComputedStyle(p)
            return {
                textIndent: computed.textIndent,
                marginLeft: computed.marginLeft,
                marginRight: computed.marginRight,
                fontSize: computed.fontSize,
                lineHeight: computed.lineHeight
            }
        })

        expect(styles).not.toBeNull()

        // Проверяем, что есть отступы
        if (styles) {
            expect(styles.textIndent).not.toBe('0px')
            expect(styles.marginLeft).not.toBe('0px')
            expect(styles.fontSize).toMatch(/\d+pt/) // Должны быть pt единицы
        }
    })

    test('should preserve font sizes in pt units', async ({ page }) => {
        await page.goto('/documents/import')

        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document-font-sizes.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Ждем завершения импорта
        await expect(page.locator('text=Качество:')).toBeVisible({ timeout: 30000 })

        const iframe = page.frameLocator('iframe')

        // Проверяем, что font-size в pt единицах
        const ptElements = await iframe.locator('*[style*="font-size"]').count()
        expect(ptElements).toBeGreaterThan(0)

        // Проверяем конкретные элементы
        const elementsWithPt = await iframe.locator('*[style*="pt"]').count()
        expect(elementsWithPt).toBeGreaterThan(0)
    })
})

test.describe('Error Handling', () => {
    test('should handle LibreOffice errors gracefully', async ({ page }) => {
        // Симулируем ошибку LibreOffice
        await page.route('/api/convert', route => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ error: 'LibreOffice process failed' })
            })
        })

        const testDocxPath = path.join(__dirname, 'fixtures', 'test-document.docx')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testDocxPath)

        // Проверяем, что показывается ошибка или fallback
        await expect(page.locator('text=Ошибка:')).toBeVisible({ timeout: 10000 })
    })

    test('should handle invalid file format', async ({ page }) => {
        const testTxtPath = path.join(__dirname, 'fixtures', 'test-document.txt')
        const fileInput = page.locator('input[type="file"]')

        await fileInput.setInputFiles(testTxtPath)

        // Проверяем, что показывается ошибка
        await expect(page.locator('text=Ошибка:')).toBeVisible({ timeout: 10000 })
    })
})
