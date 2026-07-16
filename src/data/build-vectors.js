const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Starting portfolio vector building process...');

  // Dynamically import ES modules in CommonJS
  const { pipeline } = await import('@huggingface/transformers');

  const resumePath = path.join(__dirname, 'resume.json');
  if (!fs.existsSync(resumePath)) {
    throw new Error(`resume.json not found at: ${resumePath}`);
  }

  const resumeData = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
  console.log('Successfully loaded resume.json.');

  // Extract all achievements from experiences
  const achievements = [];
  if (resumeData.experiences && Array.isArray(resumeData.experiences)) {
    resumeData.experiences.forEach(exp => {
      if (exp.roles && Array.isArray(exp.roles)) {
        exp.roles.forEach(role => {
          if (role.achievements && Array.isArray(role.achievements)) {
            role.achievements.forEach(a => {
              if (a.id && a.text) {
                achievements.push({
                  id: a.id,
                  text: a.text
                });
              }
            });
          }
        });
      }
    });
  }

  console.log(`Extracted ${achievements.length} achievements to embed.`);

  // Initialize huggingface transformers pipeline
  console.log('Loading Xenova/e5-small-v2 feature extraction pipeline...');
  const pipe = await pipeline('feature-extraction', 'Xenova/e5-small-v2');

  const meta = {
    model: 'Xenova/e5-small-v2',
    dimension: 384,
    achievements: []
  };

  const floatArray = [];

  for (let i = 0; i < achievements.length; i++) {
    const ach = achievements[i];
    console.log(`[${i + 1}/${achievements.length}] Generating embedding for: ${ach.id}`);

    // e5 models require 'passage: ' prefix for document indexing
    const out = await pipe(['passage: ' + ach.text], { pooling: 'mean', normalize: true });
    
    // out.data is a Float32Array containing the 384 dimensions
    const vector = Array.from(out.data);
    if (vector.length !== 384) {
      throw new Error(`Expected vector dimension 384, got ${vector.length} for ${ach.id}`);
    }

    meta.achievements.push({
      id: ach.id,
      index: i
    });

    floatArray.push(...vector);
  }

  // Write metadata JSON file
  const metaPath = path.join(__dirname, 'search-vectors-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`Wrote metadata file to: ${metaPath}`);

  // Write binary Float32Array file
  const binPath = path.join(__dirname, 'search-vectors.bin');
  const buffer = Buffer.from(new Float32Array(floatArray).buffer);
  fs.writeFileSync(binPath, buffer);
  console.log(`Wrote binary vectors file to: ${binPath} (Size: ${buffer.length} bytes)`);

  console.log('Build process completed successfully!');
}

main().catch(err => {
  console.error('Vector build failed:', err);
  process.exit(1);
});
