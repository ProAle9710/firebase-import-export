const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Obtener parámetros de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda
function showHelp() {
  console.log('\n📖 Uso: node export-firestore.js <archivo-key.json> [archivo-salida.json]');
  console.log('\nParámetros:');
  console.log('  archivo-key.json    - Ruta al archivo de credenciales de Firebase (requerido)');
  console.log('  archivo-salida.json - Nombre del archivo de salida (opcional, por defecto: backup.json)');
  console.log('\nEjemplo:');
  console.log('  node export-firestore.js banking-key.json backup.json');
  console.log('  node export-firestore.js ./keys/project-key.json\n');
  process.exit(1);
}

// Validar argumentos
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

const keyFile = args[0];
const outputFile = args[1] || 'backup.json';

// Validar que el archivo de key existe
if (!fs.existsSync(keyFile)) {
  console.error(`❌ Error: El archivo de credenciales "${keyFile}" no existe.`);
  showHelp();
}

// Cargar las credenciales
let serviceAccount;
try {
  serviceAccount = require(path.resolve(keyFile));
} catch (error) {
  console.error(`❌ Error al cargar el archivo de credenciales: ${error.message}`);
  process.exit(1);
}

console.log('🔐 Inicializando Firebase Admin SDK...');
console.log(`📁 Proyecto: ${serviceAccount.project_id}`);
console.log(`👤 Cuenta de servicio: ${serviceAccount.client_email}\n`);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

// Función para exportar una colección completa
async function exportCollection(collectionName) {
  console.log(`📦 Exportando colección: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  const documents = {};
  snapshot.forEach(doc => {
    documents[doc.id] = doc.data();
  });
  
  console.log(`   ✅ ${snapshot.size} documentos exportados`);
  return documents;
}

// Función para exportar todas las colecciones
async function exportAllCollections() {
  console.log('🚀 Iniciando exportación completa de Firestore...\n');
  
  const backup = {};
  const collections = await db.listCollections();
  
  console.log(`📋 Se encontraron ${collections.length} colecciones\n`);
  
  for (const collection of collections) {
    try {
      backup[collection.id] = await exportCollection(collection.id);
    } catch (error) {
      console.error(`   ❌ Error al exportar ${collection.id}: ${error.message}`);
      backup[collection.id] = { _error: error.message };
    }
  }
  
  return backup;
}

// Ejecutar exportación
exportAllCollections()
  .then(backup => {
    const jsonContent = JSON.stringify(backup, null, 2);
    
    fs.writeFileSync(outputFile, jsonContent, 'utf8');
    
    console.log(`\n✅ Exportación completada exitosamente!`);
    console.log(`📁 Archivo guardado: ${outputFile}`);
    console.log(`📊 Tamaño: ${(jsonContent.length / 1024 / 1024).toFixed(2)} MB`);
    
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error durante la exportación:');
    console.error(error);
    process.exit(1);
  });

