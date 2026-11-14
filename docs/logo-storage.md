# Almacenamiento de logos y salida de Appwrite

Astro puede seguir en Vercel. Google Sheets mantiene los proyectos y solicitudes;
este cambio afecta solo a los archivos de logos. No copia archivos, modifica
Sheets, crea infraestructura ni cambia el proveedor desplegado automáticamente.

## Contrato de almacenamiento

El endpoint valida y convierte los archivos a WebP con Sharp antes de llamar a
`LogoStorage.upload`. Cada adaptador devuelve una referencia que se guarda como
texto en la columna existente `ID del logo`, sin cambiar sus encabezados:

| Referencia | Lectura pública |
| --- | --- |
| ID sin prefijo (histórico) | Appwrite, o `LOGO_LEGACY_PUBLIC_BASE_URL/<ID>` después de copiarlo |
| `s3:project-logos/<uuid>.webp` | `LOGO_S3_PUBLIC_BASE_URL/project-logos/<uuid>.webp` |

Las lecturas se resuelven por referencia, independientemente del proveedor de
nuevos envíos. Así pueden convivir logos antiguos y nuevos. No se guarda una
URL firmada ni credenciales en Sheets. Las claves no se importan en el código
del navegador. La validación y las respuestas del formulario no cambian; si la
configuración o la subida falla, se devuelve 503 sin añadir una fila a Sheets.
Los envíos sin logo siguen funcionando sin configurar almacenamiento.

## Configuración

`LOGO_STORAGE_PROVIDER` admite `appwrite` (valor predeterminado si está vacío)
o `s3`. Un valor desconocido rechaza las subidas; no cambia a otro proveedor.

- **Appwrite:** `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`.
  Conserva el bucket `project-logos` y el permiso de lectura pública por archivo.
- **S3 compatible:** `LOGO_S3_REGION`, `LOGO_S3_BUCKET`,
  `LOGO_S3_ACCESS_KEY_ID`, `LOGO_S3_SECRET_ACCESS_KEY` y
  `LOGO_S3_PUBLIC_BASE_URL`. Los cinco son obligatorios para subir logos.
  `LOGO_S3_ENDPOINT` es opcional para AWS y obligatorio para apuntar a R2 u otro
  servicio compatible. `LOGO_S3_FORCE_PATH_STYLE` admite `true` o `false`;
  su valor predeterminado es `false`.

Para R2, usa `auto` como región y el endpoint S3 de tu cuenta
(`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, o el endpoint de jurisdicción
correspondiente). Para AWS S3, usa la región real del bucket y deja vacío el
endpoint. Consulta los ejemplos oficiales de [R2 con AWS SDK v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).

El bucket debe permitir escrituras desde el servidor y lecturas públicas de
logos mediante un dominio o CDN estable. `LOGO_S3_PUBLIC_BASE_URL` apunta a la
raíz pública del bucket (o al prefijo elegido), **no** al endpoint privado S3.
El adaptador no configura políticas ni envía ACLs por archivo. Usa credenciales
limitadas al bucket de logos. Las subidas son servidor a servidor; no necesitan
CORS de escritura en el navegador. Las bases públicas admiten HTTP para pruebas
locales; usa HTTPS en producción, sin usuario, contraseña, query ni fragmento.

No hay adaptadores de escritura nativos para Azure Blob, Google Cloud Storage
o Vercel Blob en este PR. Se pueden añadir implementando `LogoStorage` y un
prefijo propio en el resolver, sin modificar el formulario ni Sheets. Los
logos históricos ya pueden servirse desde cualquiera de ellos usando la base
pública de compatibilidad.

## Migración gradual

1. Guarda una copia de seguridad de Sheets y del bucket Appwrite. Inventaría
   todos los archivos referenciados, también en solicitudes pendientes y
   revisiones históricas, no solo los proyectos publicados. Conserva las copias
   fuera del repositorio.
2. Crea el almacenamiento de destino y su dominio público. Configura las
   variables S3 en un entorno de pruebas con `LOGO_STORAGE_PROVIDER=s3`.
   Envía un logo, comprueba sus bytes WebP, la lectura anónima y la referencia
   `s3:` en una hoja de pruebas. Simula credenciales incorrectas y comprueba
   que el formulario devuelve 503 sin añadir una fila. Esto requiere validar
   el servicio real; las pruebas automáticas del repo usan mocks.
3. Activa las nuevas subidas S3 en el hosting y vuelve a desplegar. Mantén
   `APPWRITE_ENDPOINT` y `APPWRITE_PROJECT_ID`: los IDs históricos aún se leen
   desde Appwrite. La API key deja de ser necesaria si no se sube allí.
4. Copia los archivos históricos a un prefijo separado, por ejemplo
   `legacy/<ID-original>`. **La clave final debe ser el ID exacto, sin añadir
   extensión**. Conserva los bytes originales y su `Content-Type`; no asumas
   que todos los archivos históricos son WebP. Verifica inventario, tamaño,
   integridad y lectura anónima de cada archivo. El corte de nuevas subidas a
   S3 debe terminar antes del inventario final y la última copia de Appwrite.
5. Solo cuando la copia esté completa, configura
   `LOGO_LEGACY_PUBLIC_BASE_URL=https://logos.example.com/legacy` y despliega.
   Los mismos IDs de Sheets ahora apuntan a sus copias sin editar las filas.
   Esta variable se aplica a **todos** los IDs históricos; no hay fallback por
   archivo si uno falta en destino. Comprueba el directorio y sus logos antes
   de retirar `APPWRITE_*`.
6. Conserva Appwrite y los respaldos durante el plazo de reversión que elijas.
   Después de verificar nuevas subidas y todos los logos antiguos, puedes
   retirar las variables y cancelar el servicio. La dependencia Appwrite se
   conserva aquí para permitir la transición y la reversión.

Cambiar de bucket o de proveedor S3 más adelante también requiere copiar
**todas** las claves `s3:` antes de cambiar la base pública: el prefijo identifica
el adaptador, no una cuenta o bucket concretos.

## Reversión y límites

Para volver a subir a Appwrite, restaura sus tres variables, cambia
`LOGO_STORAGE_PROVIDER=appwrite`, quita `LOGO_LEGACY_PUBLIC_BASE_URL` y despliega.
Mantén la configuración de lectura S3 y sus archivos: las filas creadas durante
la transición conservan referencias `s3:`. No regreses a una versión anterior
del código que desconozca esas referencias sin migrarlas primero.

No se borran logos automáticamente. Si la subida termina pero falla la escritura
en Sheets, puede quedar un archivo sin referencia, igual que antes; revisa esos
archivos antes de limpiarlos. Likes/comentarios de `feat/engagement-parked` y
los checks externos de Appwrite Sites/Lovable quedan fuera de esta migración.
