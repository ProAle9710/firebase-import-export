const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Obtener parámetros de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda
function showHelp() {
  console.log('\n📖 Uso: node import-firestore.js <archivo-key.json> <archivo-backup.json>');
  console.log('\nParámetros:');
  console.log('  archivo-key.json    - Ruta al archivo de credenciales del proyecto DESTINO (requerido)');
  console.log('  archivo-backup.json - Ruta al archivo de backup a importar (requerido)');
  console.log('\nEjemplo:');
  console.log('  node import-firestore.js banking-landes-key.json banking-backup.json');
  console.log('  node import-firestore.js ./keys/dest-key.json ./backups/backup.json\n');
  process.exit(1);
}

// Validar argumentos
if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

const keyFile = args[0];
const backupFile = args[1];

// Validar que los archivos existen
if (!fs.existsSync(keyFile)) {
  console.error(`❌ Error: El archivo de credenciales "${keyFile}" no existe.`);
  showHelp();
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ Error: El archivo de backup "${backupFile}" no existe.`);
  showHelp();
}

// Cargar las credenciales del proyecto destino
let serviceAccount;
try {
  serviceAccount = require(path.resolve(keyFile));
} catch (error) {
  console.error(`❌ Error al cargar el archivo de credenciales: ${error.message}`);
  process.exit(1);
}

console.log('🔐 Inicializando Firebase Admin SDK...');
console.log(`📁 Proyecto destino: ${serviceAccount.project_id}`);
console.log(`👤 Cuenta de servicio: ${serviceAccount.client_email}\n`);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

// Función para convertir timestamps de Firestore
function convertTimestamp(obj) {
  if (obj && typeof obj === 'object' && obj._seconds !== undefined) {
    return admin.firestore.Timestamp.fromMillis(obj._seconds * 1000 + (obj._nanoseconds || 0) / 1000000);
  }
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamp);
  }
  if (obj && typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      converted[key] = convertTimestamp(obj[key]);
    }
    return converted;
  }
  return obj;
}

// Función para importar una colección
async function importCollection(collectionName, documents) {
  console.log(`📦 Importando colección: ${collectionName}...`);
  
  let batch = db.batch();
  let docCount = 0;
  let batchOperationCount = 0;
  const batchSize = 500; // Límite de Firestore por batch
  
  for (const [docId, docData] of Object.entries(documents)) {
    // Limpiar el ID del documento (eliminar espacios en blanco)
    const cleanDocId = docId.trim();
    
    // Convertir timestamps
    const convertedData = convertTimestamp(docData);
    
    const docRef = db.collection(collectionName).doc(cleanDocId);
    batch.set(docRef, convertedData);
    docCount++;
    batchOperationCount++;
    
    // Firestore limita los batches a 500 operaciones
    if (batchOperationCount >= batchSize) {
      await batch.commit();
      console.log(`   ⏳ ${docCount} documentos procesados...`);
      // Crear un nuevo batch después del commit
      batch = db.batch();
      batchOperationCount = 0;
    }
  }
  
  // Commit del batch final si tiene operaciones pendientes
  if (batchOperationCount > 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ ${docCount} documentos importados exitosamente`);
  return docCount;
}

// Función principal de importación
async function importBackup() {
  console.log(`📖 Leyendo archivo de backup: ${backupFile}...\n`);
  
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const collections = Object.keys(backupData);
  
  console.log(`📋 Se encontraron ${collections.length} colecciones para importar\n`);
  
  const results = {
    success: [],
    errors: [],
    totalDocuments: 0
  };
  
  for (const collectionName of collections) {
    try {
      const documents = backupData[collectionName];
      
      // Verificar si hay errores en la exportación
      if (documents && documents._error) {
        console.log(`⚠️  Colección ${collectionName} tiene un error: ${documents._error}`);
        results.errors.push({ collection: collectionName, error: documents._error });
        continue;
      }
      
      if (!documents || typeof documents !== 'object') {
        console.log(`⚠️  Colección ${collectionName} está vacía o tiene formato inválido`);
        continue;
      }
      
      const docCount = await importCollection(collectionName, documents);
      results.success.push({ collection: collectionName, documents: docCount });
      results.totalDocuments += docCount;
      
    } catch (error) {
      console.error(`   ❌ Error al importar ${collectionName}: ${error.message}`);
      results.errors.push({ collection: collectionName, error: error.message });
    }
    
    console.log(''); // Línea en blanco entre colecciones
  }
  
  return results;
}

// Ejecutar importación
console.log('🚀 Iniciando importación de Firestore...\n');

importBackup()
  .then(results => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Colecciones importadas exitosamente: ${results.success.length}`);
    console.log(`❌ Colecciones con errores: ${results.errors.length}`);
    console.log(`📄 Total de documentos importados: ${results.totalDocuments}`);
    
    if (results.success.length > 0) {
      console.log('\n✅ Colecciones exitosas:');
      results.success.forEach(r => {
        console.log(`   - ${r.collection}: ${r.documents} documentos`);
      });
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ Colecciones con errores:');
      results.errors.forEach(r => {
        console.log(`   - ${r.collection}: ${r.error}`);
      });
    }
    
    console.log('\n🎉 ¡Importación completada!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error durante la importación:');
    console.error(error);
    process.exit(1);
  });

