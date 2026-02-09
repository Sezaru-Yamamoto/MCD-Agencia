'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { Button, Card } from '@/components/ui';
import { verifyEmail } from '@/lib/api/auth';

export default function VerifyEmailPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No se proporcionó un token de verificación.');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('¡Tu correo electrónico ha sido verificado exitosamente!');
      } catch (error: unknown) {
        const err = error as { message?: string };
        setStatus('error');
        setMessage(
          err.message || 'El enlace de verificación es inválido o ha expirado.'
        );
      }
    };

    verify();
  }, [token]);

  return (
    <Card className="w-full max-w-lg mt-6">
      <div className="text-center py-6">
        {status === 'loading' && (
          <>
            <ArrowPathIcon className="h-16 w-16 text-cyan-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Verificando tu correo...
            </h1>
            <p className="text-neutral-400">
              Espera un momento mientras verificamos tu correo electrónico.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Correo verificado!
            </h1>
            <p className="text-neutral-400 mb-6">{message}</p>
            <Link href={`/${locale}/login`}>
              <Button className="w-full" size="lg">
                Iniciar Sesión
              </Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              No se pudo verificar
            </h1>
            <p className="text-neutral-400 mb-6">{message}</p>
            <div className="space-y-3">
              <Link href={`/${locale}/login`}>
                <Button className="w-full" size="lg">
                  Ir a Iniciar Sesión
                </Button>
              </Link>
              <p className="text-neutral-500 text-sm">
                Si ya verificaste tu correo, puedes iniciar sesión directamente.
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
