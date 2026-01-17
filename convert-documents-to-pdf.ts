// convert-documents-to-pdf.ts
// Converts supported documents in public/documents/ to PDF by calling the LibreOffice CLI
// "C:\Program Files\LibreOffice\program\soffice.exe" --headless --convert-to pdf --outdir C:\Users\USER\Documents\Icenia-Website\public\documents C:\Users\USER\Documents\Icenia-Website\public\documents\Simple-Sentences-Act.docx
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { execFile } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const DOCS_DIR = join(process.cwd(), 'public', 'documents');
const SUPPORTED_EXTS = ['.doc', '.docx', '.odt', '.rtf', '.ppt', '.pptx', '.xls', '.xlsx'];

// Locate LibreOffice executable
let SOFFICE_PATH = 'soffice';
if (os.platform() === 'win32') {
  if (process.env.LIBREOFFICE_PATH) {
    SOFFICE_PATH = process.env.LIBREOFFICE_PATH;
  } else {
    SOFFICE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
  }
}

async function convertFileToPDF(filePath: string, outputDir: string) {
  console.log(`Converting: ${basename(filePath)}...`);

  try {
    const args = ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, filePath];

    // Remove Python-related env vars that may conflict with LibreOffice's internal runtime
    const env = { ...process.env } as NodeJS.ProcessEnv;
    delete env.PYTHONHOME;
    delete env.PYTHONPATH;

    const { stdout, stderr } = await execFileAsync(SOFFICE_PATH, args, { env, windowsHide: true });
    if (stdout) console.log(stdout.toString());
    if (stderr) console.error(stderr.toString());

    console.log(`✅ Success: ${basename(filePath)} -> PDF`);
  } catch (error: any) {
    console.error(`❌ Error converting ${basename(filePath)}:`);
    if (error.stderr) console.error(error.stderr.toString());
    else console.error(error);
  }
}

async function convertAllDocuments() {
  try {
    const files = await readdir(DOCS_DIR);

    // Validate LibreOffice path on Windows
    if (os.platform() === 'win32') {
      try {
        await stat(SOFFICE_PATH);
      } catch {
        console.error(`Could not find LibreOffice at: ${SOFFICE_PATH}`);
        console.error('Please install LibreOffice or set LIBREOFFICE_PATH environment variable.');
        process.exit(1);
      }
    }

    for (const file of files) {
      const filePath = join(DOCS_DIR, file);
      const stats = await stat(filePath);
      const ext = extname(file).toLowerCase();

      if (stats.isFile() && SUPPORTED_EXTS.includes(ext)) {
        await convertFileToPDF(filePath, DOCS_DIR);
      }
    }
  } catch (err) {
    console.error('Directory scanning error:', err);
  }
}

if (require.main === module) {
  convertAllDocuments().catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  });
}
