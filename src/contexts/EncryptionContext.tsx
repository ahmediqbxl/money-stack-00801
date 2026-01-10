import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  getStoredEncryptionPassword, 
  storeEncryptionPassword, 
  clearEncryptionPassword,
  encryptValue,
  decryptValue
} from '@/lib/encryption';
import { useAuth } from './AuthContext';

interface EncryptionContextType {
  isEncryptionEnabled: boolean;
  hasEncryptionKey: boolean;
  setEncryptionPassword: (password: string) => void;
  getEncryptionPassword: () => string | null;
  clearEncryption: () => void;
  encryptField: (value: string) => Promise<string>;
  decryptField: (value: string) => Promise<string>;
  encryptNumber: (value: number) => Promise<string>;
  decryptNumber: (value: string) => Promise<number>;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null);

export const useEncryption = () => {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
};

export const EncryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasEncryptionKey, setHasEncryptionKey] = useState(false);
  
  // Zero-knowledge encryption is always enabled
  const isEncryptionEnabled = true;

  useEffect(() => {
    // Check if encryption password exists in session storage
    const storedPassword = getStoredEncryptionPassword();
    setHasEncryptionKey(!!storedPassword);
  }, []);

  const setEncryptionPassword = useCallback((password: string) => {
    storeEncryptionPassword(password);
    setHasEncryptionKey(true);
  }, []);

  const getEncryptionPassword = useCallback(() => {
    return getStoredEncryptionPassword();
  }, []);

  const clearEncryption = useCallback(() => {
    clearEncryptionPassword();
    setHasEncryptionKey(false);
  }, []);

  const encryptField = useCallback(async (value: string): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');
    const password = getStoredEncryptionPassword();
    if (!password) throw new Error('Encryption password not set');
    return encryptValue(value, password, user.id);
  }, [user?.id]);

  const decryptField = useCallback(async (value: string): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');
    const password = getStoredEncryptionPassword();
    if (!password) throw new Error('Encryption password not set');
    return decryptValue(value, password, user.id);
  }, [user?.id]);

  const encryptNumberValue = useCallback(async (value: number): Promise<string> => {
    return encryptField(String(value));
  }, [encryptField]);

  const decryptNumberValue = useCallback(async (value: string): Promise<number> => {
    const decrypted = await decryptField(value);
    return parseFloat(decrypted);
  }, [decryptField]);

  return (
    <EncryptionContext.Provider
      value={{
        isEncryptionEnabled,
        hasEncryptionKey,
        setEncryptionPassword,
        getEncryptionPassword,
        clearEncryption,
        encryptField,
        decryptField,
        encryptNumber: encryptNumberValue,
        decryptNumber: decryptNumberValue,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
};
