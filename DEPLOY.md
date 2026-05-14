# Despliegue gratuito

Esta app necesita Vercel para servir la web y ejecutar `api/send-result.js`.
GitHub Pages no sirve para el envio de correo ni para guardar en Supabase porque no ejecuta funciones backend.

## 1. Crear la base de datos en Supabase

1. Crea un proyecto gratuito en Supabase.
2. Entra en SQL Editor.
3. Ejecuta el contenido de `database/schema.sql`.
4. Ve a Project Settings > API y copia:
   - Project URL
   - service_role key

La tabla que se crea se llama `metabolic_results`.

## 2. Configurar Resend

1. Crea o usa tu API key de Resend.
2. Usa un remitente verificado.
3. Para pruebas puedes usar `onboarding@resend.dev`, pero para produccion conviene verificar dominio.

## 3. Variables de entorno en Vercel

En Vercel > Project > Settings > Environment Variables:

```env
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Calculadora <tu-remitente@tudominio.com>
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGIN=https://tu-web.vercel.app
```

Usa `SUPABASE_SERVICE_ROLE_KEY` solo en Vercel, nunca en `app.js`.

## 4. Comprobar que funciona

1. Abre la web desplegada en Vercel.
2. Completa el formulario.
3. Acepta terminos.
4. Pulsa `Calcular ahora`.
5. Revisa Supabase > Table Editor > `metabolic_results`.
6. Revisa la bandeja del email introducido.

Si Resend falla, el resultado debe guardarse igualmente en Supabase con `email_sent=false` y `email_error`.
