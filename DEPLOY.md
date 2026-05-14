# Despliegue gratuito

Esta app necesita Vercel para servir la web y ejecutar `api/send-result.js`.
GitHub Pages no sirve para el envio de correo ni para guardar en Supabase porque no ejecuta funciones backend.

## 1. Crear la base de datos en Supabase

1. Crea un proyecto gratuito en Supabase.
2. Entra en SQL Editor.
3. Ejecuta el contenido de `database/schema.sql`.
4. En el menu lateral de Supabase, entra en Project Settings.
5. Dentro de Project Settings, abre el apartado API.
6. En API Settings copia:
   - Project URL: aparece en la seccion Project URL.
   - service_role key: aparece en la seccion Project API keys. Usa la clave llamada `service_role` o `service_role secret`.

La `SUPABASE_URL` debe tener este formato, sin `/rest/v1` al final:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
```

Importante: no uses la `anon public key` para el backend. Para insertar desde `api/send-result.js` usamos la `service_role key` porque se ejecuta en Vercel, no en el navegador.

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
