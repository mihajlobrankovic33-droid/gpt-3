// Puskice (Cheat Sheets) Daily Limit Service

const STORAGE_KEY = "studybuddy-puskice";
const DAILY_LIMIT = 5;

interface PuskiceData {
  date: string;
  count: number;
  items: PuskiceItem[];
}

export interface PuskiceItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getData(): PuskiceData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { date: getTodayDate(), count: 0, items: [] };
  }
  
  const data: PuskiceData = JSON.parse(stored);
  
  // Reset count if it's a new day
  if (data.date !== getTodayDate()) {
    return { date: getTodayDate(), count: 0, items: data.items };
  }
  
  return data;
}

function saveData(data: PuskiceData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function canCreatePuskica(): boolean {
  const data = getData();
  return data.count < DAILY_LIMIT;
}

export function getRemainingToday(): number {
  const data = getData();
  return Math.max(0, DAILY_LIMIT - data.count);
}

export function getTodayCount(): number {
  return getData().count;
}

export function getAllPuskice(): PuskiceItem[] {
  return getData().items;
}

export function createPuskica(title: string, content: string, imageUrl?: string, isAdmin: boolean = false): { success: boolean; item?: PuskiceItem } {
  const data = getData();
  
  // Admin bypasses daily limit
  if (!isAdmin && data.count >= DAILY_LIMIT) {
    return { success: false };
  }
  
  const newItem: PuskiceItem = {
    id: crypto.randomUUID(),
    title,
    content,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
  
  // Only increment count for non-admin users
  if (!isAdmin) {
    data.count += 1;
  }
  data.items.push(newItem);
  saveData(data);
  
  return { success: true, item: newItem };
}

export function updatePuskica(id: string, title: string, content: string, imageUrl?: string): boolean {
  const data = getData();
  const index = data.items.findIndex(item => item.id === id);
  
  if (index === -1) return false;
  
  data.items[index] = {
    ...data.items[index],
    title,
    content,
    imageUrl: imageUrl !== undefined ? imageUrl : data.items[index].imageUrl,
  };
  saveData(data);
  return true;
}

export function deletePuskica(id: string): void {
  const data = getData();
  data.items = data.items.filter(item => item.id !== id);
  saveData(data);
}
