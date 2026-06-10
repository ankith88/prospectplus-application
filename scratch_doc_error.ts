import { firestore } from './src/lib/firebase';
import { doc } from 'firebase/firestore';

try {
  doc(firestore, 'leads', {} as any);
} catch (e: any) {
  console.log("Error:", e.message);
}

try {
  doc(firestore, 'leads', 123 as any);
} catch (e: any) {
  console.log("Error:", e.message);
}
