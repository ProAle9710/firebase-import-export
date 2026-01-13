const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Obtener parámetros de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda general
function showHelp() {
  console.log('\n🔥 Firebase Utils - Herramientas unificadas para Firestore\n');
  console.log('📖 Uso: node firebase-utils.js <acción> [opciones]\n');
  console.log('Acciones disponibles:');
  console.log('  -e, --export     Exportar todas las colecciones de Firestore');
  console.log('  -i, --import     Importar datos desde un archivo JSON');
  console.log('  -s, --search     Buscar un valor en todas las colecciones');
  console.log('  -t, --test       Probar permisos de la cuenta de servicio\n');
  console.log('Opciones comunes:');
  console.log('  -k, --key <archivo>     Archivo de credenciales de Firebase (requerido para todas las acciones)');
  console.log('  -h, --help              Mostrar esta ayuda\n');
  console.log('Ejemplos:');
  console.log('  # Exportar');
  console.log('  node firebase-utils.js -e -k keys/firebase-key.json');
  console.log('  node firebase-utils.js --export --key keys/firebase-key.json -o backup.json\n');
  console.log('  # Importar');
  console.log('  node firebase-utils.js -i -k keys/dest-key.json -f backup.json\n');
  console.log('  # Buscar');
  console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "juan@email.com"');
  console.log('  node firebase-utils.js --search --key keys/firebase-key.json --value "12345" --collection usuarios\n');
  console.log('  # Probar permisos');
  console.log('  node firebase-utils.js -t -k keys/firebase-key.json\n');
  console.log('Para más detalles sobre cada acción, usa: node firebase-utils.js <acción> --help\n');
  process.exit(1);
}

// Función para parsear argumentos
function parseArgs() {
  const parsed = {
    action: null,
    keyFile: null,
    options: {}
  };
  
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
    }
    // Archivo de key
    else if ((arg === '-k' || arg === '--key') && args[i + 1]) {
      parsed.keyFile = args[i + 1];
      i++;
    }
    // Opciones de export
    else if ((arg === '-o' || arg === '--output') && args[i + 1]) {
      parsed.options.output = args[i + 1];
      i++;
    }
    // Opciones de import
    else if ((arg === '-f' || arg === '--file') && args[i + 1]) {
      parsed.options.backupFile = args[i + 1];
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
        showActionHelp(parsed.action);
      } else {
        showHelp();
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
      console.log('Uso: node firebase-utils.js -e -k <archivo-key.json> [-o <archivo-salida.json>]\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Archivo de credenciales (requerido)');
      console.log('  -o, --output <archivo>     Archivo de salida (opcional, por defecto: backup.json)\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js -e -k keys/firebase-key.json -o mi-backup.json\n');
      break;
    case 'import':
      console.log('\n📖 Importar Firestore\n');
      console.log('Uso: node firebase-utils.js -i -k <archivo-key.json> -f <archivo-backup.json>\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Archivo de credenciales del proyecto DESTINO (requerido)');
      console.log('  -f, --file <archivo>       Archivo de backup a importar (requerido)\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js -i -k keys/dest-key.json -f backup.json\n');
      break;
    case 'search':
      console.log('\n📖 Buscar en Firestore\n');
      console.log('Uso: node firebase-utils.js -s -k <archivo-key.json> -v <valor> [opciones]\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Archivo de credenciales (requerido)');
      console.log('  -v, --value <valor>        Valor a buscar (requerido)');
      console.log('  --collection <nombre>      Buscar solo en una colección específica');
      console.log('  --exact                    Buscar coincidencias exactas');
      console.log('  --case-sensitive           Búsqueda case-sensitive');
      console.log('  --limit <número>           Limitar resultados por colección (por defecto: 100)');
      console.log('  --output <archivo>         Guardar resultados en JSON\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "juan@email.com"');
      console.log('  node firebase-utils.js -s -k keys/firebase-key.json -v "12345" --collection usuarios\n');
      break;
    case 'test':
      console.log('\n📖 Probar Permisos\n');
      console.log('Uso: node firebase-utils.js -t -k <archivo-key.json>\n');
      console.log('Parámetros:');
      console.log('  -k, --key <archivo>        Archivo de credenciales (requerido)\n');
      console.log('Ejemplo:');
      console.log('  node firebase-utils.js -t -k keys/firebase-key.json\n');
      break;
  }
  process.exit(1);
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
  
  return admin.firestore();
}

// ============================================================================
// FUNCIONES DE EXPORT
// ============================================================================

async function exportCollection(db, collectionName) {
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

async function exportAllCollections(db, outputFile) {
  console.log('🚀 Iniciando exportación completa de Firestore...\n');
  
  const backup = {};
  const collections = await db.listCollections();
  
  console.log(`📋 Se encontraron ${collections.length} colecciones\n`);
  
  for (const collection of collections) {
    try {
      backup[collection.id] = await exportCollection(db, collection.id);
    } catch (error) {
      console.error(`   ❌ Error al exportar ${collection.id}: ${error.message}`);
      backup[collection.id] = { _error: error.message };
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

async function importCollection(db, collectionName, documents) {
  console.log(`📦 Importando colección: ${collectionName}...`);
  
  let batch = db.batch();
  let docCount = 0;
  let batchOperationCount = 0;
  const batchSize = 500;
  
  for (const [docId, docData] of Object.entries(documents)) {
    const cleanDocId = docId.trim();
    const convertedData = convertTimestamp(docData);
    
    const docRef = db.collection(collectionName).doc(cleanDocId);
    batch.set(docRef, convertedData);
    docCount++;
    batchOperationCount++;
    
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
  
  console.log(`   ✅ ${docCount} documentos importados exitosamente`);
  return docCount;
}

async function importBackup(db, backupFile) {
  console.log(`📖 Leyendo archivo de backup: ${backupFile}...\n`);
  
  if (!fs.existsSync(backupFile)) {
    throw new Error(`El archivo de backup "${backupFile}" no existe.`);
  }
  
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
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  if (args.length === 0) {
    showHelp();
  }
  
  const parsed = parseArgs();
  
  if (!parsed.action) {
    console.error('❌ Error: Debes especificar una acción (-e, -i, -s, -t)');
    showHelp();
  }
  
  const serviceAccount = loadCredentials(parsed.keyFile);
  const db = initializeFirebase(serviceAccount);
  
  try {
    switch (parsed.action) {
      case 'export':
        const outputFile = parsed.options.output || 'backup.json';
        await exportAllCollections(db, outputFile);
        break;
        
      case 'import':
        if (!parsed.options.backupFile) {
          console.error('❌ Error: Se requiere el archivo de backup (-f o --file)');
          showActionHelp('import');
        }
        console.log('🚀 Iniciando importación de Firestore...\n');
        await importBackup(db, parsed.options.backupFile);
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

