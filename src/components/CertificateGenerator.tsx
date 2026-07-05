import { useCallback, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { CertificateData } from '../types/certificate'
import { saveCertificate } from '../services/certificateService'

interface Props {
    /** Data to render onto the certificate. id will be filled after Firestore write. */
    certData: Omit<CertificateData, 'id' | 'createdAt'>
    /** Whether the user is logged in (required to save to Firestore). */
    canSave: boolean
}

const W = 1123
const H = 794

/**
 * Loads an image from a URL and returns an HTMLImageElement.
 * Resolves when the image is fully decoded.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

/**
 * Renders the QR code onto the canvas at a specific position.
 * Uses qrcode library to draw directly onto an offscreen canvas,
 * then copies it to the main canvas.
 */
async function drawQR(
    ctx: CanvasRenderingContext2D,
    url: string,
    x: number,
    y: number,
    size: number,
): Promise<void> {
    // Draw white background behind QR so it's always visible
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 5, y - 5, size + 10, size + 10)

    const offscreen = document.createElement('canvas')
    await QRCode.toCanvas(offscreen, url, {
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
    })
    ctx.drawImage(offscreen, x, y, size, size)
}

export function CertificateGenerator({ certData, canSave }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleGenerate = useCallback(async () => {
        if (!canSave) {
            setStatus('error')
            setErrorMsg('Inicia sesión con Google para generar tu diploma.')
            return
        }

        const canvas = canvasRef.current
        if (!canvas) return

        setStatus('working')
        setErrorMsg('')

        try {
            // 1. Save to Firestore and get the verification ID
            const createdAt = new Date().toISOString()
            const docId = await saveCertificate({ ...certData, createdAt })

            // 2. Load the SVG background
            const bgImg = await loadImage('/certificado-base.svg')

            // 3. Paint the canvas
            const ctx = canvas.getContext('2d')!
            ctx.clearRect(0, 0, W, H)
            ctx.drawImage(bgImg, 0, 0, W, H)

            // 4. Name — centered at X=561, Y=420, 40px
            ctx.fillStyle = '#1A202C'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.font = 'bold 40px "Georgia", serif'
            ctx.fillText(certData.displayName, 561, 420)

            // 5. WPM / level achievement — centered at X=561, Y=600, 30px
            const achievement =
                typeof certData.level === 'number' && certData.level > 0
                    ? `${certData.wpm} WPM · Nivel máximo: ${certData.level}`
                    : `${certData.wpm} WPM`
            ctx.font = 'bold 30px "Arial", sans-serif'
            ctx.fillStyle = '#2B6CB0'
            ctx.fillText(achievement, 561, 600)

            // 6. Expedition date — centered at X=275, Y=660, 20px
            const dateStr = new Date(createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            ctx.font = '20px "Arial", sans-serif'
            ctx.fillStyle = '#4A5568'
            ctx.fillText(dateStr, 275, 660)

            // 7. Verification code below QR
            ctx.font = '11px "Arial", sans-serif'
            ctx.fillStyle = '#718096'
            ctx.fillText(`ID: ${docId.slice(0, 12)}…`, 865, 730)

            // 8. QR code at X=800, Y=580, size 130x130
            const verifyUrl = `${window.location.origin}/verificar/${docId}`
            await drawQR(ctx, verifyUrl, 800, 580, 130)

            // 9. Trigger download
            const link = document.createElement('a')
            link.download = 'certificado-oficial.png'
            link.href = canvas.toDataURL('image/png')
            link.click()

            setStatus('done')
        } catch (err) {
            console.error('Certificate generation failed:', err)
            setStatus('error')
            setErrorMsg('Ocurrió un error al generar el diploma. Intenta de nuevo.')
        }
    }, [certData, canSave])

    return (
        <>
            {/* Hidden canvas — rendered off-screen */}
            <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{ display: 'none' }}
                aria-hidden="true"
            />

            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={status === 'working'}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-amber-600 hover:to-yellow-500 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {status === 'working' ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Generando diploma…
                        </>
                    ) : status === 'done' ? (
                        <>✅ ¡Diploma descargado!</>
                    ) : (
                        <>
                            {/* Trophy icon */}
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                            </svg>
                            Generar y Descargar Diploma
                        </>
                    )}
                </button>

                {status === 'error' && errorMsg && (
                    <p className="text-xs text-red-500">{errorMsg}</p>
                )}

                {status === 'done' && (
                    <p className="text-[11px] text-muted">
                        El QR en el diploma permite verificar su autenticidad en línea
                    </p>
                )}

                {!canSave && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Inicia sesión con Google para generar tu diploma oficial
                    </p>
                )}
            </div>
        </>
    )
}
