/**
 * Create-admin script — Crée un nouvel admin ou met à jour un mot de passe
 *
 * Usage : npm run create-admin
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../src/db/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, (answer) => resolve(answer.trim()));
    } else {
      // Masque la saisie
      const stdin = process.openStdin();
      process.stdout.write(question);
      let input = '';
      const onData = (char) => {
        char = char.toString();
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.removeListener('data', onData);
          stdin.pause();
          process.stdout.write('\n');
          resolve(input);
        } else if (char === '\u0003') {
          process.exit(0);
        } else {
          input += char;
          process.stdout.write('*');
        }
      };
      stdin.on('data', onData);
    }
  });
}

async function main() {
  console.log('\n🍔 Street Food Vla — Créer / mettre à jour un admin\n');

  const username = await ask('Identifiant : ');
  if (!username) {
    console.error('Identifiant vide.');
    process.exit(1);
  }

  const password = await ask('Mot de passe (10+ caractères) : ', true);
  if (!password || password.length < 10) {
    console.error('Mot de passe trop court (minimum 10 caractères).');
    process.exit(1);
  }

  const confirmation = await ask('Confirmer : ', true);
  if (password !== confirmation) {
    console.error('Les mots de passe ne correspondent pas.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    console.log(`\n✓ Mot de passe mis à jour pour "${username}"\n`);
  } else {
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`\n✓ Admin "${username}" créé\n`);
  }

  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur :', err);
  process.exit(1);
});
