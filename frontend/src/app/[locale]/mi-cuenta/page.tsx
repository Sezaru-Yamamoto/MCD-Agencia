'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, CalendarIcon } from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/api/auth';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';

const profileSchema = z.object({
  first_name: z.string().min(2, 'Nombre requerido'),
  last_name: z.string().min(2, 'Apellido requerido'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      await updateProfile(data);
      await refreshUser();
      toast.success('Perfil actualizado');
      setIsEditing(false);
    } catch {
      toast.error('Error al actualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.full_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-neutral-800"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center text-3xl font-bold text-white">
                {getInitials(user.full_name || user.email)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-white">{user.full_name}</h2>
            <p className="text-neutral-400">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <Badge variant={user.is_email_verified ? 'success' : 'warning'}>
                {user.is_email_verified ? 'Email verificado' : 'Email no verificado'}
              </Badge>
              {user.role && (
                <Badge variant="cyan">{user.role.display_name}</Badge>
              )}
            </div>
          </div>

          {/* Edit Button */}
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Editar perfil
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  leftIcon={<UserCircleIcon className="h-5 w-5" />}
                  error={errors.first_name?.message}
                  {...register('first_name')}
                />
                <Input
                  label="Apellido"
                  error={errors.last_name?.message}
                  {...register('last_name')}
                />
              </div>

              <Input
                label="Teléfono"
                leftIcon={<PhoneIcon className="h-5 w-5" />}
                placeholder="(555) 123-4567"
                {...register('phone')}
              />

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isLoading}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-neutral-500">Nombre completo</label>
                  <p className="text-white mt-1 flex items-center gap-2">
                    <UserCircleIcon className="h-5 w-5 text-neutral-400" />
                    {user.full_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Email</label>
                  <p className="text-white mt-1 flex items-center gap-2">
                    <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                    {user.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Teléfono</label>
                  <p className="text-white mt-1 flex items-center gap-2">
                    <PhoneIcon className="h-5 w-5 text-neutral-400" />
                    {user.phone || 'No especificado'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Fecha de nacimiento</label>
                  <p className="text-white mt-1 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-neutral-400" />
                    {user.date_of_birth ? formatDate(user.date_of_birth) : 'No especificada'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <label className="text-sm text-neutral-500">Idioma preferido</label>
                <p className="text-white mt-1">
                  {user.preferred_language === 'en' ? 'English' : 'Español'}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <label className="text-sm text-neutral-500">Miembro desde</label>
                <p className="text-white mt-1">{formatDate(user.created_at)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Consent */}
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de comunicación</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-white">Recibir ofertas y novedades</p>
              <p className="text-sm text-neutral-400">
                Te enviaremos información sobre promociones y nuevos productos
              </p>
            </div>
            <input
              type="checkbox"
              checked={user.marketing_consent}
              onChange={async (e) => {
                try {
                  await updateProfile({ marketing_consent: e.target.checked });
                  await refreshUser();
                  toast.success('Preferencias actualizadas');
                } catch {
                  toast.error('Error al actualizar');
                }
              }}
              className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-neutral-950"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
