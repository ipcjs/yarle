// tslint:disable:no-console
import fs from 'fs';
import { merge } from 'lodash';
import * as path from 'path';
import flow from 'xml-flow';

import * as utils from './utils';
import { YarleOptions } from './YarleOptions';
import { processNode } from './process-node';
import { isWebClip } from './utils/note-utils';
import { loggerInfo } from './utils/loggerInfo';
import { hasAnyTagsInTemplate,
  hasCreationTimeInTemplate,
  hasLinkToOriginalInTemplate,
  hasLocationInTemplate,
  hasAltitudeInTemplate,
  hasNotebookInTemplate,
  hasSubjectDateInTemplate,
  hasAuthorInTemplate,
  hasSourceInTemplate,
  hasSourceURLInTemplate,
  hasSourceApplicationInTemplate,
  hasPlaceNameInTemplate,
  hasContentClassInTemplate,
  hasApplicationDataInTemplate,
  hasUpdateTimeInTemplate } from './utils/templates/checker-functions';
import { defaultTemplate } from './utils/templates/default-template';
import { OutputFormat } from './output-format';
import { clearLogFile } from './utils/clearLogFile';
import { RuntimePropertiesSingleton } from './runtime-properties';
import { processTaskFactory } from './process-tasks';
import { mapEvernoteTask } from './models/EvernoteTask';
import { TaskOutputFormat } from './task-output-format';
import { isTanaOutput } from './utils/tana/is-tana-output';
import { LanguageFactory } from './outputLanguages/LanguageFactory';
import { EvernoteNoteData } from './models';

export const defaultYarleOptions: YarleOptions = {
  enexSources: ['notebook.enex'],
  outputDir: './mdNotes',
  keepOriginalHtml: false,
  posixHtmlPath: false,
  isMetadataNeeded: false,
  isNotebookNameNeeded: false,
  isZettelkastenNeeded: false,
  useZettelIdAsFilename: false,
  plainTextNotesOnly: false,
  skipWebClips: true,
  useHashTags: true,
  removeUnicodeCharsFromTags: false,
  trimStartingTabs: false,
  convertPlainHtmlNewlines: false,
  encryptionPasswords: [],
  nestedTags: {
    separatorInEN: '_',
    replaceSeparatorWith: '/',
    replaceSpaceWith: '-',
  },
  outputFormat: OutputFormat.StandardMD,
  taskOutputFormat: TaskOutputFormat.StandardMD,
  obsidianTaskTag: '',
  urlEncodeFileNamesAndLinks: false,
  sanitizeResourceNameSpaces: false,
  replacementChar: '_',
  replacementCharacterMap: {},
  globalReplacementSettings: [],
  pathSeparator: '/',
  resourcesDir: '_resources',
  turndownOptions: {
    headingStyle: 'atx',
  },
};

export let yarleOptions: YarleOptions = { ...defaultYarleOptions };

const setOptions = (options: YarleOptions): void => {
  yarleOptions = merge({}, defaultYarleOptions, options);

  let template = (yarleOptions.templateFile)  ?  fs.readFileSync(yarleOptions.templateFile, 'utf-8') : defaultTemplate;
  template = yarleOptions.currentTemplate ? yarleOptions.currentTemplate : template;

  /*if (yarleOptions.templateFile) {*/
  // todo: handle file not exists error
  yarleOptions.skipCreationTime = !hasCreationTimeInTemplate(template);
  yarleOptions.skipSubjectDate = !hasSubjectDateInTemplate(template);
  yarleOptions.skipLocation = !hasLocationInTemplate(template);
  yarleOptions.skipAltitude = !hasAltitudeInTemplate(template);
  yarleOptions.skipAuthor = !hasAuthorInTemplate(template);
  yarleOptions.skipSource = !hasSourceInTemplate(template);
  yarleOptions.skipSourceUrl = !hasSourceURLInTemplate(template);
  yarleOptions.skipSourceApplication = !hasSourceApplicationInTemplate(template);
  yarleOptions.skipPlaceName = !hasPlaceNameInTemplate(template);
  yarleOptions.skipContentClass = !hasContentClassInTemplate(template);
  yarleOptions.skipApplicationData = !hasApplicationDataInTemplate(template);
  yarleOptions.skipAuthor = !hasAuthorInTemplate(template);
  yarleOptions.skipTags = !hasAnyTagsInTemplate(template) && !isTanaOutput();
  yarleOptions.skipUpdateTime = !hasUpdateTimeInTemplate(template);
  yarleOptions.isNotebookNameNeeded = hasNotebookInTemplate(template);
  yarleOptions.keepOriginalHtml = hasLinkToOriginalInTemplate(template);

  yarleOptions.currentTemplate = template;

  loggerInfo(`Current config is: ${JSON.stringify(yarleOptions, null, 4)}`);
  loggerInfo(`Path separator:${path.sep}`);
  /*}*/
};
interface TaskGroups {
  [key: string]: Map<string, string>;
}

