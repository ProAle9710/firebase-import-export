const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Obtener parámetros de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda general
function showHelp() {
  console.log('\n🔥 Firebase Utils - Herramientas unificadas para Firestore\n');
  console.log('📖 Uso: node firebase-utils.js <acción> [opciones]\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📋 ACCIONES DISPONIBLES:\n');
  console.log('  -e, --export     Exportar todas las colecciones de Firestore');
  console.log('  -i, --import     Importar datos desde un archivo JSON');
  console.log('  -s, --search     Buscar un valor en todas las colecciones');
  console.log('  -t, --test       Probar permisos de la cuenta de servicio');
  console.log('  -d, --delete     Eliminar todos los documentos de una colección');
  console.log('  -m, --migrate-indexes  Copiar solo índices de Firestore entre proyectos (-k origen --dest-key destino)');
  console.log('  --migrate        Migración completa origen → destino (Firestore, Auth+hashes, reglas, índices, Storage)');
  console.log('  -h, --help       Mostrar esta ayuda\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('⚙️  OPCIONES COMUNES:\n');
  console.log('  -k, --key <archivo>     Archivo de credenciales de Firebase (requerido)');
  console.log('  -h, --help              Mostrar ayuda general o específica de una acción\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📚 EJEMPLOS DE USO:\n');
  console.log('  # Exportar');
  console.log('  node firebase-utils.js -e -k keys/firebase-key.json');
  console.log('  node firebase-utils.js -e -k keys/firebase-key.json -c promos -o promos.json');
  console.log('  node firebase-utils.js --export --key keys/firebase-key.json -o backup.json');
  console.log('  node firebase-utils.js -e -k keys/firebase-key.json --with-indexes --with-rules\n');
  console.log('  # Importar');
  console.log('  node firebase-utils.js -i -k keys/dest-key.json -f backup.json');
  console.log('  node firebase-utils.js -i -k keys/dest-key.json -f backup.json -c promos\n');
  console.log('  # Buscar');
  console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "juan@email.com"');
  console.log('  node firebase-utils.js --search --key keys/firebase-key.json --value "12345" --collection usuarios\n');
  console.log('  # Probar permisos');
  console.log('  node firebase-utils.js -t -k keys/firebase-key.json');
  console.log('  # Eliminar colección');
  console.log('  node firebase-utils.js -d -k keys/firebase-key.json -c audit_logs\n');
  console.log('  # Migrar solo índices (origen → destino)');
  console.log('  node firebase-utils.js -m -k keys/landes-test.json --dest-key keys/landes-prod.json\n');
  console.log('  # Migración completa (Firestore + Auth + reglas + Storage)');
  console.log('  node firebase-utils.js --migrate -k keys/prod.json --dest-key keys/test.json\n');
  console.log('  # Ayuda');
  console.log('  node firebase-utils.js --help');
  console.log('  node firebase-utils.js -h');
  console.log('  node firebase-utils.js -e --help    # Ayuda específica de export\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('💡 Para más detalles sobre cada acción, usa:');
  console.log('   node firebase-utils.js <acción> --help\n');
  process.exit(0);
}

// Función para parsear argumentos
function parseArgs() {
  const parsed = {
    action: null,
    keyFile: null,
    destKeyFile: null,
    options: {}
  };
  
  // Verificar si solo se pide ayuda
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    if (args.length > 1 && args[1] !== '-h' && args[1] !== '--help') {
      // Ayuda específica de una acción
      return { action: 'help', helpAction: args[1] };
    }
    return { action: 'help' };
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Detectar acción
    if (arg === '-e' || arg === '--export') {
      parsed.action = 'export';
    } else if (arg === '-i' || arg === '--import') {
      parsed.action = 'import';
    } else if (arg === '-s' || arg === '--search') {
      parsed.action = 'search';
    } else if (arg === '-t' || arg === '--test') {
      parsed.action = 'test';
    } else if (arg === '-d' || arg === '--delete') {
      parsed.action = 'delete';
    } else if (arg === '-m' || arg === '--migrate-indexes') {
      parsed.action = 'migrate-indexes';
    } else if (arg === '--migrate') {
      parsed.action = 'migrate';
    } else if (arg === 'help' || arg === '--help-action') {
      parsed.action = 'help';
      if (args[i + 1]) {
        parsed.helpAction = args[i + 1];
      }
    }
    // Archivo de key
    else if ((arg === '-k' || arg === '--key') && args[i + 1]) {
      parsed.keyFile = args[i + 1];
      i++;
    } else if ((arg === '--dest-key') && args[i + 1]) {
      parsed.destKeyFile = args[i + 1];
      i++;
    } else if ((arg === '--hash-key') && args[i + 1]) {
      parsed.options.hashKey = args[i + 1];
      i++;
    } else if ((arg === '--salt-separator') && args[i + 1]) {
      parsed.options.saltSeparator = args[i + 1];
      i++;
    } else if ((arg === '--rounds') && args[i + 1]) {
      parsed.options.rounds = parseInt(args[i + 1], 10);
      i++;
    } else if ((arg === '--mem-cost') && args[i + 1]) {
      parsed.options.memCost = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--skip-storage') {
      parsed.options.skipStorage = true;
    } else if ((arg === '--firestore-file') && args[i + 1]) {
      parsed.options.firestoreFile = args[i + 1];
      i++;
    } else if ((arg === '--auth-file') && args[i + 1]) {
      parsed.options.authFile = args[i + 1];
      i++;
    }
    // Opciones de export
    else if ((arg === '-o' || arg === '--output') && args[i + 1]) {
      parsed.options.output = args[i + 1];
      i++;
    } else if ((arg === '-c' || arg === '--collection') && args[i + 1] && parsed.action === 'export') {
      parsed.options.exportCollection = args[i + 1];
      i++;
    } else if (arg === '--with-indexes') {
      parsed.options.withIndexes = true;
    } else if (arg === '--with-rules') {
      parsed.options.withRules = true;
    }
    // Opciones de import
    else if ((arg === '-f' || arg === '--file') && args[i + 1]) {
      parsed.options.backupFile = args[i + 1];
      i++;
    } else if ((arg === '-c' || arg === '--collection') && args[i + 1] && parsed.action === 'import') {
      parsed.options.importCollection = args[i + 1];
      i++;
    } else if ((arg === '-c' || arg === '--collection') && args[i + 1] && parsed.action === 'delete') {
      parsed.options.deleteCollection = args[i + 1];
      i++;
    }
    // Opciones de search
    else if ((arg === '-v' || arg === '--value') && args[i + 1]) {
      parsed.options.searchValue = args[i + 1];
      i++;
    } else if ((arg === '--collection') && args[i + 1]) {
      parsed.options.collection = args[i + 1];
      i++;
    } else if (arg === '--exact') {
      parsed.options.exact = true;
    } else if (arg === '--case-sensitive') {
      parsed.options.caseSensitive = true;
    } else if ((arg === '--limit') && args[i + 1]) {
      parsed.options.limit = parseInt(args[i + 1]);
      i++;
    } else if ((arg === '--output') && args[i + 1] && parsed.action === 'search') {
      parsed.options.searchOutput = args[i + 1];
      i++;
    }
    // Ayuda
    else if (arg === '-h' || arg === '--help') {
      if (parsed.action) {
        parsed.action = 'help';
        parsed.helpAction = parsed.action;
      } else if (args[i + 1]) {
        // Ayuda específica de una acción: --help export
        parsed.action = 'help';
        parsed.helpAction = args[i + 1];
        i++;
      } else {
        parsed.action = 'help';
      }
    }
  }
  
  return parsed;
}

// Función para mostrar ayuda específica de cada acción
function showActionHelp(action) {
  switch (action) {
    case 'export':
      console.log('\n📖 Exportar Firestore\n');
      console.log('Uso: node firebase-utils.js -e -k <archivo-key.json> [-o <archivo-salida.json>] [opciones]\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Archivo de credenciales (requerido)');
      console.log('  -o, --output <archivo>     Archivo de salida (opcional, por defecto: backup.json)\n');
      console.log('Opciones:');
      console.log('  -c, --collection <nombre>  Exportar solo una colección específica');
      console.log('  --with-indexes            Incluir índices de Firestore en la exportación');
      console.log('  --with-rules              Incluir reglas de seguridad en la exportación\n');
      console.log('Ejemplos:');
      console.log('  node firebase-utils.js -e -k keys/firebase-key.json -o mi-backup.json');
      console.log('  node firebase-utils.js -e -k keys/firebase-key.json -c promos -o promos.json');
      console.log('  node firebase-utils.js -e -k keys/firebase-key.json --with-indexes --with-rules\n');
      break;
    case 'import':
      console.log('\n📖 Importar Firestore\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Uso: node firebase-utils.js -i -k <archivo-key.json> -f <archivo-backup.json> [opciones]\n');
      console.log('Parámetros requeridos:');
      console.log('  -k, --key <archivo>        Archivo de credenciales del proyecto DESTINO');
      console.log('  -f, --file <archivo>       Archivo de backup a importar\n');
      console.log('Opciones:');
      console.log('  -c, --collection <nombre>  Importar solo una colección específica\n');
      console.log('Notas:');
      console.log('  • Si el backup incluye índices, se importarán automáticamente');
      console.log('  • Si el backup incluye reglas, se importarán automáticamente');
      console.log('  • Los índices pueden tardar en aplicarse después de la importación');
      console.log('  • Usa --collection para importar solo una tabla específica (ej: promos)\n');
      console.log('Ejemplos:');
      console.log('  node firebase-utils.js -i -k keys/dest-key.json -f backup.json');
      console.log('  node firebase-utils.js -i -k keys/dest-key.json -f backup.json -c promos');
      console.log('  node firebase-utils.js --import --key keys/dest-key.json --file mi-backup.json --collection usuarios\n');
      break;
    case 'migrate-indexes':
      console.log('\n📖 Migrar solo índices entre proyectos\n');
      console.log('Uso: node firebase-utils.js -m -k <key-origen.json> --dest-key <key-destino.json>\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Credenciales del proyecto ORIGEN');
      console.log('  --dest-key <archivo>       Credenciales del proyecto DESTINO\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js -m -k keys/landes-test.json --dest-key keys/landes-prod.json\n');
      break;
    case 'migrate':
      console.log('\n📖 Migración completa entre proyectos\n');
      console.log('Uso: node firebase-utils.js --migrate -k <key-origen.json> --dest-key <key-destino.json>\n');
      console.log('Copia: Firestore (incl. subcolecciones), índices, reglas, Auth (hashes/contraseñas) y Storage.\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Credenciales ORIGEN (prod)');
      console.log('  --dest-key <archivo>       Credenciales DESTINO (test)');
      console.log('  --skip-storage             No copiar archivos de Storage');
      console.log('  --firestore-file <json>    Reusar backup Firestore (omite export)');
      console.log('  --auth-file <json>         Reusar backup Auth (omite export)');
      console.log('  --hash-key --salt-separator --rounds --mem-cost');
      console.log('                             Hash scrypt de ORIGEN si la API no lo devuelve\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js --migrate -k keys/prod.json --dest-key keys/test.json\n');
      break;
    case 'search':
      console.log('\n📖 Buscar en Firestore\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Uso: node firebase-utils.js -s -k <archivo-key.json> -v <valor> [opciones]\n');
      console.log('Parámetros requeridos:');
      console.log('  -k, --key <archivo>        Archivo de credenciales');
      console.log('  -v, --value <valor>        Valor a buscar\n');
      console.log('Opciones:');
      console.log('  --collection <nombre>      Buscar solo en una colección específica');
      console.log('  --exact                    Buscar coincidencias exactas (case-sensitive)');
      console.log('  --case-sensitive           Búsqueda case-sensitive (por defecto es case-insensitive)');
      console.log('  --limit <número>           Limitar resultados por colección (por defecto: 100)');
      console.log('  --output <archivo>         Guardar resultados en un archivo JSON\n');
      console.log('Características:');
      console.log('  • Busca en nombres de colecciones');
      console.log('  • Busca en IDs de documentos');
      console.log('  • Busca en todos los campos de forma recursiva');
      console.log('  • Busca en objetos anidados y arrays\n');
      console.log('Ejemplos:');
      console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "juan@email.com"');
      console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "12345" --collection usuarios');
      console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "Admin" --exact --case-sensitive\n');
      break;
    case 'test':
      console.log('\n📖 Probar Permisos\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Uso: node firebase-utils.js -t -k <archivo-key.json>\n');
      console.log('Parámetros requeridos:');
      console.log('  -k, --key <archivo>        Archivo de credenciales\n');
      console.log('Esta acción verifica:');
      console.log('  • Que las credenciales sean válidas');
      console.log('  • Que se puedan listar colecciones');
      console.log('  • Que se puedan leer documentos');
      console.log('  • Que funcione la paginación\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js -t -k keys/firebase-key.json\n');
      break;
    case 'delete':
      console.log('\n📖 Eliminar Colección\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Uso: node firebase-utils.js -d -k <archivo-key.json> -c <colección>\n');
      console.log('Parámetros requeridos:');
      console.log('  -k, --key <archivo>        Archivo de credenciales');
      console.log('  -c, --collection <nombre>  Nombre de la colección a vaciar\n');
      console.log('⚠️  ADVERTENCIA:');
      console.log('  Esta acción eliminará TODOS los documentos excepto 1.');
      console.log('  Se dejará 1 documento para mantener la estructura.');
      console.log('  Esta operación NO se puede deshacer.\n');
      console.log('Ejemplos:');
      console.log('  node firebase-utils.js -d -k keys/firebase-key.json -c audit_logs');
      console.log('  node firebase-utils.js --delete --key keys/firebase-key.json --collection test_data\n');
      break;
    default:
      console.log(`\n❌ Acción desconocida: ${action}\n`);
      console.log('Acciones disponibles: -e (export), -i (import), -s (search), -t (test), -d (delete), -m (migrate-indexes), --migrate\n');
      showHelp();
      break;
  }
  process.exit(0);
}

// Función para cargar credenciales
function loadCredentials(keyFile) {
  if (!keyFile) {
    console.error('❌ Error: Se requiere el archivo de credenciales (-k o --key)');
    process.exit(1);
  }
  
  if (!fs.existsSync(keyFile)) {
    console.error(`❌ Error: El archivo de credenciales "${keyFile}" no existe.`);
    process.exit(1);
  }
  
  let serviceAccount;
  try {
    serviceAccount = require(path.resolve(keyFile));
  } catch (error) {
    console.error(`❌ Error al cargar el archivo de credenciales: ${error.message}`);
    process.exit(1);
  }
  
  return serviceAccount;
}

// Función para inicializar Firebase
function initializeFirebase(serviceAccount) {
  console.log('🔐 Inicializando Firebase Admin SDK...');
  console.log(`📁 Proyecto: ${serviceAccount.project_id}`);
  console.log(`👤 Cuenta de servicio: ${serviceAccount.client_email}\n`);
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } catch (error) {
    // Si ya está inicializado, usar la instancia existente
    if (error.code !== 'app/duplicate-app') {
      throw error;
    }
  }
  
  return {
    db: admin.firestore(),
    serviceAccount: serviceAccount
  };
}

