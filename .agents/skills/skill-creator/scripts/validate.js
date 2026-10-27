#!/usr/bin/env node
/**
 * Antigravity Skill Validator (Node.js)
 * Validates SKILL.md structure, YAML frontmatter, and Antigravity conventions.
 * No external dependencies required.
 */

const fs = require('fs');
const path = require('path');

function parseSimpleYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split(/\r?\n/);
  let currentKey = null;
  let multilineValue = [];
  let isMultiline = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for top-level key: value
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      if (currentKey && isMultiline) {
        result[currentKey] = multilineValue.join(' ').trim();
        isMultiline = false;
        multilineValue = [];
      }
      currentKey = match[1];
      const val = match[2].trim();

      if (val === '>-' || val === '|' || val === '>') {
        isMultiline = true;
        multilineValue = [];
      } else {
        // Strip quotes if any
        let cleanVal = val.replace(/^["']|["']$/g, '');
        result[currentKey] = cleanVal;
      }
    } else if (isMultiline && currentKey) {
      multilineValue.push(line.trim());
    }
  }

  if (currentKey && isMultiline) {
    result[currentKey] = multilineValue.join(' ').trim();
  }

  return result;
}

function validateSkill(skillDir) {
  const resolvedDir = path.resolve(skillDir);
  const skillMdPath = path.join(resolvedDir, 'SKILL.md');

  if (!fs.existsSync(skillMdPath)) {
    return { valid: false, error: `SKILL.md not found in ${resolvedDir}` };
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');
  if (!content.startsWith('---')) {
    return { valid: false, error: 'SKILL.md must start with YAML frontmatter (---)' };
  }

  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return { valid: false, error: 'Invalid frontmatter format. Must be enclosed by ---' };
  }

  const frontmatterText = frontmatterMatch[1];
  const frontmatter = parseSimpleYaml(frontmatterText);

  // Check required fields
  if (!frontmatter.name) {
    return { valid: false, error: "Missing required 'name' in frontmatter" };
  }
  if (!frontmatter.description) {
    return { valid: false, error: "Missing required 'description' in frontmatter" };
  }

  // Name validation
  const name = frontmatter.name.trim();
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: `Name '${name}' must be kebab-case (lowercase letters, digits, and hyphens only)` };
  }
  if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
    return { valid: false, error: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens` };
  }
  if (name.length > 64) {
    return { valid: false, error: `Name is too long (${name.length} chars). Maximum is 64 characters.` };
  }

  // Description validation
  const desc = frontmatter.description.trim();
  if (desc.includes('<') || desc.includes('>')) {
    return { valid: false, error: "Description cannot contain angle brackets (< or >)" };
  }
  if (desc.length > 1024) {
    return { valid: false, error: `Description is too long (${desc.length} chars). Maximum is 1024 characters.` };
  }

  // Claude-specific tool reference checks (warning/info for directive instructions)
  const claudeToolMatches = [];
  const bodyContent = content.slice(frontmatterMatch[0].length);
  // Match patterns like "use the bash tool", "use view tool", "invoke GlobTool", etc.
  const directivePatterns = [
    /use (?:the )?bash tool/i,
    /use (?:the )?view tool/i,
    /use (?:the )?edit tool/i,
    /use (?:the )?replace tool/i,
    /use (?:the )?write tool/i,
    /invoke (?:the )?globtool/i,
    /invoke (?:the )?greptool/i
  ];
  for (const pattern of directivePatterns) {
    if (pattern.test(bodyContent)) {
      claudeToolMatches.push(pattern.source);
    }
  }

  const warnings = [];
  if (claudeToolMatches.length > 0) {
    warnings.push(`Contains directive Claude tool references. In Antigravity, recommend using tool-agnostic phrasing.`);
  }

  // Check for .sh scripts without .ps1 or .py equivalents on Windows
  const scriptsDir = path.join(resolvedDir, 'scripts');
  if (fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory()) {
    const files = fs.readdirSync(scriptsDir);
    const shFiles = files.filter(f => f.endsWith('.sh'));
    const psFiles = files.filter(f => f.endsWith('.ps1') || f.endsWith('.js') || f.endsWith('.py'));
    if (shFiles.length > 0 && psFiles.length === 0) {
      warnings.push(`Found bash scripts (${shFiles.join(', ')}) without Windows-friendly alternatives (.ps1, .js, or .py).`);
    }
  }

  return {
    valid: true,
    name,
    descriptionLength: desc.length,
    warnings,
    skillDir: resolvedDir
  };
}

// CLI execution
if (require.main === module) {
  const targetDir = process.argv[2] || '.';
  const result = validateSkill(targetDir);
  if (!result.valid) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${result.error}`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[PASS]\x1b[0m Skill '${result.name}' is valid for Antigravity IDE!`);
    console.log(`       Path: ${result.skillDir}`);
    console.log(`       Description length: ${result.descriptionLength} chars`);
    if (result.warnings && result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.log(`\x1b[33m[WARN]\x1b[0m ${w}`);
      }
    }
  }
}

module.exports = { validateSkill };