export const parseStream = async (options: YarleOptions, enexSource: string): Promise<void> => {
  loggerInfo(`Getting stream from ${enexSource}`);
  const stream = fs.createReadStream(enexSource);
  // const xml = new XmlStream(stream);
  let noteNumber = 0;
  let failed = 0;
  let skipped = 0;
  const tasks: TaskGroups = {}; // key: taskId value: generated md text
  const notebookName = utils.getNotebookName(enexSource);
  const processTaskFn = processTaskFactory(yarleOptions.taskOutputFormat);

  return new Promise((resolve, reject) => {

    const logAndReject = (error: Error) => {
      loggerInfo(`Could not convert ${enexSource}:\n${error.message}`);
      ++failed;

      return reject();
    };
    if (!fs.existsSync(enexSource)) {
      return loggerInfo(JSON.stringify({ name: 'NoSuchFileOrDirectory', message: 'source Enex file does not exists' }));
    }

    const xml = flow(stream);

    let noteAttributes: any = null;
    xml.on('tag:note-attributes', (na: any) => {
      noteAttributes = na;
    });

    xml.on('tag:note', (note: EvernoteNoteData) => {
      if (options.skipWebClips && isWebClip(note)) {
        ++skipped;
        loggerInfo(`Notes skipped: ${skipped}`);
      } else {
        if (noteAttributes) {
          // make sure single attributes are not collapsed
          note['note-attributes'] = noteAttributes;
        }
        note.noteName = note.title?.slice();
        processNode(note, notebookName);
        ++noteNumber;
        loggerInfo(`Notes processed: ${noteNumber}\n\n`);
      }
      noteAttributes = null;

      const runtimeProps = RuntimePropertiesSingleton.getInstance();
      const currentNotePath = runtimeProps.getCurrentNotePath();
      if (currentNotePath) {
        for (const task of Object.keys(tasks)) {

          const taskPlaceholder = `<YARLE-EN-V10-TASK>${task}</YARLE-EN-V10-TASK>`
          const fileContent = fs.readFileSync(currentNotePath, 'UTF-8');
          const sortedTasks = new Map([...tasks[task]].sort());

          let updatedContent = fileContent.replace(taskPlaceholder, [...sortedTasks.values()].join('\n'));

          const languageFactory  = new LanguageFactory();
          const language = languageFactory.createLanguage(yarleOptions.outputFormat)
          updatedContent = language.tagProcess(fileContent, sortedTasks, taskPlaceholder, updatedContent)

          fs.writeFileSync(currentNotePath, updatedContent);

        }
      }
    });

    xml.on('tag:task', (pureTask: any) => {
      const task = mapEvernoteTask(pureTask);
      if (!tasks[task.taskgroupnotelevelid]) {
        tasks[task.taskgroupnotelevelid] = new Map();
      }

      tasks[task.taskgroupnotelevelid].set(task.sortweight, processTaskFn(task, notebookName));

    });

    xml.on('end', () => {


      const success = noteNumber - failed;
      const totalNotes = noteNumber + skipped;
      loggerInfo('==========================');
      loggerInfo(
        `Conversion finished: ${success} succeeded, ${skipped} skipped, ${failed} failed. Total notes: ${totalNotes}`,
      );

      return resolve();
    });
    xml.on('error', logAndReject);
    stream.on('error', logAndReject);
  });
};

const saveOptionsAsConfig = (options: YarleOptions): void => {
  const now = new Date();
  const formattedDateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  const yarleConfigName = `yarle_${formattedDateString}.config`;
  const encoded = Buffer.from(JSON.stringify(options))
  fs.writeFileSync(path.join(options.outputDir, yarleConfigName), encoded);
}
export const dropTheRope = async (options: YarleOptions): Promise<Array<string>> => {
  clearLogFile();
  setOptions(options);
  utils.createRootOutputDir();
  saveOptionsAsConfig(options)
  const outputNotebookFolders = [];
  for (const enex of options.enexSources) {
    utils.setPaths(enex);
    const runtimeProps = RuntimePropertiesSingleton.getInstance();
    runtimeProps.setCurrentNotebookName(utils.getNotebookName(enex));
    await parseStream(options, enex);
    outputNotebookFolders.push(utils.getNotesPath());
  }

  return outputNotebookFolders;

};
// tslint:enable:no-console
