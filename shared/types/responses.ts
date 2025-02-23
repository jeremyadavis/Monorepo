import type { Document } from "mongodb";

export interface ResponseDocument extends Omit<Document, "_id"> {
  _id: string;
  year?: number;
  editionId: string;
  surveyId: string;
  userId: string;
  updatedAt: Date;
  createdAt: Date;
  completion: number;
  customNormalizations?: CustomNormalizationDefinition[];
  /** Commit SHA during response creation */
  deploymentCommit?: string
  finishedAt?: any
  readingList?: any
  duration?: any
  knowledgeScore?: number
  isFinished?: boolean
  lastSavedAt?: any
  [key: string]: any;
}

/**
 * Fields that are common to all surveys = Response without the specific questions of a survey
 * and thus the generic [key: string] or "Document" fields
 */
export interface GenericResponseDocument extends BrowserData {
  _id: string;
  year?: number;
  editionId: string;
  surveyId: string;
  userId: string;
  updatedAt: Date;
  createdAt: Date;
  completion: number;
  customNormalizations?: CustomNormalizationDefinition[];
  /** Commit SHA during response creation */
  deploymentCommit?: string
  finishedAt?: any
  readingList?: any
  duration?: any
  knowledgeScore?: number
  isFinished?: boolean
  lastSavedAt?: any
}

export type CustomNormalizationDefinition = {
  rawPath: string;
  rawValue: string;
  tokens: string[];
};


export interface BrowserData {
  common__user_info__source?: string;
  common__user_info__referrer?: string;
  common__user_info__device?: string;
  common__user_info__browser?: string;
  common__user_info__version?: string;
  common__user_info__os?: string;
}