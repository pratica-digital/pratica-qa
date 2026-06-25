import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as csv from 'csv-parse/sync';

const prisma = new PrismaClient();

interface CsvRow {
  id: string;
  section: string;
  'test case number': string;
  title: string;
  description: string;
  'test steps': string;
  'expected result': string;
  'created at': string;
  'updated at': string;
}

async function importCsv(csvFilePath: string, projectKey: string) {
  try {
    console.log(`📂 Reading CSV file: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV - skip first 4 lines (metadata)
    const lines = fileContent.split('\n');
    const dataLines = lines.slice(4).join('\n');
    
    const records = csv.parse(dataLines, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    }) as CsvRow[];

    console.log(`✅ Found ${records.length} test cases in CSV`);

    // Find or create project
    let project = await prisma.project.findUnique({
      where: { key: projectKey },
    });

    if (!project) {
      throw new Error(`Project with key "${projectKey}" not found. Create it first.`);
    }

    console.log(`✅ Found project: ${project.name}`);

    // Get suite name from first record
    const suiteName = records[0]?.section || 'Default Suite';
    
    // Find or create suite
    let suite = await prisma.testSuite.findFirst({
      where: {
        projectId: project.id,
        name: suiteName,
      },
    });

    if (!suite) {
      suite = await prisma.testSuite.create({
        data: {
          projectId: project.id,
          name: suiteName,
          position: 0,
        },
      });
      console.log(`✨ Created new test suite: ${suiteName}`);
    } else {
      console.log(`✅ Found existing test suite: ${suiteName}`);
    }

    // Import test cases
    let createdCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      try {
        // Check if test case already exists
        const existingCase = await prisma.testCase.findFirst({
          where: {
            suiteId: suite.id,
            title: record.title.trim(),
          },
        });

        if (existingCase) {
          console.log(`⏭️  Skipping duplicate: ${record.title}`);
          skippedCount++;
          continue;
        }

        // Parse test steps (split by newline numbers or bullet points)
        const stepsText = record['test steps'] || '';
        const stepLines = stepsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        // Create test case
        const testCase = await prisma.testCase.create({
          data: {
            suiteId: suite.id,
            title: record.title.trim(),
            description: record.description?.trim() || '',
            expectedResult: record['expected result']?.trim() || '',
            status: 'ACTIVE',
            priority: 'MEDIUM',
            severity: 'MEDIUM',
          },
        });

        // Create test steps
        for (let i = 0; i < stepLines.length; i++) {
          await prisma.testStep.create({
            data: {
              testCaseId: testCase.id,
              order: i + 1,
              description: stepLines[i],
              expectedResult: record['expected result']?.trim() || '',
            },
          });
        }

        console.log(`✅ Created test case: ${record.title}`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error importing test case: ${record.title}`, error);
        skippedCount++;
      }
    }

    console.log(`
╔════════════════════════════════════╗
║ Import Summary                     ║
╠════════════════════════════════════╣
║ Project: ${project.name.padEnd(30)}║
║ Suite: ${suiteName.padEnd(30)}║
║ Created: ${createdCount.toString().padEnd(30)}║
║ Skipped: ${skippedCount.toString().padEnd(30)}║
║ Total: ${records.length.toString().padEnd(30)}║
╚════════════════════════════════════╝
    `);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Get arguments from command line
const csvPath = process.argv[2];
const projectKey = process.argv[3];

if (!csvPath || !projectKey) {
  console.error('Usage: npx ts-node scripts/import-csv.ts <csv-path> <project-key>');
  console.error('Example: npx ts-node scripts/import-csv.ts ./data.csv TSI');
  process.exit(1);
}

importCsv(csvPath, projectKey);
