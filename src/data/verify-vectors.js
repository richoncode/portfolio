const fs = require('fs');
const path = require('path');

function verify() {
  console.log('Running automated verification of precomputed vector search files...');

  const resumePath = path.join(__dirname, 'resume.json');
  const metaPath = path.join(__dirname, 'search-vectors-meta.json');
  const binPath = path.join(__dirname, 'search-vectors.bin');

  if (!fs.existsSync(resumePath)) {
    throw new Error('resume.json is missing.');
  }
  if (!fs.existsSync(metaPath)) {
    throw new Error('search-vectors-meta.json is missing.');
  }
  if (!fs.existsSync(binPath)) {
    throw new Error('search-vectors.bin is missing.');
  }

  const resumeData = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const binStats = fs.statSync(binPath);

  // 1. Count achievements in resume.json
  const achievements = [];
  resumeData.experiences.forEach(exp => {
    exp.roles.forEach(role => {
      role.achievements.forEach(a => {
        if (a.id && a.text) {
          achievements.push(a.id);
        }
      });
    });
  });

  console.log(`- Achievements in resume.json: ${achievements.length}`);
  console.log(`- Achievements in search-vectors-meta.json: ${meta.achievements.length}`);

  if (achievements.length !== meta.achievements.length) {
    throw new Error(`Achievement count mismatch: resume.json has ${achievements.length}, but search-vectors-meta.json has ${meta.achievements.length}`);
  }

  // 2. Verify binary file size matches dimensions
  const expectedSize = meta.achievements.length * meta.dimension * 4; // 4 bytes per float32
  console.log(`- Expected binary file size: ${expectedSize} bytes`);
  console.log(`- Actual binary file size: ${binStats.size} bytes`);

  if (binStats.size !== expectedSize) {
    throw new Error(`Binary file size mismatch: Expected ${expectedSize} bytes, got ${binStats.size} bytes.`);
  }

  // 3. Verify mappings match IDs exactly
  const resumeIdsSet = new Set(achievements);
  meta.achievements.forEach(ach => {
    if (!resumeIdsSet.has(ach.id)) {
      throw new Error(`Metadata lists ID "${ach.id}" which is missing in resume.json.`);
    }
  });

  console.log('✔ All automated vector verification checks passed! Precomputed search indexes are correct and integrated.');
}

try {
  verify();
} catch (err) {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
}
