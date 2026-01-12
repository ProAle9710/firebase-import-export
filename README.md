# 🔥 Firestore Export/Import Tools

Herramientas para exportar e importar datos de Firestore entre proyectos de Firebase.

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

### 1. Verificar Permisos

Antes de exportar o importar, verifica que las credenciales tengan los permisos necesarios:

```bash
# Verificar permisos de lectura (para exportar)
node test-permissions.js <archivo-key.json>

# Verificar permisos de escritura (para importar)
node test-landes-permissions.js <archivo-key.json>
```

**Ejemplo:**
```bash
node test-permissions.js banking-key.json
```

### 2. Exportar Datos de Firestore

Exporta todas las colecciones de un proyecto de Firestore a un archivo JSON:

```bash
node export-firestore.js <archivo-key.json> [archivo-salida.json]
```

**Parámetros:**
- `archivo-key.json` (requerido): Ruta al archivo de credenciales del proyecto ORIGEN
- `archivo-salida.json` (opcional): Nombre del archivo de salida (por defecto: `backup.json`)

**Ejemplo:**
```bash
# Exportar con nombre por defecto
node export-firestore.js banking-key.json

# Exportar con nombre personalizado
node export-firestore.js banking-key.json mi-backup.json
```

### 3. Importar Datos a Firestore

Importa datos desde un archivo JSON de backup a un proyecto de Firestore:

```bash
node import-firestore.js <archivo-key-destino.json> <archivo-backup.json>
```

**Parámetros:**
- `archivo-key-destino.json` (requerido): Ruta al archivo de credenciales del proyecto DESTINO
- `archivo-backup.json` (requerido): Ruta al archivo de backup a importar

**Ejemplo:**
```bash
node import-firestore.js banking-landes-key.json banking-backup.json
```

## 📝 Scripts NPM

También puedes usar los scripts definidos en `package.json`:

```bash
# Exportar
npm run export

# Importar
npm run import

# Verificar permisos
npm run test-permissions

# Instalar dependencias
npm run install-deps
```

**Nota:** Los scripts npm requieren que modifiques los archivos para usar rutas relativas o pasar los parámetros de otra manera.

## ⚠️ Consideraciones Importantes

1. **Permisos**: Asegúrate de que las cuentas de servicio tengan los roles necesarios:
   - Para exportar: `roles/datastore.viewer` o superior
   - Para importar: `roles/datastore.user` o `roles/owner`

2. **Límites de Firestore**: 
   - Los batches están limitados a 500 operaciones
   - El script maneja automáticamente colecciones grandes dividiéndolas en múltiples batches

3. **Timestamps**: El script convierte automáticamente los timestamps de Firestore al formato correcto

4. **Errores**: Si alguna colección falla durante la importación, el script continúa con las demás y muestra un resumen al final

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
Verifica que la cuenta de servicio tenga los permisos necesarios usando los scripts de prueba.

## 📄 Licencia

ISC

