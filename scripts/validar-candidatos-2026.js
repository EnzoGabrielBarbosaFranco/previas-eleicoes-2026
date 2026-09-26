const fs = require('node:fs');
const path = require('node:path');

const dataRoot = path.resolve(process.cwd(), 'data', '2026');
const manifest = JSON.parse(fs.readFileSync(path.join(dataRoot, 'manifest.json'), 'utf8'));
const ids = new Set();
const errors = [];
let totalCandidates = 0;
let totalPhotos = 0;

for (const entry of manifest.arquivos) {
  const filePath = path.join(dataRoot, ...entry.arquivo.split('/'));
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const candidates = Array.isArray(payload.candidatos) ? payload.candidatos : [];

  if (payload.meta?.total !== candidates.length || entry.total !== candidates.length) {
    errors.push(`${entry.arquivo}: total divergente`);
  }
  if (payload.meta?.situacoesVerificadasEm !== manifest.situacoesVerificadasEm) {
    errors.push(`${entry.arquivo}: verificação de situação divergente`);
  }

  for (const candidate of candidates) {
    if (ids.has(candidate.id)) errors.push(`${entry.arquivo}: ID duplicado ${candidate.id}`);
    ids.add(candidate.id);
    if (candidate.apto === false) errors.push(`${entry.arquivo}: candidatura inapta publicada ${candidate.id}`);
    if (candidate.foto) totalPhotos += 1;
  }
  totalCandidates += candidates.length;
}

if (ids.has('280002553884')) errors.push('Pablo Marçal ainda consta entre as candidaturas publicadas');
if (manifest.totalCandidatos !== totalCandidates) errors.push('Total geral divergente no manifesto');
if (manifest.totalFotos !== totalPhotos) errors.push('Total de fotos divergente no manifesto');
if (manifest.fotosAusentes !== totalCandidates - totalPhotos) errors.push('Total de fotos ausentes divergente');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`${manifest.arquivos.length} arquivos e ${totalCandidates} candidaturas validados.`);
