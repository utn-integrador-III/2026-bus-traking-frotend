# US-10: cola offline de reportes

La app movil usa SQLite como outbox persistente para reportes de incidentes de pasajeros. Cada reporte se escribe localmente antes de intentar enviarlo al backend. La fila solo se elimina cuando `POST /api/passenger/incidents` responde exitosamente.

## Integracion con formularios

Los formularios de reportes deben llamar a `submitPassengerIncident` desde `src/services/incidentService.ts` con el identificador del usuario autenticado, su access token y el borrador validado.

El resultado `synced` indica que el backend lo recibio y la fila local fue eliminada. El resultado `queued` indica que el reporte permanece en SQLite para sincronizacion posterior.

La cola separa los registros por usuario. Un access token solo intenta sincronizar los reportes pertenecientes al mismo `user.id`.

## Sincronizacion automatica

`useOfflineIncidentSync` se monta en `AppNavigator`. Para pasajeros autenticados, el hook ejecuta una sincronizacion inmediata al montarse o al cambiar la sesion (nuevo login, refresh de token). Ademas, NetInfo observa cambios de conectividad, espera 1.5 segundos y confirma nuevamente el acceso a internet antes de vaciar la cola. Las sincronizaciones concurrentes del mismo usuario se consolidan en una sola ejecucion.

### Errores y reintentos con backoff

Cada reporte fallido recibe `next_retry_at` calculado con backoff exponencial (`BASE_RETRY_DELAY_MS * 2^(attemptCount - 1)`, inicia en 2s). Maximo 5 intentos (`max_attempts`); al alcanzarlo, `next_retry_at` se fija en NULL y el reporte queda abandonado.

| Tipo de error | Comportamiento |
|---|---|
| Red (status 0) o 5xx | Marca el item con backoff y **detiene el lote** |
| Auth 401/403 | Marca el item con backoff y **detiene el lote** (se reintenta cuando la sesion cambia) |
| Validacion 4xx | Marca el item con backoff y **continua** con el siguiente |

El hook agenda un timer para el `next_retry_at` mas cercano. Al cambiar la sesion (token refresh), cancela cualquier timer pendiente y fuerza una sincronizacion inmediata ignorando el backoff.

## Limpieza de registros expirados (TTL)

Al inicializar la cola, `cleanupExpiredOfflineIncidents(7 dias)` elimina registros con mas de 7 dias de antiguedad que ya no tienen `next_retry_at` pendiente. Esto evita acumulacion infinita de reportes abandonados.

## Verificacion manual

1. Iniciar sesion como Passenger y abrir un formulario que use `submitPassengerIncident`.
2. Desactivar Wi-Fi y datos moviles.
3. Enviar uno o mas reportes y confirmar que el resultado sea `queued`.
4. Cerrar completamente la app y volver a abrirla.
5. Iniciar sesion con el mismo usuario.
6. Restaurar una conexion estable.
7. Confirmar en Supabase que los reportes fueron creados y que `countPendingOfflineIncidents(user.id)` retorna cero.

### Nuevos escenarios para validar

8. Enviar reporte con backend caido (500) y verificar que reintenta automaticamente cada 2s, 4s, 8s, 16s, 32s.
9. Enviar reporte con token expirado (401), refrescar sesion, y verificar que la sincronizacion se dispara inmediatamente con el nuevo token.
10. Enviar 3 reportes, fallar el primero con error de validacion (422) y verificar que los otros dos se procesan igual.
11. Dejar un reporte fallido por mas de 7 dias sin conexion, abrir la app y verificar que fue eliminado por TTL.

## Contrato del borrador

El payload persistido contiene `trip_id`, `type`, `description`, `latitude` y `longitude`. La validacion local replica los limites del backend: UUID valido, tipo de 1 a 80 caracteres, descripcion opcional de hasta 500 caracteres, latitud entre -90 y 90 y longitud entre -180 y 180.
