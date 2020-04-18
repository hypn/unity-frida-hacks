const FridaInject = require('frida-inject')

var proc = process.argv[2];
var file = process.argv[3];

if (!proc || !file) {
  console.log('Usage:');
  console.log('  node injector.js {executable} {script}');
  console.log();
  console.log('example:');
  console.log('  node injector.js 198X.exe enumerator-test.js');
  process.exit(1);
}

FridaInject({
  name: proc,
  scripts: [file],
  onAttach: session => console.log('Injected "' + file + '" into 198X.exe')
})
