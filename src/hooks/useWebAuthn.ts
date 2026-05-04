import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '../api/supabase';

export function useWebAuthn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Verificar si el navegador soporta WebAuthn
  useEffect(() => {
    const checkWebAuthnSupport = () => {
      const supported = 
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function' &&
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== undefined;
      
      setIsSupported(supported);
    };

    checkWebAuthnSupport();
  }, []);

  // Registrar huella (vincular al usuario actual)
  const registerPasskey = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // Solicitar opciones de registro al servidor
      const response = await fetch('/api/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });

      if (!response.ok) throw new Error('Error al obtener opciones de registro');

      const options = await response.json();

      // Iniciar registro con WebAuthn
      const registration = await startRegistration(options);

      // Enviar credencial al servidor para verificar
      const verifyResponse = await fetch('/api/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration, userId: user.id }),
      });

      if (!verifyResponse.ok) throw new Error('Error al verificar registro');

      const result = await verifyResponse.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Autenticar con huella
  const authenticateWithPasskey = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Solicitar opciones de autenticación al servidor
      const response = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error('Error al obtener opciones de autenticación');

      const options = await response.json();

      // Iniciar autenticación con WebAuthn
      const authentication = await startAuthentication(options);

      // Enviar autenticación al servidor para verificar
      const verifyResponse = await fetch('/api/webauthn/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authentication }),
      });

      if (!verifyResponse.ok) throw new Error('Error al verificar autenticación');

      const result = await verifyResponse.json();
      
      // Iniciar sesión con Supabase usando el token
      if (result.token) {
        await supabase.auth.setSession({
          access_token: result.token,
          refresh_token: result.refreshToken,
        });
      }

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isLoading,
    error,
    registerPasskey,
    authenticateWithPasskey,
  };
}
