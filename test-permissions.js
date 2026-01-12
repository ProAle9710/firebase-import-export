const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Obtener parámetros de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda
function showHelp() {
  console.log('\n📖 Uso: node test-permissions.js <archivo-key.json>');
  console.log('\nParámetros:');
  console.log('  archivo-key.json - Ruta al archivo de credenciales de Firebase (requerido)');
  console.log('\nEjemplo:');
  console.log('  node test-permissions.js banking-key.json');
  console.log('  node test-permissions.js ./keys/project-key.json\n');
  process.exit(1);
}

// Validar argumentos
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

const keyFile = args[0];

// Validar que el archivo existe
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

try {
  // Inicializar Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  const db = admin.firestore();

  console.log('✅ Firebase Admin inicializado correctamente\n');

  // Prueba 1: Listar colecciones
  console.log('📋 Prueba 1: Listando colecciones...');
  db.listCollections()
    .then(collections => {
      console.log(`✅ Éxito: Se encontraron ${collections.length} colecciones`);
      if (collections.length > 0) {
        console.log('   Primeras colecciones:');
        collections.slice(0, 5).forEach(col => {
          console.log(`   - ${col.id}`);
        });
      }
      console.log('');

      // Prueba 2: Intentar leer una colección pequeña
      if (collections.length > 0) {
        const testCollection = collections[0].id;
        console.log(`📖 Prueba 2: Intentando leer documentos de "${testCollection}"...`);
        
        return db.collection(testCollection).limit(1).get();
      } else {
        throw new Error('No hay colecciones disponibles para probar');
      }
    })
    .then(snapshot => {
      if (snapshot) {
        console.log(`✅ Éxito: Se pueden leer documentos (${snapshot.size} documento(s) leído(s))`);
        console.log('');
      }

      // Prueba 3: Intentar hacer una consulta con paginación
      console.log('📄 Prueba 3: Probando paginación (limit/offset)...');
      return db.collection('users').limit(10).get();
    })
    .then(snapshot => {
      console.log(`✅ Éxito: La paginación funciona correctamente (${snapshot.size} documento(s))`);
      console.log('');
      console.log('🎉 ¡Todas las pruebas pasaron! La cuenta de servicio tiene permisos suficientes.');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en las pruebas:');
      console.error(`   Código: ${error.code || 'N/A'}`);
      console.error(`   Mensaje: ${error.message}`);
      
      if (error.code === 'permission-denied') {
        console.error('\n⚠️  La cuenta de servicio NO tiene permisos suficientes.');
        console.error('   Necesita el rol: roles/datastore.user o roles/owner');
      } else if (error.code === 'unauthenticated') {
        console.error('\n⚠️  Error de autenticación. Verifica que la clave sea válida.');
      } else if (error.message && error.message.includes('Page size')) {
        console.error('\n⚠️  Este es el mismo error que estás experimentando con firestore-export.');
        console.error('   Puede ser un problema con la herramienta, no con los permisos.');
      }
      
      process.exit(1);
    });

} catch (error) {
  console.error('❌ Error al inicializar Firebase:');
  console.error(`   ${error.message}`);
  process.exit(1);
}

