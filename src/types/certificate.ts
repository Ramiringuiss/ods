export interface CertificateData {
    /** Firestore document ID — used as verification code */
    id: string
    /** Firebase Auth UID */
    uid: string
    /** Display name from Google Auth or local profile */
    displayName: string
    /** Best WPM achieved (cloud record) */
    wpm: number
    /** Highest level cleared (or 'Infinito' for infinite mode) */
    level: number | string
    /** ISO date string of certificate creation */
    createdAt: string
}
