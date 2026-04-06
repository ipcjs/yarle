import * as fs from 'fs';
import * as path from 'path';
import Moment from 'moment';
import { utimesSync } from 'utimes';

/**
 * 解析Markdown文件的frontmatter，提取time和update字段
 * @param content 文件内容
 * @returns 包含time和update的对象（如果存在）
 */
function parseFrontmatterTime(content: string): { time?: Date; update?: Date } {
  const result: { time?: Date; update?: Date } = {};

  // 匹配YAML frontmatter: ---\n...\n---
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return result;
  }

  const frontmatter = frontmatterMatch[1];

  // 提取time字段
  const timeMatch = frontmatter.match(/^time:\s*(.+)$/m);
  if (timeMatch) {
    const timeStr = timeMatch[1].trim();
    const parsedTime = Moment(timeStr, 'YYYY-MM-DDTHH:mm:ss', true);
    if (parsedTime.isValid()) {
      result.time = parsedTime.toDate();
    }
  }

  // 提取update字段
  const updateMatch = frontmatter.match(/^update:\s*(.+)$/m);
  if (updateMatch) {
    const updateStr = updateMatch[1].trim();
    const parsedUpdate = Moment(updateStr, 'YYYY-MM-DDTHH:mm:ss', true);
    if (parsedUpdate.isValid()) {
      result.update = parsedUpdate.toDate();
    }
  }

  return result;
}

/**
 * 递归遍历目录，生成所有文件路径
 */
function* recursiveReaddirSync(dir: string): Generator<string> {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* recursiveReaddirSync(res);
    } else {
      yield res;
    }
  }
}

/**
 * 处理单个Markdown文件
 * @param filePath 文件路径
 * @returns 处理结果统计
 */
function processMarkdownFile(filePath: string): { contentChanged: boolean; timeChanged: boolean } {
  const result = { contentChanged: false, timeChanged: false };

  // 读取文件内容
  const content = fs.readFileSync(filePath, 'utf-8');

  // 检测并转换CRLF -> LF
  const hasCRLF = content.includes('\r\n');
  let newContent = content;
  if (hasCRLF) {
    newContent = content.replace(/\r\n/g, '\n');
    result.contentChanged = true;
  }

  // 解析frontmatter中的时间
  const { time: frontmatterTime, update: frontmatterUpdate } = parseFrontmatterTime(newContent);

  // 获取当前文件的时间戳
  const stats = fs.statSync(filePath);
  const originalBirthtime = stats.birthtime;
  const originalMtime = stats.mtime;

  // 确定最终的时间戳
  // 优先使用frontmatter中的时间，如果没有则保留原文件时间
  const finalCreatedTime = frontmatterTime ? frontmatterTime.getTime() : originalBirthtime.getTime();
  const finalUpdatedTime = frontmatterUpdate
    ? frontmatterUpdate.getTime()
    : (frontmatterTime ? frontmatterTime.getTime() : originalMtime.getTime());

  // 检查时间是否有变化（允许1秒误差）
  const timeChanged =
    Math.abs(finalCreatedTime - originalBirthtime.getTime()) > 1000 ||
    Math.abs(finalUpdatedTime - originalMtime.getTime()) > 1000;

  if (timeChanged) {
    result.timeChanged = true;
  }

  // 只有内容或时间有变化时才写入
  if (result.contentChanged || result.timeChanged) {
    // 写入文件内容（如果有变更）
    if (result.contentChanged) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  [CRLF→LF] ${filePath}`);
    }

    // 设置文件时间戳
    utimesSync(filePath, {
      btime: Math.max(0, finalCreatedTime),
      mtime: Math.max(0, finalUpdatedTime),
      atime: Math.max(0, finalUpdatedTime),
    });

    if (result.timeChanged) {
      const timeInfo = frontmatterTime
        ? `time=${Moment(frontmatterTime).format('YYYY-MM-DDTHH:mm:ss')}`
        : 'kept original';
      const updateInfo = frontmatterUpdate
        ? `update=${Moment(frontmatterUpdate).format('YYYY-MM-DDTHH:mm:ss')}`
        : (frontmatterTime ? `update=${Moment(frontmatterTime).format('YYYY-MM-DDTHH:mm:ss')}` : 'kept original');
      console.log(`  [TIME] ${filePath} (${timeInfo}, ${updateInfo})`);
    }
  }

  return result;
}

/**
 * 主函数：处理指定文件夹内的所有Markdown文件
 */
function main(): void {
  // 从命令行参数获取目标文件夹
  const targetDir = process.argv[2];

  if (!targetDir) {
    console.error('Usage: node fix-md-files.js <target-directory>');
    console.error('Example: node fix-md-files.js ./output/notes');
    process.exit(1);
  }

  const resolvedDir = path.resolve(targetDir);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`Error: Directory does not exist: ${resolvedDir}`);
    process.exit(1);
  }

  if (!fs.statSync(resolvedDir).isDirectory()) {
    console.error(`Error: Not a directory: ${resolvedDir}`);
    process.exit(1);
  }

  console.log(`Scanning directory: ${resolvedDir}\n`);

  let totalFiles = 0;
  let contentChangedCount = 0;
  let timeChangedCount = 0;

  // 遍历所有文件
  for (const filePath of recursiveReaddirSync(resolvedDir)) {
    // 只处理.md文件
    if (path.extname(filePath).toLowerCase() !== '.md') {
      continue;
    }

    totalFiles++;
    const result = processMarkdownFile(filePath);

    if (result.contentChanged) {
      contentChangedCount++;
    }
    if (result.timeChanged) {
      timeChangedCount++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total MD files scanned: ${totalFiles}`);
  console.log(`Files with CRLF→LF conversion: ${contentChangedCount}`);
  console.log(`Files with timestamp updated: ${timeChangedCount}`);
}

main();
