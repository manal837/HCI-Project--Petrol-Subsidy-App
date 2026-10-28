export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function setStoredPin(pin: string): Promise<void> {
  const hashed = await hashPin(pin);
  localStorage.setItem('aasan_pin_hash', hashed);
  localStorage.setItem('aasan_pin_raw', pin);
}

export async function verifyPin(enteredPin: string): Promise<boolean> {
  const storedRaw = localStorage.getItem('aasan_pin_raw');
  if (storedRaw && storedRaw === enteredPin) return true;

  const storedHash = localStorage.getItem('aasan_pin_hash');
  if (!storedHash) {
    return enteredPin === '1234' || enteredPin === '0000';
  }

  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}