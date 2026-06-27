# US-00A - Registro publico de pasajeros y RBAC base

## Objetivo

Implementar el autoregistro publico de pasajeros en la app movil y asegurar que el backend bloquee cualquier intento de escalacion vertical de privilegios hacia roles operativos como Driver o Admin.

## Trazabilidad documental

- `Functional and non-functional requirements - Buses Project.pdf`
  - FR-01: registro publico y login seguro para Passengers con email/password u OAuth.
  - FR-02: solo Administrators pueden crear, modificar o desactivar cuentas Driver.
  - FR-04: todo autoregistro publico debe asignar rol `Passenger` por defecto y bloquear escalacion a `Driver` o `Admin`.
  - FR-05: validar tokens de sesion y restringir vistas por RBAC.
  - NFR-02, NFR-04, NFR-10, NFR-13: autenticacion/autorizacion, hashing de passwords, validacion de input y bloqueo de acceso no autorizado.
- `Release Plan and User Stories - Bus Tracking Project.pdf`
  - Hito 1, Authentication & basic RBAC: passenger self-registration, admin-managed driver accounts, default Passenger role, per-request token validation and view-level access control.

## Alcance frontend

- Crear la interfaz movil de autoregistro publico en `src/auth/RegisterPassengerScreen.tsx`.
- Reemplazar el placeholder actual por un formulario usable con:
  - nombre completo;
  - correo electronico;
  - telefono opcional;
  - password;
  - confirmacion de password;
  - estado de carga, errores y confirmacion de exito.
- Validar en cliente antes de enviar:
  - nombre requerido;
  - email con formato valido;
  - password minimo 8 caracteres;
  - confirmacion igual al password;
  - telefono opcional con longitud razonable si se ingresa.
- Consumir el backend desde `src/services/apiClient.ts` usando `EXPO_PUBLIC_API_URL`.
- Crear un servicio de autenticacion frontend, por ejemplo `src/services/authService.ts`, para encapsular `POST /api/auth/register`.
- Enviar solo campos permitidos por backend: `name`, `email`, `password`, `phone`.
- No enviar `role`, `is_admin`, `is_driver`, `permissions`, `capabilities` ni ningun campo que intente definir privilegios desde el cliente.
- Al registro exitoso, mostrar feedback claro y dejar preparada la transicion futura hacia login o pantalla inicial autenticada.
- Mantener la separacion de capas: la pantalla no debe llamar directamente a `fetch`; debe usar `services/`.

## Alcance backend

- Confirmar o implementar `POST /api/auth/register` para registro publico de Passenger.
- Validar el body con esquema estricto:
  - aceptar `name`, `email`, `password`, `phone`;
  - rechazar claves desconocidas como `role`, `user_role`, `is_driver`, `is_admin` o `capabilities`.
- Crear la cuenta en Supabase Auth usando credenciales nativas email/password.
- Forzar el rol `Passenger` en backend, independientemente del payload recibido.
- Crear el perfil local de usuario con `role = Passenger`.
- Crear el perfil relacionado de Passenger.
- Mantener la creacion de cuentas Driver fuera del registro publico; debe existir solo mediante endpoint/admin flow protegido.
- Agregar o verificar tests que cubran:
  - registro valido de Passenger;
  - rechazo de payload con `role: "Driver"`;
  - rechazo de payload con `role: "Admin"`;
  - respuesta consistente cuando el email ya existe;
  - no creacion parcial si falla Supabase Auth o la persistencia local.

## Conexion frontend-backend

Flujo esperado:

1. El usuario abre la pantalla publica de registro en la app movil.
2. El frontend valida campos basicos localmente.
3. El frontend llama `POST ${EXPO_PUBLIC_API_URL}/api/auth/register`.
4. El request contiene unicamente:

```json
{
  "name": "Nombre Apellido",
  "email": "pasajero@example.com",
  "password": "Password123",
  "phone": "88888888"
}
```

5. El backend valida el body con esquema estricto.
6. El backend crea la identidad en Supabase Auth.
7. El backend crea el usuario local con `role: "Passenger"`.
8. El backend crea el perfil Passenger.
9. El backend responde con el usuario y perfil creado.
10. El frontend muestra exito y no asume ningun rol que no venga de backend.

