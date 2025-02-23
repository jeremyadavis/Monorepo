"use client";
import { useState } from "react";
import { normalizeQuestionResponses } from "~/lib/normalization/services";
import { LoadingButton } from "../LoadingButton";
import { NormalizeInBulkResult } from "~/lib/normalization/types";
import { NormField, NormalizationResult } from "./NormalizationResult";
import {
  EditionMetadata,
  ResponseData,
  SurveyMetadata,
} from "@devographics/types";
import { NormalizationResponse } from "~/lib/normalization/hooks";
import { getQuestionObject } from "~/lib/normalization/helpers/getQuestionObject";
import type { QuestionWithSection } from "~/lib/normalization/types";
import { getFormPaths } from "@devographics/templates";
import ManualInput from "./ManualInput";
import EntityInput from "./EntityInput";
import NormToken from "./NormToken";
import { useCopy, highlightMatches, highlightPatterns } from "../hooks";
import Dialog from "./Dialog";
import { FieldValue } from "./FieldValue";
import { Entity } from "@devographics/types";
import { CustomNormalization, CustomNormalizations } from "./NormalizeQuestion";
import { NO_MATCH } from "@devographics/constants";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const combineValue = (value: string | string[]) =>
  Array.isArray(value) ? value.join() : value;

const getPercent = (a, b) => Math.round((a / b) * 100);

