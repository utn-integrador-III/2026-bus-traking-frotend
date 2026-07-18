# US-10: cola offline de reportes

La app movil usa SQLite como outbox persistente para reportes de incidentes de pasajeros. Cada reporte se escribe localmente antes de intentar enviarlo al backend. La fila solo se elimina cuando `POST /api/passenger/incidents` responde exitosamente.

## Integracion con formularios

Los formularios de reportes deben llamar a `submitPassengerIncident` desde `src/services/incidentService.ts` con el identificador del usuario autenticado, su access token y el borrador validado.

El resultado `synced` indica que el backend lo recibio y la fila local fue eliminada. El resultado `queued` indica que el reporte permanece en SQLite para sincronizacion posterior.

La cola separa los registros por usuario. Un access token solo intenta sincronizar los reportes pertenecientes al mismo `user.id`.

## Sincronizacion automatica

`useOfflineIncidentSync` se monta en `AppNavigator`. Para pasajeros autenticados, NetInfo observa cambios de conectividad, espera 1.5 segundos y confirma nuevamente el acceso a internet antes de vaciar la cola. Las sincronizaciones concurrentes del mismo usuario se consolidan en una sola ejecucion.

Los errores de red, autenticacion y servidor conservan el reporte y detienen el lote. Los errores de validacion conservan el registro fallido, registran el error y permiten continuar con los siguientes elementos. Cada intento almacena fecha, cantidad de intentos y el ultimo mensaje de error.

## Verificacion manual

1. Iniciar sesion como Passenger y abrir un formulario que use `submitPassengerIncident`.
2. Desactivar Wi-Fi y datos moviles.
3. Enviar uno o mas reportes y confirmar que el resultado sea `queued`.
4. Cerrar completamente la app y volver a abrirla.
5. Iniciar sesion con el mismo usuario.
6. Restaurar una conexion estable.
7. Confirmar en Supabase que los reportes fueron creados y que `countPendingOfflineIncidents(user.id)` retorna cero.

## Contrato del borrador

El payload persistido contiene `trip_id`, `type`, `description`, `latitude` y `longitude`. La validacion local replica los limites del backend: UUID valido, tipo de 1 a 80 caracteres, descripcion opcional de hasta 500 caracteres, latitud entre -90 y 90 y longitud entre -180 y 180.