// ============================================================================
// FUNCIONES DE EXPORT
// ============================================================================

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  const size = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}

async function exportCollection(db, collectionName, parentDocRef = null) {
  const label = parentDocRef ? `${parentDocRef.path}/${collectionName}` : collectionName;
  console.log(`📦 Exportando colección: ${label}...`);
  const collectionRef = parentDocRef
    ? parentDocRef.collection(collectionName)
    : db.collection(collectionName);

  const docs = [];
  let lastDoc = null;
  while (true) {
    let query = collectionRef.limit(500);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }
    docs.push(...snapshot.docs);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (docs.length % 500 === 0) {
      console.log(`   ⏳ ${docs.length} documentos leídos (${label})...`);
    }
    if (snapshot.size < 500) {
      break;
    }
  }

  if (docs.length > 50) {
    console.log(`   🔍 Revisando subcolecciones en ${docs.length} docs (${label})...`);
  }

  let checked = 0;
  const entries = await mapPool(docs, 25, async (doc) => {
    const data = { ...doc.data() };
    const subcols = await doc.ref.listCollections();
    if (subcols.length > 0) {
      data.__subcollections__ = {};
      for (const sub of subcols) {
        data.__subcollections__[sub.id] = await exportCollection(db, sub.id, doc.ref);
      }
    }
    checked += 1;
    if (checked % 100 === 0) {
      console.log(`   ⏳ subcolecciones ${checked}/${docs.length} (${label})`);
    }
    return [doc.id, data];
  });

  const documents = {};
  for (const [id, data] of entries) {
    documents[id] = data;
  }

  console.log(`   ✅ ${docs.length} documentos exportados (${label})`);
  return documents;
}

