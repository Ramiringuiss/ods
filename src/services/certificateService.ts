import { addDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CertificateData } from '../types/certificate'

/**
 * Saves a certificate to the `certificates` Firestore collection.
 * Returns the newly created Firestore document ID, which becomes
 * the verification code embedded in the QR code URL.
 */
export async function saveCertificate(
    data: Omit<CertificateData, 'id'>,
): Promise<string> {
    const ref = await addDoc(collection(db, 'certificates'), {
        ...data,
        createdAt: new Date().toISOString(),
    })
    return ref.id
}