const Fields = (props: {
  survey: SurveyMetadata;
  edition: EditionMetadata;
  question: QuestionWithSection;
  responsesCount: number;
  responses: NormalizationResponse[];
  questionData: ResponseData;
  variant: "normalized" | "unnormalized";
  entities: Entity[];
  customNormalizations: CustomNormalizations;
  addCustomNormalization: (CustomNormalization) => void;
}) => {
  const [showResponses, setShowResponses] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const {
    survey,
    edition,
    question,
    responsesCount,
    responses: allResponses,
    questionData,
    variant,
    entities,
    customNormalizations,
    addCustomNormalization,
  } = props;

  const responses = props[`${variant}Responses`] as NormalizationResponse[];

  if (!responses) return <p>Nothing to normalize</p>;

  const questionObject = getQuestionObject({
    survey,
    edition,
    section: question.section,
    question,
  })!;
  const formPaths = getFormPaths({ edition, question: questionObject });

  const fieldProps = {
    responses,
    showIds,
    question,
    survey,
    edition,
    questionData,
    rawPath: formPaths?.other,
    variant,
    entities,
    filterQuery,
    customNormalizations,
    addCustomNormalization,
  };

  const filteredResponses = filterQuery
    ? responses.filter((r) => {
        const combinedValue = combineValue(r.value);
        return combinedValue.toLowerCase().includes(filterQuery.toLowerCase());
      })
    : responses;

  return (
    <div>
      <h3>
        {capitalizeFirstLetter(variant)} Responses (
        {getPercent(responses.length, allResponses.length)}% –{" "}
        {responses.length}/{allResponses.length}){" "}
        <a
          href="#"
          role="button"
          onClick={(e) => {
            e.preventDefault();
            setShowResponses(!showResponses);
          }}
        >
          {showResponses ? "Hide" : "Show"}
        </a>
      </h3>
      {showResponses && (
        <div className="normalization-fields">
          {variant === "normalized" ? (
            <p>
              This table shows responses that have already received at least one
              match during the normalization process.
            </p>
          ) : (
            <p>
              This table shows responses that have not received any match yet
              during the normalization process.
            </p>
          )}

          <div className="normalization-filter">
            <label htmlFor="search">
              Filter {capitalizeFirstLetter(variant)} Responses: (
              {filteredResponses.length} results)
            </label>
            <input
              type="search"
              id="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Answer</th>
                {variant === "normalized" ? (
                  <th>Normalized Values</th>
                ) : (
                  <th>Manual Normalizations</th>
                )}
                <th>Response&nbsp;ID</th>
                <th colSpan={99}>Normalize</th>
              </tr>
            </thead>
            <tbody>
              {filteredResponses.map(
                (
                  { _id, responseId, value, normalizedValue, patterns },
                  index
                ) => {
                  const previousValue = filteredResponses[index - 1]?.value;
                  // show letter heading if this value's first letter is different from previous one
                  const showLetterHeading = previousValue
                    ? combineValue(value)[0].toUpperCase() !==
                      combineValue(previousValue)[0].toUpperCase()
                    : true;
                  return (
                    <Field
                      key={_id}
                      _id={_id}
                      value={value}
                      normalizedValue={normalizedValue}
                      patterns={patterns}
                      responseId={responseId}
                      index={index}
                      showLetterHeading={showLetterHeading}
                      {...fieldProps}
                    />
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Field = ({
  _id,
  value,
  normalizedValue,
  patterns,
  showIds,
  responses,
  responseId,
  question,
  survey,
  edition,
  questionData,
  rawPath,
  variant,
  entities,
  filterQuery,
  index,
  showLetterHeading = false,
  customNormalizations,
  addCustomNormalization,
}) => {
  const [result, setResult] = useState<NormalizeInBulkResult>();
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [showEntities, setShowEntities] = useState<boolean>(false);
  const [showResult, setShowResult] = useState(true);
  const surveyId = survey.id;
  const editionId = edition.id;
  const questionId = question.id;

  let customNormalizedValue = customNormalizations[responseId];
  if (customNormalizedValue) {
    // if there a custom tokens, remove any that was already included
    customNormalizedValue = customNormalizedValue.filter(
      (v) => !normalizedValue?.includes(v)
    );
  }

  return (
    <>
      {showLetterHeading && (
        <tr className="letter-heading">
          <th colSpan={99}>
            <h3>{combineValue(value)[0].toUpperCase()}</h3>
          </th>
        </tr>
      )}
      <tr>
        <td>{index + 1}. </td>
        <td>
          <FieldValue
            value={value}
            normalizedValue={normalizedValue}
            patterns={patterns}
            filterQuery={filterQuery}
          />
        </td>
        <td>
          <div className="normalization-tokens">
            {normalizedValue
              ?.filter((v) => v !== NO_MATCH)
              .map((value, i) => (
                <NormToken
                  key={value}
                  id={value}
                  pattern={patterns?.[i]}
                  responses={responses}
                />
              ))}
            {customNormalizedValue?.map((value) => (
              <NormToken
                key={value}
                id={value}
                responses={responses}
                variant="custom"
              />
            ))}
          </div>
        </td>
        <td>
          <ResponseId id={responseId} />
        </td>

        {/* <td>
          <button
            onClick={() => {
              setShowEntities(!showEntities);
            }}
            data-tooltip="Add or edit entities"
          >
            Edit&nbsp;Entities
          </button>
          {showEntities && (
            <Dialog
              showModal={showEntities}
              setShowModal={setShowEntities}
              header={<span>Add/Edit Entities</span>}
            >
              <EntityInput value={value} entities={entities} />
            </Dialog>
          )}
        </td> */}

        <td>
          <button
            onClick={() => {
              setShowManualInput(!showManualInput);
            }}
            data-tooltip="Manually enter normalization tokens"
          >
            Manual&nbsp;Input
          </button>
          {showManualInput && (
            <Dialog
              showModal={showManualInput}
              setShowModal={setShowManualInput}
              header={<span>Manual Input</span>}
            >
              <ManualInput
                survey={survey}
                edition={edition}
                question={question}
                questionData={questionData}
                responseId={responseId}
                normRespId={_id}
                rawValue={value}
                rawPath={rawPath}
                entities={entities}
                addCustomNormalization={addCustomNormalization}
              />
            </Dialog>
          )}
        </td>
        <td>
          <LoadingButton
            action={async () => {
              const result = await normalizeQuestionResponses({
                questionId,
                surveyId,
                editionId,
                responsesIds: [responseId],
              });
              setResult(result.data);
              console.log(result);
            }}
            label="Renormalize"
            tooltip="Renormalize this answer"
          />
        </td>
      </tr>
      {result && showResult && (
        <tr>
          <td colSpan={999}>
            <article>
              <NormalizationResult
                setShowResult={setShowResult}
                showQuestionId={false}
                {...result}
              />
            </article>
          </td>
        </tr>
      )}
    </>
  );
};

export const ResponseId = ({ id }: { id: string }) => {
  const [copied, copy, setCopied] = useCopy(id);

  const truncated = id.slice(0, 6) + "…";
  return (
    <code data-tooltip="Click to copy" onClick={copy}>
      {truncated}
    </code>
  );
};
export default Fields;