// Función para exportar índices de Firestore
async function exportIndexes(serviceAccount) {
  console.log('📑 Exportando índices de Firestore...');
  
  try {
    // Usar la API REST de Google Cloud para obtener índices
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const projectId = serviceAccount.project_id;
    const accessToken = await client.getAccessToken();
    
    const https = require('https');
    // API correcta para índices de Firestore (collection groups)
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`;
    
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const trimmed = data.trim();
            if (trimmed.startsWith('<')) {
              console.log('   ⚠️  No se pudieron obtener índices: la API devolvió HTML (posible error de configuración o de activación de API).');
              resolve(null);
              return;
            }

            const response = JSON.parse(trimmed);
            if (response.error) {
              console.log(`   ⚠️  No se pudieron obtener índices: ${response.error.message}`);
              resolve(null);
            } else {
              const indexes = response.indexes || [];
              console.log(`   ✅ ${indexes.length} índice(s) exportado(s)`);
              resolve(indexes);
            }
          } catch (error) {
            console.log(`   ⚠️  Error al parsear índices: ${error.message}`);
            resolve(null);
          }
        });
      }).on('error', (error) => {
        console.log(`   ⚠️  Error al obtener índices: ${error.message}`);
        resolve(null);
      });
    });
  } catch (error) {
    console.log(`   ⚠️  Error al exportar índices: ${error.message}`);
    return null;
  }
}

// Función para exportar reglas de seguridad de Firestore
async function exportRules(serviceAccount) {
  console.log('🔒 Exportando reglas de seguridad de Firestore...');
  
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const projectId = serviceAccount.project_id;
    const accessToken = await client.getAccessToken();
    
    const https = require('https');
    // API correcta para reglas de Firestore (Firebaserules)
    const listUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
    
    return new Promise((resolve, reject) => {
      https.get(listUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const trimmed = data.trim();
            if (trimmed.startsWith('<')) {
              console.log('   ⚠️  No se pudieron obtener reglas: la API devolvió HTML (posible error de configuración o de activación de API).');
              resolve(null);
              return;
            }

            const response = JSON.parse(trimmed);
            if (response.error) {
              console.log(`   ⚠️  No se pudieron obtener reglas: ${response.error.message}`);
              resolve(null);
            } else {
              const releases = response.releases || [];
              if (releases.length === 0) {
                console.log('   ⚠️  No se encontraron releases de reglas de seguridad');
                resolve(null);
                return;
              }

              // Tomamos el release por defecto de Firestore si existe, si no el primero
              const firestoreRelease = releases.find(r =>
                r.name && (r.name.endsWith('/cloud.firestore') || r.name.includes('firestore'))
              ) || releases[0];

              const rulesetName = firestoreRelease.rulesetName;
              if (!rulesetName) {
                console.log('   ⚠️  El release seleccionado no tiene rulesetName');
                resolve(null);
                return;
              }

              const getUrl = `https://firebaserules.googleapis.com/v1/${rulesetName}`;
              https.get(getUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken.token}`,
                  'Content-Type': 'application/json'
                }
              }, (res2) => {
                let data2 = '';
                res2.on('data', (chunk) => { data2 += chunk; });
                res2.on('end', () => {
                  try {
                    const trimmed2 = data2.trim();
                    if (trimmed2.startsWith('<')) {
                      console.log('   ⚠️  No se pudo obtener el contenido de las reglas: la API devolvió HTML (posible error de configuración o de activación de API).');
                      resolve(null);
                      return;
                    }

                    const rulesetData = JSON.parse(trimmed2);
                    if (rulesetData.error) {
                      console.log(`   ⚠️  No se pudo obtener el contenido de las reglas: ${rulesetData.error.message}`);
                      resolve(null);
                    } else {
                      const rules = rulesetData.source?.files?.[0]?.content || null;
                      if (!rules) {
                        console.log('   ⚠️  No se encontró contenido de reglas en el ruleset');
                        resolve(null);
                        return;
                      }
                      console.log('   ✅ Reglas de seguridad exportadas');
                      resolve(rules);
                    }
                  } catch (error) {
                    console.log(`   ⚠️  Error al parsear reglas: ${error.message}`);
                    resolve(null);
                  }
                });
              }).on('error', (error) => {
                console.log(`   ⚠️  Error al obtener reglas: ${error.message}`);
                resolve(null);
              });
            }
          } catch (error) {
            console.log(`   ⚠️  Error al parsear lista de reglas: ${error.message}`);
            resolve(null);
          }
        });
      }).on('error', (error) => {
        console.log(`   ⚠️  Error al obtener lista de reglas: ${error.message}`);
        resolve(null);
      });
    });
  } catch (error) {
    console.log(`   ⚠️  Error al exportar reglas: ${error.message}`);
    return null;
  }
}

async function exportAllCollections(db, outputFile, serviceAccount, options = {}) {
  const backup = {
    _metadata: {
      exportDate: new Date().toISOString(),
      version: '2.0.0'
    },
    collections: {}
  };
  
  let collectionsToExport = [];
  
  // Si se especifica una colección específica
  if (options.collection) {
    console.log(`🚀 Iniciando exportación de la colección: ${options.collection}...\n`);
    collectionsToExport = [{ id: options.collection }];
  } else {
    console.log('🚀 Iniciando exportación completa de Firestore...\n');
    const allCollections = await db.listCollections();
    collectionsToExport = allCollections;
    console.log(`📋 Se encontraron ${collectionsToExport.length} colecciones\n`);
  }
  
  for (const collection of collectionsToExport) {
    try {
      backup.collections[collection.id] = await exportCollection(db, collection.id);
    } catch (error) {
      console.error(`   ❌ Error al exportar ${collection.id}: ${error.message}`);
      backup.collections[collection.id] = { _error: error.message };
    }
  }
  
  // Exportar índices si se solicita
  if (options.withIndexes) {
    console.log('');
    const indexes = await exportIndexes(serviceAccount);
    if (indexes !== null) {
      backup.indexes = indexes;
    }
  }
  
  // Exportar reglas si se solicita
  if (options.withRules) {
    console.log('');
    const rules = await exportRulesByRelease(serviceAccount, 'cloud.firestore', 'Firestore');
    if (rules !== null) {
      backup.rules = rules;
    }
    const storageRules = await exportRulesByRelease(serviceAccount, 'firebase.storage', 'Storage');
    if (storageRules !== null) {
      backup.storageRules = storageRules;
    }
  }
  
  const jsonContent = JSON.stringify(backup, null, 2);
  fs.writeFileSync(outputFile, jsonContent, 'utf8');
  
  console.log(`\n✅ Exportación completada exitosamente!`);
  console.log(`📁 Archivo guardado: ${outputFile}`);
  console.log(`📊 Tamaño: ${(jsonContent.length / 1024 / 1024).toFixed(2)} MB`);
}

// ============================================================================
// FUNCIONES DE IMPORT
// ============================================================================

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

async function importCollection(db, collectionName, documents, parentDocRef = null) {
  const label = parentDocRef ? `${parentDocRef.path}/${collectionName}` : collectionName;
  console.log(`📦 Importando colección: ${label}...`);

  const colRef = parentDocRef
    ? parentDocRef.collection(collectionName)
    : db.collection(collectionName);

  let batch = db.batch();
  let docCount = 0;
  let batchOperationCount = 0;
  const batchSize = 500;
  const subJobs = [];

  for (const [docId, docData] of Object.entries(documents)) {
    if (!docData || typeof docData !== 'object' || docData._error) {
      continue;
    }
    const cleanDocId = docId.trim();
    const { __subcollections__, ...fields } = docData;
    const convertedData = convertTimestamp(fields);

    const docRef = colRef.doc(cleanDocId);
    batch.set(docRef, convertedData);
    docCount++;
    batchOperationCount++;

    if (__subcollections__ && typeof __subcollections__ === 'object') {
      subJobs.push({ docRef, __subcollections__ });
    }

    if (batchOperationCount >= batchSize) {
      await batch.commit();
      console.log(`   ⏳ ${docCount} documentos procesados...`);
      batch = db.batch();
      batchOperationCount = 0;
    }
  }

  if (batchOperationCount > 0) {
    await batch.commit();
  }

  for (const job of subJobs) {
    for (const [subName, subDocs] of Object.entries(job.__subcollections__)) {
      if (subDocs && typeof subDocs === 'object') {
        docCount += await importCollection(db, subName, subDocs, job.docRef);
      }
    }
  }

  console.log(`   ✅ ${docCount} documentos importados (${label})`);
  return docCount;
}

/** Quita campos de solo lectura del recurso Index para POST create. */
function sanitizeIndexForCreate(index) {
  if (!index || typeof index !== 'object') return index;
  const copy = JSON.parse(JSON.stringify(index));
  delete copy.name;
  delete copy.state;
  delete copy.progress;
  delete copy.createTime;
  delete copy.updateTime;
  delete copy.etag;
  return copy;
}

function getCollectionGroupId(index) {
  if (!index || typeof index !== 'object') return null;
  if (index.collectionGroupId && typeof index.collectionGroupId === 'string') {
    return index.collectionGroupId;
  }
  const m = index.name && String(index.name).match(/collectionGroups\/([^/]+)\//);
  return m ? m[1] : null;
}

function indexSignature(index) {
  const m = index.name && String(index.name).match(/collectionGroups\/([^/]+)\//);
  const group = m ? m[1] : '';
  const fieldParts = (index.fields || [])
    .map((f) => `${f.fieldPath}:${f.order || f.arrayConfig || f.vectorConfig || ''}`)
    .sort();
  return `${group}|${index.queryScope || ''}|${fieldParts.join(',')}`;
}

/** Copia índices de Firestore del proyecto origen al destino (solo API REST; sin datos). */
async function migrateIndexesBetweenProjects(sourceAccount, destAccount) {
  console.log(`📑 Migración de índices: ${sourceAccount.project_id} → ${destAccount.project_id}\n`);

  const sourceIndexes = await exportIndexes(sourceAccount);
  if (!sourceIndexes || sourceIndexes.length === 0) {
    console.log('❌ No hay índices en origen o no se pudieron leer.');
    return;
  }

  const destIndexes = await exportIndexes(destAccount);
  const existing = new Set((destIndexes || []).map(indexSignature));

  const toCreate = [];
  for (const idx of sourceIndexes) {
    const sig = indexSignature(idx);
    if (existing.has(sig)) {
      continue;
    }
    toCreate.push(idx);
    existing.add(sig);
  }

  const skipped = sourceIndexes.length - toCreate.length;
  if (skipped > 0) {
    console.log(`   ⏭️  ${skipped} índice(s) ya existían en destino (omitidos)\n`);
  }
  if (toCreate.length === 0) {
    console.log('✅ No quedan índices por crear en destino.');
    return;
  }

  console.log(`📤 Creando ${toCreate.length} índice(s) en destino...\n`);
  await importIndexes(destAccount, toCreate);
}

// Función para importar índices de Firestore
async function importIndexes(serviceAccount, indexes) {
  if (!indexes || !Array.isArray(indexes) || indexes.length === 0) {
    return;
  }
  
  console.log('📑 Importando índices de Firestore...');
  
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const projectId = serviceAccount.project_id;
    const accessToken = await client.getAccessToken();
    
    const https = require('https');
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;
    
    // Importar cada índice
    let imported = 0;
    let alreadyExists = 0;
    let failed = 0;
    for (const index of indexes) {
      try {
        const collectionGroupId = getCollectionGroupId(index);
        if (!collectionGroupId) {
          failed++;
          console.log('   ⚠️  Error al importar índice: no se pudo determinar collectionGroupId');
          continue;
        }
        const url = `${baseUrl}/${encodeURIComponent(collectionGroupId)}/indexes`;

        await new Promise((resolve, reject) => {
          const postData = JSON.stringify(sanitizeIndexForCreate(index));
          const options = {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };
          
          const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              const trimmed = data.trim();
              if (res.statusCode >= 200 && res.statusCode < 300) {
                imported++;
                resolve();
              } else {
                try {
                  // Protegernos si la API devuelve HTML u otra cosa no JSON
                  if (trimmed.startsWith('<')) {
                    failed++;
                    console.log('   ⚠️  Error al importar índice: la API devolvió HTML (posible error de configuración o de activación de API).');
                  } else {
                    const error = JSON.parse(trimmed);
                    const message = error.error?.message || 'Error desconocido';
                    if (message.toLowerCase().includes('index already exists')) {
                      // Firestore no permite duplicados; si ya existe, lo contamos como presente.
                      alreadyExists++;
                    } else {
                      failed++;
                      console.log(`   ⚠️  Error al importar índice: ${message}`);
                    }
                  }
                } catch (e) {
                  failed++;
                  console.log(`   ⚠️  Error al importar índice: ${res.statusCode} ${res.statusMessage}`);
                }
                resolve(); // Continuar con el siguiente
              }
            });
          });
          
          req.on('error', (error) => {
            console.log(`   ⚠️  Error de conexión: ${error.message}`);
            resolve(); // Continuar con el siguiente
          });
          
          req.write(postData);
          req.end();
        });
      } catch (error) {
        console.log(`   ⚠️  Error al procesar índice: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${imported} índice(s) creado(s), ${alreadyExists} ya existían, ${failed} con error (puede tomar tiempo en aplicarse)`);
  } catch (error) {
    console.log(`   ⚠️  Error al importar índices: ${error.message}`);
    console.log(`   💡 Nota: Los índices pueden requerir configuración manual en la consola de Firebase`);
  }
}

async function getAccessToken(serviceAccount, scopes = ['https://www.googleapis.com/auth/cloud-platform']) {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({ credentials: serviceAccount, scopes });
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  return tok.token;
}

function httpsRequest(url, { method = 'GET', token, body } = {}) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body === undefined ? null : JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname,
      path: `${u.pathname}${u.search}`,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        const trimmed = raw.trim();
        if (!trimmed) {
          resolve({ status: res.statusCode, data: {} });
          return;
        }
        if (trimmed.startsWith('<')) {
          resolve({ status: res.statusCode, data: { error: { message: 'La API devolvió HTML' } } });
          return;
        }
        try {
          resolve({ status: res.statusCode, data: JSON.parse(trimmed) });
        } catch (error) {
          resolve({ status: res.statusCode, data: { error: { message: error.message, raw: trimmed.slice(0, 200) } } });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function exportRulesByRelease(serviceAccount, releaseId, label) {
  console.log(`🔒 Exportando reglas: ${label}...`);
  try {
    const token = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const list = await httpsRequest(
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
      { token }
    );
    if (list.status >= 300) {
      console.log(`   ⚠️  No se pudieron listar releases: ${list.data.error?.message || list.status}`);
      return null;
    }
    const releases = list.data.releases || [];
    const release = releases.find((r) => r.name && r.name.endsWith(`/${releaseId}`));
    if (!release || !release.rulesetName) {
      console.log(`   ⚠️  No hay release ${releaseId}`);
      return null;
    }
    const ruleset = await httpsRequest(
      `https://firebaserules.googleapis.com/v1/${release.rulesetName}`,
      { token }
    );
    const content = ruleset.data.source?.files?.[0]?.content || null;
    if (!content) {
      console.log(`   ⚠️  Ruleset ${releaseId} sin contenido`);
      return null;
    }
    console.log(`   ✅ Reglas ${label} exportadas`);
    return content;
  } catch (error) {
    console.log(`   ⚠️  Error al exportar reglas ${label}: ${error.message}`);
    return null;
  }
}

