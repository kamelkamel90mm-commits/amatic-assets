const { spawn } = require('child_process');

const surge = spawn('npx', ['surge', 'dist', '--domain', 'poseidon-casino-kamel.surge.sh']);

surge.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('email:')) {
    surge.stdin.write('Kamelkamel90mm@gmail.com\n');
  }
  if (output.includes('password:')) {
    surge.stdin.write('99403031hatem\n');
  }
});

surge.stderr.on('data', (data) => {
  console.error(data.toString());
});

surge.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
