import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// Almacenamiento temporal (en producción usar Redis o base de datos)
const userChallenges = new Map<string, string>();
const authenticators = new Map<string, any>();

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === '/api/webauthn/register') {
    return handleRegister(req);
  } else if (path === '/api/webauthn/verify-registration') {
    return handleVerifyRegistration(req);
  } else if (path === '/api/webauthn/authenticate') {
    return handleAuthenticate(req);
  } else if (path === '/api/webauthn/verify-authentication') {
    return handleVerifyAuthentication(req);
  }

  return new Response('Not found', { status: 404 });
});

async function handleRegister(req: Request) {
  try {
    const { userId, email } = await req.json();

    const options = await generateRegistrationOptions({
      rpName: 'Nexo - App de Gastos',
      rpID: 'localhost', // Cambiar a tu dominio en producción
      userID: userId,
      userName: email || 'user',
      userDisplayName: email || 'Usuario',
      attestationType: 'none',
      excludeCredentials: [],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
      },
    });

    // Guardar challenge para verificar después
    userChallenges.set(userId, options.challenge);

    return new Response(JSON.stringify(options), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function handleVerifyRegistration(req: Request) {
  try {
    const { registration, userId } = await req.json();

    const challenge = userChallenges.get(userId);
    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Challenge no encontrado' }), { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: registration,
      expectedChallenge: challenge,
      expectedOrigin: 'http://localhost:5173', // Cambiar a tu dominio en producción
    });

    if (verification.verified) {
      // Guardar el autenticador
      authenticators.set(userId, {
        credentialID: verification.registrationInfo.credentialID,
        credentialPublicKey: verification.registrationInfo.credentialPublicKey,
        counter: verification.registrationInfo.counter,
      });

      // Eliminar challenge usado
      userChallenges.delete(userId);

      return new Response(JSON.stringify({ verified: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ verified: false }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function handleAuthenticate(req: Request) {
  try {
    const { email } = await req.json();

    // En producción, buscar el credentialID del usuario por email
    const options = await generateAuthenticationOptions({
      rpID: 'localhost', // Cambiar a tu dominio en producción
      userVerification: 'preferred',
      allowCredentials: [], // En producción, llenar con los credentialID del usuario
    });

    // Guardar challenge para verificar después
    userChallenges.set(email, options.challenge);

    return new Response(JSON.stringify(options), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function handleVerifyAuthentication(req: Request) {
  try {
    const { authentication } = await req.json();

    // En producción, obtener el autenticador del usuario
    const authenticator = authenticators.get('user_id'); // Cambiar a userId real

    if (!authenticator) {
      return new Response(JSON.stringify({ error: 'Autenticador no encontrado' }), { status: 400 });
    }

    const challenge = userChallenges.get('user_email'); // Cambiar a email real
    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Challenge no encontrado' }), { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: authentication,
      expectedChallenge: challenge,
      expectedOrigin: 'http://localhost:5173', // Cambiar a tu dominio en producción
      expectedRPID: 'localhost', // Cambiar a tu dominio en producción
      authenticator: {
        credentialID: authenticator.credentialID,
        credentialPublicKey: authenticator.credentialPublicKey,
        counter: authenticator.counter,
      },
    });

    if (verification.verified) {
      // Generar token de Supabase
      // En producción, usar Supabase Auth para generar el token
      const token = 'mock_token'; // Reemplazar con token real de Supabase

      return new Response(JSON.stringify({ verified: true, token }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ verified: false }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