// Función para importar reglas de seguridad (Firestore o Storage)
async function importRules(serviceAccount, rules, releaseId = 'cloud.firestore') {
  if (!rules) {
    return;
  }

  const label = releaseId === 'firebase.storage' ? 'Storage' : 'Firestore';
  console.log(`🔒 Importando reglas de seguridad de ${label}...`);

  try {
    const token = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const fileName = releaseId === 'firebase.storage' ? 'storage.rules' : 'firestore.rules';

    const created = await httpsRequest(
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
      {
        method: 'POST',
        token,
        body: {
          source: {
            files: [{ name: fileName, content: rules }]
          }
        }
      }
    );

    if (created.status >= 300 || !created.data.name) {
      console.log(`   ⚠️  Error al crear ruleset: ${created.data.error?.message || created.status}`);
      return;
    }

    const releaseName = `projects/${projectId}/releases/${releaseId}`;
    let published = await httpsRequest(
      `https://firebaserules.googleapis.com/v1/${releaseName}`,
      {
        method: 'PATCH',
        token,
        body: {
          name: releaseName,
          rulesetName: created.data.name
        }
      }
    );

    if (published.status >= 300) {
      published = await httpsRequest(
        `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
        {
          method: 'POST',
          token,
          body: {
            name: releaseName,
            rulesetName: created.data.name
          }
        }
      );
    }

    if (published.status >= 200 && published.status < 300) {
      console.log(`   ✅ Reglas de ${label} importadas`);
    } else {
      console.log(`   ⚠️  Error al publicar reglas: ${published.data.error?.message || published.status}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Error al importar reglas: ${error.message}`);
    console.log('   💡 Nota: Las reglas pueden requerir configuración manual en la consola de Firebase');
  }
}

async function importBackup(db, backupFile, serviceAccount, options = {}) {
  console.log(`📖 Leyendo archivo de backup: ${backupFile}...\n`);
  
  if (!fs.existsSync(backupFile)) {
    console.log(`❌ El archivo de backup "${backupFile}" no existe.\n`);
    console.log(`${'='.repeat(70)}`);
    console.log(`⚠️  IMPORTANTE: Debes EXPORTAR los datos primero`);
    console.log(`${'='.repeat(70)}\n`);
    console.log(`La importación requiere un archivo local con los datos de Firebase.`);
    console.log(`\n📤 Primero EXPORTA los datos de tu proyecto Firebase:\n`);
    
    if (options.collection) {
      console.log(`   Para exportar solo la colección "${options.collection}":`);
      console.log(`   node firebase-utils.js -e -k keys/firebase-key.json -c ${options.collection} -o ${backupFile}\n`);
      console.log(`   O exportar todo y luego importar solo esa colección:`);
      console.log(`   node firebase-utils.js -e -k keys/firebase-key.json -o ${backupFile}\n`);
    } else {
      console.log(`   node firebase-utils.js -e -k keys/firebase-key.json -o ${backupFile}\n`);
    }
    
    console.log(`📥 Después puedes importar con el comando que acabas de ejecutar.\n`);
    console.log(`${'='.repeat(70)}\n`);
    
    throw new Error(`Archivo "${backupFile}" no encontrado. Exporta los datos primero.`);
  }
  
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  
  // Manejar formato nuevo (con _metadata y collections) y formato antiguo
  let collections;
  if (backupData.collections) {
    // Formato nuevo
    collections = backupData.collections;
    if (backupData._metadata) {
      console.log(`📅 Fecha de exportación: ${backupData._metadata.exportDate || 'N/A'}`);
      console.log(`📦 Versión del backup: ${backupData._metadata.version || 'N/A'}\n`);
    }
  } else {
    // Formato antiguo (compatibilidad hacia atrás)
    collections = backupData;
  }
  
  // Filtrar por colección específica si se especifica
  let collectionNames = Object.keys(collections);
  if (options.collection) {
    if (collections[options.collection]) {
      collectionNames = [options.collection];
      console.log(`🎯 Importando solo la colección: ${options.collection}\n`);
    } else {
      throw new Error(`La colección "${options.collection}" no existe en el archivo de backup.\nColecciones disponibles: ${collectionNames.join(', ')}`);
    }
  } else {
    console.log(`📋 Se encontraron ${collectionNames.length} colecciones para importar\n`);
  }
  
  const results = {
    success: [],
    errors: [],
    totalDocuments: 0
  };
  
  for (const collectionName of collectionNames) {
    try {
      const documents = collections[collectionName];
      
      if (documents && documents._error) {
        console.log(`⚠️  Colección ${collectionName} tiene un error: ${documents._error}`);
        results.errors.push({ collection: collectionName, error: documents._error });
        continue;
      }
      
      if (!documents || typeof documents !== 'object') {
        console.log(`⚠️  Colección ${collectionName} está vacía o tiene formato inválido`);
        continue;
      }
      
      const docCount = await importCollection(db, collectionName, documents);
      results.success.push({ collection: collectionName, documents: docCount });
      results.totalDocuments += docCount;
      
    } catch (error) {
      console.error(`   ❌ Error al importar ${collectionName}: ${error.message}`);
      results.errors.push({ collection: collectionName, error: error.message });
    }
    
    console.log('');
  }
  
  // Importar índices si están presentes
  if (backupData.indexes && Array.isArray(backupData.indexes) && backupData.indexes.length > 0) {
    console.log('');
    await importIndexes(serviceAccount, backupData.indexes);
    console.log('');
  }
  
  // Importar reglas si están presentes
  if (backupData.rules) {
    console.log('');
    await importRules(serviceAccount, backupData.rules, 'cloud.firestore');
    console.log('');
  }

  if (backupData.storageRules) {
    console.log('');
    await importRules(serviceAccount, backupData.storageRules, 'firebase.storage');
    console.log('');
  }
  
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
}

// ============================================================================
// FUNCIONES DE SEARCH
// ============================================================================

function valueToString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
}

// Función para verificar si un string coincide con el valor de búsqueda
function matchesSearch(text, searchValue, options) {
  if (!text) return false;
  const textStr = options.caseSensitive ? String(text) : String(text).toLowerCase();
  const searchStr = options.caseSensitive ? searchValue : searchValue.toLowerCase();
  
  if (options.exact) {
    return textStr === searchStr;
  } else {
    return textStr.includes(searchStr);
  }
}

function searchInObject(obj, searchValue, options, path = '') {
  const matches = [];
  const searchStr = options.caseSensitive ? searchValue : searchValue.toLowerCase();
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      const valueStr = options.caseSensitive ? valueToString(value) : valueToString(value).toLowerCase();
      
      let matchesSearch = false;
      if (options.exact) {
        matchesSearch = valueStr === searchStr;
      } else {
        matchesSearch = valueStr.includes(searchStr);
      }
      
      if (matchesSearch) {
        matches.push({
          path: currentPath,
          value: value,
          key: key
        });
      }
      
      if (value !== null && typeof value === 'object' && !(value instanceof admin.firestore.Timestamp)) {
        const nestedMatches = searchInObject(value, searchValue, options, currentPath);
        matches.push(...nestedMatches);
      }
    }
  }
  
  return matches;
}

async function searchInCollection(db, collectionName, searchValue, options) {
  console.log(`🔍 Buscando en colección: ${collectionName}...`);
  
  const collectionRef = db.collection(collectionName);
  const results = [];
  let lastDoc = null;
  let totalProcessed = 0;
  let totalFound = 0;
  const limit = options.limit || 100;
  
  // Verificar si el nombre de la colección coincide
  const collectionMatches = matchesSearch(collectionName, searchValue, options);
  let collectionMatchFound = false;
  
  try {
    do {
      let snapshot;
      if (lastDoc) {
        snapshot = await collectionRef.startAfter(lastDoc).limit(1000).get();
      } else {
        snapshot = await collectionRef.limit(1000).get();
      }
      
      if (snapshot.empty) {
        break;
      }
      
      for (const doc of snapshot.docs) {
        if (results.length >= limit) {
          break;
        }
        
        totalProcessed++;
        const docData = doc.data();
        const matches = searchInObject(docData, searchValue, options);
        
        // Verificar si el ID del documento coincide
        const documentIdMatches = matchesSearch(doc.id, searchValue, options);
        if (documentIdMatches) {
          matches.push({
            path: '_documentId',
            value: doc.id,
            key: '_documentId',
            type: 'document_id'
          });
        }
        
        // Si el nombre de la colección coincide, agregarlo como match
        if (collectionMatches && !collectionMatchFound) {
          matches.push({
            path: '_collectionName',
            value: collectionName,
            key: '_collectionName',
            type: 'collection_name'
          });
          collectionMatchFound = true;
        }
        
        if (matches.length > 0) {
          totalFound++;
          results.push({
            documentId: doc.id,
            matches: matches,
            data: docData
          });
        }
        
        lastDoc = doc;
      }
      
      if (results.length >= limit || snapshot.size < 1000) {
        break;
      }
      
    } while (results.length < limit);
    
    // Si solo el nombre de la colección coincide pero no hay documentos, agregarlo
    if (collectionMatches && results.length === 0) {
      results.push({
        documentId: null,
        matches: [{
          path: '_collectionName',
          value: collectionName,
          key: '_collectionName',
          type: 'collection_name'
        }],
        data: null
      });
      totalFound = 1;
    }
    
    console.log(`   📊 Procesados: ${totalProcessed} documentos | Encontrados: ${totalFound} documentos con coincidencias`);
    
    return {
      collection: collectionName,
      totalProcessed: totalProcessed,
      totalFound: totalFound,
      results: results
    };
    
  } catch (error) {
    console.error(`   ❌ Error al buscar en ${collectionName}: ${error.message}`);
    return {
      collection: collectionName,
      error: error.message,
      results: []
    };
  }
}

function displaySearchResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADOS DE BÚSQUEDA');
  console.log('='.repeat(60));
  
  const collectionsWithResults = Object.keys(results).filter(
    key => results[key].results && results[key].results.length > 0
  );
  
  if (collectionsWithResults.length === 0) {
    console.log('\n❌ No se encontraron coincidencias para el valor buscado.\n');
    return;
  }
  
  let totalDocuments = 0;
  let totalMatches = 0;
  
  collectionsWithResults.forEach(collectionName => {
    const result = results[collectionName];
    totalDocuments += result.totalFound || 0;
    totalMatches += result.results.reduce((sum, doc) => sum + doc.matches.length, 0);
    
    console.log(`\n📦 Colección: ${collectionName}`);
    console.log(`   📄 Documentos encontrados: ${result.totalFound}`);
    console.log(`   🔍 Total de coincidencias: ${result.results.reduce((sum, doc) => sum + doc.matches.length, 0)}`);
    console.log(`   ──────────────────────────────────────────────────────────`);
    
    result.results.forEach((docResult, idx) => {
      if (docResult.documentId) {
        console.log(`\n   📄 Documento ${idx + 1}: ${docResult.documentId}`);
      } else {
        console.log(`\n   📄 Resultado ${idx + 1}: (solo nombre de colección)`);
      }
      docResult.matches.forEach(match => {
        let matchType = '';
        if (match.type === 'collection_name') {
          matchType = ' [Nombre de Colección]';
        } else if (match.type === 'document_id') {
          matchType = ' [ID de Documento]';
        }
        
        const valueDisplay = typeof match.value === 'object' 
          ? JSON.stringify(match.value).substring(0, 100) 
          : String(match.value).substring(0, 100);
        console.log(`      ✓ ${match.path === '_collectionName' ? 'Colección' : match.path === '_documentId' ? 'ID Documento' : 'Campo'}: ${match.path}${matchType}`);
        console.log(`        Valor: ${valueDisplay}${valueDisplay.length >= 100 ? '...' : ''}`);
      });
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESUMEN TOTAL`);
  console.log('='.repeat(60));
  console.log(`✅ Colecciones con resultados: ${collectionsWithResults.length}`);
  console.log(`📄 Total de documentos encontrados: ${totalDocuments}`);
  console.log(`🔍 Total de coincidencias: ${totalMatches}`);
  console.log('='.repeat(60) + '\n');
}

async function searchAll(db, searchValue, options) {
  console.log('🚀 Iniciando búsqueda en Firestore...\n');
  console.log(`🔎 Valor a buscar: "${searchValue}"`);
  console.log(`📋 Modo: ${options.exact ? 'Exacto' : 'Parcial'} | Case-sensitive: ${options.caseSensitive ? 'Sí' : 'No'}`);
  console.log(`🔍 Buscando en: Nombres de colecciones, IDs de documentos y campos\n`);
  if (options.collection) {
    console.log(`📦 Colección específica: ${options.collection}`);
  }
  console.log(`\n${'='.repeat(60)}\n`);
  
  const allResults = {};
  let collectionsToSearch = [];
  
  if (options.collection) {
    collectionsToSearch = [options.collection];
  } else {
    const collections = await db.listCollections();
    collectionsToSearch = collections.map(col => col.id);
    console.log(`📋 Se encontraron ${collectionsToSearch.length} colecciones para buscar\n`);
    
    // Primero verificar si algún nombre de colección coincide
    const matchingCollections = collectionsToSearch.filter(colName => 
      matchesSearch(colName, searchValue, options)
    );
    
    if (matchingCollections.length > 0) {
      console.log(`✨ Se encontraron ${matchingCollections.length} colección(es) cuyo nombre coincide:\n`);
      matchingCollections.forEach(colName => {
        console.log(`   - ${colName}`);
      });
      console.log('');
    }
  }
  
  for (const collectionName of collectionsToSearch) {
    const result = await searchInCollection(db, collectionName, searchValue, options);
    // Incluir resultados si hay matches, errores, o si el nombre de la colección coincide
    if (result.results && result.results.length > 0) {
      allResults[collectionName] = result;
    } else if (result.error) {
      allResults[collectionName] = result;
    } else if (matchesSearch(collectionName, searchValue, options)) {
      // Si solo el nombre de la colección coincide pero no hay documentos, agregarlo
      allResults[collectionName] = {
        collection: collectionName,
        totalProcessed: 0,
        totalFound: 1,
        results: [{
          documentId: null,
          matches: [{
            path: '_collectionName',
            value: collectionName,
            key: '_collectionName',
            type: 'collection_name'
          }],
          data: null
        }]
      };
    }
    console.log('');
  }
  
  displaySearchResults(allResults);
  
  if (options.searchOutput) {
    const jsonContent = JSON.stringify(allResults, null, 2);
    fs.writeFileSync(options.searchOutput, jsonContent, 'utf8');
    console.log(`💾 Resultados guardados en: ${options.searchOutput}\n`);
  }
}

// ============================================================================
// FUNCIONES DE DELETE
// ============================================================================

async function deleteCollection(db, collectionName, batchSize = 500) {
  console.log(`🗑️  Vaciando colección: ${collectionName}...`);
  console.log('   💡 Se dejará 1 documento para mantener la estructura\n');
  
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject, collectionName);
  });
}

