#!/usr/bin/env node
/**
 * Claude/Codex -> Antigravity Skill Porter (Node.js)
 * Automatically adapts Claude Code / Codex / Cursor skills into Antigravity IDE compatible skills.
 */

const fs = require('fs');
const path = require('path');
const { validateSkill } = require('./validate');

const TOOL_REPLACEMENTS = [
  { from: /\buse the bash tool to (?:run|execute)\b/gi, to: 'run command:' },
  { from: /\buse the bash tool\b/gi, to: 'run terminal command' },
  { from: /\bbash tool\b/gi, to: 'terminal command' },
  { from: /\buse the view tool to (?:view|inspect|read)\b/gi, to: 'inspect file:' },
  { from: /\buse the view tool\b/gi, to: 'read file' },
  { from: /\bview tool\b/gi, to: 'file viewer' },
  { from: /\buse the edit tool to\b/gi, to: 'edit file to' },
  { from: /\buse the replace tool to\b/gi, to: 'replace file content to' },
  { from: /\bedit tool\b/gi, to: 'file edit' },
  { from: /\breplace tool\b/gi, to: 'file replacement' },
  { from: /\buse the write tool to\b/gi, to: 'write file to' },
  { from: /\bwrite tool\b/gi, to: 'file write' },
  { from: /\bglobtool\b/gi, to: 'directory listing' },
  { from: /\bgreptool\b/gi, to: 'text grep search' },
  { from: /\.claude\/skills\//g, to: '.agents/skills/' },
  { from: /~[\\\/]\.claude[\\\/]skills/g, to: '~/.gemini/config/skills' }
];

function portSkill(sourceDir, targetDir) {
  const resolvedSource = path.resolve(sourceDir);
  const skillMdSource = path.join(resolvedSource, 'SKILL.md');

  if (!fs.existsSync(skillMdSource)) {
    console.error(`[ERROR] SKILL.md not found in source directory: ${resolvedSource}`);
    process.exit(1);
  }

  let content = fs.readFileSync(skillMdSource, 'utf8');

  // Check frontmatter
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  if (!match) {
    console.error('[ERROR] Source SKILL.md is missing valid YAML frontmatter (---)');
    process.exit(1);
  }

  let frontmatterStr = match[1];
  let body = match[2];

  // Extract name
  const nameMatch = frontmatterStr.match(/name:\s*(.+)/);
  const skillName = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : path.basename(resolvedSource);

  const destination = targetDir 
    ? path.resolve(targetDir) 
    : path.resolve(process.cwd(), '.agents', 'skills', skillName);

  console.log(`Porting skill '${skillName}'...`);
  console.log(`  Source: ${resolvedSource}`);
  console.log(`  Destination: ${destination}`);

  // Apply tool replacements to body
  let replacementsCount = 0;
  for (const rep of TOOL_REPLACEMENTS) {
    const matches = body.match(rep.from);
    if (matches) {
      replacementsCount += matches.length;
      body = body.replace(rep.from, rep.to);
    }
  }

  const newContent = `---\n${frontmatterStr.trim()}\n---\n${body}`;

  // Ensure target directory exists
  fs.mkdirSync(destination, { recursive: true });

  // Write ported SKILL.md
  fs.writeFileSync(path.join(destination, 'SKILL.md'), newContent, 'utf8');

  // Copy subdirectories if they exist (scripts, references, assets, examples)
  const subdirs = ['scripts', 'references', 'assets', 'resources', 'examples'];
  for (const dir of subdirs) {
    const srcSubdir = path.join(resolvedSource, dir);
    if (fs.existsSync(srcSubdir) && fs.statSync(srcSubdir).isDirectory()) {
      const destSubdir = path.join(destination, dir);
      fs.mkdirSync(destSubdir, { recursive: true });
      copyDirRecursive(srcSubdir, destSubdir);
    }
  }

  console.log(`[SUCCESS] Skill adapted to Antigravity IDE standard! (${replacementsCount} tool phrases modernized)`);
  
  // Validate result
  const val = validateSkill(destination);
  if (val.valid) {
    console.log(`[PASS] Validation check passed.`);
  } else {
    console.log(`[WARN] Validation note: ${val.error}`);
  }
}

function copyDirRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (require.main === module) {
  const source = process.argv[2];
  const target = process.argv[3];
  if (!source) {
    console.log('Usage: node port_skill.js <source-skill-directory> [target-directory]');
    process.exit(1);
  }
  portSkill(source, target);
}

module.exports = { portSkill };
