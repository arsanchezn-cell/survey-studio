'use client'

import { createClient } from '@/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  const supabase = createClient()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Survey Studio</h1>
          <p className="text-gray-500 mt-1 text-sm">Inicia sesión en tu cuenta</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          showLinks={true}
          providers={[]}
          redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                button_label: 'Iniciar sesión',
                link_text: '¿Ya tienes cuenta? Inicia sesión',
              },
              sign_up: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                button_label: 'Crear cuenta',
                link_text: '¿No tienes cuenta? Regístrate',
              },
            },
          }}
        />
      </div>
    </div>
  )
}