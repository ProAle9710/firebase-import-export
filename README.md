# 🔥 Firebase Utils - Herramientas Unificadas para Firestore

Herramientas unificadas para exportar, importar, buscar y gestionar datos de Firestore entre proyectos de Firebase.

## 📋 Requisitos

- Node.js (v14 o superior)
- npm
- Archivos de credenciales de Firebase (service account keys)

## 🚀 Instalación

```bash
npm install
```

O usando el script:

```bash
npm run install-deps
```

## 📦 Dependencias

- `firebase-admin`: SDK de Firebase Admin para Node.js

## 🛠️ Uso

Todas las funcionalidades están unificadas en un solo archivo: `firebase-utils.js`

### Sintaxis General

```bash
node firebase-utils.js <acción> [opciones]
```

### Acciones Disponibles

- `-e, --export` - Exportar todas las colecciones de Firestore
- `-i, --import` - Importar datos desde un archivo JSON
- `-s, --search` - Buscar un valor en todas las colecciones
- `-t, --test` - Probar permisos de la cuenta de servicio

### Opciones Comunes

- `-k, --key <archivo>` - Archivo de credenciales de Firebase (requerido para todas las acciones)
- `-h, --help` - Mostrar ayuda

---

## 📤 1. Exportar Datos de Firestore

Exporta todas las colecciones de un proyecto de Firestore a un archivo JSON:

```bash
node firebase-utils.js -e -k <archivo-key.json> [-o <archivo-salida.json>]
```

**Parámetros:**
- `-k, --key <archivo>` (requerido): Ruta al archivo de credenciales del proyecto ORIGEN
- `-o, --output <archivo>` (opcional): Nombre del archivo de salida (por defecto: `backup.json`)

**Ejemplos:**
```bash
# Exportar con nombre por defecto
node firebase-utils.js -e -k keys/firebase-key.json

# Exportar con nombre personalizado
node firebase-utils.js --export --key keys/firebase-key.json -o mi-backup.json
```

---

## 📥 2. Importar Datos a Firestore

Importa datos desde un archivo JSON de backup a un proyecto de Firestore:

```bash
node firebase-utils.js -i -k <archivo-key-destino.json> -f <archivo-backup.json>
```

**Parámetros:**
- `-k, --key <archivo>` (requerido): Ruta al archivo de credenciales del proyecto DESTINO
- `-f, --file <archivo>` (requerido): Ruta al archivo de backup a importar

**Ejemplos:**
```bash
node firebase-utils.js -i -k keys/dest-key.json -f backup.json
node firebase-utils.js --import --key keys/dest-key.json --file mi-backup.json
```

---

## 🔍 3. Buscar en Firestore

Busca un valor en todas las colecciones y campos de Firestore (similar a buscar en todas las columnas de una tabla en MySQL):

```bash
node firebase-utils.js -s -k <archivo-key.json> -v <valor> [opciones]
```

**Parámetros:**
- `-k, --key <archivo>` (requerido): Ruta al archivo de credenciales de Firebase
- `-v, --value <valor>` (requerido): Valor a buscar en todos los campos

**Opciones:**
- `--collection <nombre>`: Buscar solo en una colección específica
- `--exact`: Buscar coincidencias exactas (case-sensitive)
- `--case-sensitive`: Búsqueda case-sensitive (por defecto es case-insensitive)
- `--limit <número>`: Limitar número de resultados por colección (por defecto: 100)
- `--output <archivo>`: Guardar resultados en un archivo JSON

**Ejemplos:**
```bash
# Buscar en todas las colecciones
node firebase-utils.js -s -k keys/firebase-key.json -v "juan@email.com"

# Buscar solo en una colección específica
node firebase-utils.js --search --key keys/firebase-key.json --value "12345" --collection usuarios

# Búsqueda exacta y case-sensitive
node firebase-utils.js -s -k keys/firebase-key.json -v "Admin" --exact --case-sensitive

# Limitar resultados y guardar en archivo
node firebase-utils.js -s -k keys/firebase-key.json -v "test" --limit 50 --output resultados.json
```

