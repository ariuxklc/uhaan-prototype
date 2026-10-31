import "server-only";

import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** The project in `.firebaserc`. */
const PROJECT_ID = "uhaan-3c0ae";

/**
 * The service-account key from `FIREBASE_SERVICE_ACCOUNT` (the JSON file's
 * contents), or `null` to use Application Default Credentials locally
 * (`gcloud auth application-default login`). A bad value fails without
 * quoting it, since the key is a secret.
 */
function serviceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return null;
  try {
    return JSON.parse(json) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }
}

/** The Firebase Admin app, for server code only; the browser never talks to Firebase. */
export function firebaseApp(): App {
  const account = serviceAccount();
  return (
    getApps()[0] ??
    initializeApp(account ? { credential: cert(account), projectId: PROJECT_ID } : { projectId: PROJECT_ID })
  );
}

/** Firestore, for the content and monitor sources described in docs/ARCHITECTURE.md. */
export function firestore(): Firestore {
  return getFirestore(firebaseApp());
}
