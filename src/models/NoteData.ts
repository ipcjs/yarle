import { InternalLink } from './InternalLink';
import { MetaData } from './MetaData';

export interface NoteData extends MetaData {
    title?: string;
    created?:string;
    noteName?: string;
    tags?: string;
    content?: string;
    originalContent?: string;
    htmlContent?: string;
    markdownContent?: string;
    appliedMarkdownContent?: string;
    internalLinks?: Array<InternalLink>;
  }

export interface EvernoteNoteData {
  _type_id: 'EvernoteNoteData';
  title?: string;
  created?: string;
  updated?: string;
  content?: string;
  resource?: any;
  noteName?: string;
  tag?: any;
  "note-attributes"?: NoteAttributes;
}

interface NoteAttributes {
  'subject-date'?: string;
  'longitude'?: string;
  'latitude'?: string;
  'altitude'?: string;
  'author'?: string;
  'source'?: string;
  'source-url'?: string;
  'source-application'?: string;
  'reminder-order'?: string;
  'reminder-time'?: string;
  'reminder-done-time'?: string;
  'place-name'?: string;
  'content-class'?: string;
  'application-data'?: string;
}