async function deleteQueryBatch(db, query, resolve, reject, collectionName) {
  try {
    const snapshot = await query.get();

    if (snapshot.size <= 1) {
      console.log('\n✅ Colección vaciada (1 documento restante para mantener estructura)');
      if (snapshot.size === 1) {
        console.log(`   📄 Documento restante: ${snapshot.docs[0].id}`);
      }
      resolve();
      return;
    }

    // Eliminar todos menos el último documento
    const batch = db.batch();
    const docsToDelete = snapshot.docs.slice(0, -1); // Dejar el último
    docsToDelete.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`   🗑️  ${docsToDelete.length} documentos eliminados...`);

    // Recursivamente eliminar el siguiente lote
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve, reject, collectionName);
    });
  } catch (error) {
    reject(error);
  }
}

// ============================================================================
// FUNCIONES DE TEST
// ============================================================================

async function testPermissions(db) {
  console.log('✅ Firebase Admin inicializado correctamente\n');
  
  console.log('📋 Prueba 1: Listando colecciones...');
  const collections = await db.listCollections();
  console.log(`✅ Éxito: Se encontraron ${collections.length} colecciones`);
  if (collections.length > 0) {
    console.log('   Primeras colecciones:');
    collections.slice(0, 5).forEach(col => {
      console.log(`   - ${col.id}`);
    });
  }
  console.log('');
  
  if (collections.length > 0) {
    const testCollection = collections[0].id;
    console.log(`📖 Prueba 2: Intentando leer documentos de "${testCollection}"...`);
    const snapshot = await db.collection(testCollection).limit(1).get();
    console.log(`✅ Éxito: Se pueden leer documentos (${snapshot.size} documento(s) leído(s))`);
    console.log('');
  }
  
  console.log('📄 Prueba 3: Probando paginación (limit/offset)...');
  const testSnapshot = await db.collection('users').limit(10).get();
  console.log(`✅ Éxito: La paginación funciona correctamente (${testSnapshot.size} documento(s))`);
  console.log('');
  console.log('🎉 ¡Todas las pruebas pasaron! La cuenta de servicio tiene permisos suficientes.');
}

