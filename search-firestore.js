const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Obtener parámetros de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda
function showHelp() {
  console.log('\n📖 Uso: node search-firestore.js <archivo-key.json> <valor-buscar> [opciones]');
  console.log('\nParámetros:');
  console.log('  archivo-key.json    - Ruta al archivo de credenciales de Firebase (requerido)');
  console.log('  valor-buscar        - Valor a buscar en todos los campos (requerido)');
  console.log('\nOpciones:');
  console.log('  --collection <nombre>  - Buscar solo en una colección específica');
  console.log('  --exact                - Buscar coincidencias exactas (case-sensitive)');
  console.log('  --case-sensitive       - Búsqueda case-sensitive (por defecto es case-insensitive)');
  console.log('  --limit <número>       - Limitar número de resultados por colección (por defecto: 100)');
  console.log('  --output <archivo>     - Guardar resultados en un archivo JSON');
  console.log('\nEjemplos:');
  console.log('  node search-firestore.js keys/firebase-key.json "juan@email.com"');
  console.log('  node search-firestore.js keys/firebase-key.json "12345" --collection usuarios');
  console.log('  node search-firestore.js keys/firebase-key.json "admin" --exact --case-sensitive');
  console.log('  node search-firestore.js keys/firebase-key.json "test" --limit 50 --output resultados.json\n');
  process.exit(1);
}

// Validar argumentos
if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

const keyFile = args[0];
const searchValue = args[1];

// Parsear opciones
const options = {
  collection: null,
  exact: false,
  caseSensitive: false,
  limit: 100,
  output: null
};

for (let i = 2; i < args.length; i++) {
  if (args[i] === '--collection' && args[i + 1]) {
    options.collection = args[i + 1];
    i++;
  } else if (args[i] === '--exact') {
    options.exact = true;
  } else if (args[i] === '--case-sensitive') {
    options.caseSensitive = true;
  } else if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  }
}

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

// Función para convertir cualquier valor a string para búsqueda
function valueToString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    // Para objetos, intentar convertir a JSON
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
}

// Función para buscar un valor en un objeto recursivamente
function searchInObject(obj, searchValue, options, path = '') {
  const matches = [];
  const searchStr = options.caseSensitive ? searchValue : searchValue.toLowerCase();
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      const valueStr = options.caseSensitive ? valueToString(value) : valueToString(value).toLowerCase();
      
      // Verificar si coincide
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
      
      // Buscar recursivamente en objetos y arrays
      if (value !== null && typeof value === 'object' && !(value instanceof admin.firestore.Timestamp)) {
        const nestedMatches = searchInObject(value, searchValue, options, currentPath);
        matches.push(...nestedMatches);
      }
    }
  }
  
  return matches;
}

// Función para buscar en una colección
async function searchInCollection(collectionName, searchValue, options) {
  console.log(`🔍 Buscando en colección: ${collectionName}...`);
  
  const collectionRef = db.collection(collectionName);
  let query = collectionRef;
  
  // Intentar obtener todos los documentos (con límite)
  // Nota: Firestore tiene límites, así que usamos paginación si es necesario
  const results = [];
  let lastDoc = null;
  let totalProcessed = 0;
  let totalFound = 0;
  
  try {
    do {
      let snapshot;
      if (lastDoc) {
        snapshot = await query.startAfter(lastDoc).limit(1000).get();
      } else {
        snapshot = await query.limit(1000).get();
      }
      
      if (snapshot.empty) {
        break;
      }
      
      for (const doc of snapshot.docs) {
        if (results.length >= options.limit) {
          break; // Salir del bucle si ya tenemos suficientes resultados
        }
        
        totalProcessed++;
        const docData = doc.data();
        const matches = searchInObject(docData, searchValue, options);
        
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
      
      // Si ya tenemos suficientes resultados, salir
      if (results.length >= options.limit) {
        break;
      }
      
      // Si no hay más documentos, salir
      if (snapshot.size < 1000) {
        break;
      }
      
    } while (results.length < options.limit);
    
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

// Función principal de búsqueda
async function searchAll() {
  console.log('🚀 Iniciando búsqueda en Firestore...\n');
  console.log(`🔎 Valor a buscar: "${searchValue}"`);
  console.log(`📋 Modo: ${options.exact ? 'Exacto' : 'Parcial'} | Case-sensitive: ${options.caseSensitive ? 'Sí' : 'No'}`);
  if (options.collection) {
    console.log(`📦 Colección específica: ${options.collection}`);
  }
  console.log(`\n${'='.repeat(60)}\n`);
  
  const allResults = {};
  let collectionsToSearch = [];
  
  if (options.collection) {
    collectionsToSearch = [options.collection];
  } else {
    // Obtener todas las colecciones
    const collections = await db.listCollections();
    collectionsToSearch = collections.map(col => col.id);
    console.log(`📋 Se encontraron ${collectionsToSearch.length} colecciones para buscar\n`);
  }
  
  for (const collectionName of collectionsToSearch) {
    const result = await searchInCollection(collectionName, searchValue, options);
    if (result.results && result.results.length > 0) {
      allResults[collectionName] = result;
    } else if (result.error) {
      allResults[collectionName] = result;
    }
    console.log(''); // Línea en blanco
  }
  
  return allResults;
}

// Función para mostrar resultados en consola
function displayResults(results) {
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
      console.log(`\n   📄 Documento ${idx + 1}: ${docResult.documentId}`);
      docResult.matches.forEach(match => {
        const valueDisplay = typeof match.value === 'object' 
          ? JSON.stringify(match.value).substring(0, 100) 
          : String(match.value).substring(0, 100);
        console.log(`      ✓ Campo: ${match.path}`);
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

// Ejecutar búsqueda
searchAll()
  .then(results => {
    displayResults(results);
    
    // Guardar en archivo si se especificó
    if (options.output) {
      const jsonContent = JSON.stringify(results, null, 2);
      fs.writeFileSync(options.output, jsonContent, 'utf8');
      console.log(`💾 Resultados guardados en: ${options.output}\n`);
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error durante la búsqueda:');
    console.error(error);
    process.exit(1);
  });

