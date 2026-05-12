import * as admin from "firebase-admin";
import { ENV } from "./env";

if (!admin.apps.length) {
  try {
    // If we have a service account JSON in ENV
    if (ENV.firebaseServiceAccount) {
      const serviceAccount = JSON.parse(ENV.firebaseServiceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback to default credentials (e.g. for local dev if set up via gcloud CLI)
      // or just initialize with project ID if running on Google Cloud
      admin.initializeApp();
    }
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

export { admin };
