import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Trip, Day, Activity, ChecklistGroup } from '../types';

const TROTTER_VERSION = 1;

interface TrotterFile {
  version: number;
  title: string;
  days: Day[];
  defaultCurrency: string;
  checklists?: ChecklistGroup[];
}

/**
 * Strip personal data and serialize a Trip to a shareable format.
 * Removes: expenses, trip ID, doc URL.
 * Resets: completed states to false.
 */
function tripToTrotterData(trip: Trip): TrotterFile {
  return {
    version: TROTTER_VERSION,
    title: trip.title,
    defaultCurrency: trip.defaultCurrency,
    days: trip.days.map((day) => ({
      ...day,
      activities: day.activities.map((a) => {
        const { expense, ...rest } = a;
        return { ...rest, completed: false };
      }),
    })),
    checklists: trip.checklists?.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, checked: false })),
    })),
  };
}

/**
 * Export a trip as a .trotter file and open the iOS share sheet.
 */
export async function exportTrotterFile(trip: Trip): Promise<void> {
  const data = tripToTrotterData(trip);
  const json = JSON.stringify(data, null, 2);
  const safeName =
    trip.title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, ' ').trim() || 'trip';
  const filePath = `${FileSystem.cacheDirectory}${safeName}.trotter`;

  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/x-trotter',
    UTI: 'com.kevin.rl.yu.trotter',
  });
}

/**
 * Open the document picker for .trotter files and parse the selected file.
 * Returns null if the user cancels.
 */
export async function pickAndImportTrotterFile(): Promise<Trip | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return importTrotterFileFromUri(asset.uri);
}

/**
 * Import a .trotter file delivered via Linking (share sheet / "Open in").
 *
 * The incoming URL may point into another app's sandbox or a security-scoped
 * AppGroup container, where readAsStringAsync cannot reach. Copy it into our
 * own cache first — copyAsync runs natively and tolerates these URLs better
 * than direct reads. decodeURI handles percent-encoded paths (spaces, &, etc).
 */
export async function importTrotterFileFromIncomingUrl(rawUrl: string): Promise<Trip> {
  const decoded = decodeURI(rawUrl);
  const dest = `${FileSystem.cacheDirectory}imported_${Date.now()}.trotter`;
  await FileSystem.copyAsync({ from: decoded, to: dest });
  return importTrotterFileFromUri(dest);
}

/**
 * Import a .trotter file from a file URI (used by both picker and deep link).
 */
export async function importTrotterFileFromUri(uri: string): Promise<Trip> {
  const json = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const data: TrotterFile = JSON.parse(json);

  if (!data.title || !data.days || !Array.isArray(data.days)) {
    throw new Error('Invalid .trotter file: missing title or days');
  }

  const id = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    docUrl: '',
    title: data.title,
    days: data.days,
    defaultCurrency: data.defaultCurrency || 'USD',
    checklists: data.checklists,
  };
}