// ============================================================================
// AUTH + STORAGE + MIGRATE
// ============================================================================

function ensureBackupsDir() {
  const dir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function fetchHashConfig(serviceAccount) {
  const token = await getAccessToken(serviceAccount, [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/firebase'
  ]);
  const projectId = serviceAccount.project_id;
  const urls = [
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`,
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?view=FULL`
  ];

  for (const url of urls) {
    const res = await httpsRequest(url, { token });
    const cfg = res.data.hashConfig
      || res.data.hash_config
      || res.data.signIn?.hashConfig
      || res.data.signIn?.hash_config;
    if (cfg && (cfg.signerKey || cfg.signer_key)) {
      return {
        algorithm: cfg.algorithm || 'SCRYPT',
        signerKey: cfg.signerKey || cfg.signer_key,
        saltSeparator: cfg.saltSeparator || cfg.salt_separator || '',
        rounds: cfg.rounds,
        memoryCost: cfg.memoryCost || cfg.memory_cost
      };
    }
  }
  return null;
}

function hashOptionsFromCli(options) {
  if (!options.hashKey) {
    return null;
  }
  return {
    algorithm: 'SCRYPT',
    signerKey: options.hashKey,
    saltSeparator: options.saltSeparator || '',
    rounds: options.rounds || 8,
    memoryCost: options.memCost || 14
  };
}

function toAdminHash(hashConfig) {
  const algo = String(hashConfig.algorithm || 'SCRYPT').toUpperCase();
  return {
    algorithm: algo.includes('STANDARD') ? 'STANDARD_SCRYPT' : 'SCRYPT',
    key: Buffer.from(hashConfig.signerKey, 'base64'),
    saltSeparator: Buffer.from(hashConfig.saltSeparator || '', 'base64'),
    rounds: hashConfig.rounds || 8,
    memoryCost: hashConfig.memoryCost || 14
  };
}

async function downloadAuthUsers(serviceAccount) {
  const token = await getAccessToken(serviceAccount, [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/firebase'
  ]);
  const projectId = serviceAccount.project_id;
  const users = [];
  let nextPageToken;

  do {
    const res = await httpsRequest(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/downloadAccount',
      {
        method: 'POST',
        token,
        body: {
          maxResults: 1000,
          targetProjectId: projectId,
          ...(nextPageToken ? { nextPageToken } : {})
        }
      }
    );
    if (res.status >= 300) {
      throw new Error(res.data.error?.message || `downloadAccount HTTP ${res.status}`);
    }
    users.push(...(res.data.users || []));
    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);

  return users;
}

async function listAuthUsersFromAdmin(auth) {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    for (const user of result.users) {
      users.push(user.toJSON());
    }
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

function authUserHasPassword(user) {
  return Boolean(user.passwordHash && user.passwordHash !== '');
}

function toImportRecord(user) {
  const uid = user.localId || user.uid;
  const record = { uid };

  if (user.email) record.email = user.email;
  if (user.emailVerified !== undefined) record.emailVerified = user.emailVerified;
  if (user.displayName) record.displayName = user.displayName;
  if (user.photoUrl || user.photoURL) record.photoURL = user.photoUrl || user.photoURL;
  if (user.phoneNumber) record.phoneNumber = user.phoneNumber;
  if (user.disabled !== undefined) record.disabled = user.disabled;

  const createdAt = user.createdAt || user.metadata?.creationTime;
  const lastLogin = user.lastLoginAt || user.metadata?.lastSignInTime;
  if (createdAt || lastLogin) {
    record.metadata = {};
    if (createdAt) {
      record.metadata.creationTime = /^\d+$/.test(String(createdAt))
        ? new Date(Number(createdAt)).toISOString()
        : createdAt;
    }
    if (lastLogin) {
      record.metadata.lastSignInTime = /^\d+$/.test(String(lastLogin))
        ? new Date(Number(lastLogin)).toISOString()
        : lastLogin;
    }
  }

  if (user.customAttributes || user.customClaims) {
    try {
      record.customClaims = typeof user.customAttributes === 'string'
        ? JSON.parse(user.customAttributes)
        : (user.customClaims || undefined);
    } catch (error) {
      console.log(`   ⚠️  customClaims inválidos en ${uid}: ${error.message}`);
    }
  }

  if (user.passwordHash) {
    record.passwordHash = Buffer.isBuffer(user.passwordHash)
      ? user.passwordHash
      : Buffer.from(user.passwordHash, 'base64');
    if (user.salt || user.passwordSalt) {
      const salt = user.salt || user.passwordSalt;
      record.passwordSalt = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'base64');
    }
  }

  const providers = user.providerUserInfo || user.providerData;
  if (Array.isArray(providers) && providers.length > 0) {
    record.providerData = providers
      .filter((p) => p.providerId && p.providerId !== 'password' && p.providerId !== 'firebase')
      .map((p) => ({
        uid: p.rawId || p.uid,
        providerId: p.providerId,
        email: p.email,
        displayName: p.displayName,
        photoURL: p.photoUrl || p.photoURL,
        phoneNumber: p.phoneNumber
      }))
      .filter((p) => p.uid && p.providerId);
  }

  return record;
}

async function exportAuthBundle(serviceAccount, sourceApp, outputFile, cliHash) {
  console.log('👤 Exportando usuarios de Auth...');
  let users = [];
  let source = 'downloadAccount';

  try {
    users = await downloadAuthUsers(serviceAccount);
  } catch (error) {
    console.log(`   ⚠️  downloadAccount falló (${error.message}), usando Admin listUsers...`);
    users = await listAuthUsersFromAdmin(sourceApp.auth());
    source = 'listUsers';
  }

  const withHash = users.filter(authUserHasPassword).length;
  console.log(`   ✅ ${users.length} usuario(s) exportados (${withHash} con passwordHash, vía ${source})`);

  let hashConfig = cliHash;
  if (!hashConfig) {
    hashConfig = await fetchHashConfig(serviceAccount);
    if (hashConfig) {
      console.log('   ✅ hashConfig de origen obtenido');
    } else {
      console.log('   ⚠️  No se pudo leer hashConfig. Pasa --hash-key/--salt-separator/--rounds/--mem-cost');
      console.log('      Consola Firebase → Authentication → Users → ⋮ → Password hash parameters');
    }
  }

  const bundle = {
    _metadata: {
      exportDate: new Date().toISOString(),
      projectId: serviceAccount.project_id,
      source,
      users: users.length,
      withPasswordHash: withHash
    },
    hashConfig,
    users
  };
  fs.writeFileSync(outputFile, JSON.stringify(bundle, null, 2), 'utf8');
  console.log(`   📁 Auth guardado: ${outputFile}`);
  return bundle;
}

async function importAuthBundle(destApp, bundle) {
  if (!bundle || !Array.isArray(bundle.users) || bundle.users.length === 0) {
    console.log('👤 No hay usuarios Auth para importar');
    return { imported: 0, errors: 0 };
  }

  const destAuth = destApp.auth();
  const withPassword = [];
  const withoutPassword = [];

  for (const user of bundle.users) {
    const record = toImportRecord(user);
    if (record.passwordHash) {
      withPassword.push(record);
    } else {
      withoutPassword.push(record);
    }
  }

  if (withPassword.length > 0 && !bundle.hashConfig) {
    throw new Error(
      'Hay usuarios con hash de contraseña pero no hay hashConfig. ' +
      'Pasa --hash-key --salt-separator --rounds --mem-cost del proyecto ORIGEN.'
    );
  }

  const hash = bundle.hashConfig ? { hash: toAdminHash(bundle.hashConfig) } : undefined;
  let imported = 0;
  let errors = 0;

  async function importChunk(list, options, label) {
    for (let i = 0; i < list.length; i += 1000) {
      const chunk = list.slice(i, i + 1000);
      const result = await destAuth.importUsers(chunk, options);
      imported += result.successCount;
      errors += result.failureCount;
      (result.errors || []).forEach((err) => {
        console.log(`   ⚠️  ${label} ${chunk[err.index]?.uid}: ${err.error?.message || err.error}`);
      });
      console.log(`   ⏳ ${label}: ${Math.min(i + chunk.length, list.length)}/${list.length}`);
    }
  }

  console.log(`👤 Importando Auth: ${withPassword.length} con password, ${withoutPassword.length} sin password...`);
  if (withPassword.length > 0) {
    await importChunk(withPassword, hash, 'password');
  }
  if (withoutPassword.length > 0) {
    await importChunk(withoutPassword, undefined, 'sin-password');
  }
  console.log(`   ✅ Auth importado: ${imported} ok, ${errors} error(es)`);
  return { imported, errors };
}

function candidateBuckets(projectId) {
  return [
    `${projectId}.firebasestorage.app`,
    `${projectId}.appspot.com`
  ];
}

async function migrateStorageFiles(sourceApp, destApp, sourceAccount, destAccount) {
  console.log('📦 Copiando Storage...');

  async function findBucket(app, projectId, label) {
    for (const name of candidateBuckets(projectId)) {
      const bucket = app.storage().bucket(name);
      try {
        const [exists] = await bucket.exists();
        if (exists) {
          console.log(`   📁 Bucket ${label}: ${name}`);
          return bucket;
        }
      } catch (error) {
        console.log(`   ⚠️  Bucket ${name}: ${error.message}`);
      }
    }
    return null;
  }

  const srcBucket = await findBucket(sourceApp, sourceAccount.project_id, 'origen');
  const dstBucket = await findBucket(destApp, destAccount.project_id, 'destino');

  if (!srcBucket) {
    console.log('   ⚠️  No se encontró bucket de Storage en origen');
    return { copied: 0 };
  }
  if (!dstBucket) {
    console.log('   ⚠️  No se encontró bucket de Storage en destino');
    return { copied: 0 };
  }

  const [files] = await srcBucket.getFiles();
  let copied = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const destFile = dstBucket.file(file.name);
      const [buf] = await file.download();
      const [meta] = await file.getMetadata();
      await destFile.save(buf, {
        contentType: meta.contentType,
        metadata: meta.metadata
      });
      copied++;
      if (copied % 25 === 0) {
        console.log(`   ⏳ ${copied}/${files.length} archivos...`);
      }
    } catch (error) {
      failed++;
      console.log(`   ⚠️  ${file.name}: ${error.message}`);
    }
  }
  console.log(`   ✅ Storage: ${copied} copiados, ${failed} error(es), ${files.length} total`);
  return { copied, failed, total: files.length };
}