Flujo adicional para Google OAuth:

1. El usuario toca `Continuar con Google`.
2. El frontend abre Google OAuth mediante Supabase Auth y `expo-web-browser`.
3. Google devuelve el callback a la app con scheme `bustrack://auth/callback`.
4. El frontend intercambia el `code` con Supabase Auth y guarda la sesion en AsyncStorage.
5. El backend debe seguir siendo la fuente de verdad para rol/perfil: cualquier provisioning local posterior debe crear o resolver Passenger, nunca Driver/Admin desde el cliente.

Flujo adicional para solicitud de adulto mayor:

1. El usuario activa el toggle de adulto mayor.
2. El frontend solicita fecha de nacimiento y selecciona la imagen del documento.
3. El frontend llama `POST ${EXPO_PUBLIC_API_URL}/api/auth/senior-document/upload-url` con `email`, `file_name` y `content_type`.
4. El backend devuelve `bucket`, `path`, `signed_url` y `token`.
5. El frontend sube la imagen a Supabase Storage usando la `signed_url`.
6. El frontend llama `POST /api/auth/register` enviando `is_senior_request: true`, `birth_date` y `document_image_path`.
7. El backend crea el Passenger con solicitud senior pendiente, guarda la referencia del documento en bucket `cedulas` y evita aceptar roles desde el cliente.

## Contrato propuesto de API

Endpoint:

```http
POST /api/auth/register
Content-Type: application/json
```

Body permitido:

```ts
type RegisterPassengerRequest = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  is_senior_request?: boolean;
  birth_date?: string;
  document_image_path?: string;
};
```


Endpoint para preparar subida de documento senior:

```http
POST /api/auth/senior-document/upload-url
Content-Type: application/json
```

Body permitido:

```ts
type SeniorDocumentUploadUrlRequest = {
  email: string;
  file_name: string;
  content_type: "image/jpeg" | "image/png" | "image/webp";
};
```

Respuesta esperada:

```ts
type SeniorDocumentUploadUrlResponse = {
  bucket: "cedulas";
  path: string;
  signed_url: string;
  token: string | null;
};
```

Respuesta esperada:

```ts
type RegisterPassengerResponse = {
  user_id: string;
  role: "Passenger";
  passenger: {
    user_id: string;
    phone: string | null;
  };
};
```

Errores esperados:

- `400`: body invalido o claves no permitidas.
- `409`: email ya registrado.
- `500`: fallo creando cuenta/perfil.

## Puntos donde se entrelazan front y back

- El frontend depende de `EXPO_PUBLIC_API_URL` y del contrato real de `/api/auth/register`.
- El backend depende de que el frontend no intente gestionar roles, pero no debe confiar en eso: debe bloquearlo igualmente.
- La UI debe mostrar errores que provienen del backend, especialmente validacion y email duplicado.
- El RBAC posterior depende de que el backend devuelva/registre `Passenger` como rol real.
- La navegacion futura del frontend debe consultar sesion/rol desde backend o JWT validado, no desde input del formulario.

## Criterios de aceptacion

- Un pasajero puede registrarse desde la app movil con email/password.
- El formulario es usable en telefono y tablet.
- El frontend no envia campos de rol.
- Un request manipulado con `role: "Driver"` es rechazado por backend.
- Un request manipulado con `role: "Admin"` es rechazado por backend.
- Todo registro publico exitoso queda con rol `Passenger`.
- Driver y Admin no pueden crearse desde el flujo publico.
- La documentacion del alcance queda trazada a FR-01, FR-02, FR-04, FR-05 y Hito 1.

## Orden sugerido de trabajo

1. Backend: verificar/ajustar esquema estricto de registro.
2. Backend: agregar tests explicitos para escalacion a `Driver` y `Admin`.
3. Backend: confirmar respuesta de `/api/auth/register`.
4. Frontend: crear `apiClient`.
5. Frontend: crear `authService.registerPassenger`.
6. Frontend: construir formulario y validaciones.
7. Frontend: conectar submit con backend.
8. Frontend + Backend: probar flujo exitoso y payload manipulado.
