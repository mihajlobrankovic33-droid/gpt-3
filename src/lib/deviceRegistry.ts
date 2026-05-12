// Device Registry - License Key System
export type AvatarType = 'rabbit' | 'owl' | 'fox' | 'panda' | 'cat' | 'penguin';

export interface DeviceEntry {
  key: string;
  name: string;
  avatar: AvatarType;
  status: 'active' | 'expired';
}

// Map avatar names to theme IDs
export const avatarNameToId: Record<string, AvatarType> = {
  'Bunny Scholar': 'rabbit',
  'Wise Owl': 'owl',
  'Clever Fox': 'fox',
  'Zen Panda': 'panda',
  'Curious Cat': 'cat',
  'Cool Penguin': 'penguin',
};

export const DEVICE_REGISTRY: DeviceEntry[] = [
  { key: 'BOSS-0000-XP', name: 'Admin', avatar: 'rabbit', status: 'active' },
  { key: 'OWL-2988-WX', name: 'Korisnik 1', avatar: 'owl', status: 'active' },
  { key: 'BUN-1142-ST', name: 'Korisnik 2', avatar: 'rabbit', status: 'active' },
  { key: 'FOX-0051-QR', name: 'Korisnik 3', avatar: 'fox', status: 'active' },
  { key: 'PAN-8832-ZZ', name: 'Korisnik 4', avatar: 'panda', status: 'active' },
  { key: 'CAT-9910-MM', name: 'Korisnik 5', avatar: 'cat', status: 'active' },
  { key: 'PEN-4421-CC', name: 'Korisnik 6', avatar: 'penguin', status: 'active' },
];

// Device tracking per license key
const DEVICE_STORAGE_KEY = 'study-buddy-devices';

interface DeviceInfo {
  deviceId: string;
  lastSeen: number;
  userAgent: string;
}

interface DeviceTracking {
  [licenseKey: string]: DeviceInfo[];
}

// Generate a unique device ID
export const generateDeviceId = (): string => {
  const stored = localStorage.getItem('study-buddy-device-id');
  if (stored) return stored;
  
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('study-buddy-device-id', id);
  return id;
};

// Get device tracking from localStorage
export const getDeviceTracking = (): DeviceTracking => {
  try {
    const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save device tracking to localStorage
export const saveDeviceTracking = (tracking: DeviceTracking): void => {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(tracking));
};

// Register current device for a license key
export const registerDevice = (licenseKey: string): void => {
  const deviceId = generateDeviceId();
  const tracking = getDeviceTracking();
  
  if (!tracking[licenseKey]) {
    tracking[licenseKey] = [];
  }
  
  const existingIndex = tracking[licenseKey].findIndex(d => d.deviceId === deviceId);
  const deviceInfo: DeviceInfo = {
    deviceId,
    lastSeen: Date.now(),
    userAgent: navigator.userAgent.slice(0, 100),
  };
  
  if (existingIndex >= 0) {
    tracking[licenseKey][existingIndex] = deviceInfo;
  } else {
    tracking[licenseKey].push(deviceInfo);
  }
  
  saveDeviceTracking(tracking);
};

// Get device count for a license key
export const getDeviceCount = (licenseKey: string): number => {
  const tracking = getDeviceTracking();
  return tracking[licenseKey]?.length || 0;
};

// Reset devices for a license key (keep only current device)
export const resetDevices = (licenseKey: string): void => {
  const tracking = getDeviceTracking();
  const deviceId = generateDeviceId();
  
  tracking[licenseKey] = [{
    deviceId,
    lastSeen: Date.now(),
    userAgent: navigator.userAgent.slice(0, 100),
  }];
  
  saveDeviceTracking(tracking);
};

// Clear all devices for a key
export const clearAllDevices = (licenseKey: string): void => {
  const tracking = getDeviceTracking();
  tracking[licenseKey] = [];
  saveDeviceTracking(tracking);
};

// Validate license key
export const validateLicenseKey = (key: string): DeviceEntry | null => {
  const entry = DEVICE_REGISTRY.find(d => d.key === key.toUpperCase().trim());
  return entry || null;
};

// Check if license is active
export const isLicenseActive = (key: string): boolean => {
  const entry = validateLicenseKey(key);
  return entry?.status === 'active';
};

// Admin key check
export const isAdminKey = (key: string): boolean => {
  return key.toUpperCase().trim() === 'BOSS-0000-XP';
};
