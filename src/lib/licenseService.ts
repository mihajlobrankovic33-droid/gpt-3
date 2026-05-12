// License Service - Supabase-based license management
import { supabase } from "@/integrations/supabase/client";

export type AvatarType = 'rabbit' | 'owl' | 'fox' | 'panda' | 'cat' | 'penguin';

export interface License {
  id: string;
  user_name: string;
  unique_code: string;
  device_id: string | null;
  avatar: AvatarType;
  is_active: boolean;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

const DEVICE_ID_KEY = 'study-buddy-device-id';
const ADMIN_CODE = 'BOSS-0000-XP';

// Generate a unique device ID
export const generateDeviceId = (): string => {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${navigator.userAgent.slice(0, 20).replace(/\s/g, '')}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
};

// Get current device ID
export const getDeviceId = (): string => {
  return localStorage.getItem(DEVICE_ID_KEY) || generateDeviceId();
};

// Fetch all licenses (for admin panel)
export const fetchAllLicenses = async (): Promise<License[]> => {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching licenses:', error);
    return [];
  }

  return (data || []) as unknown as License[];
};

// Validate license key and check device lock via edge function
export const validateLicense = async (code: string): Promise<{
  valid: boolean;
  license?: License;
  error?: string;
  expired?: boolean;
}> => {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase.functions.invoke('validate-license', {
    body: {
      unique_code: code,
      device_id: deviceId
    }
  });

  if (error) {
    console.error('Error validating license:', error);
    return { valid: false, error: 'Greška pri proveri ključa.' };
  }

  if (!data.valid) {
    return { 
      valid: false, 
      error: data.error || 'Neispravan licencni ključ.',
      expired: data.expired
    };
  }

  return { valid: true, license: data.license as License };
};

// Check if license is still valid (for periodic checks) via edge function
export const checkLicenseStatus = async (code: string): Promise<{
  valid: boolean;
  expired?: boolean;
  error?: string;
}> => {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase.functions.invoke('validate-license', {
    body: {
      unique_code: code,
      device_id: deviceId
    }
  });

  if (error) {
    return { valid: false, error: 'Ključ nije pronađen.' };
  }

  if (!data.valid) {
    return { 
      valid: false, 
      error: data.error,
      expired: data.expired
    };
  }

  return { valid: true };
};

// Admin: Toggle license status
export const toggleLicenseStatus = async (licenseId: string, isActive: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('licenses')
    .update({ is_active: isActive })
    .eq('id', licenseId);

  if (error) {
    console.error('Error toggling license status:', error);
    return false;
  }

  return true;
};

// Admin: Reset device lock
export const resetDeviceLock = async (licenseId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('licenses')
    .update({ device_id: null })
    .eq('id', licenseId);

  if (error) {
    console.error('Error resetting device lock:', error);
    return false;
  }

  return true;
};

// Admin: Add days to expiry
export const extendLicense = async (licenseId: string, days: number): Promise<boolean> => {
  // First get current expiry
  const { data: current, error: fetchError } = await supabase
    .from('licenses')
    .select('expiry_date')
    .eq('id', licenseId)
    .single();

  if (fetchError) {
    console.error('Error fetching license:', fetchError);
    return false;
  }

  const license = current as unknown as Pick<License, 'expiry_date'>;
  const currentExpiry = license.expiry_date ? new Date(license.expiry_date) : new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('licenses')
    .update({ expiry_date: newExpiry.toISOString() })
    .eq('id', licenseId);

  if (error) {
    console.error('Error extending license:', error);
    return false;
  }

  return true;
};

// Check if code is admin
export const isAdminCode = (code: string): boolean => {
  return code.toUpperCase().trim() === ADMIN_CODE;
};

// Get days until expiry
export const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