async function waitForOperation(token, opName, host = 'firestore.googleapis.com') {
  for (let i = 0; i < 36; i++) {
    const res = await httpsRequest(`https://${host}/v1/${opName}`, { token });
    if (res.data.done) {
      if (res.data.error) {
        throw new Error(res.data.error.message || JSON.stringify(res.data.error));
      }
      return res.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timeout esperando operación ${opName}`);
}

async function enableGoogleApi(serviceAccount, serviceName) {
  const token = await getAccessToken(serviceAccount);
  const url = `https://serviceusage.googleapis.com/v1/projects/${serviceAccount.project_id}/services/${serviceName}:enable`;
  const res = await httpsRequest(url, { method: 'POST', token, body: {} });
  if (res.status >= 200 && res.status < 300) {
    if (res.data.name && !res.data.done) {
      try {
        await waitForOperation(token, res.data.name, 'serviceusage.googleapis.com');
      } catch (error) {
        console.log(`   ⚠️  enable ${serviceName}: ${error.message}`);
      }
    }
    console.log(`   ✅ API ${serviceName}`);
    return;
  }
  const msg = res.data.error?.message || `HTTP ${res.status}`;
  if (/already enabled|already been enabled/i.test(msg)) {
    console.log(`   ✅ API ${serviceName} (ya activa)`);
    return;
  }
  console.log(`   ⚠️  No se pudo activar ${serviceName}: ${msg}`);
}

async function getFirestoreLocation(serviceAccount) {
  const token = await getAccessToken(serviceAccount);
  const res = await httpsRequest(
    `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases`,
    { token }
  );
  const databases = res.data.databases || [];
  const def = databases.find((d) => String(d.name).endsWith('/databases/(default)')) || databases[0];
  return def?.locationId || 'nam5';
}

async function ensureFirestoreDatabase(serviceAccount, locationId) {
  const token = await getAccessToken(serviceAccount);
  const list = await httpsRequest(
    `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases`,
    { token }
  );
  const exists = (list.data.databases || []).some((d) => String(d.name).endsWith('/databases/(default)'));
  if (exists) {
    console.log('   ✅ Firestore (default) ya existe');
    return;
  }

  console.log(`   🛠️  Creando Firestore Native en ${locationId}...`);
  const created = await httpsRequest(
    `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases?databaseId=(default)`,
    {
      method: 'POST',
      token,
      body: {
        type: 'FIRESTORE_NATIVE',
        locationId
      }
    }
  );
  if (created.status >= 300) {
    const msg = created.data.error?.message || `HTTP ${created.status}`;
    if (/already exists/i.test(msg)) {
      console.log('   ✅ Firestore (default) ya existe');
      return;
    }
    throw new Error(`No se pudo crear Firestore: ${msg}`);
  }
  if (created.data.name && !created.data.done) {
    await waitForOperation(token, created.data.name);
  }
  console.log('   ✅ Firestore (default) creado');
}

async function enableEmailPasswordAuth(serviceAccount) {
  const token = await getAccessToken(serviceAccount, [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/firebase'
  ]);
  const res = await httpsRequest(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${serviceAccount.project_id}/config?updateMask=signIn.email`,
    {
      method: 'PATCH',
      token,
      body: {
        signIn: {
          email: {
            enabled: true,
            passwordRequired: true
          }
        }
      }
    }
  );
  if (res.status >= 200 && res.status < 300) {
    console.log('   ✅ Auth email/password habilitado');
    return;
  }
  console.log(`   ⚠️  Auth config: ${res.data.error?.message || res.status}`);
}

async function ensureDestProjectReady(sourceAccount, destAccount) {
  console.log('🔧 Preparando proyecto destino...');
  const apis = [
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'firebaserules.googleapis.com',
    'firebase.googleapis.com',
    'storage.googleapis.com'
  ];
  for (const api of apis) {
    await enableGoogleApi(destAccount, api);
  }

  const locationId = await getFirestoreLocation(sourceAccount);
  console.log(`   📍 Ubicación origen: ${locationId}`);
  await ensureFirestoreDatabase(destAccount, locationId);
  await enableEmailPasswordAuth(destAccount);
  console.log('');
}

async function migrateAll(sourceKeyFile, destKeyFile, options = {}) {
  const sourceAccount = loadCredentials(sourceKeyFile);
  const destAccount = loadCredentials(destKeyFile);

  if (sourceAccount.project_id === destAccount.project_id) {
    throw new Error('Origen y destino son el mismo proyecto.');
  }

  console.log('🚀 Migración completa');
  console.log(`   Origen:  ${sourceAccount.project_id}`);
  console.log(`   Destino: ${destAccount.project_id}`);
  console.log('   Incluye: Firestore + subcolecciones, índices, reglas, Auth+hashes, Storage\n');

  const sourceApp = admin.initializeApp({
    credential: admin.credential.cert(sourceAccount),
    projectId: sourceAccount.project_id,
    storageBucket: `${sourceAccount.project_id}.firebasestorage.app`
  }, 'migrate-source');
  const destApp = admin.initializeApp({
    credential: admin.credential.cert(destAccount),
    projectId: destAccount.project_id,
    storageBucket: `${destAccount.project_id}.firebasestorage.app`
  }, 'migrate-dest');

  await ensureDestProjectReady(sourceAccount, destAccount);

  const backupsDir = ensureBackupsDir();
  const prefix = `${sourceAccount.project_id}-to-${destAccount.project_id}-${stamp()}`;
  const firestoreFile = options.firestoreFile || path.join(backupsDir, `${prefix}-firestore.json`);
  const authFile = options.authFile || path.join(backupsDir, `${prefix}-auth.json`);

  const sourceDb = sourceApp.firestore();
  const destDb = destApp.firestore();

  let authBundle;
  if (options.firestoreFile) {
    console.log(`⏭️  Reusando Firestore backup: ${options.firestoreFile}\n`);
  } else {
    await exportAllCollections(sourceDb, firestoreFile, sourceAccount, {
      withIndexes: true,
      withRules: true
    });
  }

  if (options.authFile) {
    console.log(`⏭️  Reusando Auth backup: ${options.authFile}\n`);
    authBundle = JSON.parse(fs.readFileSync(options.authFile, 'utf8'));
    if (!authBundle.hashConfig) {
      const cliHash = hashOptionsFromCli(options);
      authBundle.hashConfig = cliHash || await fetchHashConfig(sourceAccount);
    }
  } else {
    const cliHash = hashOptionsFromCli(options);
    authBundle = await exportAuthBundle(sourceAccount, sourceApp, authFile, cliHash);
  }

  console.log('\n📥 Importando en destino...\n');
  await importBackup(destDb, firestoreFile, destAccount, {});
  const authResult = await importAuthBundle(destApp, authBundle);

  let storageResult = { copied: 0, skipped: true };
  if (!options.skipStorage) {
    try {
      storageResult = await migrateStorageFiles(sourceApp, destApp, sourceAccount, destAccount);
    } catch (error) {
      console.log(`   ⚠️  Storage no copiado: ${error.message}`);
      storageResult = { copied: 0, error: error.message };
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRACIÓN COMPLETA');
  console.log('='.repeat(60));
  console.log(`✅ Firestore backup: ${firestoreFile}`);
  console.log(`✅ Auth backup:      ${authFile}`);
  console.log(`✅ Auth usuarios:    ${authResult.imported} ok / ${authResult.errors} error(es)`);
  if (!options.skipStorage) {
    console.log(`✅ Storage archivos: ${storageResult.copied || 0}`);
  }
  console.log('='.repeat(60));
  console.log('\n⚠️  No se migran: Cloud Functions, Hosting, Remote Config, secrets, OAuth client IDs.');
  console.log('   Las contraseñas se copian como hash scrypt de ORIGEN (el usuario entra con la misma clave).');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  const parsed = parseArgs();
  
  // Manejar ayuda
  if (parsed.action === 'help' || args.length === 0 || (args.length === 1 && (args[0] === '-h' || args[0] === '--help'))) {
    if (parsed.helpAction) {
      showActionHelp(parsed.helpAction);
    } else {
      showHelp();
    }
    return;
  }
  
  if (!parsed.action) {
    console.error('❌ Error: Debes especificar una acción (-e, -i, -s, -t, -m, --migrate)');
    console.error('   Usa -h o --help para ver la ayuda\n');
    showHelp();
  }
  
  if (parsed.action === 'migrate-indexes') {
    if (!parsed.destKeyFile) {
      console.error('❌ Error: migrar índices requiere --dest-key <archivo.json>');
      showActionHelp('migrate-indexes');
    }
    const sourceAccount = loadCredentials(parsed.keyFile);
    const destAccount = loadCredentials(parsed.destKeyFile);
    try {
      await migrateIndexesBetweenProjects(sourceAccount, destAccount);
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error durante la migración de índices:');
      console.error(error.message);
      process.exit(1);
    }
    return;
  }

  if (parsed.action === 'migrate') {
    if (!parsed.destKeyFile) {
      console.error('❌ Error: --migrate requiere --dest-key <archivo.json>');
      showActionHelp('migrate');
    }
    try {
      await migrateAll(parsed.keyFile, parsed.destKeyFile, parsed.options);
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error durante la migración:');
      console.error(error.message);
      process.exit(1);
    }
    return;
  }
  
  const serviceAccount = loadCredentials(parsed.keyFile);
  const firebaseInit = initializeFirebase(serviceAccount);
  const db = firebaseInit.db;
  
  try {
    switch (parsed.action) {
      case 'export':
        const outputFile = parsed.options.output || 'backup.json';
        const exportOptions = {
          collection: parsed.options.exportCollection || null,
          withIndexes: parsed.options.withIndexes || false,
          withRules: parsed.options.withRules || false
        };
        await exportAllCollections(db, outputFile, serviceAccount, exportOptions);
        break;
        
      case 'import':
        if (!parsed.options.backupFile) {
          console.error('❌ Error: Se requiere el archivo de backup (-f o --file)');
          showActionHelp('import');
        }
        console.log('🚀 Iniciando importación de Firestore...\n');
        const importOptions = {
          collection: parsed.options.importCollection || null
        };
        await importBackup(db, parsed.options.backupFile, serviceAccount, importOptions);
        break;
        
      case 'search':
        if (!parsed.options.searchValue) {
          console.error('❌ Error: Se requiere el valor a buscar (-v o --value)');
          showActionHelp('search');
        }
        const searchOptions = {
          collection: parsed.options.collection || null,
          exact: parsed.options.exact || false,
          caseSensitive: parsed.options.caseSensitive || false,
          limit: parsed.options.limit || 100,
          searchOutput: parsed.options.searchOutput || null
        };
        await searchAll(db, parsed.options.searchValue, searchOptions);
        break;
        
      case 'test':
        await testPermissions(db);
        break;
        
      case 'delete':
        if (!parsed.options.deleteCollection) {
          console.error('❌ Error: Se requiere el nombre de la colección (-c o --collection)');
          showActionHelp('delete');
        }
        console.log('🚀 Iniciando vaciado de colección...\n');
        console.log('⚠️  ADVERTENCIA: Esta operación eliminará todos los documentos excepto 1.');
        console.log(`📦 Colección: ${parsed.options.deleteCollection}\n`);
        await deleteCollection(db, parsed.options.deleteCollection);
        console.log('\n🎉 ¡Operación completada!');
        break;
        
      default:
        console.error(`❌ Error: Acción desconocida: ${parsed.action}`);
        showHelp();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la operación:');
    console.error(error.message);
    if (error.code === 'permission-denied') {
      console.error('\n⚠️  La cuenta de servicio NO tiene permisos suficientes.');
      console.error('   Necesita el rol: roles/datastore.user o roles/owner');
    } else if (error.code === 'unauthenticated') {
      console.error('\n⚠️  Error de autenticación. Verifica que la clave sea válida.');
    }
    process.exit(1);
  }
}

// Ejecutar
main();