**Características:**
- ✅ Busca en **todas las colecciones** y **todos los campos** de forma recursiva
- ✅ Busca en objetos anidados y arrays
- ✅ Búsqueda parcial o exacta
- ✅ Case-sensitive o case-insensitive
- ✅ Muestra la ruta completa del campo donde se encontró la coincidencia
- ✅ Puede guardar resultados en un archivo JSON

---

## ✅ 4. Probar Permisos

Verifica que las credenciales tengan los permisos necesarios:

```bash
node firebase-utils.js -t -k <archivo-key.json>
```

**Parámetros:**
- `-k, --key <archivo>` (requerido): Ruta al archivo de credenciales de Firebase

**Ejemplo:**
```bash
node firebase-utils.js -t -k keys/firebase-key.json
```

---

## 📝 Scripts NPM

También puedes usar los scripts definidos en `package.json`:

```bash
# Exportar (requiere pasar -k y -o como argumentos adicionales)
npm run export -- -k keys/firebase-key.json -o backup.json

# Importar (requiere pasar -k y -f como argumentos adicionales)
npm run import -- -k keys/dest-key.json -f backup.json

# Buscar (requiere pasar -k y -v como argumentos adicionales)
npm run search -- -k keys/firebase-key.json -v "valor"

# Probar permisos (requiere pasar -k como argumento adicional)
npm run test -- -k keys/firebase-key.json

# Instalar dependencias
npm run install-deps
```

**Nota:** Los scripts npm requieren pasar los parámetros adicionales después de `--`.

---

## ⚠️ Consideraciones Importantes

1. **Permisos**: Asegúrate de que las cuentas de servicio tengan los roles necesarios:
   - Para exportar: `roles/datastore.viewer` o superior
   - Para importar: `roles/datastore.user` o `roles/owner`
   - Para buscar: `roles/datastore.viewer` o superior
   - Para probar: `roles/datastore.viewer` o superior

2. **Límites de Firestore**: 
   - Los batches están limitados a 500 operaciones
   - El script maneja automáticamente colecciones grandes dividiéndolas en múltiples batches

3. **Timestamps**: El script convierte automáticamente los timestamps de Firestore al formato correcto

4. **Errores**: Si alguna colección falla durante la importación, el script continúa con las demás y muestra un resumen al final

5. **Búsqueda**: La búsqueda puede ser lenta en bases de datos grandes. Usa `--limit` para limitar resultados y `--collection` para buscar en colecciones específicas.

## 📊 Formato del Backup

El archivo de backup es un JSON con la siguiente estructura:

```json
{
  "nombreColeccion1": {
    "idDocumento1": {
      "campo1": "valor1",
      "campo2": "valor2",
      "timestamp": {
        "_seconds": 1234567890,
        "_nanoseconds": 0
      }
    }
  },
  "nombreColeccion2": {
    ...
  }
}
```

## 🔍 Solución de Problemas

### Error: "Cannot modify a WriteBatch that has been committed"
Este error ya está resuelto en la versión actual. Si lo ves, asegúrate de usar la última versión del script.

### Error: "Page size must be nonnegative"
Este es un error conocido de la herramienta `firestore-export`. Usa este script en su lugar.

### Error: "permission-denied"
Verifica que la cuenta de servicio tenga los permisos necesarios usando:
```bash
node firebase-utils.js -t -k keys/firebase-key.json
```

### Ayuda Adicional
Para ver la ayuda de una acción específica:
```bash
node firebase-utils.js <acción> --help
```

Por ejemplo:
```bash
node firebase-utils.js -e --help
node firebase-utils.js -s --help
```

## 🔄 Migración desde Versión Anterior

Si estabas usando los archivos individuales (`export-firestore.js`, `import-firestore.js`, etc.), puedes seguir usándolos o migrar al nuevo sistema unificado:

**Antes:**
```bash
node export-firestore.js keys/firebase-key.json backup.json
```

**Ahora:**
```bash
node firebase-utils.js -e -k keys/firebase-key.json -o backup.json
```

Los archivos antiguos siguen funcionando, pero se recomienda usar el nuevo sistema unificado.

## 📄 Licencia

ISC
