import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Try to find a service account key or we might need to use application default credentials
// Wait, actually I can just try to use firebase-admin if there is an emulator or ADC.
// Let's see how the app connects.
