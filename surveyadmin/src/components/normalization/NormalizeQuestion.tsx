"use client";

import Actions from "~/components/normalization/NormalizeQuestionActions";
import Progress from "~/components/normalization/Progress";
import Fields from "~/components/normalization/Fields";
import Metadata from "~/components/normalization/Metadata";
import Tokens from "~/components/normalization/Tokens";

import { ResponsesData, useQuestionResponses } from "~/lib/normalization/hooks";
import { EditionMetadata, SurveyMetadata } from "@devographics/types";
import { useSegments } from "./hooks";
import type { QuestionWithSection } from "~/lib/normalization/types";
import QuestionData from "./QuestionData";
import { splitResponses } from "~/lib/normalization/helpers/splitResponses";
import { useLocalStorage } from "../hooks";

export const NormalizeQuestion = (props: {
  survey: SurveyMetadata;
  edition: EditionMetadata;
  question: QuestionWithSection;
}) => {
  const { survey, edition, question } = props;
  const { data, loading, error } = useQuestionResponses({
    surveyId: survey.id,
    editionId: edition.id,
    questionId: question.id,
  });

  return loading ? (
    <div aria-busy={true} />
  ) : (
    <Normalization {...props} data={data} />
  );
};

export type CustomNormalizations = {
  [key in string]: string[];
};

export type CustomNormalization = {
  responseId: string;
  tokens: string[];
};

export const Normalization = ({
  survey,
  edition,
  question,
  data = {} as ResponsesData,
}: {
  survey: SurveyMetadata;
  edition: EditionMetadata;
  question: QuestionWithSection;
  data?: ResponsesData;
}) => {
  const { responsesCount, entities, responses, questionResult, durations } =
    data;

  // console.log(durations);

  const cacheKey = `custom_normalizations__${edition.id}__${question.id}`;
  const [customNormalizations, setCustomNormalizations] =
    useLocalStorage<CustomNormalizations>(cacheKey, {});

  const questionData = questionResult?.data;

  const {
    initializeSegments,
    updateSegments,
    doneCount,
    enabled,
    setEnabled,
    segments,
  } = useSegments();

  const addCustomNormalization = ({
    responseId,
    tokens,
  }: CustomNormalization) => {
    const newTokens = [...(customNormalizations[responseId] || []), ...tokens];
    setCustomNormalizations({
      ...customNormalizations,
      [responseId]: newTokens,
    });
  };

  const props = {
    responsesCount,
    survey,
    edition,
    question,
    responses,
    initializeSegments,
    updateSegments,
    doneCount,
    enabled,
    setEnabled,
    segments,
    questionData,
    entities,
    customNormalizations,
    addCustomNormalization,
  };

  return (
    <div className="admin-normalization admin-content">
      <Actions {...props} />
      {segments.length > 0 && <Progress {...props} />}
      <QuestionData questionData={questionData} responses={responses} />
      {responses ? (
        <AllFields {...props} />
      ) : (
        <div>No responses data found.</div>
      )}
    </div>
  );
};

const AllFields = (props) => {
  const { normalizedResponses, unnormalizedResponses } = splitResponses(
    props.responses
  );
  const fieldsProps = { ...props, normalizedResponses, unnormalizedResponses };
  return (
    <>
      <Fields {...fieldsProps} variant="normalized" />
      <Fields {...fieldsProps} variant="unnormalized" />
    </>
  );
};
export default NormalizeQuestion;
